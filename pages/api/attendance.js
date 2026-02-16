import db from '../../lib/db';
import { parse } from 'cookie';

export default async function handler(req, res) {
  // --- ANTI CACHE (PENTING AGAR DATA SELALU UPDATE) ---
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  
  const { method } = req;

  // 1. CEK SESSION
  const cookies = parse(req.headers.cookie || '');
  const userSession = cookies.user_session ? JSON.parse(cookies.user_session) : null;

  if (!userSession) {
    return res.status(401).json({ message: 'Anda belum login' });
  }

  const userId = userSession.id;
  const userRole = userSession.role;

  // 2. FUNGSI WAKTU WIB (SOLUSI JAM)
  const getWIB = () => {
    // Menggunakan Intl untuk format waktu yang 100% akurat sesuai zona Jakarta
    const now = new Date();
    
    // Format: YYYY-MM-DD
    const date = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Jakarta', 
        year: 'numeric', month: '2-digit', day: '2-digit' 
    }).format(now);

    // Format: HH:MM:SS (Pakai hour12: false agar format 24 jam)
    const time = new Intl.DateTimeFormat('en-GB', { 
        timeZone: 'Asia/Jakarta', 
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(now);

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
      console.error("Database Error:", e);
      res.status(500).json({ message: 'Gagal ambil data' });
    }
  } 
  
  // --- POST: ABSEN MASUK/PULANG ---
  else if (method === 'POST') {
    const { type } = req.body;
    const { date: today, time: now } = getWIB(); // Pasti WIB

    try {
      if (type === 'in') {
        const [cek] = await db.execute('SELECT id FROM attendance WHERE user_id = ? AND date = ?', [userId, today]);
        if (cek.length > 0) return res.status(400).json({ message: 'Anda sudah absen masuk hari ini!' });

        // Jika jam > 08:30 maka Terlambat
        const status = now > "08:30:00" ? "Terlambat" : "Hadir";

        await db.execute(
            'INSERT INTO attendance (user_id, date, check_in, status) VALUES (?, ?, ?, ?)', 
            [userId, today, now, status]
        );
        res.status(200).json({ message: `Berhasil Masuk jam ${now}` });

      } else if (type === 'out') {
        await db.execute(
            'UPDATE attendance SET check_out = ? WHERE user_id = ? AND date = ?', 
            [now, userId, today]
        );
        res.status(200).json({ message: `Berhasil Pulang jam ${now}` });
      }
    } catch (e) {
      console.error("Insert Error:", e);
      res.status(500).json({ message: 'Gagal menyimpan data' });
    }
  } else {
    res.status(405).end();
  }
}