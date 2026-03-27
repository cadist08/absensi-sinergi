import db from '../../lib/db';
import { parse } from 'cookie';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  
  const { method } = req;
  const cookies = parse(req.headers.cookie || '');
  const userSession = cookies.user_session ? JSON.parse(cookies.user_session) : null;

  if (!userSession) {
    return res.status(401).json({ message: 'Anda belum login' });
  }

  const userId = userSession.id;
  const userRole = userSession.role;

  const getWIB = () => {
    const now = new Date();
    const date = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Jakarta', 
        year: 'numeric', month: '2-digit', day: '2-digit' 
    }).format(now);
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
         // Admin melihat semua, termasuk nama dari tabel users
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
    // 🌟 TANGKAP DATA LOKASI DARI FRONTEND
    const { type, latitude, longitude } = req.body; 
    const { date: today, time: now } = getWIB();

    try {
      if (type === 'in') {
        const [cek] = await db.execute('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [userId, today]);
        
        if (cek.length > 0) {
            const record = cek[0];
            // 🌟 LOGIKA PINTAR: Jika sudah ada data tapi check_in masih kosong/strip (Kasus Izin Setengah Hari)
            if (record.check_in === '-' || record.check_in === null) {
                await db.execute(
                    'UPDATE attendance SET check_in = ?, lat_in = ?, long_in = ? WHERE id = ?', 
                    [now, latitude || null, longitude || null, record.id]
                );
                return res.status(200).json({ message: `Berhasil Masuk jam ${now}` });
            } else {
                return res.status(400).json({ message: 'Anda sudah melakukan absen masuk hari ini!' });
            }
        }

        // Jika absen normal (Belum ada data sama sekali di hari ini)
        const status = now > "08:30:00" ? "Terlambat" : "Hadir";
        await db.execute(
            'INSERT INTO attendance (user_id, date, check_in, status, lat_in, long_in) VALUES (?, ?, ?, ?, ?, ?)', 
            [userId, today, now, status, latitude || null, longitude || null]
        );
        res.status(200).json({ message: `Berhasil Masuk jam ${now}` });

      } else if (type === 'out') {
        // 🌟 UPDATE JAM DAN LOKASI PULANG
        await db.execute(
            `UPDATE attendance 
             SET check_out = ?, lat_out = ?, long_out = ? 
             WHERE user_id = ? AND date = ? AND (check_out IS NULL OR check_out = '-')`, 
            [now, latitude || null, longitude || null, userId, today]
        );
        res.status(200).json({ message: `Berhasil Pulang jam ${now}` });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Gagal menyimpan data absensi' });
    }
  } 

  // --- DELETE: HAPUS ABSENSI (KHUSUS ADMIN) ---
  else if (method === 'DELETE') {
    if (userRole !== 'admin') {
        return res.status(403).json({ message: 'Hanya Admin yang boleh menghapus data!' });
    }

    const { id } = req.body;
    if (!id) return res.status(400).json({ message: 'ID tidak ditemukan' });

    try {
      await db.execute('DELETE FROM attendance WHERE id = ?', [id]);
      res.status(200).json({ message: 'Riwayat absensi berhasil dihapus secara permanen' });
    } catch (e) {
      res.status(500).json({ message: 'Gagal menghapus data dari database' });
    }
  }

  else {
    res.status(405).end();
  }
}