import React, { useState } from "react";
import { useProofingStore } from "@/lib/storage";
import { PhotoMetadata } from "@/types";
import confetti from "canvas-confetti";
import {
  generateCompressedProofUrl,
  transmitSelectionData,
  generateLightroomFilter,
  generateManifestCSV,
  generateManifestJSON,
  generateWhatsAppUrl,
} from "@/lib/sync";
import {
  X,
  CheckCircle,
  Copy,
  MessageCircle,
  FileSpreadsheet,
  Download,
  Lock,
  Unlock,
  Loader2,
  FileText,
} from "lucide-react";

export const SubmissionModal: React.FC = () => {
  const {
    photos,
    session,
    config,
    isSubmissionOpen,
    setIsSubmissionOpen,
    setLockState,
  } = useProofingStore();

  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [transmitStatus, setTransmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [transmitMessage, setTransmitMessage] = useState("");

  // Dialog behaviour: Escape closes it
  React.useEffect(() => {
    if (!isSubmissionOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSubmissionOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSubmissionOpen, setIsSubmissionOpen]);

  if (!isSubmissionOpen) return null;

  const selectedPhotos = photos.filter((p) => session.selectedPhotoIds.includes(p.id));
  const selectedCount = selectedPhotos.length;

  // 1. Copy Lightroom filter string
  const handleCopyLightroom = async () => {
    const filterString = generateLightroomFilter(selectedPhotos.map((p) => p.name));
    await navigator.clipboard.writeText(filterString);
    setCopiedType("lightroom");
    setTimeout(() => setCopiedType(null), 2500);
  };

  // 2. Share via WhatsApp
  const handleShareWhatsApp = () => {
    const compressedUrl = generateCompressedProofUrl(
      session.selectedPhotoIds,
      session.revisionNotes
    );

    let message = `*LUMINA PROOF STUDIO - KONFIRMASI KURASI FOTO*\n\n`;
    message += `👤 *Klien:* ${session.clientName || "-"}\n`;
    message += `📁 *Project:* ${session.projectId || "-"}\n`;
    message += `📸 *Total Terpilih:* ${selectedCount} / ${session.maxQuota} foto\n\n`;
    message += `*Daftar Foto Terpilih:*\n`;

    // Group selected photos by section
    const grouped: Record<string, PhotoMetadata[]> = {};
    selectedPhotos.forEach((photo) => {
      const sec = photo.section || "Galeri Utama";
      if (!grouped[sec]) grouped[sec] = [];
      grouped[sec].push(photo);
    });

    Object.entries(grouped).forEach(([secName, secPhotos]) => {
      const loc = secPhotos[0]?.location;
      message += `\n📍 *${secName}${loc ? ` (${loc})` : ""}* (${secPhotos.length} foto):\n`;
      secPhotos.forEach((photo, idx) => {
        const note = session.revisionNotes[photo.id];
        message += `  ${idx + 1}. ${photo.name}${note ? ` _(Catatan: ${note})_` : ""}\n`;
      });
    });

    message += `\n🔗 *Tautan Verifikasi Seleksi:*\n${compressedUrl}`;

    const waUrl = generateWhatsAppUrl(config.clientContact, message);
    window.open(waUrl, "_blank");

    confetti({ particleCount: 75, spread: 60, origin: { y: 0.7 } });
  };

  // 3. Transmit to Google Apps Script Webhook (PRD Sec: Google Apps Script Web App)
  const handleTransmitWebhook = async () => {
    if (!config.webhookUrl) {
      setTransmitStatus("error");
      setTransmitMessage("Penyimpanan spreadsheet studio belum diatur. Silakan kirimkan pilihan foto melalui WhatsApp.");
      return;
    }

    setIsTransmitting(true);
    setTransmitStatus("idle");

    const payload = {
      timestamp: new Date().toISOString(),
      clientName: session.clientName,
      clientContact: session.clientContact,
      projectId: session.projectId,
      totalSelected: selectedCount,
      maxQuota: session.maxQuota,
      selectedFiles: selectedPhotos.map((p) => ({
        id: p.id,
        name: p.name,
      })),
      revisionNotes: session.revisionNotes,
    };

    const success = await transmitSelectionData(config.webhookUrl, payload);
    setIsTransmitting(false);

    if (success) {
      setTransmitStatus("success");
      setTransmitMessage("Pilihan foto Anda berhasil tersimpan!");
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else {
      setTransmitStatus("error");
      setTransmitMessage(
        "Gagal menyimpan ke server. Silakan kirimkan pilihan foto Anda melalui tombol WhatsApp."
      );
    }
  };

  // 4. Download Manifest CSV
  const handleDownloadCSV = () => {
    const csvContent = generateManifestCSV(selectedPhotos, session.revisionNotes, session);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Manifest_${session.projectId || "Kurasi"}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 5. Download Manifest JSON
  const handleDownloadJSON = () => {
    const jsonContent = generateManifestJSON(selectedPhotos, session.revisionNotes, session);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Manifest_${session.projectId || "Kurasi"}_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submission-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsSubmissionOpen(false);
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center px-4 overflow-y-auto animate-fade-in"
    >
      <div className="relative w-full max-w-2xl my-auto bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 px-6 sm:px-8 pt-5 sm:pt-6 pb-4 mb-6 bg-zinc-950 border-b border-zinc-800/80 rounded-t-3xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="submission-modal-title" className="text-lg font-bold text-zinc-100 tracking-tight">
                Kirim Pilihan Foto
              </h2>
              <p className="text-xs text-zinc-400">
                Kirim daftar foto pilihan dan catatan revisi Anda langsung ke fotografer.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSubmissionOpen(false)}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quota Status Alert */}
        <div className="mb-6 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-200">Status Kuota:</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                {selectedCount} dari {session.maxQuota} Foto Terpilih
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Klien: {session.clientName} • Project: {session.projectId}
            </p>
          </div>

          <button
            onClick={() => setLockState(!session.isLocked)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              session.isLocked
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300"
            }`}
            title={session.isLocked ? "Buka kunci seleksi" : "Kunci seleksi agar tidak berubah"}
          >
            {session.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{session.isLocked ? "Terkunci" : "Kunci Seleksi"}</span>
          </button>
        </div>

        {/* Selected Photos Compact Gallery */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Pratinjau Foto Terpilih ({selectedCount})
          </h3>
          {selectedPhotos.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800/80 text-zinc-400 text-xs">
              Belum ada foto yang dipilih. Silakan kembali ke galeri untuk menandai foto.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto pr-1 space-y-2">
              {selectedPhotos.map((photo, i) => (
                <div
                  key={photo.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.name}
                      className="w-10 h-10 rounded-lg object-cover bg-zinc-800 shrink-0"
                    />
                    <div className="truncate">
                      <p className="font-semibold text-zinc-200 truncate">{photo.name}</p>
                      {photo.section && (
                        <p className="text-[10px] text-amber-400 truncate flex items-center gap-1 mt-0.5">
                          <span>{photo.section}</span>
                          {photo.location && (
                            <span className="text-zinc-400">• {photo.location}</span>
                          )}
                        </p>
                      )}
                      {session.revisionNotes[photo.id] ? (
                        <p className="text-[11px] text-amber-300 truncate mt-0.5">
                          Catatan: {session.revisionNotes[photo.id]}
                        </p>
                      ) : (
                        <p className="text-[11px] text-zinc-400 mt-0.5">Tanpa instruksi khusus</p>
                      )}
                    </div>
                  </div>
                  <span className="text-zinc-400 font-medium text-[11px] ml-2 shrink-0">
                    #{i + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export Channels Grid */}
        <div className="space-y-3 mb-6">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Pilihan Cara Pengiriman
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. WhatsApp Instant Share */}
            <button
              onClick={handleShareWhatsApp}
              disabled={selectedCount === 0}
              className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-xs font-bold text-emerald-300">
                  Kirim via WhatsApp (Utama)
                </span>
                <span className="block text-[11px] text-emerald-400/80 mt-0.5">
                  Kirim rekap foto terpilih dan catatan revisi langsung ke nomor fotografer.
                </span>
              </div>
            </button>

            {/* 2. Copy List of Filenames */}
            <button
              onClick={handleCopyLightroom}
              disabled={selectedCount === 0}
              className="flex items-start gap-3 p-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                <Copy className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-xs font-bold text-zinc-100">
                  {copiedType === "lightroom" ? "✓ Tersalin ke Clipboard!" : "Salin Daftar Foto"}
                </span>
                <span className="block text-[11px] text-zinc-400 mt-0.5">
                  Salin teks nama foto untuk dicari langsung di editor foto.
                </span>
              </div>
            </button>

            {/* 3. Transmit to Google Sheets */}
            <button
              onClick={handleTransmitWebhook}
              disabled={selectedCount === 0 || isTransmitting}
              className="flex items-start gap-3 p-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed sm:col-span-2"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
                {isTransmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-bold text-zinc-100">
                    Simpan ke Lembar Kerja Studio
                  </span>
                  {transmitStatus === "success" && (
                    <span className="text-[11px] text-emerald-400 font-semibold">✓ Terkirim</span>
                  )}
                </div>
                <span className="block text-[11px] text-zinc-400 mt-0.5">
                  Kirimkan data pilihan Anda langsung ke sistem arsip fotografer.
                </span>
                {transmitMessage && (
                  <p
                    className={`text-[11px] mt-2 ${
                      transmitStatus === "success" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {transmitMessage}
                  </p>
                )}
              </div>
            </button>
          </div>

          {/* Download Manifest Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleDownloadCSV}
              disabled={selectedCount === 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh CSV</span>
            </button>
            <button
              onClick={handleDownloadJSON}
              disabled={selectedCount === 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition-colors disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Unduh JSON</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-2">
          <button
            onClick={() => setIsSubmissionOpen(false)}
            className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Kembali ke Kurasi Foto
          </button>
        </div>
      </div>
    </div>
  );
};
