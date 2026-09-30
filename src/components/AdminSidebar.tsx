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
      <aside className="hidden lg:flex fixed left-3 top-3 bottom-3 w-60 z-30 rounded-2xl bg-zinc-950/85 border border-zinc-800/80 backdrop-blur-md shadow-xl shadow-black/40 p-3 flex-col">
        <div className="flex items-center justify-between px-2 pt-1 pb-3">
          <BrandMark iconClassName="w-7 h-7" textClassName="text-sm" />
          <span className="text-[10px] font-bold tracking-[0.18em] text-amber-400 px-2 py-1 rounded-md bg-amber-400/10 border border-amber-400/20">
            ADMIN
          </span>
        </div>

        <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
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
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive
                    ? "bg-zinc-800/80 text-white font-semibold"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-amber-400" />
                )}
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 ${
                    isActive ? "text-amber-400" : "text-zinc-400"
                  }`}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === "projects" && (
                  <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[10px] font-bold tabular-nums">
                    {clientProjects.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-3 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center gap-2 px-2 text-[11px] text-zinc-400">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isP2PConnected ? "bg-emerald-400" : "bg-zinc-600"
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
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>Lihat Galeri</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("landing")}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-medium transition-colors"
              title="Beranda"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Beranda</span>
            </button>
            <button
              type="button"
              onClick={logoutAdmin}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-rose-950/50 border border-zinc-800 text-zinc-400 hover:text-rose-400 text-xs font-medium transition-colors"
              title="Logout Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom nav ────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-3 inset-x-3 z-40 rounded-2xl bg-zinc-950/90 border border-zinc-800/80 backdrop-blur-md shadow-xl shadow-black/40 px-2 py-1.5 grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-semibold transition-colors ${
                isActive ? "text-amber-400" : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-0.5 w-8 h-0.5 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};

export default AdminSidebar;
