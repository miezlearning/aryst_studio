# DESIGN.md

Arah desain ARYST. Ditulis pemilik dari arah visual yang dipilih, diformat oleh asisten. File ini berisi data arah (bidang desain), bukan perintah ke agent.

## Identitas

- Nama: **ARYST**, satu kata, kapital semua. Tidak ada slogan pendamping.
- Produk: portal privat kurasi dan seleksi foto klien (proofing), dipakai fotografer untuk mengirim galeri, klien memilih foto, batas waktu pemilihan.
- Sifat: privat, presisi, tenang. Studio butik, bukan marketplace.

## Kepribadian

Premium tapi tidak norak. Data dan foto yang menonjol, bukan hiasan. Bahasa Indonesia, to the point, tanpa kata pemasaran kosong.

## Referensi

- **mtioon.com** (dipilih pemilik): kanvas terang hangat, kartu putih radius besar, kontrol pil, tombol 3D slab, tipografi Black dengan tracking rapat, chip 3D melayang.

## Palet

- Base: `#FAF8F5` (warm paper) untuk latar, putih `#ffffff` untuk panel/kartu, `#F4F1EA` untuk inset, `#F5F2EB` untuk field.
- Teks: `#121212` untuk judul, `#121212/60` untuk isi sekunder, `#121212/50` untuk catatan kecil.
- Aksen tunggal: oranye `#FF5A1F` untuk fokus, ikon penting, tombol utama (teks putih); `#C2410C` untuk teks aksen kecil agar lolos kontras AA; `#FFF1EB` untuk tint badge.
- Tombol: `.btn-mtioon-primary` (oranye 3D), `.btn-mtioon-secondary` (putih 3D), `.btn-mtioon-black` (pil gelap, mis. nav aktif dan segmen aktif).
- Kartu: `.mtioon-card` (putih, radius 28px, hairline + bayangan lembut).
- Feedback saja: `rose-50/200/700` error, `emerald-700` sukses.
- Scrim di atas foto (lightbox, overlay kartu foto) tetap gelap agar foto menonjol.

## Tipografi

- Sans: **Sunghyun Sans** (SIL OFL, self-hosted di `src/fonts`, 400/500/600/700/800/900) untuk seluruh antarmuka.
- Hirarki: judul Black (900) dengan tracking rapat, isi 400-500 lega; huruf kapital berlebih dengan tracking lebar tidak dipakai.
- Monospace: hanya untuk kode sesi, ID folder, dan teknis pendek (mis. `WED-2026-RIAN`). Bukan untuk judul.

## Mood dan ritme

- Suasana: terang, hangat, bersih; foto klien tetap bintang halaman.
- Sudut: kartu besar 28px, kontrol berbentuk pil (`rounded-full`).
- Motif identitas: kartu putih `.mtioon-card`, tombol 3D pil, chip 3D melayang yang bisa ditarik (loop lembut hanya di landing; wajib mati saat `prefers-reduced-motion`). Dashboard memakai kartu + tombol yang sama tanpa chip melayang.

## Dials

`Dial: ENERGY 2 / RHYTHM 2 / MOTION 1`

- ENERGY 2: hadir dan berwibawa, bukan diam, bukan berlebihan.
- RHYTHM 2: bagian konsisten dengan beberapa perbedaan nyata (hero video, showcase, form masuk, dashboard padat data).
- MOTION 1: transisi hover dan peralihan state saja; pengecualian yang disetujui pemilik: chip 3D landing boleh loop lembut dengan guard reduced-motion. Tidak ada parallax. Skeleton shimmer dianggap state loading, bukan hiasan.
