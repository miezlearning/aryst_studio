import React, { useEffect, useState } from "react";
import { useProofingStore } from "@/lib/storage";
import { BrandMark } from "@/components/BrandMark";
import { HeroVideo } from "@/components/HeroVideo";
import {
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
    showcaseItems,
    isBooted,
  } = useProofingStore();

  const [sessionCodeInput, setSessionCodeInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  // Live clock (WIB) for the floating navbar
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const timeStr =
    new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    })
      .format(now)
      .replace(".", ":") + " WIB";
  const dateStr = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(now);

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

  // Showcase preview: admin-curated picks, fallback to first photos
  const previewShowcase =
    showcaseItems.length > 0
      ? showcaseItems.map((item) => ({
          id: item.id,
          name: item.name,
          thumbnailUrl: item.thumbnailUrl,
        }))
      : photos.slice(0, 4);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-300">
      {/* Floating Liquid-Glass Navbar */}
      <header className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-4xl liquid-glass rounded-2xl px-4 sm:px-5 h-16 flex items-center justify-between">
        <div onDoubleClick={() => setViewMode("admin")} className="cursor-default" title="ARYST">
          <BrandMark />
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[11px] font-mono text-zinc-300 tabular-nums">
            {dateStr} • {timeStr}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section with interactive video background */}
        <section className="relative overflow-hidden">
          <HeroVideo />
          <div className="relative z-10 pt-32 sm:pt-36 pb-14 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight drop-shadow-lg">
            Portal Kurasi & Seleksi Foto Klien
          </h1>

          <p className="mt-4 text-sm sm:text-base text-zinc-300 max-w-xl mx-auto leading-relaxed drop-shadow">
            Akses galeri pribadi Anda dengan memasukkan kode sesi atau melalui tautan langsung yang dikirimkan oleh fotografer.
          </p>

          {/* Client Portal Code Search Box */}
          <div className="mt-8 max-w-lg mx-auto">
            <form
              onSubmit={handleSearchSession}
              className="p-1.5 rounded-2xl liquid-glass-deep flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
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
                className="px-4 py-2 rounded-xl btn-glossy text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shrink-0"
              >
                <span className="relative z-[2]">Buka Galeri</span>
                <ArrowRight className="w-3.5 h-3.5 relative z-[2]" />
              </button>
            </form>

            {errorMsg && (
              <p className="mt-2 text-xs text-rose-400 font-medium text-center">
                {errorMsg}
              </p>
            )}

            {/* Subdued Demo Sesi Helper */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-400">
              {isBooted ? (
                <>
                  <span>Sesi percontohan:</span>
                  {clientProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openClientByCode(p.projectId)}
                      className="px-2 py-0.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] text-zinc-300 hover:text-white border border-white/10 font-medium text-[11px] tracking-tight transition-colors inline-flex items-center gap-1 backdrop-blur-md"
                    >
                      {p.password && <Lock className="w-2.5 h-2.5" />}
                      <span>{p.projectId}</span>
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <span className="skeleton relative inline-block w-24 h-4 rounded-md" />
                  <span className="skeleton relative inline-block w-28 h-4 rounded-full" />
                  <span className="skeleton relative inline-block w-24 h-4 rounded-full" />
                </>
              )}
            </div>

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
            {!isBooted
              ? [0, 1, 2, 3].map((i) => (
                  <div
                    key={`skeleton-${i}`}
                    className="skeleton relative rounded-xl aspect-[4/5] shadow-lg shadow-black/40"
                  />
                ))
              : previewShowcase.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative rounded-xl overflow-hidden bg-zinc-900 border border-white/10 aspect-[4/5] shadow-lg shadow-black/40"
                  >
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Liquid-glass gloss: static top light + hover sweep */}
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.14] via-transparent to-transparent opacity-70" />
                    <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-white/15" />
                    <div className="absolute inset-0 pointer-events-none -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/[0.16] to-transparent" />
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
          <BrandMark iconClassName="w-6 h-6" textClassName="text-[13px]" />

          <div className="flex items-center gap-3 text-zinc-500">
            <span>Privasi Terjaga</span>
            <span>•</span>
            <span>&copy; {new Date().getFullYear()} ARYST</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
