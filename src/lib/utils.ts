import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import DOMPurify from "dompurify";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeText(text: string): string {
  if (!text) return "";
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

export function formatBytes(bytes?: string | number): string {
  if (!bytes) return "";
  const num = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (isNaN(num) || num <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(num) / Math.log(1024));
  return `${(num / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return "";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export async function hashPassword(pwd: string): Promise<string> {
  if (!pwd) return "";
  try {
    const msgUint8 = new TextEncoder().encode(pwd.trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  } catch {
    return btoa(encodeURIComponent(pwd.trim())).slice(0, 16);
  }
}
