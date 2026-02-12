import db from '../../../lib/db';
import bcrypt from 'bcrypt';      // 1. Wajib untuk keamanan password
import { parse } from 'cookie';   // 2. Wajib untuk cek siapa yang akses

export default async function handler(req, res) {
  const { method } = req;

  // --- KEAMANAN: CEK SESSION (HANYA ADMIN YANG BOLEH AKSES) ---
  const cookies = parse(req.headers.cookie || '');
  const userSession = cookies.user_session ? JSON.parse(cookies.user_session) : null;

  // Cek 1: Apakah sudah login?
  if (!userSession) {
    return res.status(401).json({ message: 'Anda harus login terlebih dahulu.' });
  }

  // Cek 2: Apakah dia Admin? (User biasa tidak boleh lihat/tambah karyawan)
  if (userSession.role !== 'admin') {
    return res.status(403).json({ message: 'Akses Ditolak: Hanya Admin yang boleh akses menu ini.' });
  }
  // -------------------------------------------------------------

  // 1. GET: Ambil data karyawan
  if (method === 'GET') {
    try {
      // Bagus! Anda sudah tidak men-select kolom 'password'. Pertahankan ini.
      const [rows] = await db.execute('SELECT id, name, email, role, created_at FROM users ORDER BY id DESC');
      res.status(200).json(rows);
    } catch (e) {
      res.status(500).json({ message: 'Gagal mengambil data database' });
    }
  }

  // 2. POST: Tambah karyawan baru
  else if (method === 'POST') {
    const { name, email, password, role } = req.body;

    // VALIDASI
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Mohon lengkapi semua data.' });
    }

    try {
      // Cek email duplikat
      const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Email ini sudah terdaftar.' });
      }

      // --- PERBAIKAN UTAMA: HASHING PASSWORD ---
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds); 
      // Password asli "123456" berubah jadi "$2b$10$X8k..."
      // -----------------------------------------

      // Masukkan ke database (Simpan yang sudah di-hash)
      await db.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, role]
      );
      
      res.status(201).json({ message: 'Berhasil menambahkan karyawan baru!' });

    } catch (e) {
      console.error("Database Error:", e);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  } 

  else {
    res.status(405).end();
  }
}