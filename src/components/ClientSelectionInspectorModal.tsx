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
      className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center px-4 overflow-y-auto animate-fade-in"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-2xl my-auto bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-6 -mt-6 px-6 pt-5 pb-4 mb-5 bg-zinc-900 border-b border-zinc-800 rounded-t-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Seleksi Klien: {project.clientName}
                </h3>
                {isP2PConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Sinkron Realtime
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                    <Radio className="w-3 h-3" />
                    Tersimpan Lokal
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Project Code: <span className="font-semibold text-zinc-300">{project.projectId}</span> • Kuota: <span className="text-amber-400 font-semibold">{selectedIds.length} / {project.maxQuota} foto</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Photos Gallery Grid */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span>Daftar Foto yang Dipilih Klien ({selectedIds.length})</span>
            {selectedIds.length >= project.maxQuota && (
              <span className="text-emerald-400 text-[11px] font-semibold">✓ Kuota Terpenuhi</span>
            )}
          </h4>

          {selectedPhotos.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800 text-zinc-400 text-xs">
              <Camera className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
              <p className="font-medium text-zinc-300 mb-1">Belum Ada Foto Terpilih</p>
              <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                Klien belum memilih foto untuk sesi ini. Saat klien memilih foto di galeri, daftar pilihan akan otomatis muncul di sini.
              </p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto pr-1 space-y-2.5">
              {selectedPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="flex items-start justify-between p-3 rounded-2xl bg-zinc-900 border border-zinc-800/80 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.name}
                      className="w-12 h-12 rounded-xl object-cover bg-zinc-800 shrink-0"
                    />
                    <div className="truncate">
                      <p className="text-zinc-200 font-semibold truncate">
                        {photo.name}
                      </p>
                      {photo.section && (
                        <p className="text-[10px] text-amber-400 truncate flex items-center gap-1 mt-0.5">
                          <span>{photo.section}</span>
                          {photo.location && (
                            <span className="text-zinc-500">• {photo.location}</span>
                          )}
                        </p>
                      )}
                      {revisionNotes[photo.id] ? (
                        <p className="text-[11px] text-amber-400 mt-0.5 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          <span>Instruksi: {revisionNotes[photo.id]}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Tanpa instruksi revisi khusus
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-zinc-500 font-medium text-[11px] ml-2 shrink-0">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Studio Export Tools */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-4">
          {/* One-click ZIP of every photo the client picked */}
          <div>
            <button
              onClick={handleDownloadZip}
              disabled={selectedPhotos.length === 0 || zipProgress !== null}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors disabled:opacity-50"
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
              <div className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
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
              <p className="mt-1.5 text-[11px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{zipError}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyLightroom}
              disabled={selectedPhotos.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors disabled:opacity-50"
            >
              {copiedType === "lightroom" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copiedType === "lightroom" ? "Filter Lightroom Tersalin!" : "Salin Filter Lightroom"}</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              disabled={selectedPhotos.length === 0}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Unduh CSV</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              disabled={selectedPhotos.length === 0}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Unduh JSON</span>
            </button>
          </div>

          {/* Manual Import Box (in case client sent WhatsApp link) */}
          <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
              Impor Tautan Seleksi Klien (dari pesan WhatsApp)
            </label>
            <form onSubmit={handleManualImport} className="flex items-center gap-2">
              <input
                type="text"
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                placeholder="Tempel tautan seleksi yang dikirimkan klien di sini..."
                className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors shrink-0"
              >
                Impor
              </button>
            </form>

            {importSuccess && (
              <p className="mt-1.5 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Pilihan foto klien berhasil dimuat!</span>
              </p>
            )}

            {importError && (
              <p className="mt-1.5 text-[11px] text-rose-400 flex items-center gap-1">
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
