<div align="center">

# ARYST

### Galeri kurasi foto klien, tanpa server

[![Deploy](https://github.com/miezlearning/aryst_studio/actions/workflows/deploy.yml/badge.svg)](https://github.com/miezlearning/aryst_studio/actions)
[![Demo](https://img.shields.io/website?url=https%3A%2F%2Fmiezlearning.github.io%2Faryst_studio&label=demo&color=brightgreen)](https://miezlearning.github.io/aryst_studio/)
![Node](https://img.shields.io/badge/Node-20.x-339933?logo=nodedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Workbox-5A0FC8?logo=pwa&logoColor=white)

**[Demo Langsung](https://miezlearning.github.io/aryst_studio/)** · **[PRD](./PRD%20Web%20Proofing%20Foto%20GDrive%20%281%29.pdf)** · **[Riwayat Deploy](https://github.com/miezlearning/aryst_studio/actions)**

</div>

ARYST menghubungkan folder **Google Drive publik** milik studio dengan klien lewat satu tautan: klien memilih foto dan menulis catatan revisi langsung di peramban, studio menerima pilihan siap diproses. Tidak ada backend, biaya hosting **$0** di GitHub Pages, dan data tersimpan lokal (IndexedDB).

<div align="center">

![GitHub Streak](https://streak-stats.demolab.com/?user=miezlearning&hide_border=true&ring_color=EAB308&currStreakNum=A1A1AA&sideNums=A1A1AA&sideLabels=71717A&dates=71717A&background=0A0A0A)
![Last Commit](https://img.shields.io/github/last-commit/miezlearning/aryst_studio?color=EAB308&label=commit)
![Repo Size](https://img.shields.io/github/repo-size/miezlearning/aryst_studio?color=EAB308&label=repo)
![Code Size](https://img.shields.io/github/languages/code-size/miezlearning/aryst_studio?color=EAB308)
![Visitors](https://komarev.com/ghpvc/?username=miezlearning%2Faryst_studio&color=brightgreen)

</div>

## Fitur

- **Galeri masonry responsif** — rasio asli terjaga, CLS < 0.05, filter *Semua / Terpilih / Belum Dipilih* dan pencarian nama file instan.
- **Lightbox inspeksi** — zoom 100%–600% (klik, scroll, tombol `+`/`−`, cubit di ponsel), geser foto saat zoom, klik area gelap untuk menutup, navigasi keyboard, dan catatan revisi per foto.
- **Seleksi berkuota** — dock mengambang dengan hitungan & progress, kunci seleksi, batas waktu pilihan.
- **Proteksi galeri klien** — klik kanan, seret foto keluar, serta `Ctrl+S`/`Ctrl+P` diblokir di tampilan klien.
- **Serah terima praktis** — unduhan **ZIP** foto pilihan oleh admin, manifest CSV/JSON, salin filter Lightroom, dan kirim via WhatsApp.
- **PWA *offline-first*** — cache Workbox (thumbnail *stale-while-revalidate*, metadata *network-first*), persistensi IndexedDB, indikator jaringan.
- **Aman tanpa server** — CSP deklaratif, sanitasi DOMPurify, anti-clickjacking, tanpa penyimpanan data klien di pihak ketiga.

## Alur Kerja

```mermaid
flowchart LR
    A["Studio unggah foto<br/>ke Google Drive publik"] --> B["Bagikan tautan ARYST<br/>ke klien"]
    B --> C["Klien kurasi &<br/>tulis catatan revisi"]
    C --> D["Studio menerima pilihan:<br/>ZIP · CSV/JSON · Filter Lightroom"]
```

## Dibangun Dengan

| Lapisan | Teknologi |
| --- | --- |
| Antarmuka | React 19 + TypeScript 5, Tailwind CSS 3 |
| Build & hosting | Vite 6, GitHub Pages + GitHub Actions |
| Penyimpanan | Google Drive API v3, IndexedDB (`idb-keyval`), Zustand |
| PWA | `vite-plugin-pwa` + Workbox |
| Lainnya | `jszip`, `lz-string`, PeerJS, DOMPurify, lucide-react |

## Mulai Cepat

```bash
git clone https://github.com/miezlearning/aryst_studio.git
cd aryst_studio
npm install
npm run dev
```

Buka `http://localhost:5173`. Masuk mode admin dengan **mengklik ganda logo ARYST** di kiri atas, lalu isi PIN admin.

## Konfigurasi Studio

<details>
<summary><b>Folder Drive, API key, dan tautan klien</b></summary>

1. Ubah folder Google Drive menjadi **Anyone with the link can view**.
2. Buat API key di Google Cloud Console (Drive API v3 aktif), lalu simpan lewat tombol pengaturan sesi di dashboard admin.
3. Isi ID folder + API key pada sesi klien, tentukan kuota, lalu **Salin Tautan Klien**.
4. Contoh tautan yang dibagikan ke klien:

```text
https://miezlearning.github.io/aryst_studio/?folder=1AbC...&quota=25&client=Rian%20%26%20Amanda&project=WED-2026-01
```

</details>

<details>
<summary><b>Webhook Google Sheets (opsional)</b></summary>

1. Buat Spreadsheet baru → menu **Extensions → Apps Script**.
2. Salin kode `Code.gs` dari tab *Integrasi* di dashboard ARYST, tempel, simpan.
3. **Deploy → New deployment → Web App**, *Execute as*: Me, *Access*: Anyone.
4. Tempel URL Web App ke kolom Webhook pada sesi klien — pilihan klien masuk otomatis ke Spreadsheet.

</details>

## Deploy

Tidak ada langkah manual: setiap **push ke `master`**, GitHub Actions mengecek tipe, membangun, dan menerbitkan ke

**https://miezlearning.github.io/aryst_studio/**

Pipeline ada di [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml).

## Struktur Proyek

<details>
<summary>Buka struktur berkas</summary>

```text
aryst_studio/
├── .github/workflows/deploy.yml   # CI/CD → GitHub Pages
├── public/                        # Ikon PWA & aset statis
├── src/
│   ├── components/                # Galeri, lightbox, dock, dashboard admin
│   ├── lib/                       # Drive API, store, sync, zip
│   ├── types/                     # Kontrak tipe TypeScript
│   ├── App.tsx                    # Router tampilan klien & admin
│   └── main.tsx                   # Entry + registrasi service worker
├── index.html                     # CSP + frame-busting
├── vite.config.ts                 # Vite + konfigurasi PWA Workbox
└── package.json
```

</details>
