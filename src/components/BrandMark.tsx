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
    <rect width="64" height="64" rx="18" fill="#121212" />
    <circle cx="32" cy="32" r="16" stroke="#FAF8F5" strokeWidth="3" />
    <circle cx="32" cy="32" r="7" fill="#FF5A1F" />
    <circle cx="43" cy="21" r="3" fill="#FFFFFF" opacity="0.8" />
  </svg>
);

export const BrandMark: React.FC<{
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}> = ({ className, iconClassName, textClassName }) => (
  <div className={cn("flex items-center gap-2 select-none", className)}>
    <BrandMarkIcon className={cn("w-7 h-7 sm:w-8 sm:h-8", iconClassName)} />
    <span
      className={cn(
        "font-display font-[900] tracking-tight text-xl sm:text-2xl text-[#121212] leading-none lowercase",
        textClassName
      )}
    >
      aryst<span className="text-[#FF5A1F]">.</span>
    </span>
  </div>
);

export default BrandMark;
