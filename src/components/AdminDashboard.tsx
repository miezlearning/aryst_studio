import React, { useState, useMemo, useEffect, useRef } from "react";
import { useProofingStore } from "@/lib/storage";
import { ClientProject, SessionMode } from "@/types";
import { generateClientShareUrl } from "@/lib/sync";
import { extractFolderId } from "@/lib/googleDrive";
import { formatDate, verifyPassword } from "@/lib/utils";
import { getR2Config, saveR2Config, parseR2Config, testR2Connection } from "@/lib/r2Storage";
import { pingFirestore, extractFirebaseConfig } from "@/lib/firestoreSync";
import { ClientSelectionInspectorModal } from "./ClientSelectionInspectorModal";
import { ShowcaseManager } from "./ShowcaseManager";
import { HeroVideoManager } from "./HeroVideoManager";
import { AdminSidebar, AdminTab } from "./AdminSidebar";
import {
  Users,
  Plus,
  Link2,
  Trash2,
  ExternalLink,
  Edit3,
  Lock,
  Unlock,
  Key,
  FolderGit2,
  Hash,
  Phone,
  Code2,
  Check,
  Camera,
  ShieldCheck,
  X,
  Sliders,
  Eye,
  EyeOff,
  ArrowRight,
  LogOut,
  Radio,
  CheckCircle,
  Search,
  LayoutList,
  LayoutGrid,
  MapPin,
  Calendar,
  Target,
  FolderPlus,
  CalendarClock,
  RefreshCw,
  Upload,
  User,
  Cloud,
  HardDrive,
  Sparkles,
  Activity,
  Database,
  Server,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { DeadlineBadge } from "./DeadlineCountdown";

// datetime-local helpers for the selection deadline field
const toDeadlineInput = (ms?: number | null): string => {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromDeadlineInput = (value: string): number | null => {
  if (!value.trim()) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const defaultDeadlineInput = (days = 7): string =>
  toDeadlineInput(Date.now() + days * 86_400_000);

// Photo source status of one session: sample demo, no folder yet, folder without API key, or ready
type SourceState = "unset" | "nokey" | "ready" | "sample";
const sourceStateOf = (proj: ClientProject, hasApiKey: boolean): SourceState =>
  proj.isSample && !proj.folderId ? "sample" : !proj.folderId ? "unset" : !hasApiKey ? "nokey" : "ready";

// One status control per session. Each state carries its own next action,
// so an unfinished setup is never a dead label.
const SourceStatus: React.FC<{
  state: SourceState;
  count?: number;
  isActive: boolean;
  onConfigure: () => void;
  onOpenSettings: () => void;
  onReload: () => void;
}> = ({ state, count, isActive, onConfigure, onOpenSettings, onReload }) => {
  if (state === "sample") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F4F1EA] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/10 text-[11px] text-[#71717A] dark:text-zinc-400 font-medium">
        <Sparkles className="w-3 h-3 text-[#FF5A1F] shrink-0" />
        <span>Sesi Contoh Studio</span>
      </span>
    );
  }

  if (state === "unset") {
    return (
      <button
        type="button"
        onClick={onConfigure}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-[11px] font-bold transition-colors"
        title="Folder Google Drive belum dipasang untuk sesi ini. Klik untuk memasukkan link folder."
      >
        <Upload className="w-3 h-3" />
        <span>Tautkan Link Folder Drive</span>
      </button>
    );
  }

  if (state === "nokey") {
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-[11px] font-semibold transition-colors"
        title="Folder sudah ada, tetapi Google Drive API Key belum diisi di Pengaturan Studio"
      >
        <Key className="w-3 h-3" />
        <span>Perlu Kunci API GDrive</span>
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold min-w-0">
      <FolderGit2 className="w-3 h-3 shrink-0" />
      <span className="truncate max-w-[150px]">
        {count ? `${count} foto siap` : "Folder terhubung"}
      </span>
      {isActive && (
        <button
          type="button"
          onClick={onReload}
          className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-[#71717A] dark:text-zinc-400 hover:text-[#FF5A1F] dark:hover:text-[#FF5A1F] transition-colors"
          title="Muat ulang foto dari Google Drive"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

// Compact label for the session mode chosen by the admin
const SessionModeBadge: React.FC<{ proj: ClientProject }> = ({ proj }) =>
  proj.sessionMode === "group" ? (
    <span
      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60"
      title={proj.members?.length ? proj.members.join(", ") : "Sesi grup"}
    >
      <span className="inline-flex items-center gap-1">
        <Users className="w-3 h-3" />
        Grup{proj.members?.length ? ` · ${proj.members.length} anggota` : ""}
      </span>
    </span>
  ) : (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F5F2EB] dark:bg-white/[0.06] text-[#52525B] dark:text-zinc-400 border border-black/[0.06] dark:border-white/10 inline-flex items-center gap-1">
      <User className="w-3 h-3" />
      Perorangan
    </span>
  );

export const AdminDashboard: React.FC = () => {
  const {
    clientProjects,
    clients,
    activeProjectId,
    globalApiKey,
    isP2PConnected,
    switchProject,
    saveProject,
    deleteProject,
    setGlobalApiKey,
    setAdminPin,
    adminPin,
    logoutAdmin,
    setViewMode,
    unlockForPreview,
    probeDriveFolder,
    getPhotoCounts,
    loadPhotos,
    syncStatus,
    syncMessage,
    syncSource,
    setFirebaseConfigJson,
  } = useProofingStore();

  const [activeTab, setActiveTab] = useState<AdminTab>("projects");
  const [viewLayout, setViewLayout] = useState<"by_client" | "table" | "grid">("by_client");
  const [searchQuery, setSearchQuery] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState(globalApiKey);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [apiKeyCloudWarn, setApiKeyCloudWarn] = useState(false);

  useEffect(() => {
    if (globalApiKey) {
      setApiKeyInput(globalApiKey);
    }
  }, [globalApiKey]);
  const [newPinInput, setNewPinInput] = useState("");
  const [pinSaved, setPinSaved] = useState(false);
  const [pinCloudWarn, setPinCloudWarn] = useState(false);
  const [fbInput, setFbInput] = useState("");
  const [fbSaved, setFbSaved] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);
  const [r2Input, setR2Input] = useState("");
  const [r2Saved, setR2Saved] = useState(false);
  const [r2Error, setR2Error] = useState<string | null>(null);
  const [r2Active, setR2Active] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return sessionStorage.getItem("aryst_source_banner_dismissed") === "true";
  });

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    sessionStorage.setItem("aryst_source_banner_dismissed", "true");
  };

  // Inspector modal state
  const [inspectingProject, setInspectingProject] = useState<ClientProject | null>(null);

  // Modal for Create/Edit Project
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ClientProject | null>(null);

  // Form states
  const [formClientName, setFormClientName] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formSessionType, setFormSessionType] = useState("Pernikahan");
  const [formSessionTitle, setFormSessionTitle] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formSessionPurpose, setFormSessionPurpose] = useState("");
  const [formSessionDate, setFormSessionDate] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [formFolderId, setFormFolderId] = useState("");
  const [formQuota, setFormQuota] = useState(20);
  const [formPassword, setFormPassword] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formSections, setFormSections] = useState("");
  const [formSessionMode, setFormSessionMode] = useState<SessionMode>("individual");
  const [formMembers, setFormMembers] = useState("");
  const [formWebhookUrl, setFormWebhookUrl] = useState("");
  const [formClearPassword, setFormClearPassword] = useState(false);
  const [focusFolderField, setFocusFolderField] = useState(false);
  const [probeResult, setProbeResult] = useState<
    { ok: boolean; count: number; message: string } | null
  >(null);
  const [isProbing, setIsProbing] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Diagnostics & Architecture state
  const [showArchitectureDetails, setShowArchitectureDetails] = useState(false);
  const [isTestingFirestore, setIsTestingFirestore] = useState(false);
  const [firestoreTestResult, setFirestoreTestResult] = useState<{
    ok: boolean;
    latencyMs: number;
    message: string;
    projectId?: string;
  } | null>(null);

  const [isTestingR2, setIsTestingR2] = useState(false);
  const [r2TestResult, setR2TestResult] = useState<{
    ok: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);

  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const [driveTestResult, setDriveTestResult] = useState<{
    ok: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);

  // Admin PIN tester state
  const [testPinInput, setTestPinInput] = useState("");
  const [testPinResult, setTestPinResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTestingPin, setIsTestingPin] = useState(false);

  // Form password state & copy helpers
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [copiedPasswordId, setCopiedPasswordId] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  // Cached photo count per session, so source status shows a real number
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    let alive = true;
    getPhotoCounts().then((counts) => {
      if (alive) setPhotoCounts(counts);
    });
    return () => {
      alive = false;
    };
  }, [clientProjects, globalApiKey, getPhotoCounts]);

  // The session form is a dialog: focus lands on it, Escape closes it
  useEffect(() => {
    if (!isModalOpen) return;
    modalRef.current?.focus();
    modalRef.current?.scrollTo(0, 0);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen]);

  // Jump to the Drive field when the form is opened from a "add photos" CTA
  useEffect(() => {
    if (isModalOpen && focusFolderField) {
      folderInputRef.current?.focus();
      folderInputRef.current?.scrollIntoView({ block: "center" });
      setFocusFolderField(false);
    }
  }, [isModalOpen, focusFolderField]);

  const filteredProjects = clientProjects.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (p.clientName || "").toLowerCase().includes(query) ||
      (p.projectId || "").toLowerCase().includes(query) ||
      (p.sessionType && p.sessionType.toLowerCase().includes(query)) ||
      (p.location && p.location.toLowerCase().includes(query)) ||
      (p.sessionPurpose && p.sessionPurpose.toLowerCase().includes(query)) ||
      (p.notes && p.notes.toLowerCase().includes(query))
    );
  });

  // Group sessions by their owning client, so a renamed session stays grouped
  const groupedClients = useMemo(() => {
    const map = new Map<
      string,
      { key: string; clientName: string; clientContact: string; projects: ClientProject[] }
    >();

    const safeClients = Array.isArray(clients) ? clients : [];
    (filteredProjects || []).forEach((proj) => {
      if (!proj) return;
      const key = proj.clientId || (proj.clientName || "").trim().toLowerCase() || "klien";
      if (!map.has(key)) {
        const record = safeClients.find((c) => c && c.id === proj.clientId);
        map.set(key, {
          key,
          clientName: record?.name || (proj.clientName || "").trim() || "Klien Terhormat",
          clientContact: record?.contact || proj.clientContact || "",
          projects: [],
        });
      }
      const group = map.get(key)!;
      if (!group.clientContact && proj.clientContact) {
        group.clientContact = proj.clientContact;
      }
      group.projects.push(proj);
    });

    return Array.from(map.values());
  }, [filteredProjects, clients]);

  // Sessions that still need a photo source, driving the setup banner
  const sourceGaps = useMemo(() => {
    const hasKey = Boolean(globalApiKey);
    return {
      unset: filteredProjects.filter((p) => !p.isSample && sourceStateOf(p, hasKey) === "unset"),
      noKey: filteredProjects.filter((p) => !p.isSample && sourceStateOf(p, hasKey) === "nokey"),
    };
  }, [filteredProjects, globalApiKey]);

  const openCreateModal = (opts?: { focusFolder?: boolean }) => {
    setEditingProject(null);
    setFormClientName("");
    setFormProjectId(`SESI-${Date.now().toString().slice(-4)}`);
    setFormSessionType("Pernikahan");
    setFormSessionTitle("");
    setFormLocation("");
    setFormSessionPurpose("");
    setFormSessionDate("");
    setFormFolderId("");
    setFormQuota(20);
    setFormPassword("");
    setFormContact("");
    setFormNotes("");
    setFormSections("");
    setFormDeadline(defaultDeadlineInput(7));
    setFormSessionMode("individual");
    setFormMembers("");
    setFormWebhookUrl("");
    setFormClearPassword(false);
    setProbeResult(null);
    setFocusFolderField(Boolean(opts?.focusFolder));
    setIsModalOpen(true);
  };

  const openCreateModalForClient = (clientName: string, clientContact?: string) => {
    const record = clients.find(
      (c) => c.name.trim().toLowerCase() === clientName.trim().toLowerCase()
    );
    setEditingProject(null);
    setFormClientName(clientName);
    setFormProjectId(`SESI-${Date.now().toString().slice(-4)}`);
    setFormSessionType("Prewedding");
    setFormSessionTitle("");
    setFormLocation("");
    setFormSessionPurpose("");
    setFormSessionDate("");
    setFormFolderId("");
    setFormQuota(15);
    // A new session of an existing client starts from that client's defaults
    setFormPassword(record?.password || "");
    setFormContact(record?.contact || clientContact || "");
    setFormNotes("");
    setFormSections("");
    setFormDeadline(defaultDeadlineInput(7));
    setFormSessionMode("individual");
    setFormMembers("");
    setFormWebhookUrl("");
    setFormClearPassword(false);
    setProbeResult(null);
    setFocusFolderField(false);
    setIsModalOpen(true);
  };

  const openEditModal = (proj: ClientProject, opts?: { focusFolder?: boolean }) => {
    setEditingProject(proj);
    setFormClientName(proj.clientName);
    setFormProjectId(proj.projectId);
    setFormSessionType(proj.sessionType || "Pernikahan");
    setFormSessionTitle(proj.sessionTitle || "");
    setFormLocation(proj.location || "");
    setFormSessionPurpose(proj.sessionPurpose || "");
    setFormSessionDate(proj.sessionDate || "");
    setFormFolderId(proj.folderId);
    setFormQuota(proj.maxQuota);
    setFormPassword(proj.password || "");
    setFormContact(proj.clientContact || "");
    setFormNotes(proj.notes || "");
    setFormSections(
      proj.sections?.map((s) => (s.location ? `${s.name} (${s.location})` : s.name)).join(", ") || ""
    );
    setFormDeadline(toDeadlineInput(proj.selectionDeadline));
    setFormSessionMode(proj.sessionMode || "individual");
    setFormMembers(proj.members?.join(", ") || "");
    setFormWebhookUrl(proj.webhookUrl || "");
    setFormClearPassword(false);
    setProbeResult(null);
    setFocusFolderField(Boolean(opts?.focusFolder));
    setIsModalOpen(true);
  };

  const handleSaveProjectForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientName.trim()) return;

    const cleanFolder = extractFolderId(formFolderId);

    const parsedSections = formSections
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((item, idx) => {
        const match = item.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
          return {
            id: `sec-${idx}-${Date.now()}`,
            name: match[1].trim(),
            location: match[2].trim(),
          };
        }
        return {
          id: `sec-${idx}-${Date.now()}`,
          name: item,
        };
      });

    const newProject: ClientProject = {
      ...(editingProject || {}),
      id: editingProject ? editingProject.id : `proj-${Date.now()}`,
      clientName: formClientName.trim(),
      projectId: formProjectId.trim() || `PRJ-${Date.now().toString().slice(-4)}`,
      sessionType: formSessionType.trim() || "Pernikahan",
      sessionTitle: formSessionTitle.trim() || undefined,
      location: formLocation.trim() || undefined,
      sessionPurpose: formSessionPurpose.trim() || undefined,
      sessionDate: formSessionDate.trim() || undefined,
      sessionMode: formSessionMode,
      members:
        formSessionMode === "group"
          ? formMembers
              .split(",")
              .map((m) => m.trim())
              .filter(Boolean)
          : undefined,
      folderId: cleanFolder,
      maxQuota: Number(formQuota) || 20,
      password: formPassword.trim() || undefined,
      clearPassword: formClearPassword,
      clientContact: formContact.trim(),
      webhookUrl: formWebhookUrl.trim() || undefined,
      notes: formNotes.trim(),
      sections: parsedSections.length > 0 ? parsedSections : undefined,
      selectionDeadline: fromDeadlineInput(formDeadline),
      createdAt: editingProject ? editingProject.createdAt : Date.now(),
    };

    await saveProject(newProject);
    setIsModalOpen(false);
    setProbeResult(null);
    getPhotoCounts().then(setPhotoCounts);
  };

  const handleCopyClientLink = async (proj: ClientProject) => {
    const link = generateClientShareUrl(proj);
    await navigator.clipboard.writeText(link);
    setCopiedId(proj.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyPassword = async (password: string, projId: string) => {
    await navigator.clipboard.writeText(password);
    setCopiedPasswordId(projId);
    setTimeout(() => setCopiedPasswordId(null), 2500);
  };

  const handleCopyClientInvite = async (proj: ClientProject) => {
    const link = generateClientShareUrl(proj);
    const pwdText = proj.password ? `\nKata Sandi Galeri: ${proj.password}` : "";
    const msg = `Halo ${proj.clientName},\n\nBerikut tautan galeri kurasi foto Anda dari Aryst Photography:\n${link}${pwdText}\n\nSilakan pilih foto-foto terbaik Anda dan tambahkan catatan revisi jika diperlukan.\n\nTerima kasih!`;
    await navigator.clipboard.writeText(msg);
    setCopiedInviteId(proj.id);
    setTimeout(() => setCopiedInviteId(null), 2500);
  };

  const handleTestFirestore = async () => {
    setIsTestingFirestore(true);
    setFirestoreTestResult(null);
    try {
      const res = await pingFirestore();
      setFirestoreTestResult(res);
    } finally {
      setIsTestingFirestore(false);
    }
  };

  const handleTestR2 = async () => {
    setIsTestingR2(true);
    setR2TestResult(null);
    try {
      const cfg = await getR2Config();
      if (!cfg) {
        setR2TestResult({
          ok: false,
          latencyMs: 0,
          message: "Konfigurasi Cloudflare R2 belum diisi.",
        });
        return;
      }
      const res = await testR2Connection(cfg);
      setR2TestResult(res);
    } finally {
      setIsTestingR2(false);
    }
  };

  const handleTestDrive = async () => {
    setIsTestingDrive(true);
    setDriveTestResult(null);
    const key = apiKeyInput.trim() || globalApiKey.trim();
    if (!key) {
      setDriveTestResult({
        ok: false,
        latencyMs: 0,
        message: "Google Drive API Key belum diisi.",
      });
      setIsTestingDrive(false);
      return;
    }
    const start = performance.now();
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/about?fields=user&key=${encodeURIComponent(key)}`);
      const data = await res.json();
      const latencyMs = Math.round(performance.now() - start);
      if (!res.ok) {
        const errMsg = data?.error?.message || `HTTP ${res.status}`;
        setDriveTestResult({
          ok: false,
          latencyMs,
          message: errMsg.includes("API key not valid") ? "API key Google Drive tidak valid." : errMsg,
        });
      } else {
        setDriveTestResult({
          ok: true,
          latencyMs,
          message: `API Key Valid (${latencyMs}ms)! Siap membaca folder album Google Drive.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menguji koneksi Google Drive";
      setDriveTestResult({ ok: false, latencyMs: 0, message: msg });
    } finally {
      setIsTestingDrive(false);
    }
  };

  const handleVerifyTestPin = async () => {
    if (!testPinInput.trim()) return;
    setIsTestingPin(true);
    setTestPinResult(null);
    try {
      const isMatch =
        (await verifyPassword(testPinInput.trim(), adminPin)) ||
        testPinInput.trim() === adminPin.trim();
      if (isMatch) {
        setTestPinResult({
          ok: true,
          message: "PIN Cocok! Akses admin Anda terverifikasi dengan benar.",
        });
      } else {
        setTestPinResult({
          ok: false,
          message: "PIN Salah. Tidak cocok dengan PIN yang tersimpan di cloud.",
        });
      }
    } finally {
      setIsTestingPin(false);
    }
  };

  const handlePreviewAsClient = async (projId: string) => {
    await switchProject(projId);
    // The admin already authenticated, so the preview skips the password gate
    unlockForPreview(projId);
    setViewMode("client");
  };

  const handleProbeFolder = async () => {
    setIsProbing(true);
    const result = await probeDriveFolder(formFolderId);
    setProbeResult(result);
    setIsProbing(false);
    if (result.ok) getPhotoCounts().then(setPhotoCounts);
  };

  const handleReloadActivePhotos = async () => {
    await loadPhotos(true);
    getPhotoCounts().then(setPhotoCounts);
  };

  const handleSaveApiKey = async () => {
    const pushed = await setGlobalApiKey(apiKeyInput.trim());
    setApiKeySaved(pushed);
    setApiKeyCloudWarn(!pushed);
    setTimeout(() => {
      setApiKeySaved(false);
      setApiKeyCloudWarn(false);
    }, 2500);
  };

  const handleSavePin = async () => {
    if (!newPinInput.trim()) return;
    const pushed = await setAdminPin(newPinInput.trim());
    setNewPinInput("");
    setPinSaved(pushed);
    setPinCloudWarn(!pushed);
    setTimeout(() => {
      setPinSaved(false);
      setPinCloudWarn(false);
    }, 2500);
  };

  const handleSaveFirebase = async () => {
    const raw = fbInput.trim();
    if (!raw) {
      setFbError("Isi dulu konfigurasi Firebase, atau gunakan tombol Putuskan.");
      return;
    }
    const parsed = extractFirebaseConfig(raw);
    if (!parsed) {
      setFbError(
        "Format konfigurasi tidak valid. Pastikan memuat apiKey dan projectId dari Firebase Console."
      );
      return;
    }
    setFbError(null);
    const cleanJson = JSON.stringify(parsed, null, 2);
    await setFirebaseConfigJson(cleanJson);
    setFbInput("");
    setFbSaved(true);
    setTimeout(() => setFbSaved(false), 2000);
  };

  const handleClearFirebase = async () => {
    setFbError(null);
    await setFirebaseConfigJson("");
  };

  useEffect(() => {
    let alive = true;
    getR2Config().then((cfg) => {
      if (!alive || !cfg) return;
      setR2Active(true);
      setR2Input(JSON.stringify(cfg, null, 2));
    });
    return () => {
      alive = false;
    };
  }, []);

  const handleSaveR2 = async () => {
    const json = r2Input.trim();
    if (!json) {
      setR2Error("Isi dulu konfigurasi R2, atau gunakan tombol Lepas.");
      return;
    }
    const parsed = parseR2Config(json);
    if (!parsed) {
      setR2Error(
        "Format harus JSON valid dan memuat accountId, bucket, accessKeyId, secretAccessKey, publicBaseUrl."
      );
      return;
    }
    setR2Error(null);
    await saveR2Config(json);
    setR2Input(JSON.stringify(parsed, null, 2));
    setR2Active(true);
    setR2Saved(true);
    setTimeout(() => setR2Saved(false), 2000);
  };

  const handleClearR2 = async () => {
    setR2Error(null);
    await saveR2Config("");
    const remaining = await getR2Config();
    setR2Active(Boolean(remaining));
    setR2Input(remaining ? JSON.stringify(remaining, null, 2) : "");
  };

  const gasScriptCode = `// Google Apps Script (Code.gs)
// Integrasi otomatis ARYST dengan Google Sheets
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    sheet.appendRow([
      new Date(),
      data.clientName,
      data.clientContact,
      data.projectId,
      data.selectedFiles.length,
      data.selectedFiles.map(function(item) { return item.name; }).join(", "),
      JSON.stringify(data.revisionNotes)
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ status: "success", count: data.selectedFiles.length })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <div className="animate-fade-in pb-28 lg:pb-12 lg:pl-[264px]">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-black/[0.08] dark:border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="font-extrabold text-[#FF5A1F] uppercase tracking-wider">
              Admin
            </span>
            <span className="text-[#A1A1AA]">•</span>
            {isP2PConnected ? (
              <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 font-bold text-[11px] bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sinkron Realtime
              </span>
            ) : (
              <span className="text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-1.5 text-[11px] font-medium">
                <Radio className="w-3 h-3 text-[#71717A] dark:text-[#A1A1AA]" />
                Siap Menerima Pilihan
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-[#121212] dark:text-white tracking-tight">
            Dashboard Fotografer
          </h1>
          <p className="text-xs sm:text-sm text-[#52525B] dark:text-[#A1A1AA] mt-1 max-w-2xl font-medium">
            Kelola sesi kurasi klien, pantau pilihan foto secara realtime, dan atur sandi galeri.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              unlockForPreview(activeProjectId);
              setViewMode("client");
            }}
            className="btn-mtioon-secondary flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors"
          >
            <Eye className="w-4 h-4 text-[#FF5A1F]" />
            <span>Lihat Galeri Klien</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#71717A] dark:text-[#A1A1AA]" />
          </button>

          <button
            id="admin-add-session-btn"
            onClick={() => openCreateModal()}
            className="btn-mtioon-primary flex items-center gap-2 px-4 py-2 text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Sesi Klien</span>
          </button>

          <button
            onClick={logoutAdmin}
            className="btn-mtioon-secondary p-2 text-[#71717A] dark:text-[#A1A1AA] hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            title="Kunci & Logout Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Studio Overview Metrics (Clean White Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-6">
        <div className="mtioon-card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#71717A] dark:text-zinc-400">Total Sesi Klien</p>
          <p className="text-2xl sm:text-3xl font-black text-[#121212] dark:text-white mt-1.5">{clientProjects.length}</p>
        </div>

        <div className="mtioon-card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#71717A] dark:text-zinc-400">Sesi Dilindungi Sandi</p>
          <p className="text-2xl sm:text-3xl font-black text-[#121212] dark:text-white mt-1.5">
            {clientProjects.filter((p) => Boolean(p.password || p.passwordHash)).length}
          </p>
        </div>

        <div className="mtioon-card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#71717A] dark:text-zinc-400">Sesi Aktif di Preview</p>
          <p className="text-base sm:text-lg font-bold text-[#121212] dark:text-white mt-2 truncate">
            {clientProjects.find((p) => p.id === activeProjectId)?.clientName || "Belum dipilih"}
          </p>
        </div>
      </div>

      {/* Cloud & Media Architecture Status Bar */}
      <div className="rounded-2xl bg-white dark:bg-[#141417] border border-black/[0.08] dark:border-white/[0.08] p-4 shadow-sm mb-6 transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] dark:bg-[#FF5A1F]/15 text-[#FF5A1F] flex items-center justify-center font-bold shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-[#121212] dark:text-white flex items-center gap-2">
                <span>Arsitektur Sistem Cloud Terintegrasi</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                  Terpusat &amp; Terverifikasi
                </span>
              </h3>
              <p className="text-[11px] text-[#71717A] dark:text-zinc-400 mt-0.5">
                Database teks, sandi &amp; sesi di <strong>Firestore</strong>. Media video/foto besar di <strong>Cloudflare R2</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Firestore Badge */}
            <button
              type="button"
              onClick={() => setShowArchitectureDetails((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all hover:scale-[1.02] ${
                syncStatus === "live"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
                  : syncStatus === "connecting"
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60"
              }`}
              title="Klik untuk diagnosa koneksi database"
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span>
                {syncStatus === "live" ? "Firestore: Live" : syncStatus === "connecting" ? "Firestore: Menghubungkan..." : "Firestore: Offline"}
              </span>
            </button>

            {/* R2 Badge */}
            <button
              type="button"
              onClick={() => setShowArchitectureDetails((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all hover:scale-[1.02] ${
                r2Active
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
                  : "bg-black/[0.04] dark:bg-white/[0.06] text-[#71717A] dark:text-zinc-400 border-black/10 dark:border-white/10"
              }`}
              title="Klik untuk diagnosa Cloudflare R2"
            >
              <HardDrive className="w-3.5 h-3.5 shrink-0" />
              <span>Media: {r2Active ? "R2 Siap" : "R2 Belum Diisi"}</span>
            </button>

            {/* Google Drive API Badge */}
            <button
              type="button"
              onClick={() => setShowArchitectureDetails((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all hover:scale-[1.02] ${
                globalApiKey
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"
              }`}
              title="Klik untuk diagnosa Google Drive API"
            >
              <Key className="w-3.5 h-3.5 shrink-0" />
              <span>GDrive: {globalApiKey ? "API Key Ada" : "Perlu API Key"}</span>
            </button>

            {/* Toggle Detail Button */}
            <button
              type="button"
              onClick={() => setShowArchitectureDetails((v) => !v)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#121212] hover:bg-black/80 dark:bg-white dark:hover:bg-white/90 text-white dark:text-[#121212] text-xs font-bold transition-all"
            >
              <span>{showArchitectureDetails ? "Tutup Diagnostik" : "Uji Koneksi & Arsitektur"}</span>
              {showArchitectureDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expandable Architecture & Diagnostics Panel */}
        {showArchitectureDetails && (
          <div className="mt-4 pt-4 border-t border-black/[0.08] dark:border-white/[0.08] space-y-4 animate-fade-in">
            {/* Architecture Explainer Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-1.5 font-bold text-[#121212] dark:text-white mb-1">
                  <Database className="w-4 h-4 text-[#FF5A1F]" />
                  <span>1. Database Utama</span>
                </div>
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Google Firestore</p>
                <p className="text-[11px] text-[#71717A] dark:text-zinc-400 mt-1 leading-relaxed">
                  <strong>Single Source of Truth:</strong> Menyimpan seluruh data sesi foto, kata sandi klien, PIN admin master, daftar klien, catatan revisi, dan pilihan foto klien secara realtime.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-1.5 font-bold text-[#121212] dark:text-white mb-1">
                  <HardDrive className="w-4 h-4 text-[#FF5A1F]" />
                  <span>2. Penyimpanan Media</span>
                </div>
                <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Cloudflare R2 Bucket</p>
                <p className="text-[11px] text-[#71717A] dark:text-zinc-400 mt-1 leading-relaxed">
                  <strong>Objek Biner S3:</strong> Khusus menyimpan file besar seperti Video Hero MP4 dan foto showcase resolusi asli tanpa biaya egress ($0 transfer keluar). URL publiknya disimpan ke Firestore.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-1.5 font-bold text-[#121212] dark:text-white mb-1">
                  <Server className="w-4 h-4 text-[#FF5A1F]" />
                  <span>3. Album Foto Klien</span>
                </div>
                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Google Drive API v3</p>
                <p className="text-[11px] text-[#71717A] dark:text-zinc-400 mt-1 leading-relaxed">
                  <strong>Folder Drive Studio:</strong> Membaca ribuan foto langsung dari folder Google Drive publik fotografer tanpa perlu mengunggah ulang foto satu per satu.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-1.5 font-bold text-[#121212] dark:text-white mb-1">
                  <Layers className="w-4 h-4 text-[#FF5A1F]" />
                  <span>4. Offline Resilience</span>
                </div>
                <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">IndexedDB Browser</p>
                <p className="text-[11px] text-[#71717A] dark:text-zinc-400 mt-1 leading-relaxed">
                  <strong>Optimistic Local Cache:</strong> Hanya cache lokal di peramban agar website terbuka instan &amp; dapat dibuka offline. Tidak menimpa Firestore saat boot!
                </p>
              </div>
            </div>

            {/* Live Interactive Connection Testers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {/* Firestore Test Card */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#1A1A20] border border-black/[0.08] dark:border-white/[0.1] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#121212] dark:text-white flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#FF5A1F]" />
                    <span>Uji Ping Database</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#71717A] dark:text-zinc-400">aryst-5e94c</span>
                </div>
                <p className="text-[11px] text-[#71717A] dark:text-zinc-400">
                  Uji koneksi baca &amp; tulis realtime ke Firestore Cloud:
                </p>
                <button
                  type="button"
                  disabled={isTestingFirestore}
                  onClick={handleTestFirestore}
                  className="w-full py-1.5 px-3 rounded-full text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${isTestingFirestore ? "animate-spin" : ""}`} />
                  <span>{isTestingFirestore ? "Menguji..." : "Uji Ping Firestore"}</span>
                </button>
                {firestoreTestResult && (
                  <p className={`text-[11px] font-medium p-2 rounded-lg ${
                    firestoreTestResult.ok
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  }`}>
                    {firestoreTestResult.message}
                  </p>
                )}
              </div>

              {/* R2 Test Card */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#1A1A20] border border-black/[0.08] dark:border-white/[0.1] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#121212] dark:text-white flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-[#FF5A1F]" />
                    <span>Uji Media R2</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#71717A] dark:text-zinc-400">aryst-media</span>
                </div>
                <p className="text-[11px] text-[#71717A] dark:text-zinc-400">
                  Uji otorisasi SigV4 &amp; akses tulis/hapus ke Cloudflare R2:
                </p>
                <button
                  type="button"
                  disabled={isTestingR2}
                  onClick={handleTestR2}
                  className="w-full py-1.5 px-3 rounded-full text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${isTestingR2 ? "animate-spin" : ""}`} />
                  <span>{isTestingR2 ? "Menguji R2..." : "Uji Akses Bucket R2"}</span>
                </button>
                {r2TestResult && (
                  <p className={`text-[11px] font-medium p-2 rounded-lg ${
                    r2TestResult.ok
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  }`}>
                    {r2TestResult.message}
                  </p>
                )}
              </div>

              {/* GDrive API Test Card */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#1A1A20] border border-black/[0.08] dark:border-white/[0.1] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#121212] dark:text-white flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#FF5A1F]" />
                    <span>Uji GDrive API</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#71717A] dark:text-zinc-400">
                    {globalApiKey ? "•••" + globalApiKey.slice(-4) : "Belum diisi"}
                  </span>
                </div>
                <p className="text-[11px] text-[#71717A] dark:text-zinc-400">
                  Uji validitas Google Drive API Key v3 untuk membaca album:
                </p>
                <button
                  type="button"
                  disabled={isTestingDrive}
                  onClick={handleTestDrive}
                  className="w-full py-1.5 px-3 rounded-full text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${isTestingDrive ? "animate-spin" : ""}`} />
                  <span>{isTestingDrive ? "Menguji GDrive..." : "Uji Kunci API GDrive"}</span>
                </button>
                {driveTestResult && (
                  <p className={`text-[11px] font-medium p-2 rounded-lg ${
                    driveTestResult.ok
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  }`}>
                    {driveTestResult.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {activeTab === "projects" && (
        <div className="space-y-4">
          {/* Search Bar & View Mode Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A] dark:text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari sesi berdasarkan nama klien atau kode project..."
                className="w-full pl-10 pr-4 py-2 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#26262E] transition-all"
              />
            </div>

            <div className="flex items-center gap-1 bg-white dark:bg-[#141417] border border-black/[0.06] dark:border-white/[0.08] rounded-full p-1 self-end sm:self-auto transition-colors">
              <button
                onClick={() => setViewLayout("by_client")}
                className={`px-3 py-1.5 rounded-full text-xs transition-all flex items-center gap-1.5 ${
                  viewLayout === "by_client"
                    ? "bg-[#121212] dark:bg-white text-[#FFFFFF] dark:text-[#09090B] font-bold shadow-xs"
                    : "text-[#121212]/60 dark:text-zinc-400 hover:text-[#121212] dark:hover:text-white font-semibold"
                }`}
                title="Kelompokkan Sesi per Klien"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Per Klien</span>
              </button>

              <button
                onClick={() => setViewLayout("table")}
                className={`px-3 py-1.5 rounded-full text-xs transition-all flex items-center gap-1.5 ${
                  viewLayout === "table"
                    ? "bg-[#121212] dark:bg-white text-[#FFFFFF] dark:text-[#09090B] font-bold shadow-xs"
                    : "text-[#121212]/60 dark:text-zinc-400 hover:text-[#121212] dark:hover:text-white font-semibold"
                }`}
                title="Tampilan Tabel Pro"
              >
                <LayoutList className="w-4 h-4" />
                <span className="hidden sm:inline">Tabel Sesi</span>
              </button>

              <button
                onClick={() => setViewLayout("grid")}
                className={`px-3 py-1.5 rounded-full text-xs transition-all flex items-center gap-1.5 ${
                  viewLayout === "grid"
                    ? "bg-[#121212] dark:bg-white text-[#FFFFFF] dark:text-[#09090B] font-bold shadow-xs"
                    : "text-[#121212]/60 dark:text-zinc-400 hover:text-[#121212] dark:hover:text-white font-semibold"
                }`}
                title="Tampilan Kartu"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Kartu</span>
              </button>
            </div>
          </div>

          {/* Photo source setup banner: sleek, dismissible, elegant studio guidance */}
          {!bannerDismissed && (sourceGaps.unset.length > 0 || sourceGaps.noKey.length > 0) && (
            <div className="rounded-2xl bg-white dark:bg-[#141417] border border-black/[0.08] dark:border-white/[0.08] p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#FFF0EB] dark:bg-[#FF5A1F]/15 border border-[#FF5A1F]/20 dark:border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F] shrink-0 mt-0.5">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#121212] dark:text-white">
                    {sourceGaps.unset.length > 0
                      ? sourceGaps.unset.length === 1
                        ? `Sesi "${sourceGaps.unset[0].clientName}" belum memiliki folder foto`
                        : `${sourceGaps.unset.length} sesi belum memiliki tautan folder foto`
                      : "Kunci API Google Drive belum dikonfigurasi"}
                  </p>
                  <p className="text-[11px] text-[#71717A] dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {sourceGaps.unset.length > 0
                      ? "Tautkan folder Google Drive agar foto sesi dapat diakses langsung oleh klien di galeri."
                      : "Foto belum dapat dimuat dari cloud sampai kunci API Google Drive diisi pada tab Pengaturan."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {sourceGaps.unset.length > 0 && (
                  <button
                    type="button"
                    onClick={() => openEditModal(sourceGaps.unset[0], { focusFolder: true })}
                    className="btn-mtioon-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{sourceGaps.unset.length === 1 ? "Atur Folder Sesi Ini" : "Atur Folder Drive"}</span>
                  </button>
                )}
                {sourceGaps.noKey.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("settings")}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-white/[0.06] hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 text-xs font-bold transition-colors"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Atur Kunci API</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDismissBanner}
                  className="p-1.5 rounded-lg text-[#71717A] dark:text-zinc-400 hover:text-[#121212] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Tutup pemberitahuan ini"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#141417] border border-black/[0.08] dark:border-white/[0.08] text-[#71717A] dark:text-zinc-400 text-xs shadow-sm">
              <Users className="w-8 h-8 mx-auto mb-2 text-[#A1A1AA] dark:text-zinc-500" />
              <p className="font-bold text-[#121212] dark:text-white text-sm mb-1">Tidak Ada Sesi Ditemukan</p>
              <p className="text-[#71717A] dark:text-zinc-400 max-w-sm mx-auto">
                {searchQuery
                  ? "Coba ubah kata kunci pencarian Anda."
                  : "Belum ada sesi klien yang dibuat. Buat sesi pertama untuk mulai mengumpulkan foto."}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => openCreateModal()}
                  className="btn-mtioon-primary mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Sesi Klien</span>
                </button>
              )}
            </div>
          ) : viewLayout === "by_client" ? (
            /* GROUPED BY CLIENT: Multi-session relationship view */
            <div className="space-y-6">
              {groupedClients.map((group) => {
                return (
                  <div
                    key={group.key}
                    className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141417] overflow-hidden shadow-sm transition-colors"
                  >
                    {/* Client Group Header */}
                    <div className="p-4 sm:p-5 bg-[#F4F1EA] dark:bg-white/[0.04] border-b border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#FFF0EB] dark:bg-[#FF5A1F]/15 border border-[#FF5A1F]/20 flex items-center justify-center font-bold text-[#FF5A1F] text-base shrink-0">
                          {group.clientName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-[#121212] dark:text-white tracking-tight">
                              {group.clientName}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/20">
                              {group.projects.length} Sesi Foto
                            </span>
                          </div>
                          {group.clientContact && (
                            <p className="text-xs text-[#71717A] dark:text-zinc-400 mt-0.5 flex items-center gap-1.5 font-medium">
                              <Phone className="w-3 h-3 text-[#71717A] dark:text-zinc-400" />
                              <span>{group.clientContact}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => openCreateModalForClient(group.clientName, group.clientContact)}
                        className="btn-mtioon-secondary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-colors"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-[#FF5A1F]" />
                        <span>Tambah Sesi untuk Klien Ini</span>
                      </button>
                    </div>

                    {/* Sessions List within Client */}
                    <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                      {group.projects.map((proj) => {
                        const isActive = proj.id === activeProjectId;
                        const hasPassword = Boolean(proj.password || proj.passwordHash);
                        const isCopied = copiedId === proj.id;

                        return (
                          <div
                            key={proj.id}
                            className={`p-4 sm:p-5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                              isActive ? "bg-[#FFF0EB]/40 dark:bg-[#FF5A1F]/10" : ""
                            }`}
                          >
                            <div className="space-y-2 flex-1 min-w-0">
                              {/* Session Badges & Title */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/20">
                                  {proj.sessionType || "Sesi Foto"}
                                </span>
                                <SessionModeBadge proj={proj} />
                                <h4 className="text-sm sm:text-base font-bold text-[#121212] dark:text-white truncate">
                                  {proj.sessionTitle || proj.projectId}
                                </h4>
                                <span className="text-[11px] font-mono text-[#71717A] dark:text-zinc-400">
                                  ({proj.projectId})
                                </span>
                                {isActive && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    Aktif di Preview
                                  </span>
                                )}
                                <DeadlineBadge deadline={proj.selectionDeadline} />
                              </div>

                              {/* Venue & Purpose (Esensi Sesi) */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                                {proj.location && (
                                  <div className="flex items-center gap-1.5 text-[#52525B] dark:text-zinc-300">
                                    <MapPin className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0" />
                                    <span className="text-[#71717A] dark:text-zinc-400 font-medium">Tempat:</span>
                                    <span className="font-medium truncate">{proj.location}</span>
                                  </div>
                                )}
                                {(proj.sessionPurpose || proj.notes) && (
                                  <div className="flex items-center gap-1.5 text-[#52525B] dark:text-zinc-300">
                                    <Target className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0" />
                                    <span className="text-[#71717A] dark:text-zinc-400 font-medium">Tujuan / Esensi:</span>
                                    <span className="font-medium truncate">{proj.sessionPurpose || proj.notes}</span>
                                  </div>
                                )}
                              </div>

                              {/* Meta info tags */}
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#71717A] dark:text-zinc-400 pt-1">
                                <span className="flex items-center gap-1">
                                  <Camera className="w-3 h-3 text-[#71717A] dark:text-zinc-400" />
                                  <span>Kuota: <strong className="text-[#121212] dark:text-white">{proj.maxQuota} foto</strong></span>
                                </span>
                                {proj.sessionDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-[#71717A] dark:text-zinc-400" />
                                    <span>{proj.sessionDate}</span>
                                  </span>
                                )}
                                <span>•</span>
                                {hasPassword ? (
                                  <span className="inline-flex items-center gap-1 text-[#FF5A1F] font-medium">
                                    <Lock className="w-3 h-3" />
                                    <span>Dilindungi Sandi</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[#71717A] dark:text-zinc-400">
                                    <Unlock className="w-3 h-3" />
                                    <span>Publik</span>
                                  </span>
                                )}
                                {proj.sections && proj.sections.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-[#FF5A1F] font-semibold">
                                      {proj.sections.length} Bab Lokasi
                                    </span>
                                  </>
                                )}
                                <span>•</span>
                                <SourceStatus
                                  state={sourceStateOf(proj, Boolean(globalApiKey))}
                                  count={photoCounts[proj.id]}
                                  isActive={isActive}
                                  onConfigure={() => openEditModal(proj, { focusFolder: true })}
                                  onOpenSettings={() => setActiveTab("settings")}
                                  onReload={handleReloadActivePhotos}
                                />
                              </div>
                            </div>

                            {/* Actions for this session */}
                            <div className="flex items-center gap-1.5 shrink-0 self-start lg:self-center">
                              <button
                                onClick={() => setInspectingProject(proj)}
                                className="px-3 py-1.5 rounded-xl bg-[#FFF0EB] dark:bg-[#FF5A1F]/15 hover:bg-[#FFE5DB] dark:hover:bg-[#FF5A1F]/25 border border-[#FF5A1F]/30 text-[#FF5A1F] font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                                title="Lihat foto yang dipilih klien"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Pilihan</span>
                              </button>

                              <button
                                onClick={() => handlePreviewAsClient(proj.id)}
                                className="px-3 py-1.5 rounded-xl bg-[#F5F2EB] dark:bg-white/[0.06] hover:bg-[#EDE9E0] dark:hover:bg-white/[0.1] text-[#121212] dark:text-zinc-200 border border-black/5 dark:border-white/10 text-xs font-semibold transition-colors flex items-center gap-1.5"
                                title="Buka galeri klien untuk sesi ini"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#71717A] dark:text-zinc-400" />
                                <span>Buka Galeri</span>
                              </button>

                              <button
                                onClick={() => handleCopyClientLink(proj)}
                                className={`p-2 rounded-xl border text-xs transition-colors ${
                                  isCopied
                                    ? "bg-emerald-600 text-[#FFFFFF] border-emerald-600 font-bold"
                                    : "bg-white dark:bg-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.1] text-[#71717A] dark:text-zinc-300 hover:text-[#121212] dark:hover:text-white border-black/10 dark:border-white/10"
                                }`}
                                title="Salin tautan galeri klien"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                onClick={() => openEditModal(proj)}
                                className="p-2 rounded-xl bg-white dark:bg-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.1] text-[#71717A] dark:text-zinc-300 hover:text-[#121212] dark:hover:text-white border border-black/10 dark:border-white/10 transition-colors"
                                title="Edit sesi"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {clientProjects.length > 1 && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Hapus sesi "${proj.sessionTitle || proj.projectId}"?`)) {
                                      deleteProject(proj.id);
                                    }
                                  }}
                                  className="p-2 rounded-xl bg-white dark:bg-white/[0.06] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#71717A] dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 border border-black/10 dark:border-white/10 transition-colors"
                                  title="Hapus sesi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewLayout === "table" ? (
            /* PROFESSIONAL DATA TABLE */
            <div className="overflow-x-auto mtioon-card">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-black/[0.06] dark:border-white/[0.08] bg-[#F4F1EA] dark:bg-white/[0.04] text-[#121212]/60 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Klien & Tipe Sesi</th>
                    <th className="py-3 px-4">Tempat & Tujuan Sesi</th>
                    <th className="py-3 px-4">Sumber Foto</th>
                    <th className="py-3 px-4">Kuota</th>
                    <th className="py-3 px-4">Akses Sandi</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                  {filteredProjects.map((proj) => {
                    const isActive = proj.id === activeProjectId;
                    const isCopied = copiedId === proj.id;

                    return (
                      <tr
                        key={proj.id}
                        className={`hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors ${
                          isActive ? "bg-[#FFF0EB]/40 dark:bg-[#FF5A1F]/10" : ""
                        }`}
                      >
                        {/* Klien & Tipe Sesi */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#121212] dark:text-white text-sm">
                              {proj.clientName}
                            </span>
                            {proj.sessionType && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF0EB] dark:bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/20">
                                {proj.sessionType}
                              </span>
                            )}
                            <SessionModeBadge proj={proj} />
                            {isActive && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                Aktif
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[#121212]/80 dark:text-zinc-300 font-medium text-xs">
                              {proj.sessionTitle || proj.projectId}
                            </span>
                            <span className="text-[#121212]/60 dark:text-zinc-400 font-mono text-[11px]">
                              ({proj.projectId})
                            </span>
                            <DeadlineBadge deadline={proj.selectionDeadline} />
                          </div>
                        </td>

                        {/* Tempat & Tujuan Sesi */}
                        <td className="py-3 px-4 max-w-xs">
                          {proj.location && (
                            <div className="flex items-center gap-1 text-[#121212]/80 dark:text-zinc-300 truncate">
                              <MapPin className="w-3 h-3 text-[#FF5A1F] shrink-0" />
                              <span className="truncate">{proj.location}</span>
                            </div>
                          )}
                          {(proj.sessionPurpose || proj.notes) && (
                            <div className="flex items-center gap-1 text-[#121212]/60 dark:text-zinc-400 truncate mt-0.5 text-[11px]">
                              <Target className="w-3 h-3 text-[#FF5A1F] shrink-0" />
                              <span className="truncate">{proj.sessionPurpose || proj.notes}</span>
                            </div>
                          )}
                        </td>

                        {/* Sumber Foto */}
                        <td className="py-3 px-4">
                          <SourceStatus
                            state={sourceStateOf(proj, Boolean(globalApiKey))}
                            count={photoCounts[proj.id]}
                            isActive={isActive}
                            onConfigure={() => openEditModal(proj, { focusFolder: true })}
                            onOpenSettings={() => setActiveTab("settings")}
                            onReload={handleReloadActivePhotos}
                          />
                        </td>

                        {/* Kuota */}
                        <td className="py-3 px-4 font-semibold text-[#121212]/80 dark:text-zinc-200">
                          {proj.maxQuota} foto
                        </td>

                        {/* Proteksi Sandi */}
                        <td className="py-3 px-4">
                          {proj.password ? (
                            <button
                              type="button"
                              onClick={() => handleCopyPassword(proj.password!, proj.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 transition-all group"
                              title="Klik untuk salin kata sandi sesi klien ini"
                            >
                              <Key className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span className="font-mono font-bold tracking-wide">{proj.password}</span>
                              <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70 group-hover:underline">
                                {copiedPasswordId === proj.id ? "✓ Tersalin" : "Salin"}
                              </span>
                            </button>
                          ) : proj.passwordHash ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-semibold" title="Kata sandi aktif tersimpan (hash aman di cloud)">
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span>Sandi Aktif</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[#F4F1EA] dark:bg-white/[0.06] text-[#121212]/60 dark:text-zinc-400 border border-black/[0.06] dark:border-white/[0.08] font-medium">
                              <Unlock className="w-3 h-3" />
                              <span>Publik</span>
                            </span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setInspectingProject(proj)}
                              className="px-2.5 py-1.5 rounded-full bg-[#FFF0EB] dark:bg-[#FF5A1F]/15 hover:bg-[#FFE5DB] dark:hover:bg-[#FF5A1F]/25 border border-[#FF5A1F]/30 text-[#FF5A1F] font-semibold text-xs transition-colors flex items-center gap-1"
                              title="Lihat foto yang dipilih klien"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Pilihan</span>
                            </button>

                            <button
                              onClick={() => handleCopyClientInvite(proj)}
                              className={`p-1.5 rounded-full border text-xs transition-colors ${
                                copiedInviteId === proj.id
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "bg-white dark:bg-white/[0.06] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[#71717A] hover:text-emerald-600 dark:text-zinc-300 dark:hover:text-emerald-400 border-black/10 dark:border-white/10"
                              }`}
                              title="Salin pesan undangan WhatsApp (berisi tautan & kata sandi)"
                            >
                              {copiedInviteId === proj.id ? <Check className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => handleCopyClientLink(proj)}
                              className={`p-1.5 rounded-full border text-xs transition-colors ${
                                isCopied
                                  ? "bg-emerald-600 text-[#FFFFFF] border-emerald-600"
                                  : "bg-white dark:bg-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.1] text-[#71717A] dark:text-zinc-300 hover:text-[#121212] dark:hover:text-white border-black/10 dark:border-white/10"
                              }`}
                              title="Salin tautan galeri klien"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => handlePreviewAsClient(proj.id)}
                              className="p-1.5 rounded-full bg-white dark:bg-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.1] text-[#71717A] dark:text-zinc-300 hover:text-[#121212] dark:hover:text-white border border-black/10 dark:border-white/10 transition-colors"
                              title="Buka galeri klien ini"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => openEditModal(proj)}
                              className="p-1.5 rounded-full bg-white dark:bg-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.1] text-[#71717A] dark:text-zinc-300 hover:text-[#121212] dark:hover:text-white border border-black/10 dark:border-white/10 transition-colors"
                              title="Edit sesi"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {clientProjects.length > 1 && (
                              <button
                                onClick={() => {
                                  if (confirm(`Hapus sesi "${proj.sessionTitle || proj.clientName}"?`)) {
                                    deleteProject(proj.id);
                                  }
                                }}
                                className="p-1.5 rounded-full bg-white dark:bg-white/[0.06] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#71717A] dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 border border-black/10 dark:border-white/10 transition-colors"
                                title="Hapus sesi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* CLEAN MATTE CARD VIEW (NO GRADIENTS, NO BUBBLY RADIUS) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((proj) => {
                const isActive = proj.id === activeProjectId;
                const isCopied = copiedId === proj.id;

                return (
                  <div
                    key={proj.id}
                    className={`mtioon-card mtioon-card-hover p-5 transition-colors flex flex-col justify-between ${
                      isActive
                        ? "ring-2 ring-[#FF5A1F]/40"
                        : ""
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-[11px] px-2 py-0.5 rounded-full bg-[#FFF0EB] dark:bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/20 dark:border-[#FF5A1F]/30">
                          {proj.sessionType || "Sesi Foto"}
                        </span>
                        <SessionModeBadge proj={proj} />

                        {proj.password ? (
                          <button
                            type="button"
                            onClick={() => handleCopyPassword(proj.password!, proj.id)}
                            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-semibold transition-all group"
                            title="Klik untuk salin kata sandi sesi klien"
                          >
                            <Key className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span className="font-mono font-bold">{proj.password}</span>
                            <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70 group-hover:underline">
                              {copiedPasswordId === proj.id ? "✓" : "Salin"}
                            </span>
                          </button>
                        ) : proj.passwordHash ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-medium">
                            <Lock className="w-3 h-3 text-amber-600" />
                            <span>Sandi Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#F4F1EA] dark:bg-white/[0.06] text-[#121212]/60 dark:text-zinc-400 border border-black/[0.06] dark:border-white/10 font-medium">
                            <Unlock className="w-3 h-3" />
                            <span>Publik</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-[#121212] dark:text-white tracking-tight">
                        {proj.clientName}
                      </h3>
                      {proj.sessionTitle && (
                        <p className="text-xs font-semibold text-[#121212]/80 dark:text-zinc-300 mt-0.5">
                          {proj.sessionTitle}
                        </p>
                      )}

                      <div className="mt-3 space-y-1.5 text-xs">
                        {proj.location && (
                          <div className="flex items-center gap-1.5 text-[#121212]/80 dark:text-zinc-300">
                            <MapPin className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0" />
                            <span className="text-[#121212]/60 dark:text-zinc-400">Tempat:</span>
                            <span className="truncate font-medium">{proj.location}</span>
                          </div>
                        )}
                        {(proj.sessionPurpose || proj.notes) && (
                          <div className="flex items-center gap-1.5 text-[#121212]/80 dark:text-zinc-300">
                            <Target className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0" />
                            <span className="text-[#121212]/60 dark:text-zinc-400">Tujuan:</span>
                            <span className="truncate font-medium">{proj.sessionPurpose || proj.notes}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2 text-xs text-[#121212]/60 dark:text-zinc-400">
                        <div className="flex items-center gap-2">
                          <span>Kuota: </span>
                          <strong className="text-[#121212] dark:text-white">{proj.maxQuota} foto</strong>
                          <DeadlineBadge deadline={proj.selectionDeadline} />
                        </div>
                        <span className="text-[11px] text-[#121212]/60 dark:text-zinc-400 shrink-0">
                          {proj.sessionDate || formatDate(proj.createdAt)}
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] flex items-center gap-1.5 text-[#121212]/60 dark:text-zinc-400">
                        <SourceStatus
                          state={sourceStateOf(proj, Boolean(globalApiKey))}
                          count={photoCounts[proj.id]}
                          isActive={isActive}
                          onConfigure={() => openEditModal(proj, { focusFolder: true })}
                          onOpenSettings={() => setActiveTab("settings")}
                          onReload={handleReloadActivePhotos}
                        />
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] space-y-2">
                      <button
                        onClick={() => setInspectingProject(proj)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-full bg-[#FFF0EB] hover:bg-[#FFE5DB] dark:bg-[#FF5A1F]/15 dark:hover:bg-[#FF5A1F]/25 border border-[#FF5A1F]/30 text-[#FF5A1F] font-semibold text-xs transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Lihat Seleksi Klien</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyClientInvite(proj)}
                          className={`p-2 rounded-full border transition-colors ${
                            copiedInviteId === proj.id
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white hover:bg-emerald-50 dark:bg-white/[0.06] dark:hover:bg-emerald-950/40 text-[#71717A] hover:text-emerald-600 dark:text-zinc-300 dark:hover:text-emerald-400 border-black/10 dark:border-white/10"
                          }`}
                          title="Salin pesan undangan WhatsApp (berisi link & kata sandi)"
                        >
                          {copiedInviteId === proj.id ? <Check className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleCopyClientLink(proj)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-semibold border transition-colors ${
                            isCopied
                              ? "bg-emerald-600 text-[#FFFFFF] border-emerald-600"
                              : "bg-white hover:bg-black/[0.04] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-[#71717A] hover:text-[#121212] dark:text-zinc-300 dark:hover:text-white border-black/10 dark:border-white/10"
                          }`}
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                          <span>{isCopied ? "Tersalin!" : "Salin Link"}</span>
                        </button>

                        <button
                          onClick={() => handlePreviewAsClient(proj.id)}
                          className="p-2 rounded-full bg-white hover:bg-black/[0.04] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-[#71717A] hover:text-[#121212] dark:text-zinc-300 dark:hover:text-white border border-black/10 dark:border-white/10 transition-colors"
                          title="Buka galeri klien ini"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => openEditModal(proj)}
                          className="p-2 rounded-full bg-white hover:bg-black/[0.04] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-[#71717A] hover:text-[#121212] dark:text-zinc-300 dark:hover:text-white border border-black/10 dark:border-white/10 transition-colors"
                          title="Edit sesi"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {clientProjects.length > 1 && (
                          <button
                            onClick={() => {
                              if (confirm(`Hapus sesi "${proj.sessionTitle || proj.clientName}"?`)) {
                                deleteProject(proj.id);
                              }
                            }}
                            className="p-2 rounded-full bg-white hover:bg-rose-50 dark:bg-white/[0.06] dark:hover:bg-rose-950/40 text-[#71717A] hover:text-rose-600 dark:text-zinc-300 dark:hover:text-rose-400 border border-black/10 dark:border-white/10 transition-colors"
                            title="Hapus sesi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: LANDING SHOWCASE */}
      {activeTab === "showcase" && (
        <div className="space-y-5">
          <HeroVideoManager />
          <ShowcaseManager />
        </div>
      )}

      {/* TAB 2: STUDIO SETTINGS */}
      {activeTab === "settings" && (
        <div className="max-w-3xl space-y-6">
          {/* Admin Master PIN */}
          <div className="mtioon-card p-6">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2 className="text-base font-bold text-[#121212] dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#C2410C]" />
                <span>PIN Master Admin &amp; Keamanan</span>
              </h2>
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>Tersimpan di Cloud Firestore</span>
              </span>
            </div>
            <p className="text-xs text-[#121212]/60 dark:text-zinc-400 mb-4 leading-relaxed">
              PIN ini melindungi akses Dashboard Admin. Disimpan secara aman di koleksi cloud Firestore menggunakan enkripsi hash salted PBKDF2 SHA-256 (format v2$).
            </p>

            <div className="space-y-4">
              {/* PIN Tester */}
              <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
                <label className="block text-xs font-bold text-[#121212]/80 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Uji Kecocokan PIN Anda</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={testPinInput}
                    onChange={(e) => {
                      setTestPinInput(e.target.value);
                      if (testPinResult) setTestPinResult(null);
                    }}
                    placeholder="Ketik PIN Anda untuk verifikasi..."
                    className="flex-1 px-3.5 py-1.5 text-xs font-mono bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all"
                  />
                  <button
                    type="button"
                    disabled={isTestingPin || !testPinInput.trim()}
                    onClick={handleVerifyTestPin}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#121212] hover:bg-black/80 dark:bg-white dark:hover:bg-white/90 text-white dark:text-[#121212] transition-colors disabled:opacity-50"
                  >
                    {isTestingPin ? "Menguji..." : "Cek PIN"}
                  </button>
                </div>
                {testPinResult && (
                  <p className={`text-[11px] font-medium p-2 rounded-lg ${
                    testPinResult.ok
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  }`}>
                    {testPinResult.message}
                  </p>
                )}
              </div>

              {/* PIN Updater */}
              <div>
                <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#C2410C]" />
                  <span>Ganti PIN Master Baru</span>
                </label>
                <input
                  type="text"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="Contoh: studio2026"
                  className="w-full px-3.5 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all font-mono"
                />
              </div>

              <button
                onClick={handleSavePin}
                className="btn-mtioon-primary px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                {pinSaved ? <Check className="w-4 h-4" /> : null}
                <span>{pinSaved ? "PIN Berhasil Disimpan ke Cloud!" : "Simpan & Sinkronkan PIN Baru"}</span>
              </button>
              {pinCloudWarn ? (
                <p className="text-[11px] font-medium p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  PIN tersimpan di browser ini saja. Cloud tidak terjangkau (cek status Firestore), jadi PIN baru belum berlaku di perangkat lain.
                </p>
              ) : null}
            </div>
          </div>

          {/* Global Google Drive API Key */}
          <div className="mtioon-card p-6">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2 className="text-base font-bold text-[#121212] dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#C2410C]" />
                <span>Kredensial Global Google Drive</span>
              </h2>
              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                globalApiKey
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"
              }`}>
                <Key className="w-3 h-3" />
                <span>{globalApiKey ? "Kunci Aktif" : "Belum Dikonfigurasi"}</span>
              </span>
            </div>
            <p className="text-xs text-[#121212]/60 dark:text-zinc-400 mb-4 leading-relaxed">
              Kunci API ini digunakan otomatis untuk membaca foto dari folder Google Drive publik klien tanpa perlu memasukkan kunci berulang kali.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#C2410C]" />
                  <span>Google Drive API Key v3</span>
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all font-mono"
                />
                <p className="text-[11px] text-[#121212]/60 dark:text-zinc-400 mt-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Tersimpan di Firestore cloud, otomatis tersinkron di semua browser Anda.
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleSaveApiKey}
                  className="btn-mtioon-primary px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  {apiKeySaved ? <Check className="w-4 h-4" /> : null}
                  <span>{apiKeySaved ? "Kunci Tersimpan!" : "Simpan Kunci API"}</span>
                </button>

                <button
                  type="button"
                  disabled={isTestingDrive}
                  onClick={handleTestDrive}
                  className="btn-mtioon-secondary px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingDrive ? "animate-spin" : ""}`} />
                  <span>{isTestingDrive ? "Menguji..." : "Uji Kunci API GDrive"}</span>
                </button>
              </div>

              {apiKeyCloudWarn ? (
                <p className="text-[11px] font-medium p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Kunci tersimpan di browser ini saja. Cloud tidak terjangkau (cek status Firestore), jadi belum tersinkron ke perangkat lain.
                </p>
              ) : null}

              {driveTestResult && (
                <p className={`text-[11px] font-medium p-2.5 rounded-xl ${
                  driveTestResult.ok
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                }`}>
                  {driveTestResult.message}
                </p>
              )}
            </div>
          </div>

          {/* Cloud sync (Firestore) */}
          <div className="mtioon-card p-6">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2 className="text-base font-bold text-[#121212] dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-[#C2410C]" />
                <span>Database Utama (Google Firestore)</span>
              </h2>
              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                syncStatus === "live"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
                  : syncStatus === "connecting"
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60"
              }`}>
                <Activity className="w-3 h-3" />
                <span>{syncStatus === "live" ? "Live Realtime" : syncStatus === "connecting" ? "Menghubungkan..." : "Offline"}</span>
              </span>
            </div>
            <p className="text-xs text-[#121212]/60 dark:text-zinc-400 mb-4 leading-relaxed">
              Seluruh data sesi kurasi klien, kata sandi, kuota, catatan revisi, dan pilihan foto klien tersimpan di Firebase Firestore Project <strong>aryst-5e94c</strong> sebagai Single Source of Truth.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-semibold ${
                    syncStatus === "live"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
                      : syncStatus === "connecting"
                        ? "bg-[#FFF0EB] dark:bg-[#FF5A1F]/15 text-[#FF5A1F] border-[#FF5A1F]/20 dark:border-[#FF5A1F]/30"
                        : syncStatus === "error"
                          ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60"
                          : "bg-[#F4F1EA] dark:bg-white/[0.04] text-[#121212]/60 dark:text-zinc-400 border-black/[0.06] dark:border-white/10"
                  }`}
                  data-testid="sync-status"
                >
                  <Cloud className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {syncStatus === "live"
                      ? "Tersambung ke cloud Firestore (WebSocket Aktif)"
                      : syncStatus === "connecting"
                        ? "Menghubungkan ke cloud..."
                        : syncStatus === "error"
                          ? `Gagal: ${syncMessage || "koneksi error"}`
                          : "Nonaktif - pilihan hanya tersimpan di perangkat ini"}
                    {syncStatus !== "off" && syncSource === "env" ? " (konfigurasi build)" : ""}
                    {syncStatus !== "off" && syncSource === "manual" ? " (override manual)" : ""}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isTestingFirestore}
                  onClick={handleTestFirestore}
                  className="btn-mtioon-secondary px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingFirestore ? "animate-spin" : ""}`} />
                  <span>{isTestingFirestore ? "Menguji..." : "Uji Ping Firestore"}</span>
                </button>
              </div>

              {firestoreTestResult && (
                <p className={`text-[11px] font-medium p-2.5 rounded-xl ${
                  firestoreTestResult.ok
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                }`}>
                  {firestoreTestResult.message}
                </p>
              )}

              <div>
                <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#C2410C]" />
                  <span>Konfigurasi Web App Firestore (JSON)</span>
                </label>
                <textarea
                  rows={4}
                  value={fbInput}
                  onChange={(e) => setFbInput(e.target.value)}
                  placeholder={'{"apiKey": "AIza...", "authDomain": "...", "projectId": "..."}'}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-[20px] text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all resize-y"
                />
                <p className="text-[11px] text-[#121212]/60 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Sudah terhubung secara otomatis ke project <strong>aryst-5e94c</strong> melalui variabel lingkungan build.
                </p>
                {fbError ? (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1.5">{fbError}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveFirebase}
                  className="btn-mtioon-primary px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  {fbSaved ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{fbSaved ? "Tersimpan!" : "Simpan & Aktifkan"}</span>
                </button>
                {syncStatus !== "off" ? (
                  <button
                    onClick={handleClearFirebase}
                    className="btn-mtioon-secondary px-4 py-2 text-xs font-semibold transition-colors"
                  >
                    Putuskan
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Cloudflare R2 Media Storage */}
          <div className="mtioon-card p-6">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2 className="text-base font-bold text-[#121212] dark:text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#C2410C]" />
                <span>Penyimpanan Media &amp; Video Hero (Cloudflare R2)</span>
              </h2>
              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                r2Active
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
                  : "bg-black/[0.04] dark:bg-white/[0.06] text-[#71717A] dark:text-zinc-400 border-black/10 dark:border-white/10"
              }`}>
                <Server className="w-3 h-3" />
                <span>{r2Active ? "Bucket: aryst-media" : "Belum Diatur"}</span>
              </span>
            </div>
            <p className="text-xs text-[#121212]/60 dark:text-zinc-400 mb-4 leading-relaxed">
              File video hero MP4 dan gambar beresolusi penuh disimpan di bucket Cloudflare R2 (10GB penyimpanan gratis, biaya kirim data $0). URL publik video otomatis disimpan di Firestore.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#C2410C]" />
                  <span>Konfigurasi R2 (JSON)</span>
                </label>
                <textarea
                  rows={5}
                  value={r2Input}
                  onChange={(e) => setR2Input(e.target.value)}
                  placeholder={
                    '{"accountId": "...", "bucket": "...", "accessKeyId": "...", "secretAccessKey": "...", "publicBaseUrl": "https://pub-xxxx.r2.dev"}'
                  }
                  className="w-full px-3.5 py-2 text-xs font-mono bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-[20px] text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all resize-y"
                />
                <p className="text-[11px] text-[#121212]/60 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Bucket: <code className="font-mono text-xs">aryst-media</code> | Public URL: <code className="font-mono text-xs">https://pub-b7ff3f1f45a44414b5076939830eb283.r2.dev</code>
                </p>
                {r2Error ? (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1.5">{r2Error}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleSaveR2}
                  className="btn-mtioon-primary px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  {r2Saved ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{r2Saved ? "Tersimpan!" : "Simpan & Aktifkan"}</span>
                </button>

                <button
                  type="button"
                  disabled={isTestingR2}
                  onClick={handleTestR2}
                  className="btn-mtioon-secondary px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingR2 ? "animate-spin" : ""}`} />
                  <span>{isTestingR2 ? "Menguji..." : "Uji Akses Bucket R2"}</span>
                </button>

                {r2Active ? (
                  <button
                    onClick={handleClearR2}
                    className="btn-mtioon-secondary px-4 py-2 text-xs font-semibold transition-colors"
                  >
                    Lepas
                  </button>
                ) : null}
              </div>

              {r2TestResult && (
                <p className={`text-[11px] font-medium p-2.5 rounded-xl ${
                  r2TestResult.ok
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                }`}>
                  {r2TestResult.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GAS GUIDE */}
      {activeTab === "gas_guide" && (
        <div className="max-w-3xl mtioon-card p-6">
          <h2 className="text-base font-bold text-[#121212] dark:text-white mb-1 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#121212]/60 dark:text-zinc-400" />
            <span>Panduan Integrasi Google Sheets (Apps Script)</span>
          </h2>
          <p className="text-xs text-[#121212]/60 dark:text-zinc-400 mb-5 leading-relaxed">
            Terima pilihan foto klien langsung ke spreadsheet Google Sheets studio Anda secara otomatis dan gratis.
          </p>

          <div className="space-y-4">
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#121212]/80 dark:text-zinc-300">
              <li>Buat Google Spreadsheet baru di Google Drive Anda.</li>
              <li>Buka menu <b>Extensions &gt; Apps Script</b>.</li>
              <li>Salin dan tempel kode di bawah ini:</li>
            </ol>

            <div className="relative">
              <pre className="p-4 rounded-2xl bg-[#F4F1EA] dark:bg-[#1C1C22] border border-black/[0.06] dark:border-white/10 text-[11px] text-[#121212]/80 dark:text-zinc-200 overflow-x-auto max-h-60 leading-relaxed font-normal">
                {gasScriptCode}
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(gasScriptCode)}
                className="btn-mtioon-secondary absolute top-3 right-3 px-3 py-1.5 text-xs font-medium transition-colors"
              >
                Salin Kode
              </button>
            </div>

            <ol start={4} className="list-decimal list-inside space-y-1.5 text-xs text-[#121212]/80 dark:text-zinc-300">
              <li>Klik tombol <b>Deploy &gt; New deployment</b>.</li>
              <li>Pilih tipe <b>Web App</b>.</li>
              <li>Atur <b>Execute as: Me</b> dan <b>Who has access: Anyone</b>.</li>
              <li>
                Salin URL Web App yang dihasilkan dan tempelkan ke kolom{" "}
                <b>URL Webhook Spreadsheet</b> pada form sesi klien.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* CREATE / EDIT SESSION MODAL */}
      {isModalOpen && (
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center px-4 overflow-y-auto animate-fade-in"
        >
          <div className="relative w-full max-w-3xl my-auto bg-white dark:bg-[#141417] border border-black/[0.08] dark:border-white/[0.1] rounded-[28px] p-6 shadow-2xl">
            <div className="sticky top-0 z-10 -mx-6 -mt-6 px-6 pt-5 pb-3 mb-3 bg-white dark:bg-[#141417] border-b border-black/[0.06] dark:border-white/[0.08] rounded-t-[28px] flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#121212] dark:text-white">
                  {editingProject ? "Edit Sesi Klien" : "Buat Sesi Galeri Klien Baru"}
                </h3>
                <p className="text-xs text-[#121212]/60 dark:text-zinc-400 mt-0.5">
                  Atur mode sesi, sumber foto, kuota, dan akses galeri klien.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full bg-[#F4F1EA] hover:bg-[#EDE9E0] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-[#121212]/60 hover:text-[#121212] dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProjectForm} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>Nama Klien / Pasangan</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    placeholder="Contoh: Rian & Amanda"
                    className="w-full px-3 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>ID / Kode Project</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    placeholder="WED-2026-RIAN"
                    className="w-full px-3 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all"
                  />
                </div>
              </div>

              {/* Mode Sesi: perorangan atau grup */}
              <div>
                <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#C2410C]" />
                  <span>Mode Sesi</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormSessionMode("individual")}
                    className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                      formSessionMode === "individual"
                        ? "bg-[#FFF0EB] border-[#FF5A1F]/40 text-[#121212] dark:bg-[#FF5A1F]/15 dark:border-[#FF5A1F]/40 dark:text-white"
                        : "bg-[#F5F2EB] dark:bg-white/[0.04] border-black/10 dark:border-white/10 text-[#121212]/60 dark:text-zinc-400 hover:border-black/20 dark:hover:border-white/20"
                    }`}
                  >
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Perorangan
                    </span>
                    <span className="text-[11px] text-[#121212]/60 dark:text-zinc-400 block mt-0.5">
                      Satu penerima, kuota pilihannya sendiri
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormSessionMode("group")}
                    className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                      formSessionMode === "group"
                        ? "bg-[#FFF0EB] border-[#FF5A1F]/40 text-[#121212] dark:bg-[#FF5A1F]/15 dark:border-[#FF5A1F]/40 dark:text-white"
                        : "bg-[#F5F2EB] dark:bg-white/[0.04] border-black/10 dark:border-white/10 text-[#121212]/60 dark:text-zinc-400 hover:border-black/20 dark:hover:border-white/20"
                    }`}
                  >
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Grup
                    </span>
                    <span className="text-[11px] text-[#121212]/60 dark:text-zinc-400 block mt-0.5">
                      Beberapa anggota, satu daftar bersama
                    </span>
                  </button>
                </div>
                {formSessionMode === "group" ? (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={formMembers}
                      onChange={(e) => setFormMembers(e.target.value)}
                      placeholder="Nama anggota, pisahkan koma: Rina, Budi, Citra"
                      className="w-full px-3 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all"
                    />
                    <p className="text-[11px] text-[#121212]/60 dark:text-zinc-400 mt-1">
                      Kuota dan daftar pilihan dipakai bersama oleh seluruh anggota sesi ini.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#121212]/60 dark:text-zinc-400 mt-1.5">
                    Sesi untuk satu penerima dengan kuota pilihannya sendiri.
                  </p>
                )}
              </div>

              {/* Sumber Foto: tautan folder Drive, tervalidasi sebelum disimpan */}
              <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#F4F1EA] dark:bg-[#1C1C22]/80 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-[#121212]/80 dark:text-zinc-300 flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>Sumber Foto (Google Drive)</span>
                  </label>
                  {formFolderId.trim() !== "" && Boolean(globalApiKey) && (
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      {editingProject && photoCounts[editingProject.id]
                        ? `${photoCounts[editingProject.id]} foto siap`
                        : "Terhubung"}
                    </span>
                  )}
                </div>

                {!formFolderId.trim() ? (
                  <p className="text-[11px] text-[#C2410C] dark:text-[#FF5A1F] bg-[#FFF0EB] dark:bg-[#FF5A1F]/15 border border-[#FF5A1F]/25 dark:border-[#FF5A1F]/30 rounded-md px-2.5 py-2">
                    Belum ada foto. Tempel tautan folder Google Drive di bawah agar galeri
                    klien terisi.
                  </p>
                ) : !globalApiKey ? (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-md px-2.5 py-2 flex items-center justify-between gap-2">
                    <span>Kunci API Google Drive belum diisi.</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("settings")}
                      className="shrink-0 underline font-semibold hover:text-rose-100"
                    >
                      Buka Pengaturan
                    </button>
                  </p>
                ) : null}

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    ref={folderInputRef}
                    type="text"
                    value={formFolderId}
                    onChange={(e) => setFormFolderId(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="flex-1 px-3 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleProbeFolder}
                    disabled={isProbing}
                    className="btn-mtioon-secondary px-3 py-1 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? "animate-spin" : ""}`} />
                    <span>{isProbing ? "Memeriksa..." : "Periksa Folder"}</span>
                  </button>
                </div>

                {probeResult && (
                  <p
                    className={`text-[11px] flex items-start gap-1.5 ${
                      probeResult.ok ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    <span>{probeResult.message}</span>
                  </p>
                )}

                <p className="text-[11px] text-[#121212]/60 dark:text-zinc-400">
                  Izin folder harus{" "}
                  <span className="text-[#121212]/80 dark:text-zinc-300 font-medium">Anyone with the link can view</span>. Bisa
                  ditempel tautan maupun ID folder.
                </p>
              </div>

              {/* Tipe Sesi & Tanggal Pelaksanaan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>Tipe / Kategori Sesi Foto</span>
                  </label>
                  <select
                    value={formSessionType}
                    onChange={(e) => setFormSessionType(e.target.value)}
                    className="w-full px-3 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all"
                  >
                    <option value="Pernikahan">Pernikahan (Wedding Day)</option>
                    <option value="Prewedding">Prewedding</option>
                    <option value="Maternity">Maternity & Newborn</option>
                    <option value="Lamaran">Lamaran & Engagement</option>
                    <option value="Keluarga">Keluarga (Family Portrait)</option>
                    <option value="Wisuda">Wisuda / Graduation</option>
                    <option value="Komersial">Komersial / Editorial</option>
                    <option value="Lainnya">Sesi Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>Tanggal Sesi (Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={formSessionDate}
                    onChange={(e) => setFormSessionDate(e.target.value)}
                    placeholder="Contoh: 14 Maret 2026"
                    className="w-full px-3 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all"
                  />
                </div>
              </div>

              {/* Batas Waktu Pilihan Foto (Deadline) */}
              <div>
                <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-[#C2410C]" />
                  <span>Batas Waktu Pilihan Foto</span>
                </label>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                  <input
                    type="datetime-local"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="flex-1 min-w-[190px] px-3 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[3, 7, 14].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setFormDeadline(defaultDeadlineInput(days))}
                        className="px-2.5 py-1.5 rounded-full bg-[#F5F2EB] hover:bg-[#EDE9E0] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-black/10 dark:border-white/10 text-[#121212]/80 dark:text-zinc-300 text-[11px] font-semibold transition-colors"
                      >
                        +{days} hari
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFormDeadline("")}
                      className="px-2.5 py-1.5 rounded-full bg-white hover:bg-black/[0.03] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-black/10 dark:border-white/10 text-[#121212]/60 dark:text-zinc-400 text-[11px] font-medium transition-colors"
                    >
                      Tanpa batas
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-[#121212]/60 dark:text-zinc-400 mt-1">
                  Setelah lewat waktu, sesi terkunci otomatis untuk klien (pilihan tetap
                  tersimpan). Perpanjang tanggal untuk membuka kembali.
                </p>
              </div>

              {/* Judul Sesi & Tempat / Lokasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1">
                    Tema / Judul Sesi
                  </label>
                  <input
                    type="text"
                    value={formSessionTitle}
                    onChange={(e) => setFormSessionTitle(e.target.value)}
                    placeholder="Contoh: Prewedding Alam & Sunset"
                    className="w-full px-3 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>Tempat / Lokasi Utama</span>
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Contoh: Kintamani & Pantai Melasti, Bali"
                    className="w-full px-3 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all"
                  />
                </div>
              </div>

              {/* Tujuan & Esensi Sesi Foto */}
              <div>
                <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#C2410C]" />
                  <span>Tujuan Foto / Esensi Sesi</span>
                </label>
                <input
                  type="text"
                  value={formSessionPurpose}
                  onChange={(e) => setFormSessionPurpose(e.target.value)}
                  placeholder="Contoh: Foto Cetak Kanvas Resepsi & Video Undangan Digital"
                  className="w-full px-3 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all"
                />
                <p className="text-[11px] text-[#121212]/60 dark:text-zinc-400 mt-1">
                  Menjelaskan esensi foto bagi klien (misal: album cetak, kanvas dekorasi, dokumentasi sakral).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>Kuota Maksimal Pilihan</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={formQuota}
                    onChange={(e) => setFormQuota(Number(e.target.value))}
                    className="w-full px-3 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#C2410C]" />
                      <span>Kata Sandi Galeri Klien</span>
                    </span>
                    {formPassword.trim() && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        ✓ Sandi Terpasang
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showFormPassword ? "text" : "password"}
                      value={formPassword}
                      onChange={(e) => {
                        setFormPassword(e.target.value);
                        if (e.target.value.trim()) setFormClearPassword(false);
                      }}
                      placeholder={
                        editingProject && (editingProject.password || editingProject.passwordHash)
                          ? "Biarkan kosong untuk mempertahankan sandi lama"
                          : "Kosongkan jika publik tanpa sandi"
                      }
                      className="w-full pl-3.5 pr-10 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-black/40 dark:text-zinc-400 hover:text-[#121212] dark:hover:text-white transition-colors"
                      title={showFormPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                    >
                      {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#121212]/60 dark:text-zinc-400 mt-1">
                    Tersimpan di <strong>Firestore Cloud</strong>. Klien wajib memasukkan sandi ini saat membuka galeri foto.
                  </p>
                  {editingProject &&
                    !editingProject.password &&
                    Boolean(editingProject.passwordHash) && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                        Sandi lama tersimpan ter-hash di cloud. Masukkan sandi baru jika ingin mengubah.
                      </p>
                    )}
                  {editingProject &&
                    (editingProject.password || editingProject.passwordHash) &&
                    !formPassword.trim() && (
                      <button
                        type="button"
                        onClick={() => setFormClearPassword((prev) => !prev)}
                        className={`mt-1.5 text-[11px] font-semibold transition-colors ${
                          formClearPassword ? "text-rose-600 dark:text-rose-400" : "text-[#121212]/60 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                        }`}
                      >
                        {formClearPassword
                          ? "Sandi akan dihapus saat disimpan. Klik untuk batal."
                          : "Hapus sandi galeri ini (Jadikan Publik)"}
                      </button>
                    )}
                </div>
              </div>

              {/* Bab Acara & Lokasi */}
              <div>
                <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C2410C]" />
                  <span>Bab Acara & Lokasi Foto (Pisahkan koma)</span>
                </label>
                <input
                  type="text"
                  value={formSections}
                  onChange={(e) => setFormSections(e.target.value)}
                  placeholder="Contoh: Persiapan (Hotel), Akad Nikah (Masjid), Resepsi (Ballroom)"
                  className="w-full px-3 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all"
                />
                <p className="text-[11px] text-[#121212]/60 dark:text-zinc-400 mt-1">
                  Format: <span className="text-[#121212]/70 dark:text-zinc-300 font-mono">Nama Bab (Nama Lokasi)</span>, pisahkan dengan koma.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>WhatsApp Klien/Fotografer</span>
                  </label>
                  <input
                    type="tel"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1">
                    Catatan Sesi (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Paket Album Premium 2026"
                    className="w-full px-3 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all"
                  />
                </div>
              </div>

              {/* Webhook Spreadsheet */}
              <div>
                <label className="block text-[13px] font-semibold text-[#121212]/80 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-[#C2410C]" />
                  <span>URL Webhook Spreadsheet (Opsional)</span>
                </label>
                <input
                  type="url"
                  value={formWebhookUrl}
                  onChange={(e) => setFormWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-1 text-sm font-medium bg-[#F5F2EB] dark:bg-[#202026] border border-black/10 dark:border-white/10 rounded-full text-[#121212] dark:text-[#F4F4F6] placeholder-black/35 dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white dark:focus:bg-[#1A1A20] transition-all"
                />
                <p className="text-[11px] text-[#121212]/60 dark:text-zinc-400 mt-1">
                  Diambil dari tab <span className="text-[#121212]/80 dark:text-zinc-300 font-medium">Integrasi</span>. Pilihan
                  klien akan terkirim ke Google Sheets studio Anda.
                </p>
              </div>

              <div className="sticky bottom-0 z-10 -mx-6 px-6 pb-5 pt-3 bg-white dark:bg-[#141417] border-t border-black/[0.06] dark:border-white/[0.08] rounded-b-[28px] mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-mtioon-secondary px-3.5 py-2 text-xs font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-mtioon-primary px-4 py-2 text-xs font-semibold transition-colors"
                >
                  {editingProject ? "Simpan Perubahan" : "Buat Sesi Klien"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT CLIENT SELECTION MODAL */}
      {inspectingProject && (
        <ClientSelectionInspectorModal
          project={inspectingProject}
          isOpen={Boolean(inspectingProject)}
          onClose={() => setInspectingProject(null)}
        />
      )}
      </div>
    </div>
  );
};
