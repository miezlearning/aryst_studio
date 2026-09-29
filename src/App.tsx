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
import { Sliders, Eye, Home, MapPin, Target, Calendar, Sparkles } from "lucide-react";

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

  // Current session & other sessions belonging to this same client
  const currentProject = clientProjects.find((p) => p.id === activeProjectId);
  const clientNameKey = (currentProject?.clientName || session.clientName || "").trim().toLowerCase();
  const clientOtherSessions = clientProjects.filter(
    (p) => p.clientName.trim().toLowerCase() === clientNameKey
  );

  // If in Landing Page mode, render dedicated landing experience
  if (viewMode === "landing") {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-300">
      {/* Offline Alert Bar */}
      <OfflineIndicator />

      {/* Main Adaptive Floating Navbar */}
      <Navbar />

      {/* View Orchestration: Admin View vs Client View */}
      {viewMode === "admin" ? (
        <main className="flex-1 pt-20 sm:pt-24">
          {!isAdminAuthenticated ? <AdminAuthGate /> : <AdminDashboard />}
        </main>
      ) : !isPasswordUnlocked ? (
        <main className="flex-1 pt-20 sm:pt-24">
          <PasswordGate />
        </main>
      ) : (
        <>
          {/* Client Welcome Brief with Session Details & Multi-Session Switcher */}
          <section className="border-b border-zinc-900 bg-zinc-950 pt-24 pb-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="space-y-2 flex-1">
                  {/* Session Type Badge & Project ID */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentProject?.sessionType && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                        {currentProject.sessionType}
                      </span>
                    )}
                    <span className="text-xs font-mono font-medium text-zinc-400">
                      {session.projectId || currentProject?.projectId}
                    </span>
                    {currentProject?.sessionDate && (
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        <span>{currentProject.sessionDate}</span>
                      </span>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    Halo, {session.clientName || "Klien Terhormat"}
                  </h1>

                  {currentProject?.sessionTitle && (
                    <p className="text-sm sm:text-base font-semibold text-zinc-200">
                      {currentProject.sessionTitle}
                    </p>
                  )}

                  {/* Venue / Location & Purpose of the Session */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 max-w-3xl">
                    {currentProject?.location && (
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-zinc-500 font-medium">Tempat:</span>
                        <span className="font-medium truncate">{currentProject.location}</span>
                      </div>
                    )}
                    {currentProject?.sessionPurpose && (
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-zinc-500 font-medium">Tujuan Foto:</span>
                        <span className="font-medium truncate">{currentProject.sessionPurpose}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 pt-1 leading-relaxed max-w-2xl">
                    Silakan kurasi dan tandai foto terbaik hingga batas kuota <strong className="text-amber-400 font-semibold">{session.maxQuota} foto</strong>. Klik foto untuk melihat detail atau memberi catatan revisi editing.
                  </p>
                </div>

                <div className="shrink-0 self-start w-full sm:w-64 space-y-2">
                  {currentProject?.selectionDeadline ? (
                    <DeadlineCountdown
                      deadline={currentProject.selectionDeadline}
                      createdAt={currentProject.createdAt}
                    />
                  ) : null}
                  <p className="text-xs text-zinc-500 font-medium text-left sm:text-right">
                    Pilihan tersimpan otomatis
                  </p>
                </div>
              </div>

              {/* Dedicated Multi-Session Hub for Same Client with Different Venues & Purposes */}
              {clientOtherSessions.length > 1 && (
                <div className="mt-5 pt-4 border-t border-zinc-900">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-semibold text-zinc-200">
                        Sesi lain Anda:
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      Klik sesi untuk berganti galeri foto & kuota
                    </span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {clientOtherSessions.map((projSession) => {
                      const isCurrent = projSession.id === activeProjectId;
                      return (
                        <button
                          key={projSession.id}
                          onClick={() => switchProject(projSession.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all shrink-0 text-left ${
                            isCurrent
                              ? "bg-amber-400 text-zinc-950 font-bold shadow-sm"
                              : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800"
                          }`}
                        >
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isCurrent
                                ? "bg-zinc-950/20 text-zinc-950"
                                : "bg-zinc-800 text-amber-400"
                            }`}
                          >
                            {projSession.sessionType || "Sesi"}
                          </span>
                          <div className="flex flex-col">
                            <span className="truncate max-w-[160px] sm:max-w-none">
                              {projSession.location || projSession.sessionTitle || projSession.projectId}
                            </span>
                          </div>
                          <span className={`text-[10px] ml-1 ${isCurrent ? "text-zinc-900/80" : "text-zinc-500"}`}>
                            ({projSession.maxQuota} foto)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
        </>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 px-4 text-xs text-zinc-500 bg-zinc-950 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandMark iconClassName="w-6 h-6" textClassName="text-[13px]" />

          <div className="flex items-center gap-4 text-zinc-500">
            <button
              onClick={() => setViewMode("landing")}
              className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Halaman Utama</span>
            </button>
            <span>•</span>
            {viewMode === "client" ? (
              <button
                onClick={() => setViewMode("admin")}
                className="flex items-center gap-1.5 text-zinc-400 hover:text-amber-400 transition-colors"
                title="Dashboard Fotografer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
            ) : (
              <button
                onClick={() => setViewMode("client")}
                className="flex items-center gap-1.5 text-zinc-400 hover:text-amber-400 transition-colors"
                title="Tampilan Klien"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Tampilan Klien</span>
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
