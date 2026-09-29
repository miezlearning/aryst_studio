import { PhotoMetadata, GoogleDriveApiResponse } from "@/types";
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

  // Query as defined in PRD Page 2:
  // q='{FOLDER_ID}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,thumbnailLink,imageMediaMetadata,size)&pageSize=1000&key={API_KEY}
  const query = encodeURIComponent(`'${cleanFolderId}' in parents and trashed = false and mimeType contains 'image/'`);
  const fields = encodeURIComponent("files(id,name,mimeType,thumbnailLink,imageMediaMetadata,size)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=1000&key=${apiKey}`;

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

  if (!data.files || data.files.length === 0) {
    return [];
  }

  // Normalize into PhotoMetadata
  return data.files.map((file) => {
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
    };
  });
}

/**
 * Curated Demo Photography Dataset for immediate preview and testing
 * Features professional editorial, wedding, and portrait photography with real aspect ratios
 */
export const DEMO_PHOTOS: PhotoMetadata[] = [
  {
    id: "demo-001",
    name: "LUMINA_CEREMONY_0102.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=90",
    width: 1200,
    height: 800,
    sizeBytes: "4194304",
    section: "Persiapan & Detail",
    location: "Suite Room • Hotel Grand",
  },
  {
    id: "demo-002",
    name: "LUMINA_BRIDE_SOLO_0118.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1800&q=90",
    width: 800,
    height: 1200,
    sizeBytes: "3670016",
    section: "Persiapan & Detail",
    location: "Suite Room • Hotel Grand",
  },
  {
    id: "demo-003",
    name: "LUMINA_RINGS_MACRO_0142.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=1800&q=90",
    width: 1200,
    height: 800,
    sizeBytes: "5242880",
    section: "Persiapan & Detail",
    location: "Suite Room • Hotel Grand",
  },
  {
    id: "demo-007",
    name: "LUMINA_FIRST_LOOK_0267.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1800&q=90",
    width: 1200,
    height: 800,
    sizeBytes: "4823449",
    section: "Akad Nikah / Ijab Kabul",
    location: "Masjid Raya Al-Akbar",
  },
  {
    id: "demo-009",
    name: "LUMINA_VOWS_EXCHANGE_0344.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1800&q=90",
    width: 1200,
    height: 800,
    sizeBytes: "4561234",
    section: "Akad Nikah / Ijab Kabul",
    location: "Masjid Raya Al-Akbar",
  },
  {
    id: "demo-010",
    name: "LUMINA_CANDID_LAUGHTER_0388.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1800&q=90",
    width: 800,
    height: 1200,
    sizeBytes: "3892736",
    section: "Akad Nikah / Ijab Kabul",
    location: "Masjid Raya Al-Akbar",
  },
  {
    id: "demo-004",
    name: "LUMINA_COUPLE_SUNSET_0189.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1800&q=90",
    width: 800,
    height: 1100,
    sizeBytes: "4718592",
    section: "Sesi Outdoor & Sunset",
    location: "Garden Lawn & Sunset Deck",
  },
  {
    id: "demo-008",
    name: "LUMINA_OUTDOOR_PORTRAIT_0312.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1800&q=90",
    width: 800,
    height: 1000,
    sizeBytes: "5111808",
    section: "Sesi Outdoor & Sunset",
    location: "Garden Lawn & Sunset Deck",
  },
  {
    id: "demo-011",
    name: "LUMINA_SUNLIT_WALK_0411.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1800&q=90",
    width: 1200,
    height: 800,
    sizeBytes: "4194304",
    section: "Sesi Outdoor & Sunset",
    location: "Garden Lawn & Sunset Deck",
  },
  {
    id: "demo-005",
    name: "LUMINA_RECEPTION_DANCE_0234.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1800&q=90",
    width: 1200,
    height: 800,
    sizeBytes: "3984588",
    section: "Resepsi & After Party",
    location: "Grand Ballroom",
  },
  {
    id: "demo-006",
    name: "LUMINA_BOUQUET_DETAILS_0245.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1800&q=90",
    width: 800,
    height: 1200,
    sizeBytes: "4325376",
    section: "Resepsi & After Party",
    location: "Grand Ballroom",
  },
  {
    id: "demo-012",
    name: "LUMINA_AFTER_PARTY_0456.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1800&q=90",
    width: 800,
    height: 1200,
    sizeBytes: "5033164",
    section: "Resepsi & After Party",
    location: "Grand Ballroom",
  },
];

export const PREWED_PHOTOS: PhotoMetadata[] = [
  {
    id: "prewed-001",
    name: "PREWED_TAMBLINGAN_SUNRISE_001.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=90",
    width: 1200,
    height: 800,
    sizeBytes: "4194304",
    section: "Danau Tamblingan (Sunrise)",
    location: "Kabupaten Buleleng, Bali",
  },
  {
    id: "prewed-002",
    name: "PREWED_PINUS_MISTY_002.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1800&q=90",
    width: 800,
    height: 1200,
    sizeBytes: "3670016",
    section: "Hutan Pinus Kintamani",
    location: "Kintamani, Bali",
  },
  {
    id: "prewed-003",
    name: "PREWED_MELASTI_CLIFF_003.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1800&q=90",
    width: 800,
    height: 1100,
    sizeBytes: "4718592",
    section: "Pantai Melasti (Sunset)",
    location: "Ungasan, Bali",
  },
  {
    id: "prewed-004",
    name: "PREWED_MELASTI_WALK_004.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1800&q=90",
    width: 1200,
    height: 800,
    sizeBytes: "4194304",
    section: "Pantai Melasti (Sunset)",
    location: "Ungasan, Bali",
  },
  {
    id: "prewed-005",
    name: "PREWED_PINUS_PORTRAIT_005.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1800&q=90",
    width: 800,
    height: 1000,
    sizeBytes: "5111808",
    section: "Hutan Pinus Kintamani",
    location: "Kintamani, Bali",
  },
];

export const MATERNITY_PHOTOS: PhotoMetadata[] = [
  {
    id: "maternity-001",
    name: "MATERNITY_STUDIO_MINIMAL_001.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1544126592-807ade215a0f?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1544126592-807ade215a0f?auto=format&fit=crop&w=1800&q=90",
    width: 800,
    height: 1200,
    sizeBytes: "3920000",
    section: "Minimalist Monochrome",
    location: "Studio Cyclorama",
  },
  {
    id: "maternity-002",
    name: "MATERNITY_WARM_EDITORIAL_002.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1800&q=90",
    width: 1200,
    height: 800,
    sizeBytes: "4200000",
    section: "Warm Editorial Couple",
    location: "Living Set Studio",
  },
  {
    id: "maternity-003",
    name: "MATERNITY_COUPLE_EMBRACE_003.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?auto=format&fit=crop&w=1800&q=90",
    width: 800,
    height: 1100,
    sizeBytes: "4100000",
    section: "Warm Editorial Couple",
    location: "Living Set Studio",
  },
  {
    id: "maternity-004",
    name: "MATERNITY_SILHOUETTE_BUMP_004.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1800&q=90",
    width: 800,
    height: 1200,
    sizeBytes: "3800000",
    section: "Minimalist Monochrome",
    location: "Studio Cyclorama",
  },
];

export const ENGAGEMENT_PHOTOS: PhotoMetadata[] = [
  {
    id: "eng-001",
    name: "ENGAGEMENT_RINGS_EXCHANGE_001.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=1800&q=90",
    width: 1200,
    height: 800,
    sizeBytes: "5242880",
    section: "Prosesi Tukar Cincin",
    location: "Bumi Sangkuriang, Bandung",
  },
  {
    id: "eng-002",
    name: "ENGAGEMENT_FAMILY_CANDID_002.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1800&q=90",
    width: 800,
    height: 1200,
    sizeBytes: "3892736",
    section: "Ramah Tamah Keluarga",
    location: "Bumi Sangkuriang, Bandung",
  },
  {
    id: "eng-003",
    name: "ENGAGEMENT_COUPLE_GLOW_003.JPG",
    thumbnailUrl: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=600&q=80",
    previewUrl: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1800&q=90",
    width: 1200,
    height: 800,
    sizeBytes: "4561234",
    section: "Prosesi Tukar Cincin",
    location: "Bumi Sangkuriang, Bandung",
  },
];

export function getDemoPhotosForProject(sessionType?: string): PhotoMetadata[] {
  if (sessionType === "Prewedding") {
    return PREWED_PHOTOS;
  }
  if (sessionType === "Maternity") {
    return MATERNITY_PHOTOS;
  }
  if (sessionType === "Lamaran") {
    return ENGAGEMENT_PHOTOS;
  }
  return DEMO_PHOTOS;
}
