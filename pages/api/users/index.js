import db from '../../../lib/db';
import bcrypt from 'bcrypt';
import { parse } from 'cookie';

export default async function handler(req, res) {
  const { method } = req;
  const cookies = parse(req.headers.cookie || '');
  const userSession = cookies.user_session ? JSON.parse(cookies.user_session) : null;

  // Keamanan: Hanya Admin yang bisa akses
  if (!userSession || userSession.role !== 'admin') {
    return res.status(403).json({ message: 'Akses Ditolak.' });
  }

  // --- 1. GET: AMBIL DATA KARYAWAN ---
  if (method === 'GET') {
    try {
      // Menarik data lengkap termasuk phone dan address
      const [rows] = await db.execute(`
        SELECT id, name, email, role, department_id, position_id, phone, address, created_at 
        FROM users 
        ORDER BY id DESC
      `);
      res.status(200).json(rows);
    } catch (e) {
      res.status(500).json({ message: 'Gagal mengambil data database' });
    }
  }

  // --- 2. POST: TAMBAH KARYAWAN BARU ---
  else if (method === 'POST') {
    const { name, email, password, role, department_id, position_id, phone, address } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Mohon lengkapi data wajib.' });
    }

    try {
      // Cek email duplikat
      const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) return res.status(400).json({ message: 'Email sudah terdaftar.' });

      // Hashing Password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds); 

      // Simpan ke database (Gunakan || null agar tidak error jika kosong)
      await db.execute(
        'INSERT INTO users (name, email, password, role, department_id, position_id, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, email, hashedPassword, role, department_id || null, position_id || null, phone || null, address || null]
      );
      
      res.status(201).json({ message: 'Berhasil menambahkan karyawan baru!' });
    } catch (e) {
      res.status(500).json({ message: 'Kesalahan server: ' + e.message });
    }
  } else {
    res.status(405).end();
  }
}