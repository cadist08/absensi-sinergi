import db from '../../lib/db';
import { parse } from 'cookie';

export default async function handler(req, res) {
  const { method } = req;
  const cookies = parse(req.headers.cookie || '');
  const userSession = cookies.user_session ? JSON.parse(cookies.user_session) : null;

  if (!userSession) return res.status(401).json({ message: 'Anda belum login' });

  const userId = userSession.id;
  const userRole = userSession.role;

  // --- 1. GET DATA ---
  if (method === 'GET') {
    try {
      const { action, checkUserId, month } = req.query;

      // A. Fitur Khusus Admin: Ambil data karyawan + Gaji + Tunjangan
      if (action === 'getUsers' && userRole === 'admin') {
          const [users] = await db.query(`
              SELECT u.id, u.name, p.salary as default_salary, p.allowance as default_allowance 
              FROM users u 
              LEFT JOIN positions p ON u.position_id = p.id 
              WHERE u.role != "admin"
          `);
          return res.status(200).json(users);
      }

      // B. Fitur Baru: Cek Riwayat Telat untuk Auto-Potongan (50rb/telat)
      if (action === 'checkAttendance' && userRole === 'admin') {
          if (!checkUserId || !month) return res.status(400).json({ late_days: 0 });
          
          const monthLike = `${month}-%`;
          const [attData] = await db.query(`
              SELECT SUM(CASE WHEN status = 'Terlambat' THEN 1 ELSE 0 END) as late_days
              FROM attendance
              WHERE user_id = ? AND date LIKE ?
          `, [checkUserId, monthLike]);
          
          return res.status(200).json({ late_days: attData[0]?.late_days || 0 });
      }

      // C. Tampilkan Riwayat Gaji
      let query = '';
      let params = [];

      if (userRole === 'admin') {
        query = `SELECT p.*, u.name FROM payrolls p JOIN users u ON p.user_id = u.id ORDER BY p.month DESC, p.id DESC`;
      } else {
        query = `SELECT p.*, u.name FROM payrolls p JOIN users u ON p.user_id = u.id WHERE p.user_id = ? ORDER BY p.month DESC`;
        params = [userId];
      }

      const [rows] = await db.query(query, params);
      return res.status(200).json(rows);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Gagal mengambil data' });
    }
  }

  // --- 2. POST: ADMIN BUAT SLIP GAJI BARU ---
  if (method === 'POST') {
    if (userRole !== 'admin') return res.status(403).json({ message: 'Akses ditolak.' });

    try {
      const { user_id, month, basic_salary, allowance, deduction } = req.body;

      if (!user_id || !month || basic_salary === undefined) {
        return res.status(400).json({ message: 'Data karyawan, bulan, dan gaji pokok wajib diisi.' });
      }

      // Cek agar Admin tidak double-input di bulan yang sama
      const [existing] = await db.query('SELECT id FROM payrolls WHERE user_id = ? AND month = ?', [user_id, month]);
      if (existing.length > 0) return res.status(400).json({ message: `Slip gaji bulan ${month} untuk karyawan ini sudah ada!` });

      // 🌟 MENGHITUNG KEHADIRAN OTOMATIS DARI TABEL ATTENDANCE 🌟
      const monthLike = `${month}-%`; 
      const [attData] = await db.query(`
          SELECT
              SUM(CASE WHEN status = 'Hadir' OR status = 'Terlambat' THEN 1 ELSE 0 END) as present_days,
              SUM(CASE WHEN status = 'Terlambat' THEN 1 ELSE 0 END) as late_days
          FROM attendance
          WHERE user_id = ? AND date LIKE ?
      `, [user_id, monthLike]);

      const present_days = attData[0]?.present_days || 0;
      const late_days = attData[0]?.late_days || 0;

      // Kalkulasi Gaji Bersih (Net Salary)
      const total_salary = Number(basic_salary) + Number(allowance) - Number(deduction);
      const payment_date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // Tanggal hari ini

      await db.query(
        `INSERT INTO payrolls (user_id, month, present_days, late_days, basic_salary, allowance, deduction, total_salary, payment_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
        [user_id, month, present_days, late_days, basic_salary, allowance, deduction, total_salary, payment_date]
      );

      return res.status(200).json({ message: 'Slip Gaji berhasil dibuat!' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Gagal menyimpan data.' });
    }
  }

  // --- 3. PUT: UPDATE STATUS (Pending -> Paid) ---
  if (method === 'PUT') {
      if (userRole !== 'admin') return res.status(403).json({ message: 'Akses ditolak.' });
      try {
          const { id, status } = req.body;
          await db.query('UPDATE payrolls SET status = ? WHERE id = ?', [status, id]);
          return res.status(200).json({ message: 'Status gaji diperbarui!' });
      } catch (e) { return res.status(500).json({ message: 'Gagal update status.' }); }
  }

  // --- 4. DELETE: HAPUS SLIP GAJI ---
  if (method === 'DELETE') {
    if (userRole !== 'admin') return res.status(403).json({ message: 'Akses ditolak.' });
    try {
      const { id } = req.body;
      await db.query('DELETE FROM payrolls WHERE id = ?', [id]);
      return res.status(200).json({ message: 'Slip gaji dihapus.' });
    } catch (error) { return res.status(500).json({ message: 'Gagal menghapus data.' }); }
  }

  return res.status(405).end();
}