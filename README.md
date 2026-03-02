# 📸 Smart Attendance System with Face Recognition

Sistem absensi berbasis web modern yang menggunakan teknologi **Artificial Intelligence (AI)** untuk memverifikasi identitas pengguna melalui pemindaian wajah secara *real-time*. Dibangun menggunakan **Next.js** dan **Face-API.js** dengan integrasi database **MySQL**.

## ✨ Fitur Utama

* **Real-time Face Detection**: Mendeteksi wajah melalui webcam secara instan menggunakan model AI yang ringan.
* **One-Time Face Enrollment**: Karyawan mendaftarkan wajah mereka hanya sekali, dan data fitur wajah unik (128 descriptor) akan dikunci di database.
* **Secure Attendance**: Mencegah "titip absen" karena sistem memverifikasi kesesuaian wajah pengguna dengan data yang terdaftar.
* **Dual Role (Admin & Employee)**: Dashboard khusus untuk Admin guna memantau riwayat absensi dan Dashboard untuk Karyawan melakukan absen.
* **Dark & Light Mode**: Antarmuka responsif yang mendukung tema gelap dan terang.

## 🧠 Teknologi AI

Proyek ini menggunakan **Face-API.js** yang dibangun di atas **TensorFlow.js** (dikembangkan oleh Google). AI bekerja dengan cara:

1. **Detection**: Mencari wajah manusia menggunakan `SSD Mobilenet v1` atau `Tiny Face Detector`.
2. **Landmarks**: Memetakan 68 titik unik wajah (mata, hidung, bibir, rahang).
3. **Recognition**: Mengonversi fitur wajah menjadi **128 Float32 Array (Face Descriptor)** yang unik untuk setiap individu.

## 🔐 Akun Login Default (GitHub Version)

Gunakan kredensial berikut untuk mencoba fitur aplikasi:

| Role | Username | Password |
| --- | --- | --- |
| **Admin** | Admin | `123456` |
| **Karyawan** | Fana | `123456` |

## 🚀 Getting Started

Pertama, jalankan development server:

```bash
npm run dev
# atau
yarn dev
# atau
pnpm dev
# atau
bun dev

```

Buka [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) di browser Anda untuk melihat hasilnya.

Anda dapat mulai mengedit halaman dengan memodifikasi `pages/index.js`. Halaman akan otomatis diperbarui saat Anda menyimpan perubahan.

## 🛠️ Konfigurasi Environment

Buat file `.env.local` di root folder dan isi dengan kredensial database MySQL (XAMPP) Anda:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=nama_database_anda

```

## 📂 Struktur Penting

* `/pages/api`: Endpoint API untuk autentikasi dan absensi.
* `/public/models`: Berisi 7 file model AI (weights & manifests) yang digunakan oleh Face-API.js.
* `/lib/db.js`: Konfigurasi koneksi database menggunakan `mysql2/promise`.
