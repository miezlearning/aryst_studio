import JSZip from "jszip";
import { PhotoMetadata } from "@/types";

export interface ZipProgress {
  phase: "download" | "zip";
  current: number;
  total: number;
}

export interface ZipResult {
  ok: number;
  failed: number;
}

const sanitizeFileName = (name: string): string =>
  name.replace(/[\\/:*?"<>|]/g, "_").trim() || "foto.jpg";

const fetchBytes = async (photo: PhotoMetadata, apiKey: string): Promise<ArrayBuffer | null> => {
  const isExternal = photo.previewUrl.startsWith("http://") || photo.previewUrl.startsWith("https://");
  const urls: string[] = [];

  if (isExternal) {
    urls.push(photo.previewUrl);
  } else {
    if (apiKey) {
      urls.push(
        `https://www.googleapis.com/drive/v3/files/${photo.id}?alt=media&key=${encodeURIComponent(apiKey)}`
      );
    }
    urls.push(`https://lh3.googleusercontent.com/d/${photo.id}=w2000`);
    if (photo.previewUrl) urls.push(photo.previewUrl);
  }

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      if (buf.byteLength > 0) return buf;
    } catch {
      // CORS / network error: try the next candidate
    }
  }
  return null;
};

/**
 * Packages the client's selected photos into a single .zip and triggers a save.
 * Drive photos are pulled through `alt=media` with the stored API key, with the
 * lh3 CDN as a fallback; external (demo) photos are fetched directly.
 */
export async function downloadPhotosZip(
  photos: PhotoMetadata[],
  apiKey: string,
  zipBase: string,
  onProgress?: (p: ZipProgress) => void
): Promise<ZipResult> {
  const zip = new JSZip();
  const folder = zip.folder(zipBase) || zip;
  const usedNames = new Set<string>();
  const total = photos.length;
  let done = 0;
  let ok = 0;
  let failed = 0;

  // Small parallel pool keeps large selections snappy without hammering the API
  const queue = photos.slice();
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    for (;;) {
      const photo = queue.shift();
      if (!photo) break;
      const bytes = await fetchBytes(photo, apiKey);
      done += 1;
      if (bytes) {
        let name = sanitizeFileName(photo.name);
        if (usedNames.has(name)) name = `${done}_${name}`;
        usedNames.add(name);
        folder.file(name, bytes);
        ok += 1;
      } else {
        failed += 1;
      }
      onProgress?.({ phase: "download", current: done, total });
    }
  });
  await Promise.all(workers);

  if (ok === 0) {
    throw new Error(
      apiKey
        ? "Tidak ada foto yang bisa diunduh. Periksa folder dan kunci API."
        : "Kunci API Drive belum diatur, foto tidak bisa diunduh."
    );
  }

  onProgress?.({ phase: "zip", current: 0, total });
  const blob = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${zipBase}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { ok, failed };
}
