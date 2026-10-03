import React, { useState, useEffect } from "react";
import { useProofingStore } from "@/lib/storage";
import { ClientProject, ClientSelectionSession, PhotoMetadata } from "@/types";
import {
  generateLightroomFilter,
  generateManifestCSV,
  generateManifestJSON,
  extractSelectionFromUrl,
} from "@/lib/sync";
import { downloadPhotosZip, ZipProgress } from "@/lib/downloadZip";
import { subscribeSelection } from "@/lib/firestoreSync";
import {
  X,
  CheckCircle,
  Copy,
  FileSpreadsheet,
  FileText,
  Radio,
  Camera,
  Check,
  AlertCircle,
  MessageSquare,
  Download,
} from "lucide-react";

interface ClientSelectionInspectorModalProps {
  project: ClientProject;
  isOpen: boolean;
  onClose: () => void;
}

export const ClientSelectionInspectorModal: React.FC<ClientSelectionInspectorModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const {
    loadProjectSession,
    importClientSelection,
    isP2PConnected,
    getProjectPhotos,
    globalApiKey,
  } = useProofingStore();
  const [sessionData, setSessionData] = useState<ClientSelectionSession | null>(null);
  const [catalog, setCatalog] = useState<PhotoMetadata[]>([]);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [importInput, setImportInput] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [zipProgress, setZipProgress] = useState<ZipProgress | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);

  // Load project session (local cache, superseded by newer cloud data)
  useEffect(() => {
    if (isOpen && project) {
      loadProjectSession(project.id).then((data) => {
        setSessionData((prev) =>
          prev && data.lastModified < prev.lastModified ? prev : data
        );
      });
    }
  }, [isOpen, project, loadProjectSession]);

  // Follow the cloud copy while the inspector is open, so selections the
  // client makes right now appear without reloading the dialog
  useEffect(() => {
    if (!isOpen || !project) return;
    const unsub = subscribeSelection(project.id, (remote) => {
      setSessionData((prev) =>
        prev && remote.lastModified <= prev.lastModified ? prev : remote
      );
    });
    return () => unsub();
  }, [isOpen, project]);

  // Resolve names against this session's own photo catalog, not the
  // catalog of whichever session happens to be active
  useEffect(() => {
    if (isOpen && project) {
      let alive = true;
      getProjectPhotos(project.id).then((photos) => {
        if (alive) setCatalog(photos);
      });
      return () => {
        alive = false;
      };
    }
  }, [isOpen, project, getProjectPhotos]);

  // Dialog behaviour: focus the panel at the top, Escape closes it
  const panelRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.focus();
    panelRef.current?.parentElement?.scrollTo(0, 0);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedIds = sessionData ? sessionData.selectedPhotoIds : [];
  const revisionNotes = sessionData ? sessionData.revisionNotes : {};

  // Find matching photo metadata from that session's catalog
  const selectedPhotos: PhotoMetadata[] = selectedIds.map((id) => {
    const found = catalog.find((p) => p.id === id);
    if (found) return found;
    // Photo missing from the catalog: render a neutral placeholder
    // instead of a dummy image
    return {
      id,
      name: `Foto-${id}`,
      thumbnailUrl: "",
      previewUrl: "",
    };
  });

  const handleCopyLightroom = async () => {
    const filterStr = generateLightroomFilter(selectedPhotos.map((p) => p.name));
    await navigator.clipboard.writeText(filterStr);
    setCopiedType("lightroom");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadCSV = () => {
    if (!sessionData) return;
    const csvContent = generateManifestCSV(selectedPhotos, revisionNotes, sessionData);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Seleksi_${project.projectId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    if (!sessionData) return;
    const jsonContent = generateManifestJSON(selectedPhotos, revisionNotes, sessionData);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Seleksi_${project.projectId}_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    if (!sessionData || selectedPhotos.length === 0 || zipProgress) return;
    setZipError(null);
    setZipProgress({ phase: "download", current: 0, total: selectedPhotos.length });
    try {
      const result = await downloadPhotosZip(
        selectedPhotos,
        globalApiKey,
        `Pilihan_${project.projectId || project.id}`,
        setZipProgress
      );
      if (result.failed > 0) {
        setZipError(`${result.failed} dari ${result.ok + result.failed} foto gagal diunduh.`);
      }
    } catch (err) {
      setZipError(err instanceof Error ? err.message : "Gagal membuat file ZIP.");
    } finally {
      setZipProgress(null);
    }
  };

  const handleManualImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importInput.trim()) return;

    setImportError(null);
    setImportSuccess(false);

    try {
      // Check if input is a URL containing hash #proof=...
      let hash = "";
      if (importInput.includes("#proof=")) {
        hash = importInput.slice(importInput.indexOf("#proof="));
      } else if (importInput.startsWith("#proof=")) {
        hash = importInput;
      }

      if (hash) {
        // Temporarily override location hash to extract
        const currentHash = window.location.hash;
        window.location.hash = hash;
        const extracted = extractSelectionFromUrl();
        window.location.hash = currentHash;

        if (extracted.selectedIds && extracted.selectedIds.length > 0) {
          await importClientSelection(project.id, extracted.selectedIds, extracted.revisionNotes);
          const updated = await loadProjectSession(project.id);
          setSessionData(updated);
          setImportSuccess(true);
          setImportInput("");
          setTimeout(() => setImportSuccess(false), 3000);
          return;
        }
      }

      // Fallback: check if JSON format
      if (importInput.trim().startsWith("{")) {
        const parsed = JSON.parse(importInput.trim());
        const ids = parsed.selectedFiles ? parsed.selectedFiles.map((f: { id: string }) => f.id) : parsed.ids || [];
        const notes = parsed.revisionNotes || {};
        if (ids.length > 0) {
          await importClientSelection(project.id, ids, notes);
          const updated = await loadProjectSession(project.id);
          setSessionData(updated);
          setImportSuccess(true);
          setImportInput("");
          setTimeout(() => setImportSuccess(false), 3000);
          return;
        }
      }

      setImportError("Format tautan tidak dikenali. Pastikan menyalin seluruh tautan yang dikirimkan oleh klien.");
    } catch (err) {
      setImportError("Gagal memproses data pilihan foto.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center px-4 overflow-y-auto animate-fade-in"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-2xl my-auto bg-white dark:bg-[#141417] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-6 -mt-6 px-6 pt-5 pb-4 mb-5 bg-white dark:bg-[#141417] border-b border-black/[0.06] dark:border-white/[0.08] rounded-t-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] dark:bg-[#FF5A1F]/15 border border-[#FF5A1F]/20 dark:border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F]">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#121212] dark:text-white tracking-tight">
                  Seleksi Klien: {project.clientName}
                </h3>
                {isP2PConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Sinkron Realtime
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F5F2EB] dark:bg-white/[0.06] text-[#71717A] dark:text-zinc-400 border border-black/[0.06] dark:border-white/10">
                    <Radio className="w-3 h-3" />
                    Tersimpan Lokal
                  </span>
                )}
              </div>
              <p className="text-xs text-[#71717A] dark:text-zinc-400 mt-0.5">
                Kode Sesi: <span className="font-semibold text-[#121212] dark:text-zinc-200">{project.projectId}</span> • Kuota: <span className="text-[#FF5A1F] font-bold">{selectedIds.length} / {project.maxQuota} foto</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-[#71717A] hover:text-[#121212] dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Photos Gallery Grid */}
        <div className="mb-6">
          <h4 className="text-xs font-bold text-[#121212] dark:text-white uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span>Daftar Foto yang Dipilih Klien ({selectedIds.length})</span>
            {selectedIds.length >= project.maxQuota && (
              <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">✓ Kuota Terpenuhi</span>
            )}
          </h4>

          {selectedPhotos.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#FAF8F5] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/10 text-[#71717A] dark:text-zinc-400 text-xs">
              <Camera className="w-6 h-6 mx-auto mb-2 text-[#A1A1AA] dark:text-zinc-600" />
              <p className="font-bold text-[#121212] dark:text-white mb-1">Belum Ada Foto Terpilih</p>
              <p className="text-[11px] text-[#71717A] dark:text-zinc-400 max-w-sm mx-auto">
                Klien belum memilih foto untuk sesi ini. Saat klien memilih foto di galeri, daftar pilihan akan otomatis muncul di sini.
              </p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto pr-1 space-y-2.5">
              {selectedPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="flex items-start justify-between p-3 rounded-2xl bg-[#FAF8F5] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/10 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.name}
                      className="w-12 h-12 rounded-xl object-cover bg-black/5 shrink-0"
                    />
                    <div className="truncate">
                      <p className="text-[#121212] dark:text-white font-bold truncate">
                        {photo.name}
                      </p>
                      {photo.section && (
                        <p className="text-[10px] text-[#FF5A1F] font-semibold truncate flex items-center gap-1 mt-0.5">
                          <span>{photo.section}</span>
                          {photo.location && (
                            <span className="text-[#71717A] dark:text-zinc-400">• {photo.location}</span>
                          )}
                        </p>
                      )}
                      {revisionNotes[photo.id] ? (
                        <p className="text-[11px] text-[#E8470B] dark:text-[#FF5A1F] mt-0.5 flex items-center gap-1 font-medium">
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          <span>Instruksi: {revisionNotes[photo.id]}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#71717A] dark:text-zinc-400 mt-0.5">
                          Tanpa instruksi revisi khusus
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[#A1A1AA] dark:text-zinc-500 font-bold text-[11px] ml-2 shrink-0">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Studio Export Tools */}
        <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] space-y-4">
          {/* One-click ZIP of every photo the client picked */}
          <div>
            <button
              onClick={handleDownloadZip}
              disabled={selectedPhotos.length === 0 || zipProgress !== null}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 btn-mtioon-primary font-bold text-xs transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {zipProgress
                  ? zipProgress.phase === "download"
                    ? `Mengunduh foto ${zipProgress.current}/${zipProgress.total}...`
                    : "Membuat file ZIP..."
                  : `Unduh ZIP Foto Terpilih (${selectedPhotos.length})`}
              </span>
            </button>
            {zipProgress && (
              <div className="mt-1.5 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#FF5A1F] transition-all duration-300"
                  style={{
                    width:
                      zipProgress.phase === "zip"
                        ? "100%"
                        : `${Math.round((zipProgress.current / Math.max(1, zipProgress.total)) * 100)}%`,
                  }}
                />
              </div>
            )}
            {zipError && (
              <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{zipError}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyLightroom}
              disabled={selectedPhotos.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F5F2EB] hover:bg-[#EDE9E0] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-xs font-semibold text-[#121212] dark:text-zinc-200 border border-black/[0.06] dark:border-white/10 transition-colors disabled:opacity-50"
            >
              {copiedType === "lightroom" ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#FF5A1F]" />}
              <span>{copiedType === "lightroom" ? "Filter Lightroom Tersalin!" : "Salin Filter Lightroom"}</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              disabled={selectedPhotos.length === 0}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F5F2EB] hover:bg-[#EDE9E0] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-xs font-semibold text-[#121212] dark:text-zinc-200 border border-black/[0.06] dark:border-white/10 transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Unduh CSV</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              disabled={selectedPhotos.length === 0}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F5F2EB] hover:bg-[#EDE9E0] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-xs font-semibold text-[#121212] dark:text-zinc-200 border border-black/[0.06] dark:border-white/10 transition-colors disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-[#71717A] dark:text-zinc-400" />
              <span>Unduh JSON</span>
            </button>
          </div>

          {/* Manual Import Box (in case client sent WhatsApp link) */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1C22]/80 border border-black/[0.06] dark:border-white/10">
            <label className="block text-[11px] font-bold text-[#121212] dark:text-zinc-200 mb-1.5">
              Impor Tautan Seleksi Klien (dari pesan WhatsApp)
            </label>
            <form onSubmit={handleManualImport} className="flex items-center gap-2">
              <input
                type="text"
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                placeholder="Tempel tautan seleksi yang dikirimkan klien di sini..."
                className="flex-1 px-3 py-2 bg-white dark:bg-[#202026] border border-black/15 dark:border-white/10 rounded-xl text-xs text-[#121212] dark:text-[#F4F4F6] placeholder-[#A1A1AA] dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F]"
              />
              <button
                type="submit"
                className="px-4 py-2 btn-mtioon-black font-bold text-xs transition-colors shrink-0"
              >
                Impor
              </button>
            </form>

            {importSuccess && (
              <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Pilihan foto klien berhasil dimuat!</span>
              </p>
            )}

            {importError && (
              <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{importError}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
