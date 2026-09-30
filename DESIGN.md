# DESIGN.md

Arah desain ARYST. Ditulis pemilik dari arah visual app yang sudah berjalan, diformat oleh asisten. File ini berisi data arah (bidang desain), bukan perintah ke agent.

## Identitas

- Nama: **ARYST**, satu kata, kapital semua. Tidak ada slogan pendamping.
- Produk: portal privat kurasi dan seleksi foto klien (proofing), dipakai fotografer untuk mengirim galeri, klien memilih foto, batas waktu pemilihan.
- Sifat: privat, presisi, tenang. Studio butik, bukan marketplace.

## Kepribadian

Premium tapi tidak norak. Data dan foto yang menonjol, bukan hiasan. Bahasa Indonesia, to the point, tanpa kata pemasaran kosong.

## Palet

- Base: `zinc-950` (#09090b) untuk latar, `zinc-900` untuk panel.
- Teks: `zinc-100`/`white` untuk judul, `zinc-400` untuk sekunder, `zinc-500` untuk catatan kecil (kontras tetap lolos WCAG AA).
- Aksen tunggal: `amber-400` (#fbbf24) untuk fokus, ikon penting, tombol utama, sorotan kode sesi.
- Feedback saja (bukan bagian palet inti): `emerald-400` sukses, `rose-400`/`rose-500` error.
- Kaca: isi putih 3% sampai 6% di atas latar gelap dengan `backdrop-blur`, garis `zinc-800`. Kaca adalah aksen, bukan karakter seluruh halaman.
- Gelap dipilih karena galeri foto: latar gelap membuat foto klien menonjol, bukan karena terkesan "tech".

## Tipografi

- Sans: **Figtree** (400 sampai 800) untuk seluruh antarmuka.
- Monospace: hanya untuk kode sesi, ID folder, dan teknis pendek (mis. `WED-2026-RIAN`). Bukan untuk judul.
- Hirarki: ukuran dan bobot yang jelas (judul tebal, sekunder tipis), huruf kapital berlebih dengan tracking lebar tidak dipakai.

## Mood dan ritme

- Suasana: malam, bersih, sedikit berkilau (liquid glass) di titik sentuh utama.
- Sudut: radius konsisten (xl sampai 2xl), tidak semua elemen berbentuk pil.
- Motif identitas: panel liquid glass dengan kilau halus saat hover (`.liquid-glass`, `.btn-glossy`) dipakai berulang di navbar, form kode sesi, dan tombol utama.

## Dials

`Dial: ENERGY 2 / RHYTHM 2 / MOTION 1`

- ENERGY 2: hadir dan berwibawa, bukan diam, bukan berlebihan.
- RHYTHM 2: bagian konsisten dengan beberapa perbedaan nyata (hero video, showcase, form masuk, dashboard padat data).
- MOTION 1: transisi hover dan peralihan state saja. Tidak ada parallax, tidak ada animasi berulang tanpa fungsi. Skeleton shimmer dianggap state loading, bukan hiasan.
