import React, { useEffect, useState } from "react";
import { Hourglass, AlertTriangle } from "lucide-react";
import { formatDeadlineRemaining } from "@/lib/storage";

const DAY_MS = 86_400_000;
const RING_R = 21;
const RING_C = 2 * Math.PI * RING_R;

export const deadlineUrgency = (
  remainingMs: number
): "expired" | "soon" | "near" | "normal" => {
  if (remainingMs <= 0) return "expired";
  if (remainingMs <= 6 * 3_600_000) return "soon";
  if (remainingMs <= 2 * DAY_MS) return "near";
  return "normal";
};

const toneFor = (urgency: ReturnType<typeof deadlineUrgency>) => {
  switch (urgency) {
    case "expired":
    case "soon":
      return {
        box: "border-rose-200 bg-rose-50",
        stroke: "stroke-rose-500",
        text: "text-rose-700",
        icon: "text-rose-500",
      };
    case "near":
      return {
        box: "border-[#FF5A1F]/25 bg-[#FFF7ED]",
        stroke: "stroke-[#FF5A1F]",
        text: "text-[#C2410C]",
        icon: "text-[#FF5A1F]",
      };
    default:
      return {
        box: "border-black/[0.08] bg-white",
        stroke: "stroke-[#FF5A1F]",
        text: "text-[#121212]",
        icon: "text-[#FF5A1F]",
      };
  }
};

interface Props {
  deadline: number;
  createdAt?: number;
  className?: string;
  variant?: "panel" | "inline" | "minimal";
}

/**
 * Live selection countdown.
 * panel   -> ring + flipping hourglass + big mono digits inside bordered box
 * inline  -> compact label for the floating dock
 * minimal -> flat, unboxed layout with no card-in-card styling
 */
export const DeadlineCountdown: React.FC<Props> = ({
  deadline,
  createdAt,
  className = "",
  variant = "panel",
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = deadline - now;
  const urgency = deadlineUrgency(remaining);
  const expired = urgency === "expired";
  const tone = toneFor(urgency);

  if (variant === "inline") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] font-bold tabular-nums ${tone.text} ${className}`}
        title="Batas waktu pilihan foto"
      >
        <Hourglass className={`w-3 h-3 animate-hourglass ${tone.icon}`} />
        {expired ? "Deadline lewat" : `Sisa ${formatDeadlineRemaining(remaining)}`}
      </span>
    );
  }

  const hasWindow = typeof createdAt === "number" && createdAt < deadline;
  const total = hasWindow ? deadline - (createdAt as number) : 0;
  const ratio = expired
    ? 0
    : hasWindow
      ? Math.min(1, Math.max(0, remaining / total))
      : 1;
  const offset = RING_C * (1 - ratio);

  const deadlineLabel = new Date(deadline).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (variant === "minimal") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* Progress ring + hourglass */}
        <div className="relative w-9 h-9 shrink-0">
          <svg
            viewBox="0 0 48 48"
            className="w-9 h-9 -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="24"
              cy="24"
              r={RING_R}
              fill="none"
              strokeWidth="4"
              className="text-black/[0.08]"
              stroke="currentColor"
            />
            <circle
              cx="24"
              cy="24"
              r={RING_R}
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={offset}
              className={`${tone.stroke} transition-[stroke-dashoffset] duration-1000 ease-linear`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {expired ? (
              <AlertTriangle className={`w-4 h-4 ${tone.icon}`} />
            ) : (
              <Hourglass className={`w-4 h-4 animate-hourglass ${tone.icon}`} />
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
              Batas Waktu Pilihan
            </span>
            <span
              className={`text-sm font-black tabular-nums tracking-tight ${tone.text}`}
            >
              {expired ? "Waktu berakhir" : formatDeadlineRemaining(remaining)}
            </span>
          </div>
          <p className="text-[11px] text-[#A1A1AA] truncate">
            {expired ? "Hubungi fotografer untuk perpanjangan" : `s/d ${deadlineLabel}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3.5 rounded-2xl border p-3.5 backdrop-blur-sm ${tone.box} ${className}`}
    >
      {/* Progress ring + hourglass */}
      <div className="relative w-12 h-12 shrink-0">
        <svg
          viewBox="0 0 48 48"
          className="w-12 h-12 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="24"
            cy="24"
            r={RING_R}
            fill="none"
            strokeWidth="3"
            className="text-black/[0.08]"
            stroke="currentColor"
          />
          <circle
            cx="24"
            cy="24"
            r={RING_R}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={offset}
            className={`${tone.stroke} transition-[stroke-dashoffset] duration-1000 ease-linear`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {expired ? (
            <AlertTriangle className={`w-5 h-5 ${tone.icon}`} />
          ) : (
            <Hourglass className={`w-5 h-5 animate-hourglass ${tone.icon}`} />
          )}
        </div>
      </div>

      {/* Digits */}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
          Batas Waktu Pilihan
        </p>
        {expired ? (
          <>
            <p className="text-sm font-bold text-rose-300 leading-tight mt-0.5">
              Waktu pemilihan berakhir
            </p>
            <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
              Pilihan tersimpan & sesi terkunci. Hubungi fotografer untuk
              perpanjangan.
            </p>
          </>
        ) : (
          <>
            <p
              className={`text-lg font-black tabular-nums leading-tight tracking-tight mt-0.5 ${tone.text}`}
            >
              {formatDeadlineRemaining(remaining)}
            </p>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
              s/d {deadlineLabel}
            </p>
          </>
        )}
      </div>
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
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : soon
            ? "bg-[#FFF7ED] text-[#C2410C] border-[#FF5A1F]/25"
            : "bg-[#F4F1EA] text-[#121212]/70 border-black/[0.08]"
      } ${className}`}
      title={`Batas pilihan: ${new Date(deadline).toLocaleString("id-ID")}`}
    >
      <Hourglass className="w-3 h-3" />
      {label}
    </span>
  );
};

export default DeadlineCountdown;
