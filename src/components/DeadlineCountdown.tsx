import React, { useEffect, useState } from "react";
import { Clock, AlertTriangle, CalendarClock } from "lucide-react";
import { formatDeadlineRemaining } from "@/lib/storage";

const DAY_MS = 86_400_000;

export const deadlineUrgency = (
  remainingMs: number
): "expired" | "soon" | "near" | "normal" => {
  if (remainingMs <= 0) return "expired";
  if (remainingMs <= 6 * 3_600_000) return "soon";
  if (remainingMs <= 2 * DAY_MS) return "near";
  return "normal";
};

interface Props {
  deadline: number;
  createdAt?: number;
  className?: string;
}

/**
 * Live selection-decountdown (ticks every second).
 * variant "panel"  -> dashboard card with progress bar + states
 * variant "inline" -> compact label for the floating dock
 */
export const DeadlineCountdown: React.FC<
  Props & { variant?: "panel" | "inline" }
> = ({ deadline, createdAt, className = "", variant = "panel" }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = deadline - now;
  const urgency = deadlineUrgency(remaining);
  const expired = urgency === "expired";

  if (variant === "inline") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold tabular-nums ${
          expired
            ? "text-rose-400"
            : urgency === "soon"
              ? "text-rose-300"
              : urgency === "near"
                ? "text-amber-400"
                : "text-zinc-400"
        } ${className}`}
        title="Batas waktu pilihan foto"
      >
        <Clock className="w-3 h-3" />
        {expired ? "Deadline lewat" : `Sisa ${formatDeadlineRemaining(remaining)}`}
      </span>
    );
  }

  const hasWindow = typeof createdAt === "number" && createdAt < deadline;
  const total = hasWindow ? deadline - (createdAt as number) : 0;
  const progress = hasWindow
    ? Math.min(100, Math.max(0, ((now - (createdAt as number)) / total) * 100))
    : 0;

  const tone = expired
    ? {
        border: "border-rose-500/35",
        bg: "bg-rose-500/10",
        text: "text-rose-300",
        bar: "bg-rose-500",
        icon: "text-rose-400",
      }
    : urgency === "soon"
      ? {
          border: "border-rose-500/30",
          bg: "bg-rose-500/5",
          text: "text-rose-300",
          bar: "bg-rose-400",
          icon: "text-rose-400",
        }
      : urgency === "near"
        ? {
            border: "border-amber-500/35",
            bg: "bg-amber-500/10",
            text: "text-amber-300",
            bar: "bg-amber-400",
            icon: "text-amber-400",
          }
        : {
            border: "border-zinc-800",
            bg: "bg-zinc-900/60",
            text: "text-zinc-200",
            bar: "bg-amber-400",
            icon: "text-amber-400",
          };

  return (
    <div
      className={`rounded-xl border p-3 ${tone.border} ${tone.bg} backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          <CalendarClock className={`w-3.5 h-3.5 ${tone.icon}`} />
          Batas Waktu Pilihan
        </span>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${tone.border} ${tone.text} bg-black/20`}
        >
          {expired ? "TERKUNCI" : "HITUNG MUNDUR"}
        </span>
      </div>

      {expired ? (
        <div className="flex items-start gap-2">
          <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${tone.icon}`} />
          <div>
            <p className={`text-sm font-bold ${tone.text}`}>
              Waktu pemilihan berakhir
            </p>
            <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
              Pilihan Anda tersimpan dan sesi terkunci otomatis. Hubungi
              fotografer untuk perpanjangan waktu.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            className={`font-mono text-xl font-bold tabular-nums tracking-tight ${tone.text}`}
          >
            {formatDeadlineRemaining(remaining)}
          </div>
          {hasWindow && (
            <>
              <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-1000 rounded-full ${tone.bar}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                {Math.round(progress)}% dari jendela pemilihan terpakai
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Compact deadline status used in the admin session lists.
 */
export const DeadlineBadge: React.FC<{
  deadline?: number | null;
  className?: string;
}> = ({ deadline, className = "" }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!deadline) return null;

  const remaining = deadline - now;
  const expired = remaining <= 0;
  const soon = !expired && remaining <= 2 * DAY_MS;

  const shortLabel = (ms: number) => {
    if (ms >= DAY_MS) return `${Math.ceil(ms / DAY_MS)} hari`;
    const hours = Math.floor(ms / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    if (hours > 0) return `${hours} jam ${minutes} mnt`;
    return `${Math.max(1, minutes)} mnt`;
  };

  const label = expired
    ? `Lewat ${shortLabel(-remaining)}`
    : `Sisa ${shortLabel(remaining)}`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border tabular-nums ${
        expired
          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
          : soon
            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
            : "bg-zinc-800 text-zinc-300 border-zinc-700"
      } ${className}`}
      title={`Batas pilihan: ${new Date(deadline).toLocaleString("id-ID")}`}
    >
      <Clock className="w-3 h-3" />
      {expired ? "Deadline lewat" : label}
    </span>
  );
};

export default DeadlineCountdown;
