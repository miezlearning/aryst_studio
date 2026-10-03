import React, { useState, useRef, useEffect, useMemo } from "react";
import { useProofingStore } from "@/lib/storage";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { animate } from "animejs";
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
  ArrowUp,
  MapPin,
  Layers,
  Camera,
} from "lucide-react";

const iconBtnClass =
  "p-2.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#52525B] dark:text-[#A1A1AA] hover:text-[#121212] dark:hover:text-white border border-black/[0.06] dark:border-white/[0.08] transition-colors";

export const Navbar: React.FC = () => {
  const {
    session,
    photos,
    activeFilter,
    setActiveFilter,
    activeSectionFilter,
    setActiveSectionFilter,
    isSidebarActive,
    setIsSidebarActive,
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
      <header className="fixed top-4 z-40 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] lg:left-[284px] lg:right-4 lg:w-auto lg:translate-x-0 h-16 flex items-center justify-between gap-3 bg-white/90 dark:bg-[#141417]/90 border border-black/[0.08] dark:border-white/[0.1] rounded-full px-4 sm:px-6 backdrop-blur-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6)] text-[#121212] dark:text-[#F4F4F6] transition-all">
        {/* Brand: only on small screens where the sidebar is hidden */}
        <div className="flex lg:hidden items-center gap-2.5 min-w-0">
          <div
            onDoubleClick={() => setViewMode("admin")}
            className="cursor-pointer"
            title="aryst studio"
          >
            <BrandMark iconClassName="w-7 h-7" textClassName="text-base" />
          </div>
          {liveDot}
        </div>

        {/* Session switcher */}
        {clientProjects.length > 0 && (
          <div className="relative min-w-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsSessionDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border text-xs font-semibold transition-colors focus:outline-none ${
                isSessionDropdownOpen
                  ? "bg-black/[0.06] dark:bg-white/[0.1] border-black/20 dark:border-white/20 text-[#121212] dark:text-white"
                  : "bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] border-black/[0.06] dark:border-white/[0.08] text-[#52525B] dark:text-[#A1A1AA] hover:text-[#121212] dark:hover:text-white"
              }`}
              aria-expanded={isSessionDropdownOpen}
              aria-label="Pilih sesi klien aktif"
            >
              <span className="w-6 h-6 rounded-full bg-[#FF5A1F]/10 border border-[#FF5A1F]/25 flex items-center justify-center text-[10px] font-bold text-[#FF5A1F] shrink-0">
                {activeProject?.clientName
                  ? activeProject.clientName.charAt(0).toUpperCase()
                  : "-"}
              </span>
              <span className="text-left hidden md:block max-w-[140px] leading-tight">
                <span className="block text-xs font-bold text-[#121212] dark:text-white truncate">
                  {activeProject?.clientName || "Pilih Sesi"}
                </span>
                <span className="block text-[10px] text-[#71717A] dark:text-[#A1A1AA] truncate">
                  {activeProject?.projectId || ""}
                </span>
              </span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
            </button>

            {isSessionDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 w-72 sm:w-80 bg-white border border-black/[0.08] rounded-2xl shadow-xl shadow-black/10 z-50 p-2.5 flex flex-col gap-2">
                {clientProjects.length >= 2 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={sessionSearch}
                      onChange={(e) => setSessionSearch(e.target.value)}
                      placeholder="Cari nama / ID..."
                      className="w-full bg-black/[0.03] border border-black/[0.06] focus:border-black/20 rounded-xl pl-8 pr-3 py-2 text-xs text-[#121212] placeholder-[#A1A1AA] focus:outline-none transition-colors"
                      autoFocus
                    />
                  </div>
                )}

                <div className="flex items-center justify-between px-2 pt-1 text-[10px] font-semibold text-[#71717A] uppercase tracking-wider">
                  <span>Daftar Sesi</span>
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
                            ? "bg-black/[0.05] text-[#121212] font-semibold"
                            : "hover:bg-black/[0.03] text-[#52525B] hover:text-[#121212]"
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
                              isCurrent
                                ? "bg-[#FF5A1F]/10 border-[#FF5A1F]/30 text-[#FF5A1F]"
                                : "bg-black/[0.04] border-black/[0.06] text-[#71717A]"
                            }`}
                          >
                            {p.clientName.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold truncate leading-snug">
                              {p.clientName}
                            </span>
                            <span className="block text-[10px] text-[#71717A] truncate">
                              {p.projectId} • {p.maxQuota} foto
                              {(p.password || p.passwordHash) ? " • 🔒" : ""}
                            </span>
                          </span>
                        </span>
                        {isCurrent && (
                          <Check className="w-4 h-4 text-[#FF5A1F] shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}

                  {filteredProjects.length === 0 && (
                    <div className="text-center py-5 text-xs text-[#71717A]">
                      Tidak ada hasil untuk &ldquo;{sessionSearch}&rdquo;
                    </div>
                  )}
                </div>

                <div className="border-t border-black/[0.06] pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSessionDropdownOpen(false);
                      setSessionSearch("");
                      const el = document.getElementById("admin-add-session-btn");
                      if (el) el.click();
                      else window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold text-[#FF5A1F] hover:bg-[#FF5A1F]/10 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Sesi Baru</span>
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
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full btn-mtioon-primary"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Lihat Galeri</span>
          </button>
          <button
            onClick={() => setViewMode("client")}
            className="sm:hidden p-2 rounded-full btn-mtioon-primary"
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

  // ── Client navbar & Sidebar powered by Anime.js (Hardware Accelerated GPU) ──
  const topNavRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const topNavAnimRef = useRef<any>(null);
  const sidebarAnimRef = useRef<any>(null);
  const isSidebarActiveRef = useRef(isSidebarActive);

  useEffect(() => {
    isSidebarActiveRef.current = isSidebarActive;
  }, [isSidebarActive]);

  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Smooth, reliable scroll listener without stale closures
  useEffect(() => {
    if (viewMode !== "client") return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (window.innerWidth < 1024) {
          if (isSidebarActiveRef.current) setIsSidebarActive(false);
          return;
        }
        const scrollY = window.scrollY;
        // Scrolled down past welcome header into photos (> 160px)
        if (scrollY > 160 && !isSidebarActiveRef.current) {
          setIsSidebarActive(true);
        } else if (scrollY < 80 && isSidebarActiveRef.current) {
          setIsSidebarActive(false);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [viewMode, setIsSidebarActive]);

  // Anime.js GPU transition driver
  useEffect(() => {
    if (viewMode !== "client") return;
    const showSidebar = isDesktop && isSidebarActive;

    // Cancel any running animations to prevent frame conflicts and stutter
    if (topNavAnimRef.current) topNavAnimRef.current.pause?.();
    if (sidebarAnimRef.current) sidebarAnimRef.current.pause?.();

    if (showSidebar) {
      // 1. Top navbar glides up & fades out
      if (topNavRef.current) {
        topNavAnimRef.current = animate(topNavRef.current, {
          translateY: -40,
          opacity: 0,
          duration: 180,
          ease: "outQuad",
          onComplete: () => {
            if (topNavRef.current) topNavRef.current.style.pointerEvents = "none";
          },
        });
      }
      // 2. Left sidebar glides in from left
      if (sidebarRef.current) {
        sidebarRef.current.style.pointerEvents = "auto";
        sidebarAnimRef.current = animate(sidebarRef.current, {
          translateX: [-40, 0],
          opacity: [0, 1],
          duration: 220,
          ease: "outQuad",
        });
      }
    } else {
      // 1. Sidebar glides out to left & fades
      if (sidebarRef.current) {
        sidebarAnimRef.current = animate(sidebarRef.current, {
          translateX: -40,
          opacity: 0,
          duration: 160,
          ease: "outQuad",
          onComplete: () => {
            if (sidebarRef.current) sidebarRef.current.style.pointerEvents = "none";
          },
        });
      }
      // 2. Top navbar glides down into view
      if (topNavRef.current) {
        topNavRef.current.style.pointerEvents = "auto";
        topNavAnimRef.current = animate(topNavRef.current, {
          translateY: [-40, 0],
          opacity: [0, 1],
          duration: 200,
          ease: "outQuad",
        });
      }
    }
  }, [viewMode, isDesktop, isSidebarActive]);

  const sectionStats = useMemo(() => {
    const stats: Record<string, { total: number; selected: number }> = {};
    photos.forEach((p) => {
      const secName = p.section || "Galeri Utama";
      if (!stats[secName]) stats[secName] = { total: 0, selected: 0 };
      stats[secName].total++;
      if (session.selectedPhotoIds.includes(p.id)) {
        stats[secName].selected++;
      }
    });
    return stats;
  }, [photos, session.selectedPhotoIds]);

  const sectionsList = useMemo(() => {
    const defined = activeProject?.sections || [];
    const photoSections = Array.from(
      new Set(photos.map((p) => p.section).filter(Boolean) as string[])
    );

    const merged: { id: string; name: string; location?: string; description?: string }[] = [];
    const seen = new Set<string>();

    defined.forEach((s) => {
      merged.push(s);
      seen.add(s.name);
    });

    photoSections.forEach((sName) => {
      if (!seen.has(sName)) {
        const matchingPhoto = photos.find((p) => p.section === sName);
        merged.push({
          id: `sec-${sName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          name: sName,
          location: matchingPhoto?.location || "",
        });
        seen.add(sName);
      }
    });

    return merged;
  }, [activeProject, photos]);

  const handleChapterClick = (chapterName: string, index: number) => {
    setActiveSectionFilter(chapterName);
    setTimeout(() => {
      const el = document.getElementById(`section-${index}`);
      if (el) {
        const yOffset = -24;
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 40);
  };

  const remaining = Math.max(0, session.maxQuota - selectedCount);
  const percentage = Math.min(100, Math.round((selectedCount / (session.maxQuota || 1)) * 100));

  return (
    <>
      {/* ── 1. Top Navbar (Floating Horizontal Capsule) ────── */}
      <div className="fixed top-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
        <header
          ref={topNavRef}
          style={{ transform: "translate3d(0, 0, 0)", opacity: 1 }}
          className="pointer-events-auto w-full max-w-6xl h-16 rounded-full px-4 sm:px-6 flex items-center justify-between bg-white/95 dark:bg-[#141417]/95 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.1] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.5)] will-change-transform transition-colors"
        >
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            onDoubleClick={() => setViewMode("admin")}
            className="cursor-pointer shrink-0"
            title="aryst studio"
          >
            <BrandMark />
          </div>
          {(session.projectId || session.clientName) && (
            <>
              <span className="hidden sm:block w-px h-5 bg-black/[0.08] dark:bg-white/[0.1] shrink-0" />
              <span className="hidden sm:block text-xs font-semibold text-[#71717A] dark:text-[#A1A1AA] truncate max-w-[180px]">
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
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[10px] font-semibold text-[#52525B] dark:text-[#A1A1AA]"
            >
              <Users className="w-3 h-3 text-[#FF5A1F]" />
              <span>
                Grup{activeProject.members?.length ? ` · ${activeProject.members.length}` : ""}
              </span>
            </span>
          )}
          {liveDot}
        </div>

        {/* Actions - Clean & Minimal */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {session.isLocked && (
            <span
              title="Seleksi dikunci"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-[#71717A] dark:text-[#A1A1AA]"
            >
              <Lock className="w-3 h-3 text-[#FF5A1F]" />
              <span>Terkunci</span>
            </span>
          )}

          <button
            onClick={() => setIsSubmissionOpen(true)}
            className={`btn-mtioon-primary flex items-center gap-2 pl-4 pr-2.5 py-2 text-xs font-bold ${
              isFull ? "bg-[#121212] dark:bg-white text-white dark:text-[#09090B] hover:bg-black dark:hover:bg-zinc-100 shadow-[0_4px_0_#000] dark:shadow-[0_4px_0_#D4D4D8]" : ""
            }`}
          >
            {isFull ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span className="hidden xs:inline sm:inline">Kirim Seleksi</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 dark:bg-black/15 text-white dark:text-[#09090B] text-[11px] font-bold tabular-nums">
              {selectedCount}/{session.maxQuota}
            </span>
          </button>

          <ThemeToggle />

          <button
            onClick={() => setViewMode("landing")}
            className={iconBtnClass}
            title="Beranda"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>
      </header>
    </div>

      {/* ── 2. Left Sidebar (Docked Vertical Panel for Desktop) ── */}
      <aside
        ref={sidebarRef}
        style={{
          opacity: 0,
          pointerEvents: "none",
          transform: "translate3d(-40px, 0, 0)",
        }}
        className="hidden lg:flex fixed z-40 top-6 left-6 bottom-6 w-[286px] h-[calc(100vh-3rem)] rounded-[30px] p-5 flex-col justify-between bg-white/98 dark:bg-[#141417]/98 backdrop-blur-md shadow-[0_20px_50px_-10px_rgba(0,0,0,0.10)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] border border-black/[0.08] dark:border-white/[0.1] overflow-hidden text-[#121212] dark:text-[#F4F4F6] will-change-transform transition-colors"
      >
        {/* Top Section */}
        <div className="space-y-4">
          {/* Header: Brand & Collapse back to top button */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div
              onDoubleClick={() => setViewMode("admin")}
              className="cursor-pointer"
              title="aryst studio"
            >
              <BrandMark iconClassName="w-6 h-6" textClassName="text-base" />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsSidebarActive(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.12] text-[#71717A] dark:text-[#A1A1AA] hover:text-[#121212] dark:hover:text-white transition-colors"
              title="Kembalikan ke Navigasi Atas"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Ke Atas</span>
            </button>
          </div>

          {/* Client Session Card */}
          <div className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {activeProject?.sessionType && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF5A1F]/15 text-[#FF5A1F]">
                  {activeProject.sessionType}
                </span>
              )}
              {liveDot}
            </div>
            <h4 className="font-display font-bold text-sm text-[#121212] dark:text-white truncate">
              {session.clientName || activeProject?.clientName || "Klien Terhormat"}
            </h4>
            <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] truncate mt-0.5">
              {activeProject?.location || activeProject?.sessionTitle || activeProject?.projectId}
            </p>
          </div>

          {/* Quota Progress Card */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C22] border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-[#121212] dark:text-white">
                {isFull ? (
                  <CheckCircle2 className="w-4 h-4 text-[#FF5A1F]" />
                ) : (
                  <Camera className="w-4 h-4 text-[#71717A] dark:text-[#A1A1AA]" />
                )}
                <span>Kuota Terpilih</span>
              </span>
              <span className="text-[#FF5A1F] tabular-nums">
                {selectedCount}/{session.maxQuota}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-black/[0.06] dark:bg-white/[0.1] rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isFull ? "bg-[#121212] dark:bg-white" : "bg-[#FF5A1F]"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
              <span>{percentage}% Tercapai</span>
              <span>
                {session.isLocked
                  ? "Dikunci"
                  : isFull
                  ? "Siap Kirim"
                  : `Sisa ${remaining} foto`}
              </span>
            </div>
          </div>

          {/* Quick Filter Pill Buttons */}
          <div className="flex items-center gap-1 p-1 bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.08] rounded-full text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`flex-1 py-1 rounded-full text-center transition-all ${
                activeFilter === "all"
                  ? "bg-white dark:bg-[#141417] text-[#121212] dark:text-white shadow-sm font-bold"
                  : "text-[#71717A] dark:text-[#A1A1AA] hover:text-[#121212] dark:hover:text-white"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("selected")}
              className={`flex-1 py-1 rounded-full text-center transition-all ${
                activeFilter === "selected"
                  ? "bg-[#FF5A1F] text-white shadow-sm font-bold"
                  : "text-[#71717A] dark:text-[#A1A1AA] hover:text-[#121212] dark:hover:text-white"
              }`}
            >
              Terpilih ({selectedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("unselected")}
              className={`flex-1 py-1 rounded-full text-center transition-all ${
                activeFilter === "unselected"
                  ? "bg-[#121212] dark:bg-white text-white dark:text-[#09090B] shadow-sm font-bold"
                  : "text-[#71717A] dark:text-[#A1A1AA] hover:text-[#121212] dark:hover:text-white"
              }`}
            >
              Belum
            </button>
          </div>
        </div>

        {/* Middle: Chapters / Bab List */}
        {sectionsList.length > 0 && (
          <div className="my-3 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-2 px-1">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-[#FF5A1F]" />
                <span>Bab Cerita</span>
              </span>
              <span>{sectionsList.length} Bab</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setActiveSectionFilter("all");
                  window.scrollTo({ top: 200, behavior: "smooth" });
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all text-left ${
                  activeSectionFilter === "all"
                    ? "bg-black/[0.07] dark:bg-white/[0.1] text-[#121212] dark:text-white font-bold"
                    : "text-[#52525B] dark:text-[#A1A1AA] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] hover:text-[#121212] dark:hover:text-white"
                }`}
              >
                <span className="truncate">Semua Bab</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
                  {photos.length}
                </span>
              </button>

              {sectionsList.map((sec, idx) => {
                const stats = sectionStats[sec.name] || { total: 0, selected: 0 };
                const isCurrent = activeSectionFilter === sec.name;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleChapterClick(sec.name, idx)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all text-left ${
                      isCurrent
                        ? "bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-[#FF5A1F] font-bold"
                        : "text-[#52525B] dark:text-[#A1A1AA] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] hover:text-[#121212] dark:hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate min-w-0">
                      <MapPin className={`w-3 h-3 shrink-0 ${isCurrent ? "text-[#FF5A1F]" : "text-[#71717A] dark:text-[#A1A1AA]"}`} />
                      <span className="truncate">{sec.name}</span>
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums shrink-0 ml-1.5 ${
                        isCurrent
                          ? "bg-[#FF5A1F] text-white"
                          : stats.selected > 0
                          ? "bg-[#FF5A1F]/15 text-[#FF5A1F]"
                          : "bg-black/[0.05] dark:bg-white/[0.08] text-[#71717A] dark:text-[#A1A1AA]"
                      }`}
                    >
                      {stats.selected}/{stats.total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] space-y-2">
          <button
            type="button"
            onClick={() => setIsSubmissionOpen(true)}
            className={`w-full btn-mtioon-primary py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 ${
              isFull ? "bg-[#121212] dark:bg-white text-white dark:text-[#09090B] hover:bg-black dark:hover:bg-zinc-100 shadow-[0_4px_0_#000] dark:shadow-[0_4px_0_#D4D4D8]" : ""
            }`}
          >
            {isFull ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Kirim Seleksi</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 dark:bg-black/15 text-white dark:text-[#09090B] text-[11px] font-bold tabular-nums">
              {selectedCount}/{session.maxQuota}
            </span>
          </button>

          <ThemeToggle showLabel className="w-full justify-center py-2 text-xs" />

          <div className="flex items-center justify-between text-xs text-[#71717A] dark:text-[#A1A1AA] pt-1 px-1">
            <button
              type="button"
              onClick={() => setViewMode("landing")}
              className="flex items-center gap-1.5 hover:text-[#121212] dark:hover:text-white transition-colors"
              title="Halaman Beranda"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Beranda</span>
            </button>

            <span className="text-[10px]">
              {session.isLocked ? "Terkunci" : "Otomatis tersimpan"}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
