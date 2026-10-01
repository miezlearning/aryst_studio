import React from "react";
import { useProofingStore } from "@/lib/storage";
import { BrandMark } from "@/components/BrandMark";
import {
  Users,
  Images,
  Sliders,
  Code2,
  Eye,
  Home,
  LogOut,
} from "lucide-react";

export type AdminTab = "projects" | "showcase" | "settings" | "gas_guide";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

const NAV_ITEMS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: "projects", label: "Sesi Klien", icon: Users },
  { id: "showcase", label: "Showcase", icon: Images },
  { id: "settings", label: "Pengaturan", icon: Sliders },
  { id: "gas_guide", label: "Integrasi", icon: Code2 },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const {
    clientProjects,
    activeProjectId,
    setViewMode,
    logoutAdmin,
    isP2PConnected,
    unlockForPreview,
  } = useProofingStore();

  return (
    <>
      {/* ── Desktop floating sidebar ─────────────────────────── */}
      <aside className="hidden lg:flex fixed left-4 top-4 bottom-4 w-64 z-30 rounded-[24px] bg-white/90 border border-black/[0.08] backdrop-blur-md shadow-[0_12px_36px_rgba(0,0,0,0.06)] p-3.5 flex-col">
        <div className="flex items-center justify-between px-2 pt-1 pb-4">
          <BrandMark iconClassName="w-7 h-7" textClassName="text-sm font-black" />
          <span className="text-[10px] font-extrabold tracking-widest text-[#FF5A1F] px-2.5 py-1 rounded-full bg-[#FFF0EB] border border-[#FF5A1F]/20">
            ADMIN
          </span>
        </div>

        <p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-[#121212]/40">
          Menu Utama
        </p>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#121212] text-white shadow-sm"
                    : "text-[#121212]/70 hover:text-[#121212] hover:bg-black/[0.04]"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-[#FF5A1F]" : "text-[#121212]/50"
                  }`}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === "projects" && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-black/[0.06] text-[#121212]/70"
                    }`}
                  >
                    {clientProjects.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-black/[0.06] space-y-2.5">
          <div className="flex items-center gap-2 px-2 text-[11px] font-medium text-[#121212]/60">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isP2PConnected ? "bg-emerald-500 animate-pulse" : "bg-black/25"
              }`}
            />
            <span>{isP2PConnected ? "Sinkron Realtime" : "Mode Lokal"}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              unlockForPreview(activeProjectId);
              setViewMode("client");
            }}
            className="w-full btn-mtioon-primary py-2.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>Lihat Galeri Klien</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("landing")}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-[#F5F2EB] hover:bg-[#EDE9E0] text-[#121212] text-xs font-bold transition-colors"
              title="Beranda"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Beranda</span>
            </button>
            <button
              type="button"
              onClick={logoutAdmin}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-[#F5F2EB] hover:bg-rose-50 text-[#121212]/70 hover:text-rose-600 text-xs font-bold transition-colors"
              title="Logout Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom nav ────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-3 inset-x-3 z-40 rounded-full bg-white/95 border border-black/[0.08] backdrop-blur-md shadow-[0_12px_36px_rgba(0,0,0,0.1)] px-3 py-2 grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center gap-1 py-1.5 rounded-full text-[10px] font-bold transition-colors ${
                isActive ? "text-[#FF5A1F]" : "text-[#121212]/50 hover:text-[#121212]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};

export default AdminSidebar;

