import { create } from "zustand";
import { get, set, del } from "idb-keyval";
import {
  PhotoMetadata,
  ClientSelectionSession,
  ProofingConfig,
  ClientProject,
  Client,
  ViewMode,
  ShowcaseItem,
  ShowcaseCandidate,
} from "@/types";
import { fetchGoogleDriveFolder, extractFolderId } from "./googleDrive";
import { extractSelectionFromUrl } from "./sync";
import { hashPassword } from "./utils";
import {
  startP2PHost,
  startP2PClient,
  broadcastSelectionUpdate,
  cleanupP2P,
} from "./p2p";

const IDB_PROJECTS_KEY = "lumina_client_projects";
const IDB_CLIENTS_KEY = "lumina_clients";
const IDB_ACTIVE_PROJECT_KEY = "lumina_active_project_id";
const IDB_GLOBAL_KEY = "lumina_global_api_key";
const IDB_ADMIN_PIN_KEY = "lumina_admin_master_pin";
const IDB_PHOTOS_CACHE_KEY = "lumina_photos_catalog_";
const IDB_SHOWCASE_KEY = "lumina_showcase_items";
const IDB_HERO_VIDEO_URL_KEY = "lumina_hero_video_url";
const IDB_HERO_VIDEO_BLOB_KEY = "lumina_hero_video_blob";

export const MAX_SHOWCASE = 4;
export const MAX_HERO_VIDEO_BYTES = 30 * 1024 * 1024;

export const DEFAULT_HERO_VIDEO_HD = "https://assets.mixkit.co/videos/5382/5382-720.mp4";
export const DEFAULT_HERO_VIDEO_SD = "https://assets.mixkit.co/videos/5382/5382-360.mp4";
export const DEFAULT_HERO_POSTER = "https://assets.mixkit.co/videos/5382/5382-thumb-720-0.jpg";

const DEFAULT_ADMIN_PIN = "studio2026";

// ── Selection deadline helpers ────────────────────────────────
export const isDeadlinePassed = (project?: ClientProject | null): boolean =>
  Boolean(project?.selectionDeadline && Date.now() > project.selectionDeadline);

export const formatDeadlineRemaining = (ms: number): string => {
  if (ms <= 0) return "Berakhir";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${days} hari ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

// Applied lock automatically when the deadline crosses while the app is open
let deadlineTimer: number | null = null;

// ── Gallery access policy (password gate) ─────────────────────
// Professional session rules:
//  · access lives in memory only -> reload / new tab asks for the password again
//  · auto re-lock after 30 minutes of inactivity
//  · forced re-authentication every 12 hours
//  · 5 wrong attempts -> 30 second lockout (brute-force protection)
export const ACCESS_IDLE_TIMEOUT_MS = 30 * 60_000;
export const ACCESS_MAX_AGE_MS = 12 * 3_600_000;
export const ACCESS_MAX_ATTEMPTS = 5;
export const ACCESS_LOCKOUT_MS = 30_000;

const accessExpiry = new Map<string, number>(); // projectId -> expiresAt
let accessActivityAt = Date.now();
let accessFailedAttempts = 0;
let accessLockoutUntil = 0;
let accessWatchdogStarted = false;

const isAccessValid = (projectId: string): boolean => {
  const expiresAt = accessExpiry.get(projectId);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    accessExpiry.delete(projectId);
    return false;
  }
  return true;
};

// Keeps a project session in sync with its selection deadline:
// past deadline -> auto-lock, deadline removed/extended -> clear auto-lock
const reconcileDeadlineLock = async (
  session: ClientSelectionSession,
  project: ClientProject,
  storageKey: string
): Promise<ClientSelectionSession> => {
  const expired = isDeadlinePassed(project);
  if (expired && !session.isLocked) {
    const next: ClientSelectionSession = {
      ...session,
      isLocked: true,
      autoLocked: true,
      lastModified: Date.now(),
    };
    await set(storageKey, next);
    return next;
  }
  if (!expired && session.autoLocked) {
    const next: ClientSelectionSession = {
      ...session,
      isLocked: false,
      autoLocked: false,
      lastModified: Date.now(),
    };
    await set(storageKey, next);
    return next;
  }
  return session;
};

const DEFAULT_PROJECTS: ClientProject[] = [
  // Client 1: Rian & Amanda - Session 1: Prewedding Bali
  {
    id: "prewed-rian-amanda",
    clientId: "cli-rian-amanda",
    clientName: "Rian & Amanda",
    projectId: "PREWED-RIAN-AMANDA",
    sessionMode: "individual",
    isSample: true,
    sessionType: "Prewedding",
    sessionTitle: "Prewedding Sinematik Alam & Sunset",
    sessionPurpose: "Foto Cetak Kanvas Resepsi & Video Undangan Digital",
    location: "Kintamani & Pantai Melasti, Bali",
    sessionDate: "14 Maret 2026",
    folderId: "",
    maxQuota: 15,
    password: "",
    passwordHash: "",
    clientContact: "081234567890",
    notes: "Sesi 1: Nuansa outdoor pegunungan kabut & tebing sunset",
    sections: [
      { id: "sec-tamblingan", name: "Danau Tamblingan (Sunrise)", location: "Kabupaten Buleleng, Bali", description: "Sesi pagi berkabut di tepi danau" },
      { id: "sec-pinus", name: "Hutan Pinus Kintamani", location: "Kintamani, Bali", description: "Nuansa sejuk dan potret kasual" },
      { id: "sec-pantai", name: "Pantai Melasti (Sunset)", location: "Ungasan, Bali", description: "Golden hour dramatis di tebing karang" },
    ],
    createdAt: Date.now() - 172800000,
    // Demo: 7-day selection window (2 days already elapsed)
    selectionDeadline: Date.now() + 432000000,
  },
  // Client 1: Rian & Amanda - Session 2: Wedding Day Jakarta
  {
    id: "wed-rian-amanda",
    clientId: "cli-rian-amanda",
    clientName: "Rian & Amanda",
    projectId: "WED-2026-RIAN",
    sessionMode: "individual",
    isSample: true,
    sessionType: "Pernikahan",
    sessionTitle: "The Holy Matrimony & Grand Reception",
    sessionPurpose: "Dokumentasi Sakral Akad Nikah & Pesta Resepsi Keluarga Besar",
    location: "Hotel Mulia Senayan & Masjid Raya, Jakarta",
    sessionDate: "20 Juni 2026",
    folderId: "",
    maxQuota: 25,
    password: "",
    passwordHash: "",
    clientContact: "081234567890",
    notes: "Sesi 2: Dokumentasi hari H pernikahan lengkap",
    sections: [
      { id: "sec-persiapan", name: "Persiapan & Detail", location: "Suite Room • Hotel Mulia", description: "Momen persiapan rias dan detail perhiasan" },
      { id: "sec-akad", name: "Akad Nikah / Ijab Kabul", location: "Masjid Raya Al-Akbar", description: "Prosesi sakral ijab kabul dan pemasangan cincin" },
      { id: "sec-outdoor", name: "Sesi Outdoor & Sunset", location: "Garden Lawn & Sunset Deck", description: "Potret berdua saat matahari terbenam" },
      { id: "sec-resepsi", name: "Resepsi & After Party", location: "Grand Ballroom", description: "Pesta resepsi malam, dansa, dan ramah tamah" },
    ],
    createdAt: Date.now() - 86400000,
  },
  // Client 1: Rian & Amanda - Session 3: Maternity Studio
  {
    id: "maternity-rian-amanda",
    clientId: "cli-rian-amanda",
    clientName: "Rian & Amanda",
    projectId: "MATERNITY-RIAN-AMANDA",
    sessionMode: "individual",
    isSample: true,
    sessionType: "Maternity",
    sessionTitle: "Warm Editorial Maternity Portrait",
    sessionPurpose: "Koleksi Intim Kehamilan 32 Minggu & Album Keluarga Eksklusif",
    location: "Aryst Studio 2, Jakarta Selatan",
    sessionDate: "18 November 2026",
    folderId: "",
    maxQuota: 10,
    password: "",
    passwordHash: "",
    clientContact: "081234567890",
    notes: "Sesi 3: Potret kehamilan intim monokrom & warm editorial",
    sections: [
      { id: "sec-mat-mono", name: "Minimalist Monochrome", location: "Studio Cyclorama", description: "Siluet kontras & ekspresi intim" },
      { id: "sec-mat-warm", name: "Warm Editorial Couple", location: "Living Set Studio", description: "Nuansa hangat bersama pasangan" },
    ],
    createdAt: Date.now() - 43200000,
  },
  // Client 2: Dimas & Sarah - Session 1: Lamaran Bandung
  {
    id: "engagement-dimas-sarah",
    clientId: "cli-dimas-sarah",
    clientName: "Dimas & Sarah",
    projectId: "ENG-DIMAS-SARAH",
    sessionMode: "individual",
    isSample: true,
    sessionType: "Lamaran",
    sessionTitle: "Intimate Engagement Gathering",
    sessionPurpose: "Dokumentasi Pertunangan & Pertemuan Keluarga Inti",
    location: "Bumi Sangkuriang, Bandung",
    sessionDate: "10 Januari 2026",
    folderId: "",
    maxQuota: 12,
    password: "demo",
    passwordHash: "2a97516c354b6884",
    clientContact: "081987654321",
    notes: "Sesi lamaran intimate keluarga di Bandung",
    sections: [
      { id: "sec-ring", name: "Prosesi Tukar Cincin", location: "Bumi Sangkuriang, Bandung", description: "Momen pertukaran tanda cinta & cincin" },
      { id: "sec-family", name: "Ramah Tamah Keluarga", location: "Bumi Sangkuriang, Bandung", description: "Foto keluarga besar dan keakraban" },
    ],
    createdAt: Date.now() - 259200000,
  },
  // Client 2: Dimas & Sarah - Session 2: Prewedding Bromo
  {
    id: "prewed-dimas-sarah",
    clientId: "cli-dimas-sarah",
    clientName: "Dimas & Sarah",
    projectId: "PREWED-DIMAS-SARAH",
    sessionMode: "individual",
    isSample: true,
    sessionType: "Prewedding",
    sessionTitle: "Sunrise Bromo Adventure",
    sessionPurpose: "Buku Kenangan Pra-Nikah & Galeri Dekorasi Resepsi",
    location: "Gunung Bromo & Pasir Berbisik, Jawa Timur",
    sessionDate: "05 Mei 2026",
    folderId: "",
    maxQuota: 18,
    password: "demo",
    passwordHash: "2a97516c354b6884",
    clientContact: "081987654321",
    notes: "Sesi prewedding petualangan alam terbuka (Sandi: demo)",
    sections: [
      { id: "sec-bromo-sunrise", name: "Sunrise Penanjakan", location: "Penanjakan Bromo", description: "Latar megah gunung berapi & lautan awan" },
      { id: "sec-pasir", name: "Lautan Pasir Berbisik", location: "Pasir Berbisik Bromo", description: "Konsep kasual & sinematik dengan jeep" },
    ],
    createdAt: Date.now(),
  },
];

// ── Client registry (one client, many sessions) ─────────────
const normalizeClientKey = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

const slugify = (name: string): string => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "klien";
};

// Attaches every session to a client record, creating one when the name
// is new. Also migrates older data: missing clientId, sessionMode and
// the sample flag used by the landing page.
const ensureClients = (
  projects: ClientProject[],
  existing: Client[]
): { clients: Client[]; projects: ClientProject[]; clientsChanged: boolean; projectsChanged: boolean } => {
  const clients = [...existing];
  const sampleIds = new Set(DEFAULT_PROJECTS.map((p) => p.id));
  let clientsChanged = clients.length !== existing.length;
  let projectsChanged = false;

  const keyOf = (name: string) => normalizeClientKey(name);
  const byKey = new Map(clients.map((c) => [keyOf(c.name), c]));

  const nextProjects = projects.map((p) => {
    const next: ClientProject = { ...p };
    let dirty = false;

    if (sampleIds.has(p.id) && !p.isSample) {
      next.isSample = true;
      dirty = true;
    }
    if (!p.sessionMode) {
      next.sessionMode = "individual";
      dirty = true;
    }

    const key = keyOf(next.clientName || "");
    let client = next.clientId ? clients.find((c) => c.id === next.clientId) : byKey.get(key);
    if (!client) {
      const base = `cli-${slugify(next.clientName)}`;
      let id = base;
      let suffix = 2;
      while (clients.some((c) => c.id === id)) id = `${base}-${suffix++}`;
      client = {
        id,
        name: next.clientName,
        contact: next.clientContact || "",
        password: next.password || "",
        passwordHash: next.passwordHash || "",
        createdAt: next.createdAt || Date.now(),
      };
      clients.push(client);
      byKey.set(key, client);
      clientsChanged = true;
    }
    if (next.clientId !== client.id) {
      next.clientId = client.id;
      dirty = true;
    }
    if (dirty) projectsChanged = true;
    return next;
  });

  return { clients, projects: nextProjects, clientsChanged, projectsChanged };
};

const DEFAULT_CLIENTS: Client[] = ensureClients(DEFAULT_PROJECTS, []).clients;

interface ProofingState {
  photos: PhotoMetadata[];
  isLoading: boolean;
  error: string | null;
  activeFilter: "all" | "selected" | "unselected";
  searchQuery: string;
  lightboxPhotoId: string | null;
  isSubmissionOpen: boolean;
  isStudioOpen: boolean;
  isOnline: boolean;
  isDemoMode: boolean;

  // View & Authentication
  viewMode: ViewMode;
  isAdminAuthenticated: boolean;
  adminPin: string;
  clientProjects: ClientProject[];
  clients: Client[];
  activeProjectId: string;
  isPasswordUnlocked: boolean;
  // Timestamp until the password gate is temporarily locked out (0 = none)
  passwordLockUntil: number;
  globalApiKey: string;
  isP2PConnected: boolean;

  config: ProofingConfig;
  session: ClientSelectionSession;

  // Landing showcase (editable preview photos)
  showcaseItems: ShowcaseItem[];

  // True once init() hydrated showcase/hero/projects from IndexedDB
  // (used to hold skeletons instead of flashing default content)
  isBooted: boolean;

  // Hero background video ("" = default, upload blob takes precedence)
  heroVideoUrl: string;
  hasHeroVideoUpload: boolean;

  // Actions
  init: () => Promise<void>;
  setViewMode: (view: ViewMode) => void;
  loginAdmin: (pin: string) => boolean;
  logoutAdmin: () => void;
  setAdminPin: (newPin: string) => Promise<void>;
  openClientByCode: (codeOrUrl: string) => Promise<boolean>;

  loadPhotos: (forceReload?: boolean) => Promise<void>;
  toggleSelectPhoto: (id: string) => boolean;
  isPhotoSelected: (id: string) => boolean;
  setRevisionNote: (photoId: string, note: string) => void;
  setLockState: (isLocked: boolean, auto?: boolean) => void;
  // Effective lock = manual lock OR selection deadline passed
  isSelectionLocked: () => boolean;
  // (Re)arm the timer that auto-locks the active session at its deadline
  scheduleDeadlineLock: () => void;
  // Start the idle/expiry watchdog for the gallery password gate (idempotent)
  startAccessWatchdog: () => void;
  updateSessionInfo: (info: Partial<ClientSelectionSession>) => void;
  updateConfig: (newConfig: Partial<ProofingConfig>) => void;
  setActiveFilter: (filter: "all" | "selected" | "unselected") => void;
  setSearchQuery: (query: string) => void;
  setLightboxPhotoId: (id: string | null) => void;
  setIsSubmissionOpen: (open: boolean) => void;
  setIsStudioOpen: (open: boolean) => void;
  setIsOnline: (online: boolean) => void;
  clearSelection: () => void;

  // Multi-client project actions
  switchProject: (projectId: string) => Promise<void>;
  saveProject: (project: ClientProject) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  saveClient: (client: Client) => Promise<void>;
  // Grants the admin an unlocked preview of a protected session
  unlockForPreview: (projectId: string) => void;
  // Tests a pasted Drive folder against the global API key, saves nothing
  probeDriveFolder: (folderInput: string) => Promise<{ ok: boolean; count: number; message: string }>;
  // Photo count per session, read from each session's local cache
  getPhotoCounts: () => Promise<Record<string, number>>;
  // Photo catalog of one session (uses the live list for the active one)
  getProjectPhotos: (projectId: string) => Promise<PhotoMetadata[]>;
  verifyPassword: (passwordInput: string) => Promise<boolean>;
  setGlobalApiKey: (key: string) => Promise<void>;
  loadProjectSession: (projectId: string) => Promise<ClientSelectionSession>;
  importClientSelection: (projectId: string, selectedIds: string[], notes: Record<string, string>) => Promise<void>;

  // Showcase actions
  fetchShowcaseCandidates: () => Promise<ShowcaseCandidate[]>;
  addShowcasePhoto: (photo: PhotoMetadata) => Promise<boolean>;
  addShowcaseUpload: (item: ShowcaseItem) => Promise<boolean>;
  removeShowcaseItem: (id: string) => Promise<void>;
  moveShowcaseItem: (id: string, direction: -1 | 1) => Promise<void>;
  resetShowcase: () => Promise<void>;

  // Hero video actions
  setHeroVideoUrl: (url: string) => Promise<void>;
  saveHeroVideoUpload: (blob: Blob) => Promise<void>;
  clearHeroVideo: () => Promise<void>;
  resolveHeroVideoUrl: () => Promise<string>;
}

const DEFAULT_CONFIG: ProofingConfig = {
  folderId: "",
  apiKey: "",
  clientName: "Rian & Amanda",
  clientContact: "081234567890",
  projectId: "WED-2026-RIAN",
  maxQuota: 20,
  webhookUrl: "",
};

const DEFAULT_SESSION: ClientSelectionSession = {
  projectId: "WED-2026-RIAN",
  clientName: "Rian & Amanda",
  clientContact: "081234567890",
  maxQuota: 20,
  selectedPhotoIds: [],
  revisionNotes: {},
  isLocked: false,
  lastModified: Date.now(),
};

export const useProofingStore = create<ProofingState>((setStore, getStore) => ({
  photos: [],
  isLoading: false,
  error: null,
  activeFilter: "all",
  searchQuery: "",
  lightboxPhotoId: null,
  isSubmissionOpen: false,
  isStudioOpen: false,
  isOnline: navigator.onLine,
  isDemoMode: true,

  viewMode: "landing",
  isAdminAuthenticated: false,
  adminPin: DEFAULT_ADMIN_PIN,
  clientProjects: DEFAULT_PROJECTS,
  clients: DEFAULT_CLIENTS,
  activeProjectId: DEFAULT_PROJECTS[0].id,
  isPasswordUnlocked: true,
  passwordLockUntil: 0,
  globalApiKey: "",
  isP2PConnected: false,

  config: DEFAULT_CONFIG,
  session: DEFAULT_SESSION,
  showcaseItems: [],
  isBooted: false,
  heroVideoUrl: "",
  hasHeroVideoUpload: false,

  init: async () => {
    // 1. Read URL query params
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    const sessionParam = params.get("session");
    const clientParam = params.get("client");
    const projectParam = params.get("project");
    const folderParam = params.get("folder");
    const quotaParam = params.get("quota");
    const phParam = params.get("ph");
    const contactParam = params.get("contact");
    const webhookParam = params.get("webhook");
    const apiKeyParam = params.get("key");

    // 2. Load Global API Key & Admin Master PIN from IndexedDB
    const savedApiKey = (await get<string>(IDB_GLOBAL_KEY)) || apiKeyParam || "";
    const savedAdminPin = (await get<string>(IDB_ADMIN_PIN_KEY)) || DEFAULT_ADMIN_PIN;
    const isAuth = sessionStorage.getItem("lumina_admin_authenticated") === "true";

    let savedProjects = (await get<ClientProject[]>(IDB_PROJECTS_KEY)) || [];
    if (savedProjects.length === 0) {
      // First run only, so sessions deleted by the admin stay deleted
      savedProjects = [...DEFAULT_PROJECTS];
      await set(IDB_PROJECTS_KEY, savedProjects);
    }

    // Client registry: attach every session to a client record
    const savedClients = (await get<Client[]>(IDB_CLIENTS_KEY)) || [];
    const ensured = ensureClients(savedProjects, savedClients);
    savedProjects = ensured.projects;
    if (ensured.clientsChanged || ensured.projectsChanged) {
      await set(IDB_CLIENTS_KEY, ensured.clients);
      await set(IDB_PROJECTS_KEY, savedProjects);
    }
    const clients = ensured.clients;

    // 3. If URL specifies a shared project link, import or update it
    if (sessionParam || clientParam || projectParam) {
      const matchIndex = savedProjects.findIndex(
        (p) => p.id === sessionParam || p.projectId === projectParam
      );

      if (matchIndex >= 0) {
        savedProjects[matchIndex] = {
          ...savedProjects[matchIndex],
          clientName: clientParam || savedProjects[matchIndex].clientName,
          projectId: projectParam || savedProjects[matchIndex].projectId,
          folderId: folderParam || savedProjects[matchIndex].folderId,
          maxQuota: quotaParam ? parseInt(quotaParam, 10) : savedProjects[matchIndex].maxQuota,
          passwordHash: phParam || savedProjects[matchIndex].passwordHash,
          clientContact: contactParam || savedProjects[matchIndex].clientContact,
          webhookUrl: webhookParam || savedProjects[matchIndex].webhookUrl,
        };
      } else {
        const newProject: ClientProject = {
          id: sessionParam || `proj-${Date.now()}`,
          clientName: clientParam || "Klien Terhormat",
          projectId: projectParam || "PROJECT-2026",
          folderId: folderParam || "",
          maxQuota: quotaParam ? parseInt(quotaParam, 10) : 20,
          passwordHash: phParam || "",
          clientContact: contactParam || "",
          webhookUrl: webhookParam || "",
          createdAt: Date.now(),
        };
        savedProjects.unshift(newProject);
      }
      await set(IDB_PROJECTS_KEY, savedProjects);
    }

    // 4. Determine Active Project
    const savedActiveId = await get<string>(IDB_ACTIVE_PROJECT_KEY);
    let targetProject =
      savedProjects.find((p) => p.id === sessionParam || p.projectId === projectParam) ||
      savedProjects.find((p) => p.id === savedActiveId) ||
      savedProjects[0];

    // 5. Determine View Mode: landing, client, or admin
    let viewMode: ViewMode = "landing";
    if (viewParam === "admin" || window.location.hash === "#admin") {
      viewMode = "admin";
    } else if (sessionParam || clientParam || projectParam || viewParam === "client") {
      viewMode = "client";
    } else {
      // Default initial visit without query params: Landing Page
      viewMode = "landing";
    }

    // 6. Check Password Lock Status for target project
    // (in-memory access only: a page reload asks for the password again)
    const hasPassword = Boolean(targetProject.password || targetProject.passwordHash);
    const isUnlocked = hasPassword ? isAccessValid(targetProject.id) : true;

    // 7. Assemble active config
    const activeConfig: ProofingConfig = {
      folderId: targetProject.folderId,
      apiKey: targetProject.folderId ? savedApiKey : "",
      clientName: targetProject.clientName,
      clientContact: targetProject.clientContact || "",
      projectId: targetProject.projectId,
      maxQuota: targetProject.maxQuota,
      webhookUrl: targetProject.webhookUrl || "",
    };

    // 8. Load selection session for this specific project
    const projectSessionKey = `lumina_session_${targetProject.id}`;
    let projectSession = (await get<ClientSelectionSession>(projectSessionKey)) || {
      projectId: targetProject.projectId,
      clientName: targetProject.clientName,
      clientContact: targetProject.clientContact || "",
      maxQuota: targetProject.maxQuota,
      selectedPhotoIds: [],
      revisionNotes: {},
      isLocked: false,
      lastModified: Date.now(),
    };

    // Check URL hash for compressed selection state (#proof=...)
    const hashData = extractSelectionFromUrl();
    if (hashData.selectedIds && hashData.selectedIds.length > 0) {
      projectSession = {
        ...projectSession,
        selectedPhotoIds: hashData.selectedIds,
        revisionNotes: {
          ...projectSession.revisionNotes,
          ...hashData.revisionNotes,
        },
        lastModified: Date.now(),
      };
      await set(projectSessionKey, projectSession);
    }

    // Auto-lock when the selection deadline has passed (or release it
    // if the deadline was extended / removed by the photographer)
    projectSession = await reconcileDeadlineLock(
      projectSession,
      targetProject,
      projectSessionKey
    );

    // Same reconciliation for every other session, so a deadline that
    // passes while another session is open still locks that session
    for (const proj of savedProjects) {
      if (!proj.selectionDeadline || proj.id === targetProject.id) continue;
      const otherKey = `lumina_session_${proj.id}`;
      const stored = await get<ClientSelectionSession>(otherKey);
      if (stored) await reconcileDeadlineLock(stored, proj, otherKey);
    }

    // 9. Load photos cache + landing showcase
    const cacheKey = IDB_PHOTOS_CACHE_KEY + targetProject.id;
    const cachedPhotos = await get<PhotoMetadata[]>(cacheKey);
    const savedShowcase = (await get<ShowcaseItem[]>(IDB_SHOWCASE_KEY)) || [];
    const savedHeroVideoUrl = (await get<string>(IDB_HERO_VIDEO_URL_KEY)) || "";
    const savedHeroVideoBlob = await get<Blob>(IDB_HERO_VIDEO_BLOB_KEY).catch(() => undefined);

    setStore({
      viewMode,
      isAdminAuthenticated: isAuth,
      adminPin: savedAdminPin,
      clientProjects: savedProjects,
      clients,
      activeProjectId: targetProject.id,
      globalApiKey: savedApiKey,
      isPasswordUnlocked: isUnlocked,
      config: activeConfig,
      session: projectSession,
      isDemoMode: !targetProject.folderId || !savedApiKey,
      photos: cachedPhotos && cachedPhotos.length > 0 ? cachedPhotos : [],
      showcaseItems: savedShowcase.slice(0, MAX_SHOWCASE),
      heroVideoUrl: savedHeroVideoUrl,
      hasHeroVideoUpload: Boolean(savedHeroVideoBlob),
      isBooted: true,
    });

    // Arm the deadline auto-lock timer for the active session
    getStore().scheduleDeadlineLock();

    // Gallery password gate: idle timeout + max age + lockout watchdog
    getStore().startAccessWatchdog();

    // 10. Start P2P depending on view
    if (viewMode === "client") {
      startP2PClient(
        targetProject.projectId,
        () => ({
          type: "INITIAL_SYNC",
          projectId: targetProject.projectId,
          selectedPhotoIds: projectSession.selectedPhotoIds,
          revisionNotes: projectSession.revisionNotes,
          timestamp: Date.now(),
        }),
        (connected) => setStore({ isP2PConnected: connected })
      );
    } else if (viewMode === "admin") {
      startP2PHost(
        targetProject.projectId,
        (payload) => {
          getStore().importClientSelection(
            targetProject.id,
            payload.selectedPhotoIds,
            payload.revisionNotes
          );
        },
        (connected) => setStore({ isP2PConnected: connected })
      );
    }

    // 11. Load real Google Drive photos if configured
    if (targetProject.folderId && savedApiKey) {
      await getStore().loadPhotos();
    }
  },

  setViewMode: (view: ViewMode) => {
    setStore({ viewMode: view });
    const url = new URL(window.location.href);

    if (view === "admin") {
      url.searchParams.set("view", "admin");
    } else if (view === "client") {
      url.searchParams.set("view", "client");
      const { activeProjectId, clientProjects } = getStore();
      const current = clientProjects.find((p) => p.id === activeProjectId);
      if (current) {
        url.searchParams.set("session", current.id);
        url.searchParams.set("project", current.projectId);
      }
    } else {
      // Landing page: clean params
      url.search = "";
    }
    window.history.replaceState({}, "", url.toString());

    // Restart P2P for current view mode
    const { activeProjectId, clientProjects, session } = getStore();
    const current = clientProjects.find((p) => p.id === activeProjectId);
    if (!current) return;

    if (view === "client") {
      startP2PClient(
        current.projectId,
        () => ({
          type: "INITIAL_SYNC",
          projectId: current.projectId,
          selectedPhotoIds: session.selectedPhotoIds,
          revisionNotes: session.revisionNotes,
          timestamp: Date.now(),
        }),
        (connected) => setStore({ isP2PConnected: connected })
      );
    } else if (view === "admin") {
      startP2PHost(
        current.projectId,
        (payload) => {
          getStore().importClientSelection(current.id, payload.selectedPhotoIds, payload.revisionNotes);
        },
        (connected) => setStore({ isP2PConnected: connected })
      );
    } else {
      cleanupP2P();
      setStore({ isP2PConnected: false });
    }
  },

  loginAdmin: (pinInput: string) => {
    const { adminPin } = getStore();
    if (pinInput.trim() === adminPin.trim()) {
      sessionStorage.setItem("lumina_admin_authenticated", "true");
      setStore({ isAdminAuthenticated: true });
      return true;
    }
    return false;
  },

  logoutAdmin: () => {
    sessionStorage.removeItem("lumina_admin_authenticated");
    setStore({ isAdminAuthenticated: false, viewMode: "landing" });
    const url = new URL(window.location.origin + window.location.pathname);
    window.history.replaceState({}, "", url.toString());
  },

  setAdminPin: async (newPin: string) => {
    const clean = newPin.trim();
    if (!clean) return;
    await set(IDB_ADMIN_PIN_KEY, clean);
    setStore({ adminPin: clean });
  },

  openClientByCode: async (codeOrUrl: string) => {
    const trimmed = codeOrUrl.trim().toUpperCase();
    const { clientProjects } = getStore();
    const match = clientProjects.find(
      (p) => p.projectId.toUpperCase() === trimmed || p.id.toUpperCase() === trimmed
    );

    if (match) {
      await getStore().switchProject(match.id);
      getStore().setViewMode("client");
      return true;
    }
    return false;
  },

  switchProject: async (projectId: string) => {
    const { clientProjects, globalApiKey, viewMode } = getStore();
    const target = clientProjects.find((p) => p.id === projectId);
    if (!target) return;

    await set(IDB_ACTIVE_PROJECT_KEY, target.id);

    const hasPassword = Boolean(target.password || target.passwordHash);
    const isUnlocked = hasPassword ? isAccessValid(target.id) : true;

    const newConfig: ProofingConfig = {
      folderId: target.folderId,
      apiKey: target.folderId ? globalApiKey : "",
      clientName: target.clientName,
      clientContact: target.clientContact || "",
      projectId: target.projectId,
      maxQuota: target.maxQuota,
      webhookUrl: target.webhookUrl || "",
    };

    const projectSessionKey = `lumina_session_${target.id}`;
    let projectSession = (await get<ClientSelectionSession>(projectSessionKey)) || {
      projectId: target.projectId,
      clientName: target.clientName,
      clientContact: target.clientContact || "",
      maxQuota: target.maxQuota,
      selectedPhotoIds: [],
      revisionNotes: {},
      isLocked: false,
      lastModified: Date.now(),
    };

    // Sync lock state with the selection deadline of the target session
    projectSession = await reconcileDeadlineLock(projectSession, target, projectSessionKey);

    const cacheKey = IDB_PHOTOS_CACHE_KEY + target.id;
    const cachedPhotos = await get<PhotoMetadata[]>(cacheKey);

    setStore({
      activeProjectId: target.id,
      isPasswordUnlocked: isUnlocked,
      config: newConfig,
      session: projectSession,
      isDemoMode: !target.folderId || !globalApiKey,
      photos: cachedPhotos && cachedPhotos.length > 0 ? cachedPhotos : [],
    });

    // Re-arm the deadline auto-lock timer for the newly active session
    getStore().scheduleDeadlineLock();

    // Re-wire P2P for new project
    if (viewMode === "client") {
      startP2PClient(
        target.projectId,
        () => ({
          type: "INITIAL_SYNC",
          projectId: target.projectId,
          selectedPhotoIds: projectSession.selectedPhotoIds,
          revisionNotes: projectSession.revisionNotes,
          timestamp: Date.now(),
        }),
        (connected) => setStore({ isP2PConnected: connected })
      );
    } else if (viewMode === "admin") {
      startP2PHost(
        target.projectId,
        (payload) => {
          getStore().importClientSelection(target.id, payload.selectedPhotoIds, payload.revisionNotes);
        },
        (connected) => setStore({ isP2PConnected: connected })
      );
    }

    if (target.folderId && globalApiKey) {
      await getStore().loadPhotos();
    }
  },

  saveProject: async (project: ClientProject) => {
    const { clientProjects, clients, globalApiKey } = getStore();
    const updated = [...clientProjects];
    const nextClients = [...clients];

    const toSave: ClientProject = { ...project };
    const clearPassword = Boolean(toSave.clearPassword);
    delete toSave.clearPassword;

    const previous = clientProjects.find((p) => p.id === project.id);
    if (toSave.password && toSave.password.trim()) {
      toSave.passwordHash = await hashPassword(toSave.password.trim());
    } else if (clearPassword) {
      toSave.password = "";
      toSave.passwordHash = "";
    } else {
      // Empty field means "unchanged", so a stored credential survives an edit
      toSave.password = previous?.password || "";
      toSave.passwordHash = previous?.passwordHash || "";
    }

    // Every session belongs to a client, so a renamed session still groups
    const key = normalizeClientKey(toSave.clientName || "");
    let client = toSave.clientId
      ? nextClients.find((c) => c.id === toSave.clientId)
      : nextClients.find((c) => normalizeClientKey(c.name) === key);
    if (!client) {
      const base = `cli-${slugify(toSave.clientName || "klien")}`;
      let id = base;
      let suffix = 2;
      while (nextClients.some((c) => c.id === id)) id = `${base}-${suffix++}`;
      client = { id, name: toSave.clientName, createdAt: Date.now() };
      nextClients.push(client);
    }
    // The session edits below fill in the client's shared defaults
    client = {
      ...client,
      name: toSave.clientName || client.name,
      contact: toSave.clientContact || client.contact || "",
      password: toSave.password || client.password || "",
      passwordHash: toSave.passwordHash || client.passwordHash || "",
    };
    nextClients[nextClients.findIndex((c) => c.id === client.id)] = client;
    toSave.clientId = client.id;

    const index = updated.findIndex((p) => p.id === project.id);
    if (index >= 0) {
      updated[index] = toSave;
    } else {
      updated.unshift(toSave);
    }

    await set(IDB_PROJECTS_KEY, updated);
    await set(IDB_CLIENTS_KEY, nextClients);
    setStore({ clientProjects: updated, clients: nextClients });

    if (getStore().activeProjectId === project.id) {
      const updatedConfig: ProofingConfig = {
        folderId: project.folderId,
        apiKey: project.folderId ? globalApiKey : "",
        clientName: project.clientName,
        clientContact: project.clientContact || "",
        projectId: project.projectId,
        maxQuota: project.maxQuota,
        webhookUrl: project.webhookUrl || "",
      };

      setStore({
        config: updatedConfig,
        session: {
          ...getStore().session,
          clientName: project.clientName,
          projectId: project.projectId,
          maxQuota: project.maxQuota,
        },
      });

      if (project.folderId && globalApiKey) {
        await getStore().loadPhotos(true);
      }
    }

    // Deadline may have been set / extended / removed
    getStore().scheduleDeadlineLock();
  },

  deleteProject: async (projectId: string) => {
    const { clientProjects, clients, activeProjectId } = getStore();
    const removed = clientProjects.find((p) => p.id === projectId);
    const filtered = clientProjects.filter((p) => p.id !== projectId);
    await set(IDB_PROJECTS_KEY, filtered);

    // Drop everything stored for that session
    await del(`lumina_session_${projectId}`).catch(() => undefined);
    await del(IDB_PHOTOS_CACHE_KEY + projectId).catch(() => undefined);

    // Keep the client list clean when its last session disappears
    let nextClients = clients;
    if (removed?.clientId && !filtered.some((p) => p.clientId === removed.clientId)) {
      nextClients = clients.filter((c) => c.id !== removed.clientId);
      await set(IDB_CLIENTS_KEY, nextClients);
    }

    setStore({ clientProjects: filtered, clients: nextClients });

    if (activeProjectId === projectId && filtered.length > 0) {
      await getStore().switchProject(filtered[0].id);
    }
  },

  saveClient: async (client: Client) => {
    const clients = [...getStore().clients];
    const index = clients.findIndex((c) => c.id === client.id);
    if (index >= 0) clients[index] = client;
    else clients.push(client);
    await set(IDB_CLIENTS_KEY, clients);
    setStore({ clients });
  },

  unlockForPreview: (projectId: string) => {
    accessExpiry.set(projectId, Date.now() + ACCESS_MAX_AGE_MS);
    accessActivityAt = Date.now();
    accessFailedAttempts = 0;
    setStore({ isPasswordUnlocked: true, passwordLockUntil: 0 });
  },

  probeDriveFolder: async (folderInput: string) => {
    const { globalApiKey } = getStore();
    const folderId = extractFolderId(folderInput);
    if (!folderId.trim()) {
      return { ok: false, count: 0, message: "Tautan folder belum diisi." };
    }
    if (!globalApiKey) {
      return {
        ok: false,
        count: 0,
        message: "Kunci API Google Drive belum diatur. Buka tab Pengaturan untuk mengisinya.",
      };
    }
    try {
      const files = await fetchGoogleDriveFolder(folderId, globalApiKey);
      if (files.length === 0) {
        return {
          ok: true,
          count: 0,
          message: "Folder terbaca, tetapi belum ada foto di dalamnya.",
        };
      }
      return { ok: true, count: files.length, message: `${files.length} foto terbaca dari folder ini.` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Folder gagal dibaca.";
      return { ok: false, count: 0, message };
    }
  },

  getPhotoCounts: async () => {
    const counts: Record<string, number> = {};
    for (const proj of getStore().clientProjects) {
      try {
        const cached = await get<PhotoMetadata[]>(IDB_PHOTOS_CACHE_KEY + proj.id);
        if (cached && cached.length > 0) counts[proj.id] = cached.length;
      } catch {
        // Ignore unreadable caches
      }
    }
    return counts;
  },

  getProjectPhotos: async (projectId: string) => {
    if (projectId === getStore().activeProjectId && getStore().photos.length > 0) {
      return getStore().photos;
    }
    try {
      const cached = await get<PhotoMetadata[]>(IDB_PHOTOS_CACHE_KEY + projectId);
      return cached || [];
    } catch {
      return [];
    }
  },

  verifyPassword: async (passwordInput: string) => {
    const { clientProjects, activeProjectId } = getStore();
    const current = clientProjects.find((p) => p.id === activeProjectId);
    if (!current) return false;

    const now = Date.now();
    // Brute-force protection: reject while the lockout window is active
    if (now < accessLockoutUntil) return false;

    const trimmedInput = passwordInput.trim();
    if (!trimmedInput) return false;

    let isMatch = false;
    if (current.password && current.password.trim() === trimmedInput) {
      isMatch = true;
    } else if (current.passwordHash) {
      // Strict comparison only (prefix matching would be a vulnerability)
      const inputHash = await hashPassword(trimmedInput);
      isMatch = inputHash === current.passwordHash;
    }

    if (isMatch) {
      accessFailedAttempts = 0;
      accessLockoutUntil = 0;
      accessExpiry.set(current.id, now + ACCESS_MAX_AGE_MS);
      accessActivityAt = now;
      setStore({
        isPasswordUnlocked: true,
        passwordLockUntil: 0,
      });
      return true;
    }

    accessFailedAttempts += 1;
    if (accessFailedAttempts >= ACCESS_MAX_ATTEMPTS) {
      accessFailedAttempts = 0;
      accessLockoutUntil = now + ACCESS_LOCKOUT_MS;
      setStore({ passwordLockUntil: accessLockoutUntil });
    }
    return false;
  },

  startAccessWatchdog: () => {
    if (accessWatchdogStarted) return;
    accessWatchdogStarted = true;

    const touch = () => {
      accessActivityAt = Date.now();
    };
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach((evt) =>
      window.addEventListener(evt, touch, { passive: true })
    );

    window.setInterval(() => {
      const { activeProjectId, clientProjects, isPasswordUnlocked } = getStore();
      if (!isPasswordUnlocked) return;

      const project = clientProjects.find((p) => p.id === activeProjectId);
      if (!project?.password && !project?.passwordHash) return; // no gate

      const now = Date.now();
      const idle = now - accessActivityAt > ACCESS_IDLE_TIMEOUT_MS;
      if (!isAccessValid(activeProjectId) || idle) {
        accessExpiry.delete(activeProjectId);
        setStore({ isPasswordUnlocked: false });
      }
    }, 15_000);
  },

  setGlobalApiKey: async (key: string) => {
    const cleanKey = key.trim();
    await set(IDB_GLOBAL_KEY, cleanKey);
    setStore({ globalApiKey: cleanKey });

    const { config } = getStore();
    if (config.folderId) {
      setStore({
        config: { ...config, apiKey: cleanKey },
        isDemoMode: !cleanKey,
      });
      await getStore().loadPhotos(true);
    }
  },

  loadProjectSession: async (projectId: string) => {
    const key = `lumina_session_${projectId}`;
    const saved = await get<ClientSelectionSession>(key);
    return (
      saved || {
        projectId: "",
        clientName: "",
        clientContact: "",
        maxQuota: 20,
        selectedPhotoIds: [],
        revisionNotes: {},
        isLocked: false,
        lastModified: 0,
      }
    );
  },

  importClientSelection: async (
    projectId: string,
    selectedIds: string[],
    notes: Record<string, string>
  ) => {
    const key = `lumina_session_${projectId}`;
    const existing = await get<ClientSelectionSession>(key);
    const updated: ClientSelectionSession = {
      ...(existing || getStore().session),
      selectedPhotoIds: selectedIds,
      revisionNotes: notes,
      lastModified: Date.now(),
    };
    await set(key, updated);

    if (getStore().activeProjectId === projectId) {
      setStore({ session: updated });
    }
  },

  fetchShowcaseCandidates: async () => {
    const { clientProjects, photos } = getStore();
    const seen = new Map<string, ShowcaseCandidate>();
    const push = (p: PhotoMetadata, groupLabel: string) => {
      if (!seen.has(p.id)) seen.set(p.id, { ...p, groupLabel });
    };

    // Currently loaded catalog (Google Drive photos)
    photos.forEach((p) => push(p, "Sesi Aktif"));

    // Cached Google Drive photos from every project
    for (const proj of clientProjects) {
      try {
        const cached = await get<PhotoMetadata[]>(IDB_PHOTOS_CACHE_KEY + proj.id);
        cached?.forEach((p) => push(p, `Drive • ${proj.projectId}`));
      } catch {
        // Ignore unreadable caches
      }
    }

    return [...seen.values()];
  },

  addShowcasePhoto: async (photo: PhotoMetadata) => {
    const { showcaseItems } = getStore();
    if (showcaseItems.length >= MAX_SHOWCASE) return false;
    if (showcaseItems.some((item) => item.id === photo.id)) return false;
    const updated: ShowcaseItem[] = [
      ...showcaseItems,
      {
        id: photo.id,
        name: photo.name,
        thumbnailUrl: photo.thumbnailUrl,
        previewUrl: photo.previewUrl,
        source: "photo",
      },
    ];
    await set(IDB_SHOWCASE_KEY, updated);
    setStore({ showcaseItems: updated });
    return true;
  },

  addShowcaseUpload: async (item: ShowcaseItem) => {
    const { showcaseItems } = getStore();
    if (showcaseItems.length >= MAX_SHOWCASE) return false;
    if (showcaseItems.some((existing) => existing.id === item.id)) return false;
    const updated: ShowcaseItem[] = [...showcaseItems, { ...item, source: "upload" }];
    await set(IDB_SHOWCASE_KEY, updated);
    setStore({ showcaseItems: updated });
    return true;
  },

  removeShowcaseItem: async (id: string) => {
    const updated = getStore().showcaseItems.filter((item) => item.id !== id);
    await set(IDB_SHOWCASE_KEY, updated);
    setStore({ showcaseItems: updated });
  },

  moveShowcaseItem: async (id: string, direction: -1 | 1) => {
    const items = [...getStore().showcaseItems];
    const idx = items.findIndex((item) => item.id === id);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= items.length) return;
    [items[idx], items[target]] = [items[target], items[idx]];
    await set(IDB_SHOWCASE_KEY, items);
    setStore({ showcaseItems: items });
  },

  resetShowcase: async () => {
    await set(IDB_SHOWCASE_KEY, []);
    setStore({ showcaseItems: [] });
  },

  setHeroVideoUrl: async (url: string) => {
    const clean = url.trim();
    await set(IDB_HERO_VIDEO_URL_KEY, clean);
    setStore({ heroVideoUrl: clean });
  },

  saveHeroVideoUpload: async (blob: Blob) => {
    await set(IDB_HERO_VIDEO_BLOB_KEY, blob);
    setStore({ hasHeroVideoUpload: true });
  },

  clearHeroVideo: async () => {
    await del(IDB_HERO_VIDEO_BLOB_KEY).catch(() => undefined);
    await set(IDB_HERO_VIDEO_URL_KEY, "");
    setStore({ heroVideoUrl: "", hasHeroVideoUpload: false });
  },

  resolveHeroVideoUrl: async () => {
    const { heroVideoUrl } = getStore();
    try {
      const blob = await get<Blob>(IDB_HERO_VIDEO_BLOB_KEY);
      if (blob && blob.size > 0) return URL.createObjectURL(blob);
    } catch {
      // Fall through to URL / default
    }
    return heroVideoUrl;
  },

  loadPhotos: async (forceReload = false) => {
    const { config, isOnline, activeProjectId } = getStore();

    if (!config.folderId || !config.apiKey) {
      // No Drive source configured: gallery stays empty (no dummy photos)
      setStore({
        photos: [],
        isDemoMode: true,
        isLoading: false,
        error: null,
      });
      return;
    }

    const cacheKey = IDB_PHOTOS_CACHE_KEY + activeProjectId;
    if (!isOnline && !forceReload) {
      const cached = await get<PhotoMetadata[]>(cacheKey);
      if (cached && cached.length > 0) {
        setStore({ photos: cached, isLoading: false, isDemoMode: false });
        return;
      }
    }

    setStore({ isLoading: true, error: null });

    try {
      const fetched = await fetchGoogleDriveFolder(config.folderId, config.apiKey);
      setStore({
        photos: fetched,
        isDemoMode: false,
        isLoading: false,
        error: null,
      });
      await set(cacheKey, fetched);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memuat foto dari Google Drive.";
      setStore({
        isLoading: false,
        error: message,
      });
    }
  },

  toggleSelectPhoto: (id: string) => {
    const { session, activeProjectId } = getStore();
    if (getStore().isSelectionLocked()) return false;

    const isAlreadySelected = session.selectedPhotoIds.includes(id);
    let updated: string[];

    if (isAlreadySelected) {
      updated = session.selectedPhotoIds.filter((photoId) => photoId !== id);
    } else {
      if (session.selectedPhotoIds.length >= session.maxQuota) {
        return false;
      }
      updated = [...session.selectedPhotoIds, id];
    }

    const newSession: ClientSelectionSession = {
      ...session,
      selectedPhotoIds: updated,
      lastModified: Date.now(),
    };
    setStore({ session: newSession });
    set(`lumina_session_${activeProjectId}`, newSession);

    // Real-time P2P Broadcast to Photographer
    broadcastSelectionUpdate({
      type: "SELECTION_UPDATE",
      projectId: session.projectId,
      selectedPhotoIds: updated,
      revisionNotes: session.revisionNotes,
      timestamp: Date.now(),
    });

    return true;
  },

  isPhotoSelected: (id: string) => {
    return getStore().session.selectedPhotoIds.includes(id);
  },

  setRevisionNote: (photoId: string, note: string) => {
    const { session, activeProjectId } = getStore();
    if (getStore().isSelectionLocked()) return;
    const updatedNotes = { ...session.revisionNotes };
    if (note.trim()) {
      updatedNotes[photoId] = note.trim();
    } else {
      delete updatedNotes[photoId];
    }
    const newSession: ClientSelectionSession = {
      ...session,
      revisionNotes: updatedNotes,
      lastModified: Date.now(),
    };
    setStore({ session: newSession });
    set(`lumina_session_${activeProjectId}`, newSession);

    // Real-time P2P Broadcast
    broadcastSelectionUpdate({
      type: "SELECTION_UPDATE",
      projectId: session.projectId,
      selectedPhotoIds: session.selectedPhotoIds,
      revisionNotes: updatedNotes,
      timestamp: Date.now(),
    });
  },

  setLockState: (isLocked: boolean, auto = false) => {
    const { session, activeProjectId } = getStore();
    const newSession: ClientSelectionSession = {
      ...session,
      isLocked,
      autoLocked: isLocked ? auto : false,
      lastModified: Date.now(),
    };
    setStore({ session: newSession });
    set(`lumina_session_${activeProjectId}`, newSession);
  },

  isSelectionLocked: () => {
    const { session, clientProjects, activeProjectId } = getStore();
    if (session.isLocked) return true;
    const project = clientProjects.find((p) => p.id === activeProjectId);
    return isDeadlinePassed(project);
  },

  scheduleDeadlineLock: () => {
    if (deadlineTimer !== null) {
      window.clearTimeout(deadlineTimer);
      deadlineTimer = null;
    }
    const { clientProjects, activeProjectId, session } = getStore();
    const project = clientProjects.find((p) => p.id === activeProjectId);
    if (!project?.selectionDeadline) return;

    const delay = project.selectionDeadline - Date.now();
    if (delay <= 0) {
      if (!session.isLocked) getStore().setLockState(true, true);
      return;
    }
    // Deadline moved into the future: release a previous auto-lock
    if (session.isLocked && session.autoLocked) getStore().setLockState(false);
    // setTimeout overflows above ~24.8 days; re-arm from a longer interval
    const MAX_DELAY = 2_000_000_000;
    deadlineTimer = window.setTimeout(
      () => getStore().scheduleDeadlineLock(),
      Math.min(delay, MAX_DELAY)
    );
  },

  updateSessionInfo: (info: Partial<ClientSelectionSession>) => {
    const { session, activeProjectId } = getStore();
    const newSession: ClientSelectionSession = {
      ...session,
      ...info,
      lastModified: Date.now(),
    };
    setStore({ session: newSession });
    set(`lumina_session_${activeProjectId}`, newSession);
  },

  updateConfig: (newConfig: Partial<ProofingConfig>) => {
    const { config, session, activeProjectId } = getStore();
    const updatedConfig: ProofingConfig = {
      ...config,
      ...newConfig,
    };
    const updatedSession: ClientSelectionSession = {
      ...session,
      maxQuota: updatedConfig.maxQuota ?? session.maxQuota,
      clientName: updatedConfig.clientName ?? session.clientName,
      clientContact: updatedConfig.clientContact ?? session.clientContact,
      projectId: updatedConfig.projectId ?? session.projectId,
    };
    setStore({
      config: updatedConfig,
      session: updatedSession,
      isDemoMode: !updatedConfig.folderId || !updatedConfig.apiKey,
    });
    set(`lumina_session_${activeProjectId}`, updatedSession);
  },

  clearSelection: () => {
    const { session, activeProjectId } = getStore();
    if (session.isLocked) return;
    const newSession: ClientSelectionSession = {
      ...session,
      selectedPhotoIds: [],
      revisionNotes: {},
      lastModified: Date.now(),
    };
    setStore({ session: newSession });
    set(`lumina_session_${activeProjectId}`, newSession);

    broadcastSelectionUpdate({
      type: "SELECTION_UPDATE",
      projectId: session.projectId,
      selectedPhotoIds: [],
      revisionNotes: {},
      timestamp: Date.now(),
    });
  },

  setActiveFilter: (filter) => setStore({ activeFilter: filter }),
  setSearchQuery: (query) => setStore({ searchQuery: query }),
  setLightboxPhotoId: (id) => setStore({ lightboxPhotoId: id }),
  setIsSubmissionOpen: (open) => setStore({ isSubmissionOpen: open }),
  setIsStudioOpen: (open) => setStore({ isStudioOpen: open }),
  setIsOnline: (online) => setStore({ isOnline: online }),
}));
