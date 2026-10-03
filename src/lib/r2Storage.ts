import { get, set, del } from "idb-keyval";
import { AwsClient } from "aws4fetch";

export const IDB_R2_CONFIG_KEY = "lumina_r2_config";

/**
 * Cloudflare R2 bucket used as the free (no-credit-card) home for the
 * uploaded hero video. The API token should be scoped to read+write on
 * the bucket and the "studio/" prefix only.
 */
export interface R2Config {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  // Public development URL of the bucket, e.g. https://pub-abc123.r2.dev
  publicBaseUrl: string;
}

const REQUIRED_KEYS = [
  "accountId",
  "bucket",
  "accessKeyId",
  "secretAccessKey",
  "publicBaseUrl",
] as const;

export const parseR2Config = (json: string): R2Config | null => {
  const trimmed = (json || "").trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    for (const key of REQUIRED_KEYS) {
      const value = parsed[key];
      if (typeof value !== "string" || !value.trim()) return null;
    }
    return {
      accountId: (parsed.accountId as string).trim(),
      bucket: (parsed.bucket as string).trim(),
      accessKeyId: (parsed.accessKeyId as string).trim(),
      secretAccessKey: (parsed.secretAccessKey as string).trim(),
      publicBaseUrl: (parsed.publicBaseUrl as string).trim().replace(/\/+$/, ""),
    };
  } catch {
    return null;
  }
};

/** Manual config wins, then the VITE_R2_CONFIG build variable. */
export const getR2Config = async (): Promise<R2Config | null> => {
  try {
    const manual = (await get<string>(IDB_R2_CONFIG_KEY)) || "";
    if (manual) return parseR2Config(manual);
  } catch {
    // Fall through to the build variable
  }
  const envCfg = import.meta.env.VITE_R2_CONFIG || "";
  return envCfg ? parseR2Config(envCfg) : null;
};

export const saveR2Config = async (json: string): Promise<void> => {
  const trimmed = (json || "").trim();
  if (trimmed) {
    await set(IDB_R2_CONFIG_KEY, trimmed);
  } else {
    await del(IDB_R2_CONFIG_KEY).catch(() => undefined);
  }
};

const encodeKeyPath = (key: string): string =>
  key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

/**
 * Upload a video to the R2 bucket and return its public URL.
 * Signing is handled by aws4fetch (SigV4, region "auto"); the bucket must
 * expose a public development URL (r2.dev) and allow this origin in its
 * CORS policy.
 */
export const uploadHeroVideoR2 = async (blob: Blob, cfg: R2Config): Promise<string> => {
  const rawExt = (blob.type.split("/")[1] || "mp4").replace(/[^a-z0-9]/gi, "") || "mp4";
  const ext = rawExt === "quicktime" ? "mov" : rawExt;
  const objectKey = `studio/hero-video-${Date.now()}.${ext}`;
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const objectUrl = `https://${host}/${encodeKeyPath(cfg.bucket)}/${encodeKeyPath(objectKey)}`;
  const contentType = blob.type || "video/mp4";

  const aws = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    region: "auto",
    service: "s3",
  });
  const res = await aws.fetch(objectUrl, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: blob,
  });
  if (!res.ok) {
    throw new Error(`R2 menolak unggahan (HTTP ${res.status}). Periksa CORS bucket dan izin token.`);
  }
  const publicUrl = `${cfg.publicBaseUrl}/${objectKey}`;
  // Verify the object is actually publicly readable. Without this check a
  // private bucket would "succeed" while the video fails on every screen.
  let readable = false;
  try {
    const probe = await fetch(publicUrl, { method: "HEAD" });
    readable = probe.ok;
  } catch {
    readable = false;
  }
  if (!readable) {
    throw new Error(
      "File terupload ke R2, tapi URL publiknya tidak bisa dibaca. Aktifkan Public Development URL di Settings bucket dan pastikan objek bisa dibaca publik, lalu upload ulang."
    );
  }
  return publicUrl;
};
