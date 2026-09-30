import { PhotoMetadata, GoogleDriveApiResponse, GoogleDriveApiFile } from "@/types";
import { sanitizeText } from "./utils";

/**
 * Extracts the Google Drive folder ID from various URL patterns or raw ID
 */
export function extractFolderId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();

  // Pattern: https://drive.google.com/drive/folders/1AbC...
  // Pattern: https://drive.google.com/drive/u/0/folders/1AbC...
  const match = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // Pattern: https://drive.google.com/open?id=1AbC...
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // Raw ID pattern (typically 25 to 50 alphanumeric characters with - and _)
  if (/^[a-zA-Z0-9_-]{15,60}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

/**
 * Generates direct CDN URL for Google Drive file without CORS issues.
 * Implements PRD Sec: Direct CDN Formatting (lh3.googleusercontent.com/d/{id}=w{width})
 */
export function getDriveImageUrl(fileId: string, width: number = 400): string {
  // If it's already an external HTTP URL (e.g. demo mode), return as is
  if (fileId.startsWith("http://") || fileId.startsWith("https://")) {
    return fileId;
  }
  // Google User Content CDN
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`;
}

export function getDriveImageFallbackUrl(fileId: string, width: number = 400): string {
  if (fileId.startsWith("http://") || fileId.startsWith("https://")) {
    return fileId;
  }
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
}

/**
 * Fetches files from Google Drive API v3
 * Requires public folder ("Anyone with the link can view") and Google API Key
 * Reads the folder plus every subfolder (up to depth 3 / 40 folders); photos
 * inside a subfolder get its name as their gallery section ("Bab").
 */
export async function fetchGoogleDriveFolder(
  folderId: string,
  apiKey: string
): Promise<PhotoMetadata[]> {
  const cleanFolderId = extractFolderId(folderId);
  if (!cleanFolderId) {
    throw new Error("ID Folder Google Drive tidak valid.");
  }
  if (!apiKey) {
    throw new Error("Google Drive API Key diperlukan untuk memuat dari Google Drive.");
  }

  // Query as defined in PRD Page 2, then follow nextPageToken so folders
  // with more than 1000 photos are not silently truncated
  const fields = encodeURIComponent(
    "nextPageToken,files(id,name,mimeType,thumbnailLink,imageMediaMetadata,size,createdTime)"
  );

  const fetchPage = async (rawQuery: string): Promise<GoogleDriveApiFile[]> => {
    const query = encodeURIComponent(rawQuery);
    const collected: GoogleDriveApiFile[] = [];
    let pageToken = "";
    let guard = 0;

    do {
      const url =
        `https://www.googleapis.com/drive/v3/files?q=${query}` +
        `&fields=${fields}&orderBy=createdTime&pageSize=1000&key=${apiKey}` +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        const msg = errorJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`Gagal memuat dari Google Drive: ${msg}`);
      }

      const data: GoogleDriveApiResponse = await response.json();
      if (data.files && data.files.length > 0) {
        collected.push(...data.files);
      }
      pageToken = data.nextPageToken || "";
      guard += 1;
    } while (pageToken && guard < 20);

    return collected;
  };

  // 1. Walk the folder tree (root + subfolders) breadth-first
  type FolderNode = { id: string; name: string; depth: number };
  const nodes: FolderNode[] = [{ id: cleanFolderId, name: "", depth: 0 }];
  const queue: FolderNode[] = [...nodes];
  while (queue.length > 0 && nodes.length < 40) {
    const node = queue.shift() as FolderNode;
    if (node.depth >= 3) continue;
    try {
      const subfolders = await fetchPage(
        `'${node.id}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`
      );
      for (const sub of subfolders) {
        queue.push({ id: sub.id, name: sanitizeText(sub.name), depth: node.depth + 1 });
      }
    } catch {
      // Unreadable subfolder: keep going with the rest of the tree
    }
  }

  // 2. Fetch photos folder by folder
  const collected: { file: GoogleDriveApiFile; section?: string }[] = [];
  for (const node of nodes) {
    try {
      const files = await fetchPage(
        `'${node.id}' in parents and trashed = false and mimeType contains 'image/'`
      );
      for (const file of files) {
        collected.push({ file, section: node.name || undefined });
      }
    } catch (err) {
      if (node.depth === 0) throw err; // Root failure must surface
      // Unreadable subfolder: skip it
    }
  }

  if (collected.length === 0) {
    return [];
  }

  // Normalize into PhotoMetadata
  return collected.map(({ file, section }) => {
    const width = file.imageMediaMetadata?.width || 1200;
    const height = file.imageMediaMetadata?.height || 800;
    return {
      id: file.id,
      name: sanitizeText(file.name),
      thumbnailUrl: getDriveImageUrl(file.id, 400),
      previewUrl: getDriveImageUrl(file.id, 1600),
      width,
      height,
      sizeBytes: file.size,
      createdAt: file.createdTime,
      section,
    };
  });
}

