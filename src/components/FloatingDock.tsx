import React from "react";
import { useProofingStore } from "@/lib/storage";
import { CheckCircle2, ChevronRight, Lock, Camera, Filter } from "lucide-react";
import { DeadlineCountdown } from "./DeadlineCountdown";

export const FloatingDock: React.FC = () => {
  const {
    session,
    activeFilter,
    setActiveFilter,
    setIsSubmissionOpen,
    clientProjects,
    activeProjectId,
  } = useProofingStore();

  const activeProject = clientProjects.find((p) => p.id === activeProjectId);
  const deadline = activeProject?.selectionDeadline;

  const selectedCount = session.selectedPhotoIds.length;
  const maxQuota = session.maxQuota || 20;
  const percentage = Math.min(100, Math.round((selectedCount / maxQuota) * 100));
  const isComplete = selectedCount >= maxQuota;
  const remaining = Math.max(0, maxQuota - selectedCount);

  return (
    <div className="fixed bottom-6 inset-x-0 z-30 pointer-events-none flex justify-center px-4">
      <div className="pointer-events-auto max-w-xl w-full glass-panel rounded-2xl p-3 sm:p-4 shadow-2xl shadow-black/60 border border-zinc-700/60 backdrop-blur-xl animate-fade-in flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Progress & Quota Information */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                {isComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Camera className="w-4 h-4 text-amber-400" />
                )}
                <span>Kuota Seleksi:</span>
                <span className="text-white font-bold">{selectedCount}</span>
                <span className="text-zinc-500">/</span>
                <span className="text-zinc-400">{maxQuota} Foto</span>
              </span>
            </div>

            <div className="text-[11px] font-medium">
              {session.isLocked ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Dikunci
                </span>
              ) : isComplete ? (
                <span className="text-emerald-400 font-semibold">Siap Dikirim!</span>
              ) : (
                <span className="text-zinc-400">Sisa {remaining} foto</span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isComplete
                  ? "bg-emerald-400"
                  : "bg-amber-400"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {deadline ? (
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <DeadlineCountdown variant="inline" deadline={deadline} />
              <span className="text-[10px] text-zinc-600 hidden sm:inline">
                Batas pilihan foto
              </span>
            </div>
          ) : null}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Filter toggle */}
          <button
            type="button"
            onClick={() => setActiveFilter(activeFilter === "selected" ? "all" : "selected")}
            className={`px-3 py-2 text-xs font-medium rounded-xl border transition-colors flex items-center gap-1.5 ${
              activeFilter === "selected"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-zinc-800/80 hover:bg-zinc-700/80 border-zinc-700 text-zinc-300"
            }`}
            title="Saring foto terpilih"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {activeFilter === "selected" ? "Lihat Semua" : "Hanya Terpilih"}
            </span>
          </button>

          {/* Review & Submit CTA */}
          <button
            type="button"
            onClick={() => setIsSubmissionOpen(true)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-lg active:scale-95 ${
              isComplete
                ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20"
                : "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20"
            }`}
          >
            <span>Tinjau & Kirim</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
