# Lumina Proof Studio

Platform kurasi dan seleksi foto (*photo proofing*) profesional untuk fotografer dan studio foto, dirancang berdasarkan spesifikasi arsitektur **Serverless Client-Side Google Drive Photo Proofing PWA**.

Aplikasi ini dapat di-host secara gratis di **GitHub Pages** (biaya server $0), terhubung langsung ke **Google Drive publik** milik fotografer via REST API v3 dan edge CDN Google User Content (`lh3.googleusercontent.com`), serta mendukung mode luring (*offline-first* PWA) dan persistensi lokal dengan IndexedDB.

---

## Fitur Utama

1. **Integrasi Google Drive API v3 & Edge CDN**:
   - Memuat berkas gambar langsung dari folder Google Drive publik (*Anyone with the link can view*).
   - Menggunakan CDN `https://lh3.googleusercontent.com/d/{FILE_ID}=w{WIDTH}` dengan parameter lebar dinamis (`w400` untuk galeri grid, `w1600` untuk inspeksi *lightbox* resolusi tinggi), terbebas dari isu *error 403 Forbidden* tautan lama dan bebas kendala CORS.
   - Dilengkapi *Mode Demo* kurasi foto pernikahan siap pakai bagi pengujian instan tanpa perlu API key awal.

2. **Galeri Kisi Masonry Responsif**:
   - Menjaga rasio aspek asli foto tanpa pemotongan paksa (*no forced cropping*).
   - Optimasi CLS (*Cumulative Layout Shift* < 0.05) dengan placeholder aspek rasio sebelum gambar termuat sempurna.
   - Filter tab instan: **Semua Foto**, **Terpilih (X/Kuota)**, dan **Belum Dipilih**.
   - Kolom pencarian berkas (*instant filename search*).

3. **Floating Selection Dock**:
   - Panel kendali mengambang di bawah layar dengan penghitung kuota foto *real-time*.
   - *Progress bar* dinamis yang berubah warna hijau (*emerald*) saat kuota paket terpenuhi.
   - Peringatan dan penguncian seleksi otomatis saat batas kuota paket tercapai.

4. **Lightbox Inspeksi Layar Penuh**:
   - Tampilan resolusi tinggi dengan latensi transisi cepat.
   - Tombol *zoom* (1x / 2x) untuk memeriksa ketajaman dan detail wajah.
   - Navigasi keyboard (Panah Kiri, Panah Kanan, Spasi untuk memilih, Esc untuk keluar) serta gestur sentuh *swipe* untuk ponsel.
   - Kolom catatan revisi per-foto (misal: "Tolong hilangkan orang di latar belakang", "Retouch warna kulit").

5. **Multi-Channel Submission & Ekspor Pasca-Produksi**:
   - **Salin Filter Adobe Lightroom / Capture One**: Salin daftar nama file terpilih dipisahkan tanda koma (`IMG_1024.JPG, IMG_1028.JPG`) dengan 1 klik untuk langsung ditempel ke pencarian pustaka Lightroom.
   - **Kirim via WhatsApp**: Format pesan terstruktur rapi beserta tautan hash `#proof=` terkompresi LZW (`lz-string`) untuk verifikasi seleksi.
   - **Transmisi Otomatis ke Google Sheets via Google Apps Script (GAS)**: Menggunakan permintaan `POST text/plain;charset=utf-8` untuk meniadakan pemblokiran *CORS preflight OPTIONS* peramban.
   - **Unduh Manifest Terstruktur**: Berkas `.csv` dan `.json` memuat ID file, nama file, ukuran, dimensi, catatan revisi, dan stempel waktu.
   - Fitur kunci seleksi (*lock selection*) untuk mencegah perubahan yang tidak disengaja.

6. **PWA & Offline-First**:
   - Service worker via Workbox (`vite-plugin-pwa`) dengan strategi `StaleWhileRevalidate` untuk thumbnail Google CDN dan `NetworkFirst` untuk metadata API.
   - Persistensi status seleksi dan katalog foto secara lokal pada *IndexedDB* menggunakan `idb-keyval`.
   - Indikator status jaringan (Online / Offline).

7. **Keamanan Siber Tanpa Server**:
   - *Declarative Content Security Policy (CSP)* pada tag `<meta>` di `index.html`.
   - Sanitasi input string dengan `DOMPurify` untuk mencegah serangan Stored XSS.
   - Skrip *Anti-Clickjacking Frame-Busting*.

---

## Panduan Penggunaan

### 1. Menjalankan di Komputer Lokal

```bash
# Masuk ke direktori proyek
cd "Web Fotografi"

# Jalankan server pengembangan
npm run dev

# Buka peramban di http://127.0.0.1:5173/
```

### 2. Konfigurasi Studio (Fotografer)

Klik tombol **Studio Hub** di bilah navigasi kanan atas:
- Masukkan URL atau ID folder Google Drive publik.
- Masukkan **Google Drive API Key v3**.
- Tentukan kuota maksimal foto (misal: 20, 30, atau 50).
- Masukkan Nama Klien dan ID Proyek.
- Masukkan URL Webhook Google Apps Script (jika ingin hasil langsung masuk ke Google Sheets).
- Klik **Salin Tautan Klien** untuk membagikan tautan yang sudah terkonfigurasi ke klien.

Contoh tautan klien:
```text
https://username.github.io/web-fotografi/?folder=1AbC...&quota=25&client=Rian%20%26%20Amanda&project=WED-2026-01
```

### 3. Mengatur Google Apps Script (GAS) untuk Google Sheets

1. Buat Google Spreadsheet baru di akun Google Anda.
2. Buka menu **Extensions > Apps Script**.
3. Buka tab **Google Apps Script (GAS)** di dalam menu *Studio Hub* aplikasi, lalu salin kode `Code.gs`.
4. Tempel ke editor Apps Script dan simpan.
5. Klik **Deploy > New deployment**:
   - Pilih jenis: **Web App**.
   - Description: `Lumina Proof Webhook`.
   - Execute as: **Me** (akun Google Anda).
   - Who has access: **Anyone**.
6. Klik **Deploy** dan salin URL Web App yang dihasilkan ke kolom Webhook di *Studio Hub*.

### 4. Deploy ke GitHub Pages via GitHub Actions

Pipeline CI/CD telah disediakan di berkas [deploy.yml](file:///.github/workflows/deploy.yml).

1. Buat repositori baru di GitHub dan dorong (*push*) kode ini ke cabang `main`.
2. Di GitHub Repository:
   - Buka **Settings > Pages**.
   - Pada bagian **Build and deployment > Source**, pilih **GitHub Actions**.
   - (Opsional) Di **Settings > Secrets and variables > Actions**, tambahkan secret `PROD_GOOGLE_API_KEY` jika ingin menyematkan API key saat build.
3. Setiap kali ada commit ke branch `main`, GitHub Actions akan otomatis memverifikasi kode, mengompilasi Vite SPA, membuat berkas `404.html` dan `.nojekyll`, lalu mempublikasikannya ke CDN GitHub Pages.

---

## Struktur Berkas Proyek

```text
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD otomatis untuk GitHub Pages
├── public/
│   ├── favicon.svg                 # Ikon studio kamera
│   ├── masked-icon.svg
│   ├── pwa-192x192.png             # Ikon PWA
│   └── pwa-512x512.png
├── src/
│   ├── components/
│   │   ├── EmptyState.tsx          # Komponen status kosong (pencarian, seleksi)
│   │   ├── FloatingDock.tsx        # Dock mengambang penghitung kuota & progress bar
│   │   ├── LightboxModal.tsx       # Peninjau layar penuh resolusi tinggi & catatan revisi
│   │   ├── MasonryGallery.tsx      # Galeri kisi adaptif multi-kolom
│   │   ├── Navbar.tsx              # Bilah navigasi, status koneksi & aksi
│   │   ├── OfflineIndicator.tsx    # Banner status koneksi luring
│   │   ├── PhotographerStudioModal.tsx # Hub pengaturan fotografer & kode GAS
│   │   └── SubmissionModal.tsx     # Dialog ekspor Lightroom, WhatsApp, GAS, CSV/JSON
│   ├── lib/
│   │   ├── googleDrive.ts          # Integrasi Google Drive API v3 & dataset demo
│   │   ├── storage.ts              # Zustand store & persistensi IndexedDB (idb-keyval)
│   │   ├── sync.ts                 # Algoritma kompresi URL hash lz-string & ekspor
│   │   └── utils.ts                # Utilitas tailwind, sanitasi DOMPurify, format ukuran
│   ├── types/
│   │   └── index.ts                # Antarmuka TypeScript (PhotoMetadata, Session, Config)
│   ├── App.tsx                     # Komponen utama aplikasi
│   ├── index.css                   # Token desain Tailwind CSS, custom scrollbar & masonry
│   ├── main.tsx                    # Entry point React & registrasi PWA
│   └── vite-env.d.ts               # Definisi types Vite dan VitePWA
├── index.html                      # Template HTML dengan CSP deklaratif & frame-busting
├── package.json                    # Dependensi dan script build
├── postcss.config.js               # Konfigurasi PostCSS
├── tailwind.config.js              # Desain sistem & tema warna gelap
├── tsconfig.json                   # Konfigurasi TypeScript dan path alias @/*
└── vite.config.ts                  # Bundler Vite & konfigurasi PWA Workbox runtime caching
```
