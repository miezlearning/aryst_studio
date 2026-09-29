import React from "react";
import { cn } from "@/lib/utils";

export const BrandMarkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("shrink-0", className)}
    aria-hidden="true"
  >
    <rect width="64" height="64" rx="14" fill="#09090b" />
    <rect width="64" height="64" rx="14" stroke="#3f3f46" strokeWidth="1.5" />
    <circle cx="32" cy="32" r="15" stroke="#f59e0b" strokeWidth="3.5" />
    <circle cx="32" cy="32" r="6" fill="#f59e0b" />
  </svg>
);

export const BrandMark: React.FC<{
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}> = ({ className, iconClassName, textClassName }) => (
  <div className={cn("flex items-center gap-2.5 select-none", className)}>
    <BrandMarkIcon className={cn("w-8 h-8", iconClassName)} />
    <span
      className={cn(
        "text-[15px] font-extrabold tracking-[0.24em] text-white leading-none",
        textClassName
      )}
    >
      ARYST
    </span>
  </div>
);

export default BrandMark;
