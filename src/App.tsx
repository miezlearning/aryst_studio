import React, { useEffect } from "react";
import { useProofingStore } from "@/lib/storage";
import { Navbar } from "@/components/Navbar";
import { BrandMark } from "@/components/BrandMark";
import { LandingPage } from "@/components/LandingPage";
import { MasonryGallery } from "@/components/MasonryGallery";
import { FloatingDock } from "@/components/FloatingDock";
import { LightboxModal } from "@/components/LightboxModal";
import { SubmissionModal } from "@/components/SubmissionModal";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminAuthGate } from "@/components/AdminAuthGate";
import { PasswordGate } from "@/components/PasswordGate";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { Home, Calendar, ChevronRight } from "lucide-react";

const getSessionCoverUrl = (proj?: { coverPhotoUrl?: string; sessionType?: string }): string => {
  if (proj?.coverPhotoUrl) return proj.coverPhotoUrl;
  const sType = (proj?.sessionType || "").toLowerCase();
  if (sType.includes("prewed")) {
    return "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=85";
  }
  if (sType.includes("nikah") || sType.includes("wedding")) {
    return "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1600&q=85";
  }
  if (sType.includes("maternity") || sType.includes("hamil")) {
    return "https://images.unsplash.com/photo-1544126592-807ade215a0b?auto=format&fit=crop&w=1600&q=85";
  }
  if (sType.includes("lamaran") || sType.includes("engagement")) {
    return "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=85";
  }
  return "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1600&q=85";
};

export const App: React.FC = () => {
  const {
    init,
    session,
    viewMode,
    setViewMode,
    isPasswordUnlocked,
    isAdminAuthenticated,
    clientProjects,
    activeProjectId,
    switchProject,
    isSidebarActive,
  } = useProofingStore();

  useEffect(() => {
    init();
  }, [init]);

  // Discreet shortcut for photographer to toggle admin mode without public buttons (Alt + A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === "a") || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a")) {
        e.preventDefault();
        setViewMode(viewMode === "admin" ? "client" : "admin");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, setViewMode]);

  // Client-view download guard: block right-click, drag-out and save/print
  // shortcuts so photos cannot be pulled down casually from the gallery
  useEffect(() => {
    if (viewMode !== "client") return;

    const stopContext = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      // Keep the native menu on text fields so pasting still works
      if (target?.closest("input, textarea")) return;
      e.preventDefault();
    };
    const stopDrag = (e: DragEvent) => e.preventDefault();
    const stopShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && ["s", "p"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    window.addEventListener("contextmenu", stopContext);
    window.addEventListener("dragstart", stopDrag);
    window.addEventListener("keydown", stopShortcut);
    return () => {
      window.removeEventListener("contextmenu", stopContext);
      window.removeEventListener("dragstart", stopDrag);
      window.removeEventListener("keydown", stopShortcut);
    };
  }, [viewMode]);

  // Current session & other sessions belonging to this same client
  const currentProject = clientProjects.find((p) => p.id === activeProjectId);
  const clientNameKey = (currentProject?.clientName || session.clientName || "").trim().toLowerCase();
  const clientOtherSessions = clientProjects.filter(
    (p) => p.clientName.trim().toLowerCase() === clientNameKey
  );

  const currentSessionIndex = clientOtherSessions.findIndex((p) => p.id === activeProjectId);
  const nextSessionIndex =
    currentSessionIndex >= 0 && clientOtherSessions.length > 0
      ? (currentSessionIndex + 1) % clientOtherSessions.length
      : 0;
  const nextProject = clientOtherSessions[nextSessionIndex];
  const hasMultipleSessions = clientOtherSessions.length > 1;

  // If in Landing Page mode, render dedicated landing experience
  if (viewMode === "landing") {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0E0E12] text-[#121212] dark:text-[#F4F4F6] flex flex-col font-sans selection:bg-[#FF5A1F]/20 selection:text-[#E8470B] transition-colors duration-200">
      {/* Offline Alert Bar */}
      <OfflineIndicator />

      {/* Main Adaptive Floating Navbar */}
      <Navbar />

      {/* View Orchestration: Admin View vs Client View */}
      {viewMode === "admin" ? (
        <main className="flex-1 pt-24 sm:pt-28">
          {!isAdminAuthenticated ? <AdminAuthGate /> : <AdminDashboard />}
        </main>
      ) : !isPasswordUnlocked ? (
        <main className="flex-1 pt-24 sm:pt-28">
          <PasswordGate />
        </main>
      ) : (
        <div
          className={`flex-1 flex flex-col transition-[padding] duration-200 ease-out will-change-[padding] ${
            isSidebarActive ? "lg:pl-[310px] lg:pr-6" : ""
          }`}
        >
            {/* Client Welcome Brief with Integrated Session Switcher in 1 Single Container */}
            <section className="pt-28 pb-8 px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                <div className="mtioon-card group relative overflow-hidden rounded-[28px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#18181C] shadow-sm flex flex-col lg:flex-row items-stretch justify-between min-h-[290px] lg:min-h-[310px]">
                  {/* Absolute Background Photo Bleed on the Right (Natural Gradient Divider) */}
                  {hasMultipleSessions && nextProject && (
                    <div className="absolute right-0 top-0 bottom-0 w-full lg:w-[66%] xl:w-[60%] h-full overflow-hidden pointer-events-none select-none session-bleed-mask">
                      <img
                        src={getSessionCoverUrl(nextProject)}
                        alt={nextProject.sessionTitle || nextProject.sessionType || "Sesi Berikutnya"}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                        loading="lazy"
                      />
                      {/* Dark vignette to ensure white text and orange button pop with maximum contrast */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
                    </div>
                  )}

                  {/* Left: Client Info, Session Badges, Quota & Instructions */}
                  <div className="relative z-10 p-6 sm:p-8 flex-1 min-w-0 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Session Type Badge, Date, and Auto-save indicator */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {currentProject?.sessionType && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/20">
                            {currentProject.sessionType}
                          </span>
                        )}
                        {currentProject?.sessionDate && (
                          <span className="text-xs text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] font-medium border border-transparent dark:border-white/[0.04]">
                            <Calendar className="w-3.5 h-3.5 text-[#52525B] dark:text-[#A1A1AA]" />
                            <span>{currentProject.sessionDate}</span>
                          </span>
                        )}
                        <span className="text-xs text-[#71717A] dark:text-[#A1A1AA] font-medium hidden sm:inline-flex items-center gap-1">
                          ✓ Pilihan tersimpan otomatis
                        </span>
                      </div>

                      <h1 className="font-display font-[900] text-3xl sm:text-4xl text-[#121212] dark:text-white tracking-tight">
                        Halo, {session.clientName || "Klien Terhormat"}
                      </h1>

                      {(currentProject?.sessionTitle || currentProject?.location) && (
                        <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] font-medium">
                          {currentProject?.sessionTitle}
                          {currentProject?.sessionTitle && currentProject?.location && (
                            <span className="text-[#A1A1AA]"> · </span>
                          )}
                          <span className="text-[#71717A] dark:text-[#A1A1AA]">{currentProject?.location}</span>
                        </p>
                      )}

                      <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">
                        Pilih hingga{" "}
                        <strong className="text-[#FF5A1F] font-bold">{session.maxQuota} foto terbaik</strong>
                        . Klik foto untuk membuka inspeksi 2x dan catatan revisi.
                      </p>
                    </div>

                    {/* Deadline Countdown without nested card */}
                    {currentProject?.selectionDeadline ? (
                      <div className="pt-2 max-w-sm">
                        <DeadlineCountdown
                          variant="minimal"
                          deadline={currentProject.selectionDeadline}
                          createdAt={currentProject.createdAt}
                        />
                      </div>
                    ) : (
                      <div className="pt-2 text-xs text-[#A1A1AA] flex items-center gap-1.5 font-medium">
                        <span>Pastikan pilihan foto sudah final sebelum batas kurasi ditutup.</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Natural Gradient Divider & Integrated Next Session Experience */}
                  {hasMultipleSessions && nextProject && (
                    <div
                      onClick={() => switchProject(nextProject.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          switchProject(nextProject.id);
                        }
                      }}
                      className="portal-session-container group/portal relative z-10 cursor-pointer p-6 sm:p-8 lg:w-[480px] xl:w-[540px] 2xl:w-[580px] flex flex-col justify-between h-full min-h-[280px] lg:min-h-[310px] select-none shrink-0"
                    >
                      {/* Top Header Row (NO Sparkle Emoji / AI Slop!) */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/95 backdrop-blur-md text-[#121212] shadow-sm">
                          Sesi Berikutnya
                        </span>

                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-sm">
                          {nextSessionIndex + 1} dari {clientOtherSessions.length}
                        </span>
                      </div>

                      {/* Bottom Session Details & Editorial Floating Pill CTA */}
                      <div className="pt-6 space-y-3.5">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wide bg-[#FF5A1F] text-white shadow-sm">
                              {nextProject.sessionType || "Sesi"}
                            </span>
                            {nextProject.sessionDate && (
                              <span className="text-xs text-zinc-100 font-medium truncate drop-shadow-sm flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-zinc-300" />
                                <span>{nextProject.sessionDate}</span>
                              </span>
                            )}
                          </div>
                          <h4 className="font-display font-[900] text-lg sm:text-xl text-white drop-shadow-md leading-snug">
                            {nextProject.sessionTitle || nextProject.location || nextProject.projectId}
                          </h4>
                          {nextProject.location && (
                            <p className="text-xs sm:text-sm text-zinc-200 drop-shadow-sm font-medium mt-1">
                              {nextProject.location}
                            </p>
                          )}
                        </div>

                        {/* Action Row: Quick jump pills + Editorial Glass Pill CTA */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/15">
                          {/* Quick jump for all sessions if 3+ */}
                          {clientOtherSessions.length > 2 ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] text-white/70 font-semibold uppercase tracking-wider mr-0.5">
                                Pilih:
                              </span>
                              {clientOtherSessions.map((projSession, idx) => {
                                const isCurrent = projSession.id === activeProjectId;
                                return (
                                  <button
                                    key={projSession.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      switchProject(projSession.id);
                                    }}
                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                                      isCurrent
                                        ? "bg-white text-[#121212] shadow-sm font-bold"
                                        : "bg-black/40 hover:bg-black/60 text-white/90 backdrop-blur-sm border border-white/15"
                                    }`}
                                    title={`${projSession.sessionType || "Sesi"} · ${projSession.location || ""}`}
                                  >
                                    {projSession.sessionType || `Sesi ${idx + 1}`}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div />
                          )}

                          {/* Editorial Glass Pill CTA - Sleek, Horizontal, Warm Accent */}
                          <div className="portal-cta-pill inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/95 text-[#121212] backdrop-blur-md text-xs sm:text-sm font-bold shadow-md border border-white/30 transition-all duration-300 ml-auto">
                            <span>Buka Sesi {nextProject.sessionType || "Ini"}</span>
                            <div className="portal-cta-arrow w-5 h-5 rounded-full bg-black/10 flex items-center justify-center transition-all duration-300">
                              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5] text-current" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback if single session with deadline */}
                  {!hasMultipleSessions && currentProject?.selectionDeadline && (
                    <div className="relative z-10 shrink-0 self-start p-6 sm:p-8 w-full sm:w-64 space-y-2">
                      <DeadlineCountdown
                        variant="minimal"
                        deadline={currentProject.selectionDeadline}
                        createdAt={currentProject.createdAt}
                      />
                      <p className="text-xs text-[#71717A] text-left sm:text-right font-medium">
                        ✓ Pilihan tersimpan otomatis
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Main Masonry Gallery Area */}
            <main className="flex-1">
              <MasonryGallery />
            </main>

            {/* Sticky Bottom Dock */}
            <FloatingDock />

            {/* Full-Screen Lightbox Inspector */}
            <LightboxModal />

            {/* Review & Export Submission Modal */}
            <SubmissionModal />

            {/* Footer */}
            <footer className="border-t border-black/[0.06] dark:border-white/[0.08] py-8 px-4 sm:px-6 lg:px-8 text-xs text-[#71717A] dark:text-[#A1A1AA] bg-white/60 dark:bg-[#121216]/60 mt-auto transition-colors">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <BrandMark iconClassName="w-6 h-6" textClassName="text-base" />

                <div className="flex items-center gap-4 text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
                  <button
                    onClick={() => setViewMode("landing")}
                    className="flex items-center gap-1.5 text-[#52525B] dark:text-[#A1A1AA] hover:text-[#121212] dark:hover:text-white transition-colors"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Halaman Utama</span>
                  </button>
                  <span>•</span>
                  <span
                    onDoubleClick={() => setViewMode("admin")}
                    className="cursor-default select-none hover:text-[#121212] dark:hover:text-white transition-colors"
                    title="aryst studio"
                  >
                    &copy; {new Date().getFullYear()} aryst studio
                  </span>
                </div>
              </div>
            </footer>
          </div>
      )}
    </div>
  );
};

export default App;
