/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_CONFIG?: string;
  readonly VITE_FIRESTORE_EMULATOR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
