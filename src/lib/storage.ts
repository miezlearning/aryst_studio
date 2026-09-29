import { create } from "zustand";
import { get, set } from "idb-keyval";
import {
  PhotoMetadata,
  ClientSelectionSession,
  ProofingConfig,
  ClientProject,
  ViewMode,
} from "@/types";
import { DEMO_PHOTOS, getDemoPhotosForProject, fetchGoogleDriveFolder } from "./googleDrive";
import { extractSelectionFromUrl } from "./sync";
import { hashPassword } from "./utils";
import {
  startP2PHost,
  startP2PClient,
  broadcastSelectionUpdate,
  cleanupP2P,
} from "./p2p";

const IDB_PROJECTS_KEY = "lumina_client_projects";
const IDB_ACTIVE_PROJECT_KEY = "lumina_active_project_id";
const IDB_GLOBAL_KEY = "lumina_global_api_key";
const IDB_ADMIN_PIN_KEY = "lumina_admin_master_pin";
const IDB_PHOTOS_CACHE_KEY = "lumina_photos_catalog_";

const DEFAULT_ADMIN_PIN = "studio2026";

const DEFAULT_PROJECTS: ClientProject[] = [
  // Client 1: Rian & Amanda - Session 1: Prewedding Bali
  {
    id: "prewed-rian-amanda",
    clientName: "Rian & Amanda",
    projectId: "PREWED-RIAN-AMANDA",
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
  },
  // Client 1: Rian & Amanda - Session 2: Wedding Day Jakarta
  {
    id: "wed-rian-amanda",
    clientName: "Rian & Amanda",
    projectId: "WED-2026-RIAN",
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
    clientName: "Rian & Amanda",
    projectId: "MATERNITY-RIAN-AMANDA",
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
    clientName: "Dimas & Sarah",
    projectId: "ENG-DIMAS-SARAH",
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
    clientName: "Dimas & Sarah",
    projectId: "PREWED-DIMAS-SARAH",
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
  activeProjectId: string;
  isPasswordUnlocked: boolean;
  globalApiKey: string;
  isP2PConnected: boolean;

  config: ProofingConfig;
  session: ClientSelectionSession;

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
  setLockState: (isLocked: boolean) => void;
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
  verifyPassword: (passwordInput: string) => Promise<boolean>;
  setGlobalApiKey: (key: string) => Promise<void>;
  loadProjectSession: (projectId: string) => Promise<ClientSelectionSession>;
  importClientSelection: (projectId: string, selectedIds: string[], notes: Record<string, string>) => Promise<void>;
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
  photos: DEMO_PHOTOS,
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
  activeProjectId: DEFAULT_PROJECTS[0].id,
  isPasswordUnlocked: true,
  globalApiKey: "",
  isP2PConnected: false,

  config: DEFAULT_CONFIG,
  session: DEFAULT_SESSION,

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
    if (
      !savedProjects ||
      savedProjects.length === 0 ||
      savedProjects.length < DEFAULT_PROJECTS.length ||
      !savedProjects.some((p) => p.id === "prewed-rian-amanda") ||
      !savedProjects[0]?.sessionType
    ) {
      const existingCustom = (savedProjects || []).filter(
        (p) => !DEFAULT_PROJECTS.some((dp) => dp.id === p.id)
      );
      savedProjects = [...DEFAULT_PROJECTS, ...existingCustom];
      await set(IDB_PROJECTS_KEY, savedProjects);
    }

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
    const hasPassword = Boolean(targetProject.password || targetProject.passwordHash);
    let isUnlocked = true;
    if (hasPassword) {
      const isSessionUnlocked =
        sessionStorage.getItem(`lumina_unlocked_${targetProject.id}`) === "true";
      isUnlocked = isSessionUnlocked;
    }

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

    // 9. Load photos cache
    const cacheKey = IDB_PHOTOS_CACHE_KEY + targetProject.id;
    const cachedPhotos = await get<PhotoMetadata[]>(cacheKey);

    setStore({
      viewMode,
      isAdminAuthenticated: isAuth,
      adminPin: savedAdminPin,
      clientProjects: savedProjects,
      activeProjectId: targetProject.id,
      globalApiKey: savedApiKey,
      isPasswordUnlocked: isUnlocked,
      config: activeConfig,
      session: projectSession,
      isDemoMode: !targetProject.folderId || !savedApiKey,
      photos: cachedPhotos && cachedPhotos.length > 0 ? cachedPhotos : getDemoPhotosForProject(targetProject.sessionType),
    });

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
    const isUnlocked = hasPassword
      ? sessionStorage.getItem(`lumina_unlocked_${target.id}`) === "true"
      : true;

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
    const projectSession = (await get<ClientSelectionSession>(projectSessionKey)) || {
      projectId: target.projectId,
      clientName: target.clientName,
      clientContact: target.clientContact || "",
      maxQuota: target.maxQuota,
      selectedPhotoIds: [],
      revisionNotes: {},
      isLocked: false,
      lastModified: Date.now(),
    };

    const cacheKey = IDB_PHOTOS_CACHE_KEY + target.id;
    const cachedPhotos = await get<PhotoMetadata[]>(cacheKey);

    setStore({
      activeProjectId: target.id,
      isPasswordUnlocked: isUnlocked,
      config: newConfig,
      session: projectSession,
      isDemoMode: !target.folderId || !globalApiKey,
      photos: cachedPhotos && cachedPhotos.length > 0 ? cachedPhotos : getDemoPhotosForProject(target.sessionType),
    });

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
    const { clientProjects, globalApiKey } = getStore();
    const updated = [...clientProjects];

    if (project.password && project.password.trim()) {
      project.passwordHash = await hashPassword(project.password.trim());
    } else {
      project.password = "";
      project.passwordHash = "";
    }

    const index = updated.findIndex((p) => p.id === project.id);
    if (index >= 0) {
      updated[index] = project;
    } else {
      updated.unshift(project);
    }

    await set(IDB_PROJECTS_KEY, updated);
    setStore({ clientProjects: updated });

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
  },

  deleteProject: async (projectId: string) => {
    const { clientProjects, activeProjectId } = getStore();
    const filtered = clientProjects.filter((p) => p.id !== projectId);
    await set(IDB_PROJECTS_KEY, filtered);
    setStore({ clientProjects: filtered });

    if (activeProjectId === projectId && filtered.length > 0) {
      await getStore().switchProject(filtered[0].id);
    }
  },

  verifyPassword: async (passwordInput: string) => {
    const { clientProjects, activeProjectId } = getStore();
    const current = clientProjects.find((p) => p.id === activeProjectId);
    if (!current) return false;

    const trimmedInput = passwordInput.trim();

    if (current.password && current.password.trim() === trimmedInput) {
      sessionStorage.setItem(`lumina_unlocked_${current.id}`, "true");
      setStore({ isPasswordUnlocked: true });
      return true;
    }

    if (current.passwordHash) {
      const inputHash = await hashPassword(trimmedInput);
      if (
        inputHash === current.passwordHash ||
        current.passwordHash.startsWith(inputHash) ||
        inputHash.startsWith(current.passwordHash)
      ) {
        sessionStorage.setItem(`lumina_unlocked_${current.id}`, "true");
        setStore({ isPasswordUnlocked: true });
        return true;
      }
    }

    return false;
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

  loadPhotos: async (forceReload = false) => {
    const { config, isOnline, activeProjectId } = getStore();

    if (!config.folderId || !config.apiKey) {
      setStore({
        photos: DEMO_PHOTOS,
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
    if (session.isLocked) return false;

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

  setLockState: (isLocked: boolean) => {
    const { session, activeProjectId } = getStore();
    const newSession: ClientSelectionSession = {
      ...session,
      isLocked,
      lastModified: Date.now(),
    };
    setStore({ session: newSession });
    set(`lumina_session_${activeProjectId}`, newSession);
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
