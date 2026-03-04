import db from '../../lib/db';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Perbesar limit jika gambar bukti resolusi tinggi
    },
  },
};

export default async function handler(req, res) {
  const { method } = req;

  // --- 1. GET DATA ---
  if (method === 'GET') {
    try {
      const { userId } = req.query;
      let query = `SELECT leaves.*, users.name, users.sisa_cuti 
                   FROM leaves 
                   JOIN users ON leaves.user_id = users.id`;
      let params = [];
      if (userId) {
        query += ` WHERE leaves.user_id = ?`;
        params.push(userId);
      }
      query += ` ORDER BY leaves.id DESC`;
      const [rows] = await db.query(query, params);
      return res.status(200).json(rows);
    } catch (error) {
      return res.status(500).json({ message: 'Gagal mengambil data.' });
    }
  }

  // --- 2. UPDATE DATA (APPROVE/REJECT/EDIT) ---
  if (method === 'PUT') {
    try {
      const { id, status, type, start_date, end_date, reason, user_id, file_bukti } = req.body;

      // SKENARIO A: ADMIN APPROVE / REJECT
      if (status && id && !type) {
        // Ambil data pengajuan secara detail
        const [leaveData] = await db.query(
          'SELECT l.*, u.name FROM leaves l JOIN users u ON l.user_id = u.id WHERE l.id = ?', 
          [id]
        );
        const leave = leaveData[0];

        if (!leave) return res.status(404).json({ message: 'Data tidak ditemukan.' });

        // Update status di tabel leaves
        await db.query('UPDATE leaves SET status = ? WHERE id = ?', [status, id]);

        // LOGIKA SINKRONISASI JIKA DI-APPROVE
        if (status === 'Approved') {
          const start = new Date(leave.start_date);
          const end = new Date(leave.end_date);
          
          // Hitung selisih hari
          const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

          // A. Potong kuota jika tipe Cuti
          if (leave.type === 'Cuti') {
            await db.query('UPDATE users SET sisa_cuti = sisa_cuti - ? WHERE id = ?', [diffDays, leave.user_id]);
          }

          // B. Isi tabel attendance otomatis
          let currentDate = new Date(start);
          while (currentDate <= end) {
            const dateStr = currentDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
            const attStatus = `${leave.type} - ${leave.reason}`;

            // Cek apakah sudah ada data absen di tanggal tersebut
            const [existing] = await db.query('SELECT id FROM attendance WHERE user_id = ? AND date = ?', [leave.user_id, dateStr]);
            
            if (existing.length === 0) {
              await db.query(
                'INSERT INTO attendance (user_id, date, check_in, check_out, status) VALUES (?, ?, ?, ?, ?)', 
                [leave.user_id, dateStr, '-', '-', attStatus]
              );
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
        return res.status(200).json({ message: 'Status diperbarui!' });
      }

      // SKENARIO B: KARYAWAN EDIT (HANYA JIKA PENDING)
      if (type && id) {
        await db.query(
          `UPDATE leaves SET type=?, start_date=?, end_date=?, reason=?, file_bukti=COALESCE(?, file_bukti) 
           WHERE id=? AND status='Pending'`,
          [type, start_date, end_date, reason, file_bukti || null, id]
        );
        return res.status(200).json({ message: 'Data diperbarui!' });
      }

      return res.status(400).json({ message: 'Parameter tidak lengkap.' });
    } catch (error) {
      console.error("🔴 API LEAVES ERROR:", error);
      return res.status(500).json({ message: 'Terjadi kesalahan pada database.' });
    }
  }

  // --- 3. DELETE DATA ---
  if (method === 'DELETE') {
    try {
      const { id, role } = req.body;
      if (role === 'admin') {
        await db.query(`DELETE FROM leaves WHERE id = ?`, [id]);
      } else {
        await db.query(`DELETE FROM leaves WHERE id = ? AND status = 'Pending'`, [id]);
      }
      return res.status(200).json({ message: 'Berhasil dihapus.' });
    } catch (error) {
      return res.status(500).json({ message: 'Gagal menghapus.' });
    }
  }

  return res.status(405).end();
}