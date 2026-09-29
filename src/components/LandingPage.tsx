import React, { useState } from "react";
import { useProofingStore } from "@/lib/storage";
import {
  Camera,
  KeyRound,
  ArrowRight,
  Lock,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const {
    openClientByCode,
    setViewMode,
    clientProjects,
    photos,
  } = useProofingStore();

  const [sessionCodeInput, setSessionCodeInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearchSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionCodeInput.trim()) {
      setErrorMsg("Silakan ketikkan kode sesi galeri Anda.");
      return;
    }

    setErrorMsg(null);
    const success = await openClientByCode(sessionCodeInput.trim());
    if (!success) {
      setErrorMsg(
        "Kode sesi tidak ditemukan. Pastikan kode sesuai dengan yang diberikan oleh fotografer."
      );
    }
  };

  // Sample curated showcase previews from DEMO_PHOTOS
  const previewShowcase = photos.slice(0, 4);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-300">
      {/* Floating Centered Navbar */}
      <header className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-4xl bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 sm:px-6 h-14 flex items-center justify-between backdrop-blur-md shadow-xl shadow-black/30">
        <div className="flex items-center gap-3">
          <div
            onDoubleClick={() => setViewMode("admin")}
            className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 select-none cursor-default"
            title="Aryst Lens Studio"
          >
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white block">
              Aryst Lens Studio
            </span>
            <span className="text-[11px] text-zinc-400 block -mt-0.5">
              Client Proofing Portal
            </span>
          </div>
        </div>

        {/* Public Clean Indicator (NO ADMIN BUTTON IN PUBLIC) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 hidden sm:inline font-medium">
            Kurasi & Seleksi Foto Eksklusif
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Portal Kurasi & Seleksi Foto Klien
          </h1>

          <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Akses galeri pribadi Anda dengan memasukkan kode sesi atau melalui tautan langsung yang dikirimkan oleh fotografer.
          </p>

          {/* Client Portal Code Search Box */}
          <div className="mt-8 max-w-lg mx-auto">
            <form
              onSubmit={handleSearchSession}
              className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
              <div className="relative flex-1">
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={sessionCodeInput}
                  onChange={(e) => {
                    setSessionCodeInput(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Ketik kode sesi (cth: WED-2026-RIAN)..."
                  className="w-full pl-10 pr-3 py-2 bg-transparent text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>Buka Galeri</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {errorMsg && (
              <p className="mt-2 text-xs text-rose-400 font-medium text-center">
                {errorMsg}
              </p>
            )}

            {/* Subdued Demo Sesi Helper */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500">
              <span>Sesi percontohan:</span>
              {clientProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openClientByCode(p.projectId)}
                  className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 font-medium text-[11px] tracking-tight transition-colors inline-flex items-center gap-1"
                >
                  {p.password && <Lock className="w-2.5 h-2.5 text-zinc-500" />}
                  <span>{p.projectId}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Visual Photography Showcase Grid */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-zinc-900">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-100 tracking-tight">
                Standar Kualitas Visual & Kurasi
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Setiap foto disajikan dalam resolusi tinggi untuk mempermudah pemilihan detail dan ekspresi terbaik.
              </p>
            </div>
            <span className="hidden sm:inline text-xs text-zinc-500 font-medium">
              Resolusi Penuh • Inspeksi 2x
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {previewShowcase.map((photo) => (
              <div
                key={photo.id}
                className="group relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/80 aspect-[4/5]"
              >
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex items-end">
                  <p className="text-[11px] font-medium text-zinc-300 truncate">
                    {photo.name}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Simple Clean Workflow Instructions */}
          <div className="mt-12 pt-8 border-t border-zinc-900 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-zinc-400">
            <div>
              <p className="font-semibold text-zinc-200 mb-1">1. Buka Galeri Privat</p>
              <p className="text-zinc-500 leading-relaxed">
                Gunakan tautan langsung atau ketikkan kode sesi yang diberikan. Masukkan kata sandi jika sesi Anda diproteksi.
              </p>
            </div>
            <div>
              <p className="font-semibold text-zinc-200 mb-1">2. Tandai & Beri Catatan</p>
              <p className="text-zinc-500 leading-relaxed">
                Pilih foto favorit hingga batas kuota paket. Perbesar foto dan sematkan catatan retouching pada berkas yang diinginkan.
              </p>
            </div>
            <div>
              <p className="font-semibold text-zinc-200 mb-1">3. Kirim Pilihan Foto</p>
              <p className="text-zinc-500 leading-relaxed">
                Kirim daftar foto pilihan dan catatan revisi Anda langsung ke fotografer melalui WhatsApp dengan sekali klik.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 px-4 text-xs text-zinc-500 bg-zinc-950">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Camera className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-medium text-zinc-300">Aryst Lens Studio</span>
            <span>• Portal Kurasi Foto Klien</span>
          </div>

          <div className="flex items-center gap-3 text-zinc-500">
            <span>Privasi Foto Terjaga</span>
            <span>•</span>
            <span>Aryst Lens Studio &copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
