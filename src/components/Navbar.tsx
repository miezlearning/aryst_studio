import React, { useState, useRef, useEffect, useMemo } from "react";
import { useProofingStore } from "@/lib/storage";
import {
  Camera,
  Send,
  CheckCircle2,
  Lock,
  Eye,
  Home,
  LogOut,
  ChevronsUpDown,
  Check,
  Search,
  Plus,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const {
    session,
    setIsSubmissionOpen,
    viewMode,
    setViewMode,
    clientProjects,
    activeProjectId,
    switchProject,
    logoutAdmin,
    isP2PConnected,
  } = useProofingStore();

  const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCount = session.selectedPhotoIds.length;
  const isFull = selectedCount >= session.maxQuota;

  const activeProject =
    clientProjects.find((p) => p.id === activeProjectId) || clientProjects[0];

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsSessionDropdownOpen(false);
        setSessionSearch("");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSessionDropdownOpen(false);
        setSessionSearch("");
      }
    };

    if (isSessionDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSessionDropdownOpen]);

  const filteredProjects = useMemo(() => {
    if (!sessionSearch.trim()) return clientProjects;
    const q = sessionSearch.toLowerCase().trim();
    return clientProjects.filter(
      (p) =>
        p.clientName.toLowerCase().includes(q) ||
        p.projectId.toLowerCase().includes(q)
    );
  }, [clientProjects, sessionSearch]);

  // Don't render top navbar on Landing page as LandingPage has its own dedicated floating header
  if (viewMode === "landing") {
    return null;
  }

  // Admin View Floating Centered Navbar
  if (viewMode === "admin") {
    return (
      <header className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-6xl bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 sm:px-5 h-14 flex items-center justify-between backdrop-blur-md shadow-xl shadow-black/30">
        {/* Admin Identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white">
                Aryst Lens Studio
              </span>
              <span className="text-[10px] font-semibold text-amber-400 px-1.5 py-0.2 rounded bg-amber-400/10 border border-amber-400/20">
                Admin
              </span>
              {isP2PConnected && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Sinkron Realtime
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Manajemen Sesi & Galeri Klien Fotografi
            </p>
          </div>
        </div>

        {/* Controls: Modern Workspace/Session Switcher Popover & View Toggle */}
        <div className="flex items-center gap-2">
          {clientProjects.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsSessionDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400/50 ${
                  isSessionDropdownOpen
                    ? "bg-zinc-800 border-zinc-700 text-white"
                    : "bg-zinc-950/80 hover:bg-zinc-800/80 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white"
                }`}
                aria-expanded={isSessionDropdownOpen}
                aria-label="Pilih sesi klien aktif"
              >
                <div className="w-5 h-5 rounded-md bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                  {activeProject?.clientName
                    ? activeProject.clientName.charAt(0).toUpperCase()
                    : "S"}
                </div>

                <div className="text-left hidden sm:block max-w-[150px]">
                  <div className="text-white font-medium text-xs truncate leading-tight">
                    {activeProject?.clientName || "Pilih Sesi"}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono truncate leading-none mt-0.5">
                    {activeProject?.projectId || "Tanpa ID"}
                  </div>
                </div>

                <div className="sm:hidden text-white font-medium text-xs max-w-[90px] truncate">
                  {activeProject?.clientName || "Sesi"}
                </div>

                <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-0.5" />
              </button>

              {/* Modern Popover Dropdown Menu (Linear / Raycast / Vercel style) */}
              {isSessionDropdownOpen && (
                <div className="absolute top-full mt-2 right-0 sm:right-auto sm:left-0 w-72 sm:w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl shadow-black/80 z-50 p-2 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                  {/* Quick Search */}
                  {clientProjects.length >= 2 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={sessionSearch}
                        onChange={(e) => setSessionSearch(e.target.value)}
                        placeholder="Cari nama klien atau ID..."
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Section Header */}
                  <div className="flex items-center justify-between px-2 pt-1 pb-0.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    <span>Sesi Klien</span>
                    <span>{filteredProjects.length} Sesi</span>
                  </div>

                  {/* List of Sessions */}
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                    {filteredProjects.map((p) => {
                      const isCurrent = p.id === activeProjectId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            switchProject(p.id);
                            setIsSessionDropdownOpen(false);
                            setSessionSearch("");
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors group cursor-pointer ${
                            isCurrent
                              ? "bg-zinc-800/90 border border-zinc-700/80 text-white"
                              : "hover:bg-zinc-800/60 border border-transparent text-zinc-300 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 border ${
                                isCurrent
                                  ? "bg-amber-400/10 border-amber-400/30 text-amber-400"
                                  : "bg-zinc-800 border-zinc-700 text-zinc-400 group-hover:text-zinc-200"
                              }`}
                            >
                              {p.clientName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate leading-snug">
                                {p.clientName}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                                <span className="font-mono text-zinc-400">
                                  {p.projectId}
                                </span>
                                <span>•</span>
                                <span>{p.maxQuota} foto</span>
                                {p.password && (
                                  <>
                                    <span>•</span>
                                    <Lock className="w-2.5 h-2.5 text-zinc-400 inline" />
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {isCurrent && (
                            <Check className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}

                    {filteredProjects.length === 0 && (
                      <div className="text-center py-5 text-xs text-zinc-500">
                        Tidak ada sesi yang cocok dengan "{sessionSearch}"
                      </div>
                    )}
                  </div>

                  {/* Footer Quick Action */}
                  <div className="border-t border-zinc-800 pt-1.5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSessionDropdownOpen(false);
                        setSessionSearch("");
                        const el = document.getElementById(
                          "admin-add-session-btn"
                        );
                        if (el) {
                          el.click();
                        } else {
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium text-amber-400 hover:bg-amber-400/10 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah & Kelola Sesi Klien</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setViewMode("client")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Galeri Klien</span>
          </button>

          <button
            onClick={() => setViewMode("landing")}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
            title="Ke Halaman Utama"
          >
            <Home className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={logoutAdmin}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-rose-400 border border-zinc-700 transition-colors"
            title="Kunci & Logout Admin"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>
    );
  }

  // Client View Floating Centered Navbar (COMPLETELY CLEAN - ZERO ADMIN BUTTON IN PUBLIC)
  return (
    <header className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-6xl bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 sm:px-5 h-14 flex items-center justify-between backdrop-blur-md shadow-xl shadow-black/30">
      {/* Brand identity (Secret photographer backdoor: double click camera icon) */}
      <div className="flex items-center gap-3">
        <div
          onDoubleClick={() => setViewMode("admin")}
          className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 shrink-0 cursor-default select-none"
          title="Aryst Lens Studio"
        >
          <Camera className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-white">
              Aryst Lens Studio
            </span>
            {isP2PConnected && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Tersambung
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 truncate max-w-[170px] sm:max-w-xs">
            {session.clientName || "Klien"} • {session.projectId || "Project"}
          </p>
        </div>
      </div>

      {/* Action Controls for Client (Pure client controls, NO public admin button) */}
      <div className="flex items-center gap-2">
        {session.isLocked && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Seleksi Dikunci</span>
          </div>
        )}

        {/* Review / Export Modal Trigger */}
        <button
          onClick={() => setIsSubmissionOpen(true)}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors focus:outline-none ${
            isFull
              ? "bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold"
              : "bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold"
          }`}
        >
          {isFull ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
          <span>Kirim Seleksi</span>
          <span className="px-1.5 py-0.2 rounded bg-zinc-950/20 text-zinc-950 text-[11px] font-extrabold">
            {selectedCount}/{session.maxQuota}
          </span>
        </button>

        {/* Home button */}
        <button
          onClick={() => setViewMode("landing")}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
          title="Ke Halaman Utama"
        >
          <Home className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
