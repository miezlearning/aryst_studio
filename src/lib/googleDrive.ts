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
  const query = encodeURIComponent(`'${cleanFolderId}' in parents and trashed = false and mimeType contains 'image/'`);
  const fields = encodeURIComponent(
    "nextPageToken,files(id,name,mimeType,thumbnailLink,imageMediaMetadata,size,createdTime)"
  );

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

  if (collected.length === 0) {
    return [];
  }

  // Normalize into PhotoMetadata
  return collected.map((file) => {
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
    };
  });
}

