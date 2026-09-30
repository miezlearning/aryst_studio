import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";
import { get, set, del } from "idb-keyval";
import type {
  Client,
  ClientProject,
  ClientSelectionSession,
  ShowcaseItem,
} from "@/types";

export type SyncStatus = "off" | "connecting" | "live" | "error";
export type SyncSource = "env" | "manual" | "none";

export interface SyncHandlers {
  onStatus: (status: SyncStatus, message?: string) => void;
  onRemote: (projectId: string, session: ClientSelectionSession) => void;
}

const COLLECTION = "selections";
const STUDIO_COLLECTION = "studio";
const STUDIO_STATE_ID = "state";
const SHOWCASE_COLLECTION = "studioShowcase";
const APP_NAME = "aryst-sync";
const PUSH_DEBOUNCE_MS = 400;
export const IDB_FIREBASE_CONFIG_KEY = "lumina_firebase_config";

/**
 * Studio-wide state shared by every browser: sessions, clients, landing
 * hero video URL, Drive API key and the admin PIN (as a SHA-256 hash).
 * Kept in one Firestore document so a fresh/private browser shows the
 * same content as the admin's browser.
 */
export interface StudioState {
  projects: ClientProject[];
  clients: Client[];
  showcaseOrder: string[]; // showcase item ids in landing-page order
  heroVideoUrl: string;
  globalApiKey: string;
  adminPin: string; // hashed, never the raw PIN
  lastModified: number;
}

/** One showcase slot stored as its own document (data URLs get large). */
export interface ShowcaseCloudItem extends ShowcaseItem {
  lastModified: number;
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let handlers: SyncHandlers | null = null;
let source: SyncSource = "none";
let activeUnsub: (() => void) | null = null;
let activeProjectId: string | null = null;
let pushTimer: number | null = null;
let pending: { projectId: string; session: ClientSelectionSession } | null = null;
let statePushTimer: number | null = null;
let pendingState: StudioState | null = null;

const parseConfig = (json: string): Record<string, string> | null => {
  const trimmed = (json || "").trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const cfg: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") cfg[key] = value;
    }
    if (cfg.apiKey && cfg.projectId) return cfg;
    return null;
  } catch {
    return null;
  }
};

const normalize = (data: Record<string, unknown>): ClientSelectionSession => ({
  projectId: typeof data.projectId === "string" ? data.projectId : "",
  clientName: typeof data.clientName === "string" ? data.clientName : "",
  clientContact: typeof data.clientContact === "string" ? data.clientContact : "",
  maxQuota: typeof data.maxQuota === "number" ? data.maxQuota : 20,
  selectedPhotoIds: Array.isArray(data.selectedPhotoIds)
    ? (data.selectedPhotoIds as unknown[]).filter((id): id is string => typeof id === "string")
    : [],
  revisionNotes:
    data.revisionNotes && typeof data.revisionNotes === "object"
      ? Object.fromEntries(
          Object.entries(data.revisionNotes as Record<string, unknown>)
            .filter((entry): entry is [string, string] => typeof entry[1] === "string")
            .map(([key, value]) => [key, value.replace(/\s+/g, " ").slice(0, 150)])
        )
      : {},
  isLocked: Boolean(data.isLocked),
  autoLocked: Boolean(data.autoLocked),
  lastModified: typeof data.lastModified === "number" ? data.lastModified : 0,
});

const flushPush = () => {
  pushTimer = null;
  if (!db || !pending) return;
  const { projectId, session } = pending;
  pending = null;
  setDoc(doc(db, COLLECTION, projectId), { ...session }, { merge: true }).catch((err) => {
    handlers?.onStatus("error", err?.message || "Gagal mengirim ke cloud");
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isProject = (value: unknown): value is ClientProject =>
  isRecord(value) && typeof value.id === "string" && typeof value.projectId === "string";

const isClient = (value: unknown): value is Client =>
  isRecord(value) && typeof value.id === "string" && typeof value.name === "string";

const isShowcaseItem = (value: unknown): value is ShowcaseItem =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.thumbnailUrl === "string" &&
  typeof value.previewUrl === "string";

const normalizeStudioState = (data: Record<string, unknown>): StudioState => ({
  projects: Array.isArray(data.projects)
    ? (data.projects as unknown[]).filter(isProject)
    : [],
  clients: Array.isArray(data.clients) ? (data.clients as unknown[]).filter(isClient) : [],
  showcaseOrder: Array.isArray(data.showcaseOrder)
    ? (data.showcaseOrder as unknown[]).filter((id): id is string => typeof id === "string")
    : [],
  heroVideoUrl: typeof data.heroVideoUrl === "string" ? data.heroVideoUrl : "",
  globalApiKey: typeof data.globalApiKey === "string" ? data.globalApiKey : "",
  adminPin:
    typeof data.adminPin === "string" && data.adminPin.length > 0 && data.adminPin.length <= 64
      ? data.adminPin
      : "",
  lastModified: typeof data.lastModified === "number" ? data.lastModified : 0,
});

const normalizeShowcaseCloud = (
  id: string,
  data: Record<string, unknown>
): ShowcaseCloudItem | null => {
  if (!isShowcaseItem(data)) return null;
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    thumbnailUrl: data.thumbnailUrl,
    previewUrl: data.previewUrl,
    source: data.source === "upload" ? "upload" : "photo",
    lastModified: typeof data.lastModified === "number" ? data.lastModified : 0,
  };
};

const flushStatePush = () => {
  statePushTimer = null;
  if (!db || !pendingState) return;
  const state = pendingState;
  pendingState = null;
  setDoc(doc(db, STUDIO_COLLECTION, STUDIO_STATE_ID), { ...state }).catch((err) => {
    handlers?.onStatus("error", err?.message || "Gagal mengirim data studio ke cloud");
  });
};

const start = async (next: SyncHandlers): Promise<SyncSource> => {
  handlers = next;
  let manual = "";
  try {
    manual = (await get<string>(IDB_FIREBASE_CONFIG_KEY)) || "";
  } catch {
    manual = "";
  }
  const envCfg = import.meta.env.VITE_FIREBASE_CONFIG || "";
  const json = manual || envCfg;
  const cfg = parseConfig(json);
  source = manual ? "manual" : envCfg ? "env" : "none";

  if (app) {
    try {
      await deleteApp(app);
    } catch {
      /* app may already be gone */
    }
    app = null;
    db = null;
    storage = null;
    activeUnsub?.();
    activeUnsub = null;
  }

  if (!cfg) {
    handlers.onStatus("off");
    return source;
  }

  try {
    app = initializeApp(cfg, APP_NAME);
    db = getFirestore(app);
    storage = getStorage(app);
    if (import.meta.env.VITE_FIRESTORE_EMULATOR === "1") {
      connectFirestoreEmulator(db, "localhost", 8080);
      connectStorageEmulator(storage, "localhost", 9199);
    }
    handlers.onStatus("connecting");
  } catch (err) {
    app = null;
    db = null;
    handlers.onStatus("error", err instanceof Error ? err.message : "Konfigurasi Firebase tidak valid");
  }
  return source;
};

export const configureSync = (next: SyncHandlers): Promise<SyncSource> => start(next);

export const reconfigureSync = (): Promise<SyncSource> => {
  if (!handlers) return Promise.resolve("none");
  return start(handlers);
};

export const saveFirebaseConfig = async (json: string): Promise<void> => {
  const trimmed = (json || "").trim();
  if (trimmed) {
    await set(IDB_FIREBASE_CONFIG_KEY, trimmed);
  } else {
    await del(IDB_FIREBASE_CONFIG_KEY).catch(() => undefined);
  }
};

export const isSyncConfigured = (): boolean => db !== null;

export const getSyncSource = (): SyncSource => source;

export const attachSelectionStream = (projectId: string): void => {
  activeUnsub?.();
  activeUnsub = null;
  activeProjectId = projectId;
  if (!db || !projectId) return;
  const current = db;
  activeUnsub = onSnapshot(
    doc(current, COLLECTION, projectId),
    (snap) => {
      handlers?.onStatus("live");
      if (snap.exists()) {
        handlers?.onRemote(projectId, normalize(snap.data() as Record<string, unknown>));
      }
    },
    (err) => {
      handlers?.onStatus("error", err?.message || "Koneksi cloud terputus");
    }
  );
};

export const subscribeSelection = (
  projectId: string,
  cb: (session: ClientSelectionSession) => void
): (() => void) => {
  if (!db || !projectId) return () => undefined;
  const current = db;
  return onSnapshot(
    doc(current, COLLECTION, projectId),
    (snap) => {
      if (snap.exists()) cb(normalize(snap.data() as Record<string, unknown>));
    },
    () => undefined
  );
};

export const fetchRemoteSelection = async (
  projectId: string
): Promise<ClientSelectionSession | null> => {
  if (!db || !projectId) return null;
  try {
    const current = db;
    const snap = await getDoc(doc(current, COLLECTION, projectId));
    if (!snap.exists()) return null;
    return normalize(snap.data() as Record<string, unknown>);
  } catch {
    return null;
  }
};

export const pushSelection = (projectId: string, session: ClientSelectionSession): void => {
  if (!db || !projectId) return;
  pending = { projectId, session };
  if (pushTimer !== null) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(flushPush, PUSH_DEBOUNCE_MS);
};

// ── Studio-wide state (sessions, clients, landing, credentials) ──

export const fetchStudioState = async (): Promise<StudioState | null> => {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, STUDIO_COLLECTION, STUDIO_STATE_ID));
    if (!snap.exists()) return null;
    return normalizeStudioState(snap.data() as Record<string, unknown>);
  } catch {
    return null;
  }
};

export const pushStudioState = (state: StudioState): void => {
  if (!db) return;
  pendingState = state;
  if (statePushTimer !== null) window.clearTimeout(statePushTimer);
  statePushTimer = window.setTimeout(flushStatePush, PUSH_DEBOUNCE_MS);
};

export const subscribeStudioState = (cb: (state: StudioState) => void): (() => void) => {
  if (!db) return () => undefined;
  const current = db;
  return onSnapshot(
    doc(current, STUDIO_COLLECTION, STUDIO_STATE_ID),
    (snap) => {
      if (snap.exists()) cb(normalizeStudioState(snap.data() as Record<string, unknown>));
    },
    () => undefined
  );
};

// ── Landing showcase (one document per slot: data URLs exceed 1 MB) ──

export const fetchShowcaseCloud = async (): Promise<ShowcaseCloudItem[]> => {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, SHOWCASE_COLLECTION));
    const items: ShowcaseCloudItem[] = [];
    snap.docs.forEach((d) => {
      const item = normalizeShowcaseCloud(d.id, d.data() as Record<string, unknown>);
      if (item) items.push(item);
    });
    return items;
  } catch {
    return [];
  }
};

export const pushShowcaseCloud = (item: ShowcaseCloudItem): void => {
  if (!db) return;
  setDoc(doc(db, SHOWCASE_COLLECTION, item.id), { ...item }).catch((err) => {
    handlers?.onStatus("error", err?.message || "Gagal mengirim showcase ke cloud");
  });
};

export const deleteShowcaseCloud = (id: string): void => {
  if (!db) return;
  deleteDoc(doc(db, SHOWCASE_COLLECTION, id)).catch(() => undefined);
};

export const clearShowcaseCloud = async (): Promise<void> => {
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, SHOWCASE_COLLECTION));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (!snap.docs.length) return;
    await batch.commit();
  } catch {
    // Best effort: a failed cleanup never blocks the local reset
  }
};

export const subscribeShowcaseCloud = (cb: (items: ShowcaseCloudItem[]) => void): (() => void) => {
  if (!db) return () => undefined;
  const current = db;
  return onSnapshot(
    collection(current, SHOWCASE_COLLECTION),
    (snap) => {
      const items: ShowcaseCloudItem[] = [];
      snap.docs.forEach((d) => {
        const item = normalizeShowcaseCloud(d.id, d.data() as Record<string, unknown>);
        if (item) items.push(item);
      });
      cb(items);
    },
    () => undefined
  );
};

// ── Hero video (Firebase Storage: files are far larger than 1 MB) ──

export const uploadHeroVideo = async (blob: Blob): Promise<string> => {
  if (!storage) throw new Error("Cloud belum aktif. Atur konfigurasi Firebase dulu.");
  const extFromType = (blob.type.split("/")[1] || "mp4").replace(/[^a-z0-9]/gi, "");
  const fileRef = ref(storage, `studio/hero-video-${Date.now()}.${extFromType || "mp4"}`);
  await uploadBytes(fileRef, blob, { contentType: blob.type || "video/mp4" });
  return await getDownloadURL(fileRef);
};

export const getActiveSyncProject = (): string | null => activeProjectId;
