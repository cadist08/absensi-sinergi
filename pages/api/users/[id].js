import db from '../../../lib/db';
import bcrypt from 'bcrypt';      // 1. Import bcrypt untuk hash password
import { parse } from 'cookie';   // 2. Import cookie untuk cek Admin

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query; // Mengambil ID user target dari URL

  // --- KEAMANAN: HANYA ADMIN YANG BOLEH AKSES ---
  const cookies = parse(req.headers.cookie || '');
  const userSession = cookies.user_session ? JSON.parse(cookies.user_session) : null;

  // Cek 1: Login?
  if (!userSession) {
    return res.status(401).json({ message: 'Unauthorized: Harap login.' });
  }

  // Cek 2: Role Admin?
  // Endpoint [id].js ini berbahaya (bisa delete/edit orang lain), jadi wajib Admin.
  if (userSession.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Hanya Admin yang boleh mengubah data karyawan lain.' });
  }
  // ----------------------------------------------

  // DELETE: Hapus user
  if (method === 'DELETE') {
    try {
      // Pencegahan: Jangan sampai Admin menghapus dirinya sendiri
      if (parseInt(id) === userSession.id) {
        return res.status(400).json({ message: 'Anda tidak bisa menghapus akun sendiri di sini.' });
      }

      await db.execute('DELETE FROM users WHERE id = ?', [id]);
      res.status(200).json({ message: 'Karyawan berhasil dihapus' });
    } catch (e) {
      res.status(500).json({ message: 'Gagal menghapus data: ' + e.message });
    }
  }

  // UPDATE: Edit user
  else if (method === 'PUT') {
    const { name, email, password, role } = req.body;

    try {
      if (password) {
        // --- JIKA PASSWORD DIUBAH, HASH DULU! ---
        // Jangan simpan password mentah, nanti database jadi tidak konsisten
        // (sebagian terenkripsi, sebagian tidak).
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        await db.execute(
          'UPDATE users SET name=?, email=?, password=?, role=? WHERE id=?',
          [name, email, hashedPassword, role, id]
        );
      } else {
        // Jika password kosong, update data lain saja (Password lama aman)
        await db.execute(
          'UPDATE users SET name=?, email=?, role=? WHERE id=?',
          [name, email, role, id]
        );
      }
      res.status(200).json({ message: 'Data karyawan diperbarui' });
    } catch (e) {
      res.status(500).json({ message: 'Gagal update: ' + e.message });
    }
  } 
  
  else {
    res.status(405).end();
  }
}