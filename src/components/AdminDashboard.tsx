import React, { useState, useMemo } from "react";
import { useProofingStore } from "@/lib/storage";
import { ClientProject } from "@/types";
import { generateClientShareUrl } from "@/lib/sync";
import { extractFolderId } from "@/lib/googleDrive";
import { formatDate } from "@/lib/utils";
import { ClientSelectionInspectorModal } from "./ClientSelectionInspectorModal";
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
} from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const {
    clientProjects,
    activeProjectId,
    globalApiKey,
    adminPin,
    isP2PConnected,
    switchProject,
    saveProject,
    deleteProject,
    setGlobalApiKey,
    setAdminPin,
    logoutAdmin,
    setViewMode,
  } = useProofingStore();

  const [activeTab, setActiveTab] = useState<"projects" | "settings" | "gas_guide">("projects");
  const [viewLayout, setViewLayout] = useState<"by_client" | "table" | "grid">("by_client");
  const [searchQuery, setSearchQuery] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState(globalApiKey);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [newPinInput, setNewPinInput] = useState(adminPin);
  const [pinSaved, setPinSaved] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
  const [formFolderId, setFormFolderId] = useState("");
  const [formQuota, setFormQuota] = useState(20);
  const [formPassword, setFormPassword] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formSections, setFormSections] = useState("");

  const filteredProjects = clientProjects.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      p.clientName.toLowerCase().includes(query) ||
      p.projectId.toLowerCase().includes(query) ||
      (p.sessionType && p.sessionType.toLowerCase().includes(query)) ||
      (p.location && p.location.toLowerCase().includes(query)) ||
      (p.sessionPurpose && p.sessionPurpose.toLowerCase().includes(query)) ||
      (p.notes && p.notes.toLowerCase().includes(query))
    );
  });

  // Group projects by client name
  const groupedClients = useMemo(() => {
    const map = new Map<string, { clientName: string; clientContact: string; projects: ClientProject[] }>();

    filteredProjects.forEach((proj) => {
      const key = proj.clientName.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          clientName: proj.clientName.trim(),
          clientContact: proj.clientContact || "",
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
  }, [filteredProjects]);

  const openCreateModal = () => {
    setEditingProject(null);
    setFormClientName("");
    setFormProjectId(`WED-${Date.now().toString().slice(-4)}`);
    setFormSessionType("Pernikahan");
    setFormSessionTitle("The Holy Matrimony & Grand Reception");
    setFormLocation("Hotel Mulia Senayan, Jakarta");
    setFormSessionPurpose("Dokumentasi Sakral Akad Nikah & Resepsi");
    setFormSessionDate("");
    setFormFolderId("");
    setFormQuota(20);
    setFormPassword("");
    setFormContact("");
    setFormNotes("");
    setFormSections("Persiapan (Suite Hotel), Akad Nikah (Masjid Raya), Resepsi (Grand Ballroom)");
    setIsModalOpen(true);
  };

  const openCreateModalForClient = (clientName: string, clientContact?: string) => {
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
    setFormPassword("");
    setFormContact(clientContact || "");
    setFormNotes("");
    setFormSections("");
    setIsModalOpen(true);
  };

  const openEditModal = (proj: ClientProject) => {
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
      id: editingProject ? editingProject.id : `proj-${Date.now()}`,
      clientName: formClientName.trim(),
      projectId: formProjectId.trim() || `PRJ-${Date.now().toString().slice(-4)}`,
      sessionType: formSessionType.trim() || "Pernikahan",
      sessionTitle: formSessionTitle.trim() || undefined,
      location: formLocation.trim() || undefined,
      sessionPurpose: formSessionPurpose.trim() || undefined,
      sessionDate: formSessionDate.trim() || undefined,
      folderId: cleanFolder,
      maxQuota: Number(formQuota) || 20,
      password: formPassword.trim() || undefined,
      clientContact: formContact.trim(),
      notes: formNotes.trim(),
      sections: parsedSections.length > 0 ? parsedSections : undefined,
      createdAt: editingProject ? editingProject.createdAt : Date.now(),
    };

    await saveProject(newProject);
    setIsModalOpen(false);
  };

  const handleCopyClientLink = async (proj: ClientProject) => {
    const link = generateClientShareUrl(proj);
    await navigator.clipboard.writeText(link);
    setCopiedId(proj.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePreviewAsClient = async (projId: string) => {
    await switchProject(projId);
    setViewMode("client");
  };

  const handleSaveApiKey = async () => {
    await setGlobalApiKey(apiKeyInput.trim());
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  };

  const handleSavePin = async () => {
    if (!newPinInput.trim()) return;
    await setAdminPin(newPinInput.trim());
    setPinSaved(true);
    setTimeout(() => setPinSaved(false), 2000);
  };

  const gasScriptCode = `// Google Apps Script (Code.gs)
// Integrasi otomatis Aryst Lens Studio dengan Google Sheets
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="font-semibold text-amber-400">
              Studio Admin
            </span>
            <span className="text-zinc-600">•</span>
            {isP2PConnected ? (
              <span className="text-emerald-400 flex items-center gap-1.5 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Sinkron Realtime
              </span>
            ) : (
              <span className="text-zinc-500 flex items-center gap-1.5 text-[11px]">
                <Radio className="w-3 h-3 text-zinc-500" />
                Siap Menerima Pilihan
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Dashboard Fotografer
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
            Kelola sesi kurasi klien, pantau pilihan foto secara realtime, dan atur sandi galeri.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode("client")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition-colors"
          >
            <Eye className="w-4 h-4 text-amber-400" />
            <span>Lihat Galeri Klien</span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
          </button>

          <button
            id="admin-add-session-btn"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Sesi Klien</span>
          </button>

          <button
            onClick={logoutAdmin}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors"
            title="Kunci & Logout Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Studio Overview Metrics (Real Data Only, No Gradients) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs font-medium text-zinc-400">Total Sesi Klien</p>
          <p className="text-2xl font-bold text-white mt-1">{clientProjects.length}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs font-medium text-zinc-400">Sesi Dilindungi Sandi</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            {clientProjects.filter((p) => Boolean(p.password || p.passwordHash)).length}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs font-medium text-zinc-400">Sesi Aktif di Preview</p>
          <p className="text-sm font-semibold text-zinc-200 mt-2 truncate">
            {clientProjects.find((p) => p.id === activeProjectId)?.clientName || "Belum dipilih"}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 mb-6 p-1 bg-zinc-900 rounded-lg border border-zinc-800 w-fit text-xs font-medium">
        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors ${
            activeTab === "projects"
              ? "bg-zinc-800 text-white font-semibold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span>Sesi Klien ({clientProjects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors ${
            activeTab === "settings"
              ? "bg-zinc-800 text-white font-semibold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-zinc-400" />
          <span>Pengaturan Studio & PIN</span>
        </button>

        <button
          onClick={() => setActiveTab("gas_guide")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors ${
            activeTab === "gas_guide"
              ? "bg-zinc-800 text-white font-semibold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-zinc-400" />
          <span>Integrasi Google Sheets</span>
        </button>
      </div>

      {/* TAB 1: PROJECTS LIST */}
      {activeTab === "projects" && (
        <div className="space-y-4">
          {/* Search Bar & View Mode Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari sesi berdasarkan nama klien atau kode project..."
                className="w-full pl-9 pr-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 self-end sm:self-auto">
              <button
                onClick={() => setViewLayout("by_client")}
                className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${
                  viewLayout === "by_client"
                    ? "bg-zinc-800 text-white font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="Kelompokkan Sesi per Klien"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Per Klien</span>
              </button>

              <button
                onClick={() => setViewLayout("table")}
                className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${
                  viewLayout === "table"
                    ? "bg-zinc-800 text-white font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="Tampilan Tabel Pro"
              >
                <LayoutList className="w-4 h-4" />
                <span className="hidden sm:inline">Tabel Sesi</span>
              </button>

              <button
                onClick={() => setViewLayout("grid")}
                className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${
                  viewLayout === "grid"
                    ? "bg-zinc-800 text-white font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="Tampilan Kartu"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Kartu</span>
              </button>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
              <p className="font-semibold text-zinc-200 mb-1">Tidak Ada Sesi Ditemukan</p>
              <p className="text-zinc-500 max-w-sm mx-auto">
                {searchQuery
                  ? "Coba ubah kata kunci pencarian Anda."
                  : "Belum ada sesi klien yang dibuat. Klik tombol 'Tambah Sesi Klien' di atas."}
              </p>
            </div>
          ) : viewLayout === "by_client" ? (
            /* GROUPED BY CLIENT: Multi-session relationship view */
            <div className="space-y-6">
              {groupedClients.map((group) => {
                return (
                  <div
                    key={group.clientName}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/90 overflow-hidden shadow-sm"
                  >
                    {/* Client Group Header */}
                    <div className="p-4 sm:p-5 bg-zinc-950/70 border-b border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center font-bold text-amber-400 text-base shrink-0">
                          {group.clientName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-white tracking-tight">
                              {group.clientName}
                            </h3>
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-amber-400 border border-zinc-700">
                              {group.projects.length} Sesi Foto
                            </span>
                          </div>
                          {group.clientContact && (
                            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-zinc-500" />
                              <span>{group.clientContact}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => openCreateModalForClient(group.clientName, group.clientContact)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-400 hover:text-amber-300 text-xs font-semibold transition-colors"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Tambah Sesi untuk Klien Ini</span>
                      </button>
                    </div>

                    {/* Sessions List within Client */}
                    <div className="divide-y divide-zinc-800/80">
                      {group.projects.map((proj) => {
                        const isActive = proj.id === activeProjectId;
                        const hasPassword = Boolean(proj.password || proj.passwordHash);
                        const isCopied = copiedId === proj.id;

                        return (
                          <div
                            key={proj.id}
                            className={`p-4 sm:p-5 transition-colors hover:bg-zinc-800/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                              isActive ? "bg-amber-500/5" : ""
                            }`}
                          >
                            <div className="space-y-2 flex-1 min-w-0">
                              {/* Session Badges & Title */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                                  {proj.sessionType || "Sesi Foto"}
                                </span>
                                <h4 className="text-sm sm:text-base font-semibold text-white truncate">
                                  {proj.sessionTitle || proj.projectId}
                                </h4>
                                <span className="text-[11px] font-mono text-zinc-500">
                                  ({proj.projectId})
                                </span>
                                {isActive && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                                    Aktif di Preview
                                  </span>
                                )}
                              </div>

                              {/* Venue & Purpose (Esensi Sesi) */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                                {proj.location && (
                                  <div className="flex items-center gap-1.5 text-zinc-300">
                                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span className="text-zinc-500 font-medium">Tempat:</span>
                                    <span className="font-medium truncate">{proj.location}</span>
                                  </div>
                                )}
                                {(proj.sessionPurpose || proj.notes) && (
                                  <div className="flex items-center gap-1.5 text-zinc-300">
                                    <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span className="text-zinc-500 font-medium">Tujuan / Esensi:</span>
                                    <span className="font-medium truncate">{proj.sessionPurpose || proj.notes}</span>
                                  </div>
                                )}
                              </div>

                              {/* Meta info tags */}
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 pt-1">
                                <span className="flex items-center gap-1">
                                  <Camera className="w-3 h-3 text-zinc-500" />
                                  <span>Kuota: <strong className="text-zinc-200">{proj.maxQuota} foto</strong></span>
                                </span>
                                {proj.sessionDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-zinc-500" />
                                    <span>{proj.sessionDate}</span>
                                  </span>
                                )}
                                <span>•</span>
                                {hasPassword ? (
                                  <span className="inline-flex items-center gap-1 text-amber-400">
                                    <Lock className="w-3 h-3" />
                                    <span>Dilindungi Sandi</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-zinc-500">
                                    <Unlock className="w-3 h-3" />
                                    <span>Publik</span>
                                  </span>
                                )}
                                {proj.sections && proj.sections.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-amber-400">
                                      {proj.sections.length} Bab Lokasi
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Actions for this session */}
                            <div className="flex items-center gap-1.5 shrink-0 self-start lg:self-center">
                              <button
                                onClick={() => setInspectingProject(proj)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 font-semibold text-xs transition-colors flex items-center gap-1.5"
                                title="Lihat foto yang dipilih klien"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Pilihan</span>
                              </button>

                              <button
                                onClick={() => handlePreviewAsClient(proj.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors flex items-center gap-1.5"
                                title="Buka galeri klien untuk sesi ini"
                              >
                                <Eye className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Buka Galeri</span>
                              </button>

                              <button
                                onClick={() => handleCopyClientLink(proj)}
                                className={`p-2 rounded-lg border text-xs transition-colors ${
                                  isCopied
                                    ? "bg-emerald-500 text-zinc-950 border-emerald-400 font-bold"
                                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                                }`}
                                title="Salin tautan galeri klien"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                onClick={() => openEditModal(proj)}
                                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
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
                                  className="p-2 rounded-lg bg-zinc-800 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-zinc-700 transition-colors"
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
            <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Klien & Tipe Sesi</th>
                    <th className="py-3 px-4">Tempat & Tujuan Sesi</th>
                    <th className="py-3 px-4">Sumber Foto</th>
                    <th className="py-3 px-4">Kuota</th>
                    <th className="py-3 px-4">Akses Sandi</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {filteredProjects.map((proj) => {
                    const isActive = proj.id === activeProjectId;
                    const hasPassword = Boolean(proj.password || proj.passwordHash);
                    const isCopied = copiedId === proj.id;

                    return (
                      <tr
                        key={proj.id}
                        className={`hover:bg-zinc-800/30 transition-colors ${
                          isActive ? "bg-amber-500/5" : ""
                        }`}
                      >
                        {/* Klien & Tipe Sesi */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {proj.clientName}
                            </span>
                            {proj.sessionType && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                                {proj.sessionType}
                              </span>
                            )}
                            {isActive && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                                Aktif
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-zinc-300 font-medium text-xs">
                              {proj.sessionTitle || proj.projectId}
                            </span>
                            <span className="text-zinc-500 font-mono text-[11px]">
                              ({proj.projectId})
                            </span>
                          </div>
                        </td>

                        {/* Tempat & Tujuan Sesi */}
                        <td className="py-3 px-4 max-w-xs">
                          {proj.location && (
                            <div className="flex items-center gap-1 text-zinc-300 truncate">
                              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate">{proj.location}</span>
                            </div>
                          )}
                          {(proj.sessionPurpose || proj.notes) && (
                            <div className="flex items-center gap-1 text-zinc-400 truncate mt-0.5 text-[11px]">
                              <Target className="w-3 h-3 text-zinc-500 shrink-0" />
                              <span className="truncate">{proj.sessionPurpose || proj.notes}</span>
                            </div>
                          )}
                        </td>

                        {/* Sumber Foto */}
                        <td className="py-3 px-4">
                          {proj.folderId ? (
                            <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                              <FolderGit2 className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[140px]">{proj.folderId}</span>
                            </span>
                          ) : (
                            <span className="text-zinc-400 flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-zinc-500" />
                              <span>Sampel Demo</span>
                            </span>
                          )}
                        </td>

                        {/* Kuota */}
                        <td className="py-3 px-4 font-semibold text-zinc-200">
                          {proj.maxQuota} foto
                        </td>

                        {/* Proteksi Sandi */}
                        <td className="py-3 px-4">
                          {hasPassword ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-amber-400/10 text-amber-400 border border-amber-400/20 font-medium">
                              <Lock className="w-3 h-3" />
                              <span>Dilindungi</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-zinc-800 text-zinc-400 font-medium">
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
                              className="px-2.5 py-1.5 rounded-md bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 font-semibold text-xs transition-colors flex items-center gap-1"
                              title="Lihat foto yang dipilih klien"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Pilihan</span>
                            </button>

                            <button
                              onClick={() => handleCopyClientLink(proj)}
                              className={`p-1.5 rounded-md border text-xs transition-colors ${
                                isCopied
                                  ? "bg-emerald-500 text-zinc-950 border-emerald-400"
                                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                              }`}
                              title="Salin tautan galeri klien"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => handlePreviewAsClient(proj.id)}
                              className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
                              title="Buka galeri klien ini"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => openEditModal(proj)}
                              className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
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
                                className="p-1.5 rounded-md bg-zinc-800 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-zinc-700 transition-colors"
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
                const hasPassword = Boolean(proj.password || proj.passwordHash);
                const isCopied = copiedId === proj.id;

                return (
                  <div
                    key={proj.id}
                    className={`rounded-lg p-5 border transition-colors flex flex-col justify-between ${
                      isActive
                        ? "bg-zinc-900 border-amber-400"
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-[11px] px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                          {proj.sessionType || "Sesi Foto"}
                        </span>

                        {hasPassword ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 font-medium">
                            <Lock className="w-3 h-3" />
                            <span>Dilindungi Sandi</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium">
                            <Unlock className="w-3 h-3" />
                            <span>Publik</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {proj.clientName}
                      </h3>
                      {proj.sessionTitle && (
                        <p className="text-xs font-semibold text-zinc-300 mt-0.5">
                          {proj.sessionTitle}
                        </p>
                      )}

                      <div className="mt-3 space-y-1.5 text-xs">
                        {proj.location && (
                          <div className="flex items-center gap-1.5 text-zinc-300">
                            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="text-zinc-500">Tempat:</span>
                            <span className="truncate font-medium">{proj.location}</span>
                          </div>
                        )}
                        {(proj.sessionPurpose || proj.notes) && (
                          <div className="flex items-center gap-1.5 text-zinc-300">
                            <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="text-zinc-500">Tujuan:</span>
                            <span className="truncate font-medium">{proj.sessionPurpose || proj.notes}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                        <div>
                          <span>Kuota: </span>
                          <strong className="text-zinc-200">{proj.maxQuota} foto</strong>
                        </div>
                        <span className="text-[11px] text-zinc-500">
                          {proj.sessionDate || formatDate(proj.createdAt)}
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] flex items-center gap-1.5 text-zinc-500">
                        {proj.folderId ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <FolderGit2 className="w-3 h-3" />
                            <span className="truncate max-w-[180px]">Folder: {proj.folderId}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-400 flex items-center gap-1">
                            <Camera className="w-3 h-3 text-zinc-500" />
                            <span>Foto Sampel Demo</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-zinc-800 space-y-2">
                      <button
                        onClick={() => setInspectingProject(proj)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 font-semibold text-xs transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 text-amber-400" />
                        <span>Lihat Seleksi Klien</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyClientLink(proj)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                            isCopied
                              ? "bg-emerald-500 text-zinc-950 border-emerald-400"
                              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                          }`}
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                          <span>{isCopied ? "Tersalin!" : "Salin Link"}</span>
                        </button>

                        <button
                          onClick={() => handlePreviewAsClient(proj.id)}
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
                          title="Buka galeri klien ini"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => openEditModal(proj)}
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
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
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-zinc-700 transition-colors"
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

      {/* TAB 2: STUDIO SETTINGS */}
      {activeTab === "settings" && (
        <div className="max-w-2xl space-y-5">
          {/* Admin Master PIN */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>PIN Master Admin Studio</span>
            </h2>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              PIN ini melindungi akses ke Dashboard Admin agar klien tidak dapat membuka konfigurasi studio Anda.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>PIN Master Saat Ini</span>
                </label>
                <input
                  type="text"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="Contoh: studio2026"
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <button
                onClick={handleSavePin}
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                {pinSaved ? <Check className="w-4 h-4" /> : null}
                <span>{pinSaved ? "PIN Tersimpan!" : "Perbarui PIN Master"}</span>
              </button>
            </div>
          </div>

          {/* Global Google Drive API Key */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Kredensial Global Google Drive</span>
            </h2>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Kunci API ini digunakan secara otomatis untuk folder Google Drive publik klien tanpa perlu memasukkan kunci berulang kali.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Google Drive API Key v3</span>
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Disimpan dengan aman di perangkat lokal Anda.
                  </span>
                </p>
              </div>

              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                {apiKeySaved ? <Check className="w-4 h-4" /> : null}
                <span>{apiKeySaved ? "Tersimpan!" : "Simpan Kunci API"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GAS GUIDE */}
      {activeTab === "gas_guide" && (
        <div className="max-w-3xl bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-zinc-400" />
            <span>Panduan Integrasi Google Sheets (Apps Script)</span>
          </h2>
          <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
            Terima pilihan foto klien langsung ke spreadsheet Google Sheets studio Anda secara otomatis dan gratis.
          </p>

          <div className="space-y-4">
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-zinc-300">
              <li>Buat Google Spreadsheet baru di Google Drive Anda.</li>
              <li>Buka menu <b>Extensions &gt; Apps Script</b>.</li>
              <li>Salin dan tempel kode di bawah ini:</li>
            </ol>

            <div className="relative">
              <pre className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 overflow-x-auto max-h-60 leading-relaxed font-normal">
                {gasScriptCode}
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(gasScriptCode)}
                className="absolute top-3 right-3 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors"
              >
                Salin Kode
              </button>
            </div>

            <ol start={4} className="list-decimal list-inside space-y-1.5 text-xs text-zinc-300">
              <li>Klik tombol <b>Deploy &gt; New deployment</b>.</li>
              <li>Pilih tipe <b>Web App</b>.</li>
              <li>Atur <b>Execute as: Me</b> dan <b>Who has access: Anyone</b>.</li>
              <li>Salin URL Web App yang dihasilkan dan tempelkan ke kolom Webhook di sesi klien Anda.</li>
            </ol>
          </div>
        </div>
      )}

      {/* CREATE / EDIT SESSION MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
        >
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingProject ? "Edit Sesi Klien" : "Buat Sesi Galeri Klien Baru"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Atur informasi klien, kuota foto, dan kata sandi opsional.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProjectForm} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nama Klien / Pasangan</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    placeholder="Contoh: Rian & Amanda"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-amber-400" />
                    <span>ID / Kode Project</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    placeholder="WED-2026-RIAN"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Tipe Sesi & Tanggal Pelaksanaan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tipe / Kategori Sesi Foto</span>
                  </label>
                  <select
                    value={formSessionType}
                    onChange={(e) => setFormSessionType(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
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
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tanggal Sesi (Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={formSessionDate}
                    onChange={(e) => setFormSessionDate(e.target.value)}
                    placeholder="Contoh: 14 Maret 2026"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Judul Sesi & Tempat / Lokasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Tema / Judul Sesi
                  </label>
                  <input
                    type="text"
                    value={formSessionTitle}
                    onChange={(e) => setFormSessionTitle(e.target.value)}
                    placeholder="Contoh: Prewedding Alam & Sunset"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tempat / Lokasi Utama</span>
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Contoh: Kintamani & Pantai Melasti, Bali"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Tujuan & Esensi Sesi Foto */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tujuan Foto / Esensi Sesi</span>
                </label>
                <input
                  type="text"
                  value={formSessionPurpose}
                  onChange={(e) => setFormSessionPurpose(e.target.value)}
                  placeholder="Contoh: Foto Cetak Kanvas Resepsi & Video Undangan Digital"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Menjelaskan esensi foto bagi klien (misal: album cetak, kanvas dekorasi, dokumentasi sakral).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tautan / ID Folder Google Drive</span>
                </label>
                <input
                  type="text"
                  value={formFolderId}
                  onChange={(e) => setFormFolderId(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/... (Kosongkan untuk demo)"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Folder harus diatur izin: <span className="text-zinc-400">"Anyone with the link can view"</span>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kuota Maksimal Pilihan</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={formQuota}
                    onChange={(e) => setFormQuota(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kata Sandi Galeri (Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Kosongkan jika publik"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Bab Acara & Lokasi */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bab Acara & Lokasi Foto (Pisahkan koma)</span>
                </label>
                <input
                  type="text"
                  value={formSections}
                  onChange={(e) => setFormSections(e.target.value)}
                  placeholder="Contoh: Persiapan (Hotel), Akad Nikah (Masjid), Resepsi (Ballroom)"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Format: <span className="text-zinc-400 font-mono">Nama Bab (Nama Lokasi)</span>, pisahkan dengan koma.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>WhatsApp Klien/Fotografer</span>
                  </label>
                  <input
                    type="tel"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Catatan Sesi (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Paket Album Premium 2026"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-800 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors"
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
  );
};
