import db from '../../../lib/db';
import bcrypt from 'bcrypt';
import { parse } from 'cookie';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  const cookies = parse(req.headers.cookie || '');
  const userSession = cookies.user_session ? JSON.parse(cookies.user_session) : null;

  if (!userSession || userSession.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  // --- 1. DELETE: HAPUS KARYAWAN ---
  if (method === 'DELETE') {
    try {
      if (parseInt(id) === userSession.id) return res.status(400).json({ message: 'Tidak bisa hapus akun sendiri.' });
      await db.execute('DELETE FROM users WHERE id = ?', [id]);
      res.status(200).json({ message: 'Karyawan berhasil dihapus' });
    } catch (e) {
      res.status(500).json({ message: 'Gagal hapus: ' + e.message });
    }
  }

  // --- 2. UPDATE: EDIT DATA KARYAWAN ---
  else if (method === 'PUT') {
    const { name, email, password, role, department_id, position_id, phone, address } = req.body;

    try {
      if (password) {
        // Update dengan password baru + data lengkap (phone & address)
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute(
          'UPDATE users SET name=?, email=?, password=?, role=?, department_id=?, position_id=?, phone=?, address=? WHERE id=?',
          [name, email, hashedPassword, role, department_id || null, position_id || null, phone || null, address || null, id]
        );
      } else {
        // Update data lengkap tanpa mengubah password lama
        await db.execute(
          'UPDATE users SET name=?, email=?, role=?, department_id=?, position_id=?, phone=?, address=? WHERE id=?',
          [name, email, role, department_id || null, position_id || null, phone || null, address || null, id]
        );
      }
      res.status(200).json({ message: 'Data karyawan diperbarui' });
    } catch (e) {
      res.status(500).json({ message: 'Gagal update: ' + e.message });
    }
  } else {
    res.status(405).end();
  }
}