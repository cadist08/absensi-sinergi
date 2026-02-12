import db from '../../lib/db';
import { parse } from 'cookie';

export default async function handler(req, res) {
  const { method } = req;

  // 1. CEK SESSION
  const cookies = parse(req.headers.cookie || '');
  const userSession = cookies.user_session ? JSON.parse(cookies.user_session) : null;

  if (!userSession) {
    return res.status(401).json({ message: 'Anda belum login' });
  }

  const userId = userSession.id;
  const userRole = userSession.role;

  // 2. FUNGSI WAKTU WIB MANUAL (Sangat Aman)
  // Menghasilkan string 'YYYY-MM-DD' dan 'HH:MM:SS' yang pasti diterima MySQL
  const getWIB = () => {
    const now = new Date();
    
    // Ubah ke UTC+7 (WIB) secara manual
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTimestamp = new Date(utc + (3600000 * 7)); // Tambah 7 Jam

    // Format YYYY-MM-DD
    const date = wibTimestamp.toISOString().split('T')[0];
    
    // Format HH:MM:SS
    const time = wibTimestamp.toISOString().split('T')[1].split('.')[0];

    return { date, time };
  };

  // --- GET: LIHAT DATA ---
  if (method === 'GET') {
    try {
      let query = '';
      let params = [];

      if (userRole === 'admin') {
         query = 'SELECT a.*, u.name FROM attendance a JOIN users u ON a.user_id = u.id ORDER BY a.date DESC, a.check_in DESC';
      } else {
         query = 'SELECT * FROM attendance WHERE user_id = ? ORDER BY date DESC, check_in DESC';
         params = [userId];
      }

      const [rows] = await db.execute(query, params);
      res.status(200).json(rows);
    } catch (e) {
      res.status(500).json({ message: 'Gagal ambil data' });
    }
  } 
  
  // --- POST: ABSEN MASUK/PULANG ---
  else if (method === 'POST') {
    const { type } = req.body;
    const { date: today, time: now } = getWIB(); // Ambil waktu WIB yang sudah pasti benar

    try {
      if (type === 'in') {
        // Cek Double Login
        const [cek] = await db.execute('SELECT id FROM attendance WHERE user_id = ? AND date = ?', [userId, today]);
        if (cek.length > 0) return res.status(400).json({ message: 'Sudah absen masuk hari ini!' });

        // Tentukan Status (Contoh: Lewat 08:30 = Terlambat)
        const status = now > "08:30:00" ? "Terlambat" : "Hadir";

        await db.execute(
            'INSERT INTO attendance (user_id, date, check_in, status) VALUES (?, ?, ?, ?)', 
            [userId, today, now, status]
        );
        res.status(200).json({ message: `Masuk berhasil: ${now}` });

      } else if (type === 'out') {
        await db.execute(
            'UPDATE attendance SET check_out = ? WHERE user_id = ? AND date = ?', 
            [now, userId, today]
        );
        res.status(200).json({ message: `Pulang berhasil: ${now}` });
      }
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  } else {
    res.status(405).end();
  }
}