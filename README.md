# 📸 Smart Attendance & HRIS System with Face Recognition

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

Sistem Human Resource Information System (HRIS) & Absensi berbasis web modern yang menggunakan teknologi **Artificial Intelligence (AI)** untuk memverifikasi identitas pengguna melalui pemindaian wajah secara *real-time*. Dibangun menggunakan **Next.js** dan **Face-API.js** dengan integrasi database **MySQL**.

---

## ✨ Fitur Utama

- 🧑‍💻 **Real-time Face Detection:** Mendeteksi wajah melalui webcam secara instan menggunakan model AI yang ringan dan akurat.
- 🔐 **One-Time Face Enrollment:** Karyawan hanya perlu mendaftarkan wajah mereka satu kali. Sistem akan mengekstraksi 128 fitur wajah unik (*descriptor*) dan menguncinya di dalam database.
- 🛡️ **Secure Attendance (Anti-Titip Absen):** Memastikan kehadiran otentik dengan mencocokkan wajah *real-time* pengguna dengan data biometrik yang telah terdaftar.
- 👥 **Dual Role Access:** - **Admin:** Memiliki akses ke Dashboard sentral untuk memantau riwayat absensi, menyetujui izin/cuti, mengelola master data, dan mencetak *Payroll* (Slip Gaji).
  - **Karyawan:** Portal mandiri untuk melakukan absensi, mengajukan cuti dengan lampiran, dan melihat riwayat kehadiran serta slip gaji.
- ⚙️ **Integrated Payroll & Leave Management:** Perhitungan otomatis untuk denda keterlambatan dan potongan *Alpha* (mangkir) yang terhubung langsung dengan sistem penerbitan slip gaji.
- 🌓 **Dark & Light Mode:** Antarmuka UI/UX yang responsif, elegan, dan mendukung preferensi tema pengguna.

---

## 🧠 Cara Kerja Teknologi AI

Proyek ini ditenagai oleh **Face-API.js**, sebuah pustaka *machine learning* yang dibangun di atas inti **TensorFlow.js** (oleh Google). Proses AI berjalan murni di sisi *client* (Browser) dengan tahapan:

1. **Detection:** Mengidentifikasi keberadaan dan posisi wajah manusia menggunakan model *Tiny Face Detector*.
2. **Landmarks:** Memetakan 68 titik koordinat unik pada wajah (seperti area mata, hidung, bibir, dan garis rahang).
3. **Recognition:** Mengonversi titik-titik tersebut menjadi *128 Float32 Array (Face Descriptor)* yang bertindak sebagai "sidik jari digital" wajah individu.

---

## 🚀 Panduan Instalasi (Getting Started)

### Prasyarat (*Prerequisites*)
Pastikan Anda telah menginstal perangkat lunak berikut di komputer Anda:
- [Node.js](https://nodejs.org/) (Versi 16.x atau lebih baru)
- [XAMPP](https://www.apachefriends.org/index.html) atau server MySQL lokal lainnya.
- Git

### Langkah Instalasi

1. **Clone Repositori**
   ```bash
   git clone [https://github.com/username-anda/nama-repo-anda.git](https://github.com/username-anda/nama-repo-anda.git)
   cd nama-repo-anda

```

2. **Instal Dependensi**
```bash
npm install
# atau menggunakan yarn / pnpm / bun

```


3. **Konfigurasi Environment**
Buat file `.env.local` di *root folder* direktori, lalu sesuaikan kredensial database Anda:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=db_absensi

```


4. **Persiapkan Database MySQL**
* Buka phpMyAdmin (biasanya di `http://localhost/phpmyadmin`).
* Buat database baru bernama `db_absensi`.
* *Import* file SQL yang telah disediakan di dalam repositori (misal: `db_absensi.sql`) ke dalam database tersebut.


5. **Jalankan Development Server**
```bash
npm run dev

```


Buka [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) di browser Anda untuk melihat aplikasi berjalan.

---

## 🔐 Kredensial Akun Default (Demo)

Gunakan akun berikut untuk menguji coba fitur aplikasi di lingkungan *development*:

| Role | Username / Email | Password | Hak Akses |
| --- | --- | --- | --- |
| **Admin** | admin | `123456` | Master Data, Approval, Payroll, Semua Riwayat |
| **Karyawan** | fana | `123456` | Absensi Wajah, Pengajuan Izin, Riwayat Pribadi |

---

## 📂 Struktur Direktori Penting

```text
├── /components         # Komponen UI modular (Layout, Navbar, dll)
├── /lib                # Konfigurasi koneksi MySQL (db.js) & Mailer
├── /pages              # Struktur antarmuka halaman web utama
│   ├── /api            # RESTful API endpoints (Backend Logic)
├── /public
│   ├── /models         # Kumpulan 7 file model AI pre-trained untuk Face-API.js
└── .env.local          # Konfigurasi variabel environment (Diabaikan dari Git)

```

---

*Dibuat dengan ❤️ untuk merevolusi sistem absensi perusahaan yang lebih cerdas dan aman.*
