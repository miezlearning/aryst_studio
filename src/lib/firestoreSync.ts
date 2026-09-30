import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import { get, set, del } from "idb-keyval";
import type { ClientSelectionSession } from "@/types";

export type SyncStatus = "off" | "connecting" | "live" | "error";
export type SyncSource = "env" | "manual" | "none";

export interface SyncHandlers {
  onStatus: (status: SyncStatus, message?: string) => void;
  onRemote: (projectId: string, session: ClientSelectionSession) => void;
}

const COLLECTION = "selections";
const APP_NAME = "aryst-sync";
const PUSH_DEBOUNCE_MS = 400;
export const IDB_FIREBASE_CONFIG_KEY = "lumina_firebase_config";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let handlers: SyncHandlers | null = null;
let source: SyncSource = "none";
let activeUnsub: (() => void) | null = null;
let activeProjectId: string | null = null;
let pushTimer: number | null = null;
let pending: { projectId: string; session: ClientSelectionSession } | null = null;

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
    if (import.meta.env.VITE_FIRESTORE_EMULATOR === "1") {
      connectFirestoreEmulator(db, "localhost", 8080);
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

export const getActiveSyncProject = (): string | null => activeProjectId;
