import React, { useEffect, useState, useRef } from "react";
import { useProofingStore } from "@/lib/storage";
import { BrandMark } from "@/components/BrandMark";
import { DraggableCandyChip } from "@/components/DraggableCandyChip";
import { ShowcaseStrip } from "@/components/ShowcaseStrip";
import { HeroVideo } from "@/components/HeroVideo";
import {
  KeyRound,
  ArrowRight,
  Lock,
  Images
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

  // Interactive Bento Card 1: Tone presets
  const presets = [
    { name: "Warm", label: "Film Warm" },
    { name: "Clean", label: "Clean Natural" },
    { name: "Mono", label: "Classic B&W" },
    { name: "Vivid", label: "Vivid Sunset" },
  ];
  const [activePresetIndex, setActivePresetIndex] = useState(0);

  // Interactive Bento Card 3: Resolution / Zoom specimen
  const [activeZoom, setActiveZoom] = useState<"100%" | "RAW" | "4K">("100%");

  // Interactive Bento Card 4: Focus pupil tracking
  const eyesContainerRef = useRef<HTMLDivElement>(null);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live clock (WIB)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  // Pupil cursor tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!eyesContainerRef.current) return;
      const rect = eyesContainerRef.current.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;

      const deltaX = e.clientX - eyeCenterX;
      const deltaY = e.clientY - eyeCenterY;
      const angle = Math.atan2(deltaY, deltaX);
      const distance = Math.min(6, Math.hypot(deltaX, deltaY) / 25);

      setPupilOffset({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const timeStr =
    new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    })
      .format(now)
      .replace(".", ":") + " WIB";

  const handleSearchSession = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const code = (customCode ?? sessionCodeInput).trim();
    if (!code) {
      setErrorMsg("Silakan ketikkan kode sesi galeri Anda.");
      return;
    }

    setErrorMsg(null);
    const success = await openClientByCode(code);
    if (!success) {
      setErrorMsg(
        "Kode sesi tidak ditemukan. Pastikan kode sesuai dengan yang diberikan oleh fotografer."
      );
    }
  };

  const focusSessionForm = () => {
    searchInputRef.current?.focus({ preventScroll: true });
    document
      .getElementById("kurasi")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const previewShowcase =
    showcaseItems.length > 0
      ? showcaseItems.map((item) => ({
          id: item.id,
          name: item.name,
          thumbnailUrl: item.thumbnailUrl,
        }))
      : photos.slice(0, 4);

  const sampleProjects = clientProjects.filter((p) => p.isSample);
  const primarySample = sampleProjects[0] || { projectId: "WED-2026-RIAN" };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#121212] flex flex-col font-sans selection:bg-[#FF5A1F]/20 selection:text-[#E8470B] relative">
      {/* ── Global Precision Studio Millimeter Grid across all sections ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* Repeating millimeter micro-grid (24px) */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(18, 18, 18, 0.045) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(18, 18, 18, 0.045) 1px, transparent 1px)
            `,
            backgroundSize: "24px 24px",
            backgroundPosition: "center top",
          }}
        />

        {/* Ambient atmospheric gradient wash across the page */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle 800px at 85% 25%, rgba(255, 90, 31, 0.04) 0%, transparent 70%),
              radial-gradient(circle 900px at 15% 65%, rgba(255, 90, 31, 0.03) 0%, transparent 70%),
              radial-gradient(circle 1000px at 70% 90%, rgba(255, 90, 31, 0.025) 0%, transparent 70%)
            `,
          }}
        />
      </div>

      {/* Floating Island Navbar */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl">
        <div className="bg-white/90 backdrop-blur-xl border border-black/[0.08] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.02)] rounded-full px-5 py-2.5 flex items-center justify-between transition-all">
          <div
            onDoubleClick={() => setViewMode("admin")}
            className="cursor-pointer"
            title="aryst studio"
          >
            <BrandMark />
          </div>

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-[#52525B]">
            <a href="#kurasi" className="hover:text-[#121212] transition-colors">
              Kurasi
            </a>
            <a href="#fitur" className="hover:text-[#121212] transition-colors">
              Fitur Studio
            </a>
            <a href="#showcase" className="hover:text-[#121212] transition-colors">
              Galeri
            </a>
            <a href="#cara-kerja" className="hover:text-[#121212] transition-colors">
              Cara Kerja
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-black/[0.04] text-[11px] font-semibold text-[#71717A] tabular-nums">
              {timeStr}
            </span>

            <button
              onClick={() => handleSearchSession(undefined, primarySample.projectId)}
              className="btn-mtioon-black px-4 py-1.5 text-xs font-bold"
            >
              Buka Demo
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        {/* Hero Section with Showcase Video Background */}
        <section
          id="kurasi"
          className="relative w-full overflow-hidden"
        >
          {/* Background Showcase Video with Gradient & Grid Overlay */}
          <HeroVideo />

          {/* Hero Content Container */}
          <div className="relative z-10 pt-36 sm:pt-44 pb-20 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
            {/* Floating 3D Candy Badges (Interactive Draggable Pins with Spring Physics) */}
            <div className="relative inline-block w-full max-w-4xl mx-auto">
              {/* Badge 1: Top-Left */}
              <DraggableCandyChip
              text="retouch kulit natural"
              colorClass="bg-[#E5484D]"
              wrapperClassName="hidden sm:block absolute -top-8 left-2 sm:-left-6 animate-float-1"
            />

            {/* Badge 2: Top-Right */}
            <DraggableCandyChip
              text="pilih 25 foto terbaik"
              colorClass="bg-[#2A8CFF]"
              wrapperClassName="hidden sm:block absolute -top-10 right-4 sm:right-2 animate-float-2"
            />

            {/* Badge 3: Middle-Right */}
            <DraggableCandyChip
              text="color grading hangat"
              colorClass="bg-[#FEBC2E]"
              textColor="text-[#121212]"
              wrapperClassName="hidden lg:block absolute top-28 -right-8 animate-float-3"
            />

            {/* Badge 4: Middle-Left */}
            <DraggableCandyChip
              text="WED-2026-RIAN"
              colorClass="bg-[#FF5A1F]"
              wrapperClassName="hidden lg:block absolute top-28 -left-8 animate-float-4"
            />

            {/* Badge 5: Bottom-Right */}
            <DraggableCandyChip
              text="foto candid keluarga"
              colorClass="bg-[#8B5CF6]"
              wrapperClassName="hidden sm:block absolute -bottom-5 right-2 sm:right-8 animate-float-5"
            />

            {/* Headline in Sunghyun Sans 900 */}
            <h1 className="font-display font-[900] text-5xl sm:text-7xl lg:text-[76px] tracking-[-0.04em] text-[#121212] leading-[1.04] mb-6">
              Pilih momen.
              <br />
              Sampaikan rasa.
            </h1>
          </div>

          {/* Sub-headline */}
          <p className="mt-3 text-base sm:text-lg text-[#52525B] max-w-2xl mx-auto leading-relaxed font-medium">
            Portal privat untuk melihat dan memilih hasil pemotretan Anda. Tandai foto favorit,
            tulis catatan retouching per frame, lalu kirimkan langsung ke fotografer.
          </p>

          {/* Tactile Buttons */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => handleSearchSession(undefined, primarySample.projectId)}
              className="btn-mtioon-primary px-7 py-3 text-sm font-bold flex items-center gap-2"
            >
              <span>Buka sesi demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                searchInputRef.current?.focus();
              }}
              className="btn-mtioon-secondary px-7 py-3 text-sm font-bold"
            >
              Ketik kode sesi
            </button>
          </div>

          {/* Search Capsule */}
          <div className="mt-8 max-w-lg mx-auto">
            <form
              onSubmit={(e) => handleSearchSession(e)}
              className="bg-white border border-black/[0.08] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] rounded-full p-1.5 pl-5 flex items-center gap-2 transition-shadow focus-within:shadow-[0_12px_40px_-4px_rgba(0,0,0,0.1)] focus-within:border-black/20"
            >
              <KeyRound className="w-4 h-4 text-[#71717A] shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={sessionCodeInput}
                onChange={(e) => {
                  setSessionCodeInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Ketik kode sesi (cth: WED-2026-RIAN)..."
                className="w-full bg-transparent text-xs sm:text-sm text-[#121212] placeholder-[#A1A1AA] font-sans focus:outline-none"
              />
              <button
                type="submit"
                className="btn-mtioon-black px-4 py-2.5 text-xs font-bold shrink-0 flex items-center gap-1.5"
              >
                <span>Buka</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {errorMsg && (
              <div className="mt-3 inline-block px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-xs text-rose-600 font-medium">
                {errorMsg}
              </div>
            )}

            {/* Quick Sesi Contoh Chips */}
            {sampleProjects.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-[#71717A]">
                <span className="font-medium text-[#A1A1AA]">Sesi contoh:</span>
                {sampleProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSearchSession(undefined, p.projectId)}
                    className="px-3 py-1 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-[#52525B] hover:text-[#121212] border border-black/[0.06] text-[11px] font-semibold transition-all inline-flex items-center gap-1"
                  >
                    {(p.password || p.passwordHash) && <Lock className="w-2.5 h-2.5" />}
                    <span>{p.projectId}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

        {/* Bento Grid: Photography Studio Experience */}
        <section id="fitur" className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
            {/* Bento Card 1: Left Tall Card (Mood Warna & Color Grading) */}
            <div className="md:col-span-6 mtioon-card p-7 sm:p-9 flex flex-col justify-between min-h-[480px]">
              <div>
                <div className="flex items-center justify-between mb-8">
                  <span className="px-3 py-1 rounded-full bg-black/[0.05] text-[11.5px] font-semibold text-[#52525B]">
                    {activePresetIndex + 1} / {presets.length} · {presets[activePresetIndex].label.toLowerCase()}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {presets.map((p, idx) => (
                      <button
                        key={p.name}
                        onClick={() => setActivePresetIndex(idx)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                          idx === activePresetIndex
                            ? "bg-[#121212] text-white shadow-sm"
                            : "bg-black/[0.04] text-[#71717A] hover:text-[#121212]"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Big Display Word in Sunghyun Sans 900 */}
                <div className="py-12 sm:py-16 text-center">
                  <span className="font-display font-[900] text-7xl sm:text-8xl tracking-[-0.04em] text-[#121212] select-none block transition-all duration-300">
                    {presets[activePresetIndex].name}
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-black/[0.06]">
                <h3 className="font-display font-bold text-lg sm:text-xl text-[#121212] tracking-tight">
                  Karakter warna sesuai selera.
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-[#71717A] leading-relaxed font-normal">
                  Pahami mood visual hasil akhir foto Anda. Tentukan arah tone warna hangat, bersih,
                  maupun hitam putih klasik sebelum foto masuk dapur cetak.
                </p>
              </div>
            </div>

            {/* Right Column: Top Card and 2 Bottom Half-Cards */}
            <div className="md:col-span-6 flex flex-col gap-5 sm:gap-6">
              {/* Bento Card 2: Catatan Revisi Per Frame */}
              <div className="mtioon-card p-7 sm:p-8 flex flex-col justify-between">
                <div>
                  <h2 className="font-display font-[900] text-4xl sm:text-5xl text-[#121212] tracking-tight">
                    Catatan detail.
                  </h2>

                  <div className="mt-6 mb-5">
                    <div
                      onClick={() => handleSearchSession(undefined, primarySample.projectId)}
                      className="cursor-pointer bg-black/[0.04] hover:bg-black/[0.07] border border-black/[0.05] rounded-full px-5 py-3 flex items-center justify-between text-xs sm:text-sm text-[#52525B] transition-colors"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="truncate">&ldquo;Rapikan rambut samping & kulit lebih hangat&rdquo;</span>
                        <span className="inline-block w-1.5 h-3.5 bg-[#FF5A1F] animate-pulse shrink-0" />
                      </span>
                      <span className="text-[11px] font-bold text-[#FF5A1F] shrink-0 ml-2">Coba &rarr;</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-base sm:text-lg text-[#121212] tracking-tight">
                    Tepat sasaran di setiap foto.
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-[#71717A] leading-relaxed font-normal">
                    Setiap foto memiliki kolom instruksi khusus. Anda tidak perlu lagi repot membuat
                    tangkapan layar ponsel satu per satu untuk menunjukkan bagian yang ingin dipoles.
                  </p>
                </div>
              </div>

              {/* Bottom Row: 2 Split Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                {/* Bento Card 3: Resolusi Penuh */}
                <div className="mtioon-card p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-black/[0.05] text-[10.5px] font-semibold text-[#52525B]">
                        Resolusi Penuh
                      </span>

                      <div className="flex items-center gap-1">
                        {(["100%", "RAW", "4K"] as const).map((z) => (
                          <button
                            key={z}
                            onClick={() => setActiveZoom(z)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                              activeZoom === z
                                ? "bg-[#121212] text-white"
                                : "text-[#71717A] hover:bg-black/[0.05]"
                            }`}
                          >
                            {z}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="my-6 text-center select-none">
                      <span className="font-display font-[900] text-5xl sm:text-6xl tracking-tight text-[#121212]">
                        {activeZoom}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-display font-bold text-sm text-[#121212]">
                      Inspeksi tanpa kompresi.
                    </h4>
                    <p className="mt-1 text-[11px] text-[#71717A] leading-normal font-normal">
                      Periksa ketajaman fokus lensa dan detail ekspresi wajah secara jernih.
                    </p>
                  </div>
                </div>

                {/* Bento Card 4: Fokus & Tatapan (Interactive Eyes) */}
                <div
                  ref={eyesContainerRef}
                  className="mtioon-card p-6 flex flex-col justify-between overflow-hidden relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-black/[0.05] text-[10.5px] font-semibold text-[#52525B]">
                      Fokus & Tatapan
                    </span>
                  </div>

                  {/* Two Interactive Eyes that follow mouse pointer */}
                  <div className="my-6 flex items-center justify-center gap-2 select-none">
                    <div className="w-12 h-12 rounded-full bg-[#121212] flex items-center justify-center relative shadow-sm">
                      <div
                        className="w-5 h-5 rounded-full bg-white flex items-center justify-center transition-transform duration-75"
                        style={{
                          transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`,
                        }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-[#121212]" />
                      </div>
                    </div>

                    <div className="w-12 h-12 rounded-full bg-[#121212] flex items-center justify-center relative shadow-sm">
                      <div
                        className="w-5 h-5 rounded-full bg-white flex items-center justify-center transition-transform duration-75"
                        style={{
                          transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`,
                        }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-[#121212]" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-display font-bold text-sm text-[#121212]">
                      Fokus tajam pada tatapan.
                    </h4>
                    <p className="mt-1 text-[11px] text-[#71717A] leading-normal font-normal">
                      Pastikan ekspresi mata terbuka sempurna sebelum foto dimasukkan ke album fisik.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Visual Photography Showcase Grid */}
        <section id="showcase" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
            <div>
              <span className="px-3 py-1 rounded-full bg-[#FF5A1F]/10 text-[#FF5A1F] text-xs font-bold">
                Koleksi Galeri
              </span>
              <h2 className="mt-2 font-display font-[900] text-2xl sm:text-3xl text-[#121212] tracking-tight">
                Standar Kualitas Visual & Kurasi
              </h2>
              <p className="text-xs sm:text-sm text-[#71717A] mt-1 max-w-xl font-normal">
                Setiap foto disajikan dalam resolusi tinggi untuk mempermudah pemilihan detail dan ekspresi terbaik.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#71717A]">
                Resolusi Penuh • Inspeksi 2x
              </span>
            </div>
          </div>

          {!isBooted ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={`skeleton-${i}`}
                  className="skeleton relative rounded-2xl aspect-[4/5] bg-black/[0.06]"
                />
              ))}
            </div>
          ) : previewShowcase.length === 0 ? (
            <div className="mtioon-card p-10 text-center">
              <Images className="w-8 h-8 text-[#A1A1AA] mx-auto mb-3" />
              <p className="text-sm font-bold text-[#121212]">
                Belum ada foto yang dimuat
              </p>
              <p className="text-xs text-[#71717A] mt-1 font-normal">
                Foto akan muncul otomatis setelah galeri sesi diisi.
              </p>
            </div>
          ) : (
            <ShowcaseStrip items={previewShowcase} onPick={focusSessionForm} />
          )}
        </section>

        {/* 3-Step Clean Workflow */}
        <section id="cara-kerja" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="px-3 py-1 rounded-full bg-black/[0.04] text-[#52525B] text-xs font-semibold">
              Alur Kerja
            </span>
            <h2 className="mt-2 font-display font-[900] text-3xl text-[#121212] tracking-tight">
              Tiga Langkah Mudah
            </h2>
            <p className="mt-1 text-sm text-[#71717A] font-normal">
              Dari memasukkan kode hingga konfirmasi daftar foto pilihan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="mtioon-card p-7 flex flex-col justify-between">
              <div>
                <span className="w-8 h-8 rounded-full bg-[#121212] text-white font-display font-black text-sm flex items-center justify-center mb-4 shadow-sm">
                  1
                </span>
                <h3 className="font-display font-bold text-base text-[#121212]">
                  Buka Galeri Privat
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#71717A] leading-relaxed font-normal">
                  Gunakan tautan langsung atau ketikkan kode sesi yang diberikan. Masukkan kata sandi jika sesi Anda diproteksi.
                </p>
              </div>
            </div>

            <div className="mtioon-card p-7 flex flex-col justify-between">
              <div>
                <span className="w-8 h-8 rounded-full bg-[#FF5A1F] text-white font-display font-black text-sm flex items-center justify-center mb-4 shadow-sm">
                  2
                </span>
                <h3 className="font-display font-bold text-base text-[#121212]">
                  Tandai & Beri Catatan
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#71717A] leading-relaxed font-normal">
                  Pilih foto favorit hingga batas kuota paket. Perbesar foto untuk inspeksi 2x dan sematkan catatan retouching spesifik.
                </p>
              </div>
            </div>

            <div className="mtioon-card p-7 flex flex-col justify-between">
              <div>
                <span className="w-8 h-8 rounded-full bg-[#121212] text-white font-display font-black text-sm flex items-center justify-center mb-4 shadow-sm">
                  3
                </span>
                <h3 className="font-display font-bold text-base text-[#121212]">
                  Kirim ke Fotografer
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#71717A] leading-relaxed font-normal">
                  Kirimkan daftar foto pilihan dan instruksi revisi langsung via WhatsApp atau ekspor berkas manifest rapi.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/[0.06] py-10 px-4 sm:px-6 lg:px-8 bg-white/50 text-xs text-[#71717A]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandMark iconClassName="w-6 h-6" textClassName="text-lg" />

          <div className="flex items-center gap-4 text-xs font-semibold text-[#71717A]">
            <span>Privasi Terjaga</span>
            <span>•</span>
            <span>Tipografi Sunghyun Sans</span>
            <span>•</span>
            <span
              onDoubleClick={() => setViewMode("admin")}
              className="cursor-default select-none hover:text-[#121212] transition-colors"
              title="aryst studio"
            >
              &copy; {new Date().getFullYear()} aryst studio
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
