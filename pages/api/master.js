import db from '../../lib/db';
import { parse } from 'cookie';

export default async function handler(req, res) {
  const { method } = req;
  const cookies = parse(req.headers.cookie || '');
  const userSession = cookies.user_session ? JSON.parse(cookies.user_session) : null;

  // Fitur Master Data ini SANGAT RAHASIA, hanya Admin yang boleh akses!
  if (!userSession || userSession.role !== 'admin') {
    return res.status(403).json({ message: 'Akses ditolak. Area khusus Admin.' });
  }

  const { type } = req.query; // Menentukan tabel mana yang mau diakses ('department' atau 'position')

  // --- 1. GET: Ambil Data ---
  if (method === 'GET') {
    try {
      if (type === 'department') {
        const [rows] = await db.query('SELECT * FROM departments ORDER BY id DESC');
        return res.status(200).json(rows);
      } else if (type === 'position') {
        const [rows] = await db.query('SELECT * FROM positions ORDER BY id DESC');
        return res.status(200).json(rows);
      }
      return res.status(400).json({ message: 'Tipe data tidak valid.' });
    } catch (error) { return res.status(500).json({ message: 'Gagal mengambil data.' }); }
  }

  // --- 2. POST: Tambah Data Baru ---
  if (method === 'POST') {
    try {
      if (type === 'department') {
        const { name } = req.body;
        await db.query('INSERT INTO departments (name) VALUES (?)', [name]);
      } else if (type === 'position') {
        const { name, salary, allowance } = req.body;
        await db.query('INSERT INTO positions (name, salary, allowance) VALUES (?, ?, ?)', [name, salary || 0, allowance || 0]);
      }
      return res.status(200).json({ message: 'Data berhasil ditambahkan!' });
    } catch (error) { return res.status(500).json({ message: 'Gagal menambah data.' }); }
  }

  // --- 3. PUT: Edit Data ---
  if (method === 'PUT') {
    try {
      if (type === 'department') {
        const { id, name } = req.body;
        await db.query('UPDATE departments SET name = ? WHERE id = ?', [name, id]);
      } else if (type === 'position') {
        const { id, name, salary, allowance } = req.body;
        await db.query('UPDATE positions SET name = ?, salary = ?, allowance = ? WHERE id = ?', [name, salary, allowance, id]);
      }
      return res.status(200).json({ message: 'Data berhasil diperbarui!' });
    } catch (error) { return res.status(500).json({ message: 'Gagal memperbarui data.' }); }
  }

  // --- 4. DELETE: Hapus Data ---
  if (method === 'DELETE') {
    try {
      const { id } = req.body;
      if (type === 'department') {
        await db.query('DELETE FROM departments WHERE id = ?', [id]);
      } else if (type === 'position') {
        await db.query('DELETE FROM positions WHERE id = ?', [id]);
      }
      return res.status(200).json({ message: 'Data berhasil dihapus!' });
    } catch (error) {
      // Error ini biasanya muncul kalau Admin menghapus Jabatan yang masih dipakai oleh Karyawan (Foreign Key Error)
      return res.status(500).json({ message: 'Gagal menghapus. Pastikan data ini tidak sedang digunakan oleh karyawan di tabel Users.' });
    }
  }

  return res.status(405).end();
}