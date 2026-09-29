import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import { PhotoMetadata, ClientSelectionSession } from "@/types";

/**
 * URL Hash Compression Synchronization (PRD Sec: Saluran Sinkronisasi Status Berbasis URL Hash Kompresi)
 * Compresses selected IDs and notes using LZW algorithm into URL hash #proof=...
 */
export function generateCompressedProofUrl(
  selectedIds: string[],
  revisionNotes: Record<string, string> = {}
): string {
  const payload = {
    ids: selectedIds,
    notes: revisionNotes,
  };
  const serialized = JSON.stringify(payload);
  const compressed = compressToEncodedURIComponent(serialized);
  const baseUri = window.location.origin + window.location.pathname + window.location.search;
  return `${baseUri}#proof=${compressed}`;
}

export function extractSelectionFromUrl(): {
  selectedIds: string[];
  revisionNotes: Record<string, string>;
} {
  const hash = window.location.hash;
  if (!hash.startsWith("#proof=")) {
    return { selectedIds: [], revisionNotes: {} };
  }

  try {
    const compressed = hash.replace("#proof=", "");
    const decompressed = decompressFromEncodedURIComponent(compressed);
    if (!decompressed) return { selectedIds: [], revisionNotes: {} };

    const parsed = JSON.parse(decompressed);
    if (Array.isArray(parsed)) {
      // Legacy format where it was just string[]
      return { selectedIds: parsed, revisionNotes: {} };
    }
    return {
      selectedIds: parsed.ids || [],
      revisionNotes: parsed.notes || {},
    };
  } catch (err) {
    console.error("Failed to decompress proof hash from URL:", err);
    return { selectedIds: [], revisionNotes: {} };
  }
}

/**
 * Google Apps Script Webhook Ingestion (PRD Sec: Saluran Webhook Ingestion Google Apps Script)
 * Sends POST request with Content-Type: text/plain;charset=utf-8 to bypass CORS preflight OPTIONS.
 */
export async function transmitSelectionData(
  endpointUrl: string,
  payload: object
): Promise<boolean> {
  if (!endpointUrl) return false;
  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    const result = await response.json();
    return result.status === "success";
  } catch (error) {
    console.error("Transmission error:", error);
    return false;
  }
}

/**
 * Adobe Lightroom / Capture One Filter String (PRD Sec: Format Ekspor Pasca-Produksi)
 * Formats selected filenames separated by comma or space: e.g. "IMG_1024.JPG, IMG_1028.JPG"
 */
export function generateLightroomFilter(photoNames: string[]): string {
  return photoNames.join(", ");
}

/**
 * Structured CSV Manifest for studio workflow
 */
export function generateManifestCSV(
  photos: PhotoMetadata[],
  notes: Record<string, string>,
  session: ClientSelectionSession
): string {
  const headers = [
    "No",
    "Nama Berkas",
    "ID File",
    "Ukuran Berkas",
    "Dimensi",
    "Catatan Revisi Klien",
    "Waktu Seleksi",
  ];

  const rows = photos.map((photo, index) => {
    const note = (notes[photo.id] || "").replace(/"/g, '""');
    const dimension = photo.width && photo.height ? `${photo.width}x${photo.height}` : "-";
    const dateStr = new Date(session.lastModified).toLocaleString("id-ID");
    return [
      index + 1,
      `"${photo.name}"`,
      `"${photo.id}"`,
      `"${photo.sizeBytes || "-"}"`,
      `"${dimension}"`,
      `"${note}"`,
      `"${dateStr}"`,
    ].join(",");
  });

  return [
    `# ARYST - MANIFEST SELEKSI FOTO`,
    `# Klien: ${session.clientName || "-"}`,
    `# Kontak: ${session.clientContact || "-"}`,
    `# Project: ${session.projectId || "-"}`,
    `# Total Terpilih: ${photos.length} / ${session.maxQuota}`,
    headers.join(","),
    ...rows,
  ].join("\n");
}

/**
 * Structured JSON Manifest
 */
export function generateManifestJSON(
  photos: PhotoMetadata[],
  notes: Record<string, string>,
  session: ClientSelectionSession
): string {
  const data = {
    studio: "ARYST",
    client: {
      name: session.clientName,
      contact: session.clientContact,
      projectId: session.projectId,
    },
    summary: {
      totalSelected: photos.length,
      maxQuota: session.maxQuota,
      submittedAt: new Date(session.lastModified).toISOString(),
    },
    selectedFiles: photos.map((p) => ({
      id: p.id,
      name: p.name,
      width: p.width,
      height: p.height,
      sizeBytes: p.sizeBytes,
      revisionNote: notes[p.id] || "",
    })),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * WhatsApp Share Link generator
 */
export function generateWhatsAppUrl(
  photographerPhone: string,
  message: string
): string {
  const cleanPhone = photographerPhone.replace(/[^0-9]/g, "");
  const encodedText = encodeURIComponent(message);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Generates direct shareable link for a client project with all config parameters
 */
export function generateClientShareUrl(project: {
  id: string;
  clientName: string;
  projectId: string;
  maxQuota: number;
  folderId?: string;
  passwordHash?: string;
  clientContact?: string;
  webhookUrl?: string;
}): string {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("view", "client");
  url.searchParams.set("session", project.id);
  url.searchParams.set("client", project.clientName);
  url.searchParams.set("project", project.projectId);
  url.searchParams.set("quota", String(project.maxQuota));
  if (project.folderId) url.searchParams.set("folder", project.folderId);
  if (project.passwordHash) url.searchParams.set("ph", project.passwordHash);
  if (project.clientContact) url.searchParams.set("contact", project.clientContact);
  if (project.webhookUrl) url.searchParams.set("webhook", project.webhookUrl);
  return url.toString();
}
