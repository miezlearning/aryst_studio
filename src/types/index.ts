export interface PhotoMetadata {
  id: string;
  name: string;
  thumbnailUrl: string;
  previewUrl: string;
  width?: number;
  height?: number;
  sizeBytes?: string;
  section?: string;
  location?: string;
}

export interface ProjectSection {
  id: string;
  name: string;
  location?: string;
  description?: string;
}

export interface ClientSelectionSession {
  projectId: string;
  clientName: string;
  clientContact: string;
  maxQuota: number;
  selectedPhotoIds: string[];
  revisionNotes: Record<string, string>;
  isLocked: boolean;
  lastModified: number;
}

export interface ProofingConfig {
  folderId: string;
  apiKey: string;
  clientName: string;
  clientContact: string;
  projectId: string;
  maxQuota: number;
  webhookUrl?: string;
}

export interface ClientProject {
  id: string;
  clientName: string;
  projectId: string;
  folderId: string;
  maxQuota: number;
  password?: string;
  passwordHash?: string;
  clientContact?: string;
  notes?: string;
  webhookUrl?: string;
  sections?: ProjectSection[];

  // Different session attributes for the same client
  sessionType?: string; // e.g. "Prewedding", "Pernikahan", "Maternity", "Lamaran", "Wisuda", "Family"
  sessionTitle?: string; // e.g. "Prewedding Sinematik Alam"
  sessionPurpose?: string; // e.g. "Foto Cetak Undangan & Galeri Resepsi"
  location?: string; // e.g. "Pantai Melasti & Kintamani, Bali"
  sessionDate?: string;

  createdAt: number;
}

export type ViewMode = "landing" | "client" | "admin";

export interface P2PSelectionPayload {
  type: "SELECTION_UPDATE" | "REQUEST_SYNC" | "INITIAL_SYNC";
  projectId: string;
  selectedPhotoIds: string[];
  revisionNotes: Record<string, string>;
  timestamp: number;
}

export interface GoogleDriveApiFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  imageMediaMetadata?: {
    width?: number;
    height?: number;
    rotation?: number;
  };
  size?: string;
}

export interface GoogleDriveApiResponse {
  files: GoogleDriveApiFile[];
  nextPageToken?: string;
  error?: {
    code: number;
    message: string;
  };
}
