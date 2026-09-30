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

// Password/PIN hashing: PBKDF2-SHA256 with a random salt (format
// "v2$salt$hash"). The old SHA-256 (16 hex chars) is still verified so
// existing hashes keep working; they upgrade on the next successful login.
const PBKDF2_ITERATIONS = 210_000;

const toB64 = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

const fromB64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

const deriveKey = async (password: string, salt: Uint8Array): Promise<Uint8Array> => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
};

const legacyShaHash = async (pwd: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(pwd.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
};

const legacyB64Hash = (pwd: string): string =>
  btoa(encodeURIComponent(pwd.trim())).slice(0, 16);

export async function hashPassword(pwd: string): Promise<string> {
  if (!pwd) return "";
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const derived = await deriveKey(pwd.trim(), salt);
    return `v2$${toB64(salt)}$${toB64(derived)}`;
  } catch {
    return legacyB64Hash(pwd);
  }
}

/** Verifies a password against a v2 or legacy hash. */
export async function verifyPassword(pwd: string, stored: string): Promise<boolean> {
  if (!pwd || !stored) return false;
  if (stored.startsWith("v2$")) {
    const parts = stored.split("$");
    if (parts.length !== 3) return false;
    try {
      const derived = await deriveKey(pwd.trim(), fromB64(parts[1]));
      return toB64(derived) === parts[2];
    } catch {
      return false;
    }
  }
  if (/^[0-9a-f]{16}$/.test(stored)) {
    try {
      return (await legacyShaHash(pwd)) === stored;
    } catch {
      return false;
    }
  }
  return legacyB64Hash(pwd) === stored;
}

/** True for any hash format the app recognises (v2 or legacy). */
export function isPasswordHash(value: string): boolean {
  if (!value) return false;
  if (value.startsWith("v2$")) return value.split("$").length === 3;
  return /^[0-9a-f]{16}$/.test(value);
}
