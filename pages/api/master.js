import db from '../../lib/db';
import { parse } from 'cookie';

export default async function handler(req, res) {
  const { method } = req;
  const cookies = parse(req.headers.cookie || '');
  const userSession = cookies.user_session ? JSON.parse(cookies.user_session) : null;

  if (!userSession || userSession.role !== 'admin') {
    return res.status(403).json({ message: 'Akses ditolak. Area khusus Admin.' });
  }

  const { type } = req.query; 
  const tableName = type === 'department' ? 'departments' : type === 'position' ? 'positions' : null;

  if (!tableName) return res.status(400).json({ message: 'Tipe data tidak valid.' });

  // --- 1. GET: Ambil Data ---
  if (method === 'GET') {
    try {
      const [rows] = await db.query(`SELECT * FROM ${tableName} ORDER BY id DESC`);
      return res.status(200).json(rows);
    } catch (error) { return res.status(500).json({ message: 'Gagal mengambil data.' }); }
  }

  // --- 2. POST: Tambah Data Baru ---
  if (method === 'POST') {
    try {
      const { name, salary, allowance } = req.body;
      if (!name) return res.status(400).json({ message: 'Nama tidak boleh kosong.' });

      // 🌟 PERBAIKAN: Cek Duplikat Nama
      const [existing] = await db.query(`SELECT id FROM ${tableName} WHERE name = ?`, [name]);
      if (existing.length > 0) return res.status(400).json({ message: `${type === 'department' ? 'Divisi' : 'Jabatan'} dengan nama tersebut sudah ada!` });

      if (type === 'department') {
        await db.query('INSERT INTO departments (name) VALUES (?)', [name]);
      } else {
        await db.query('INSERT INTO positions (name, salary, allowance) VALUES (?, ?, ?)', [name, salary || 0, allowance || 0]);
      }
      return res.status(200).json({ message: 'Data berhasil ditambahkan!' });
    } catch (error) { return res.status(500).json({ message: 'Gagal menambah data.' }); }
  }

  // --- 3. PUT: Edit Data ---
  if (method === 'PUT') {
    try {
      const { id, name, salary, allowance } = req.body;
      if (!name) return res.status(400).json({ message: 'Nama tidak boleh kosong.' });

      // 🌟 PERBAIKAN: Cek Duplikat Nama saat Edit (Abaikan jika namanya sendiri)
      const [existing] = await db.query(`SELECT id FROM ${tableName} WHERE name = ? AND id != ?`, [name, id]);
      if (existing.length > 0) return res.status(400).json({ message: `Nama tersebut sudah digunakan oleh data lain!` });

      if (type === 'department') {
        await db.query('UPDATE departments SET name = ? WHERE id = ?', [name, id]);
      } else {
        await db.query('UPDATE positions SET name = ?, salary = ?, allowance = ? WHERE id = ?', [name, salary, allowance, id]);
      }
      return res.status(200).json({ message: 'Data berhasil diperbarui!' });
    } catch (error) { return res.status(500).json({ message: 'Gagal memperbarui data.' }); }
  }

  // --- 4. DELETE: Hapus Data ---
  if (method === 'DELETE') {
    try {
      const { id } = req.body;
      await db.query(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
      return res.status(200).json({ message: 'Data berhasil dihapus!' });
    } catch (error) {
      return res.status(500).json({ message: 'Gagal menghapus. Pastikan data ini tidak sedang digunakan oleh karyawan.' });
    }
  }

  return res.status(405).end();
}