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
    isSidebarActive,
  } = useProofingStore();

  const activeProject = clientProjects.find((p) => p.id === activeProjectId);
  const deadline = activeProject?.selectionDeadline;

  const selectedCount = session.selectedPhotoIds.length;
  const maxQuota = session.maxQuota || 20;
  const percentage = Math.min(100, Math.round((selectedCount / maxQuota) * 100));
  const isComplete = selectedCount >= maxQuota;
  const remaining = Math.max(0, maxQuota - selectedCount);

  return (
    <div
      className={`fixed bottom-6 inset-x-0 z-30 pointer-events-none flex justify-center px-4 transition-[opacity,transform] duration-200 ease-out will-change-transform ${
        isSidebarActive
          ? "lg:opacity-0 lg:translate-y-8 lg:pointer-events-none"
          : "opacity-100 translate-y-0"
      }`}
    >
      <div className="pointer-events-auto max-w-xl w-full bg-white/95 dark:bg-[#141417]/95 backdrop-blur-md rounded-full sm:rounded-full p-3 sm:py-2.5 sm:px-5 shadow-[0_12px_40px_-6px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_40px_-6px_rgba(0,0,0,0.7)] border border-black/[0.08] dark:border-white/[0.12] animate-fade-in flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors">
        {/* Progress & Quota Information */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#121212] dark:text-white flex items-center gap-1.5">
                {isComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-[#FF5A1F]" />
                ) : (
                  <Camera className="w-4 h-4 text-[#52525B] dark:text-[#A1A1AA]" />
                )}
                <span>Kuota:</span>
                <span className="text-[#FF5A1F]">{selectedCount}</span>
                <span className="text-[#A1A1AA]">/</span>
                <span className="text-[#71717A] dark:text-[#A1A1AA]">{maxQuota} Foto</span>
              </span>
            </div>

            <div className="text-[11px] font-semibold">
              {session.isLocked ? (
                <span className="text-[#FF5A1F] flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Dikunci
                </span>
              ) : isComplete ? (
                <span className="text-[#121212] dark:text-white font-bold">Siap Dikirim!</span>
              ) : (
                <span className="text-[#71717A] dark:text-[#A1A1AA]">Sisa {remaining} foto</span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-black/[0.06] dark:bg-white/[0.1] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isComplete
                  ? "bg-[#121212] dark:bg-white"
                  : "bg-[#FF5A1F]"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {deadline ? (
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <DeadlineCountdown variant="inline" deadline={deadline} />
              <span className="text-[10px] font-medium text-[#A1A1AA] hidden sm:inline">
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
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 ${
              activeFilter === "selected"
                ? "bg-[#121212] dark:bg-white border-black dark:border-white text-white dark:text-[#09090B] font-bold"
                : "bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] border-black/[0.08] dark:border-white/[0.08] text-[#52525B] dark:text-[#A1A1AA]"
            }`}
            title="Saring foto terpilih"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {activeFilter === "selected" ? "Semua" : "Terpilih"}
            </span>
          </button>

          {/* Review & Submit CTA */}
          <button
            type="button"
            onClick={() => setIsSubmissionOpen(true)}
            className="btn-mtioon-primary flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold"
          >
            <span>Tinjau & Kirim</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
