import React, { useState, useRef, useEffect, useMemo } from "react";
import { useProofingStore } from "@/lib/storage";
import { BrandMark } from "@/components/BrandMark";
import {
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
  Users,
} from "lucide-react";

const shellClass =
  "fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-6xl bg-zinc-950/85 border border-zinc-800/80 rounded-2xl px-3 sm:px-4 h-16 flex items-center justify-between gap-3 backdrop-blur-md shadow-xl shadow-black/40";

const iconBtnClass =
  "p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors";

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

  // Landing has its own header
  if (viewMode === "landing") {
    return null;
  }

  const liveDot = isP2PConnected ? (
    <span
      title="Tersambung realtime"
      className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
    />
  ) : null;

  // ── Admin navbar ──────────────────────────────────────────
  // Slim control bar docked to the right of the sidebar (no duplicate brand).
  if (viewMode === "admin") {
    return (
      <header className="fixed top-3 sm:top-4 z-40 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] lg:left-[276px] lg:right-3 lg:w-auto lg:translate-x-0 h-16 flex items-center justify-between gap-2 bg-zinc-950/85 border border-zinc-800/80 rounded-2xl px-3 sm:px-4 backdrop-blur-md shadow-xl shadow-black/40">
        {/* Brand: only on small screens where the sidebar is hidden */}
        <div className="flex lg:hidden items-center gap-2.5 min-w-0">
          <div
            onDoubleClick={() => setViewMode("admin")}
            className="cursor-default"
            title="ARYST"
          >
            <BrandMark iconClassName="w-7 h-7" textClassName="text-sm" />
          </div>
          {liveDot}
        </div>

        {/* Session switcher */}
        {clientProjects.length > 0 && (
          <div className="relative min-w-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsSessionDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-amber-400/50 ${
                  isSessionDropdownOpen
                    ? "bg-zinc-900 border-zinc-700 text-white"
                    : "bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
                }`}
                aria-expanded={isSessionDropdownOpen}
                aria-label="Pilih sesi klien aktif"
              >
                <span className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-[11px] font-bold text-amber-400 shrink-0">
                  {activeProject?.clientName
                    ? activeProject.clientName.charAt(0).toUpperCase()
                    : "-"}
                </span>
                <span className="text-left hidden md:block max-w-[140px] leading-tight">
                  <span className="block text-xs font-semibold text-white truncate">
                    {activeProject?.clientName || "Pilih Sesi"}
                  </span>
                  <span className="block text-[10px] text-zinc-400 font-mono truncate">
                    {activeProject?.projectId || ""}
                  </span>
                </span>
                <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              </button>

              {isSessionDropdownOpen && (
                <div className="absolute top-full mt-2 left-0 w-72 sm:w-80 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/70 z-50 p-2 flex flex-col gap-1.5">
                  {clientProjects.length >= 2 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={sessionSearch}
                        onChange={(e) => setSessionSearch(e.target.value)}
                        placeholder="Cari nama / ID..."
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-400 focus:outline-none transition-colors"
                        autoFocus
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between px-2 pt-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    <span>Sesi</span>
                    <span>{filteredProjects.length}</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-0.5">
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
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                            isCurrent
                              ? "bg-zinc-900 border border-zinc-700/80 text-white"
                              : "hover:bg-zinc-900 border border-transparent text-zinc-300 hover:text-white"
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border ${
                                isCurrent
                                  ? "bg-amber-400/10 border-amber-400/30 text-amber-400"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400"
                              }`}
                            >
                              {p.clientName.charAt(0).toUpperCase()}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold truncate leading-snug">
                                {p.clientName}
                              </span>
                              <span className="block text-[10px] text-zinc-400 font-mono truncate">
                                {p.projectId} • {p.maxQuota} foto
                                {(p.password || p.passwordHash) ? " • 🔒" : ""}
                              </span>
                            </span>
                          </span>
                          {isCurrent && (
                            <Check className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}

                    {filteredProjects.length === 0 && (
                      <div className="text-center py-5 text-xs text-zinc-400">
                        Tidak ada hasil untuk &ldquo;{sessionSearch}&rdquo;
                      </div>
                    )}
                  </div>

                  <div className="border-t border-zinc-800/80 pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSessionDropdownOpen(false);
                        setSessionSearch("");
                        const el = document.getElementById(
                          "admin-add-session-btn"
                        );
                        if (el) el.click();
                        else window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold text-amber-400 hover:bg-amber-400/10 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Sesi</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setViewMode("client")}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Galeri</span>
          </button>
          <button
            onClick={() => setViewMode("client")}
            className="sm:hidden p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-colors"
            title="Galeri Klien"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={() => setViewMode("landing")}
            className={iconBtnClass}
            title="Beranda"
          >
            <Home className="w-4 h-4" />
          </button>

          <button
            onClick={logoutAdmin}
            className={iconBtnClass}
            title="Logout Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>
    );
  }

  // ── Client navbar ─────────────────────────────────────────
  return (
    <header className={shellClass}>
      {/* Brand */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          onDoubleClick={() => setViewMode("admin")}
          className="cursor-default shrink-0"
          title="ARYST"
        >
          <BrandMark />
        </div>
        {(session.projectId || session.clientName) && (
          <>
            <span className="hidden sm:block w-px h-6 bg-zinc-800 shrink-0" />
            <span className="hidden sm:block text-[11px] font-mono font-medium text-zinc-400 truncate max-w-[180px]">
              {session.projectId || session.clientName}
            </span>
          </>
        )}
        {activeProject?.sessionMode === "group" && (
          <span
            title={
              activeProject.members?.length
                ? `Anggota: ${activeProject.members.join(", ")}`
                : "Sesi grup dengan kuota bersama"
            }
            className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-[10px] font-semibold text-zinc-300"
          >
            <Users className="w-3 h-3 text-amber-400" />
            <span>
              Grup{activeProject.members?.length ? ` · ${activeProject.members.length}` : ""}
            </span>
          </span>
        )}
        {liveDot}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {session.isLocked && (
          <span
            title="Seleksi dikunci"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-400"
          >
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Terkunci</span>
          </span>
        )}

        <button
          onClick={() => setIsSubmissionOpen(true)}
          className={`flex items-center gap-2 pl-3.5 pr-2 py-2 text-xs font-bold rounded-xl transition-colors focus:outline-none ${
            isFull
              ? "bg-emerald-400 hover:bg-emerald-300 text-zinc-950"
              : "bg-amber-400 hover:bg-amber-300 text-zinc-950"
          }`}
        >
          {isFull ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span className="hidden xs:inline sm:inline">Kirim</span>
          <span className="px-2 py-0.5 rounded-lg bg-zinc-950/15 text-zinc-950 text-[11px] font-extrabold tabular-nums">
            {selectedCount}/{session.maxQuota}
          </span>
        </button>

        <button
          onClick={() => setViewMode("landing")}
          className={iconBtnClass}
          title="Beranda"
        >
          <Home className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
