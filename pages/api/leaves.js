import db from '../../lib/db';
import { sendEmail } from '../../lib/mailer'; // 🌟 TAMBAHKAN INI

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    try {
      const { userId } = req.query;
      let query = `SELECT leaves.*, users.name, users.sisa_cuti FROM leaves JOIN users ON leaves.user_id = users.id`;
      let params = [];
      if (userId) { query += ` WHERE leaves.user_id = ?`; params.push(userId); }
      query += ` ORDER BY leaves.id DESC`;
      const [rows] = await db.query(query, params);
      return res.status(200).json(rows);
    } catch (error) { return res.status(500).json({ message: 'Gagal mengambil data.' }); }
  }

  if (method === 'PUT') {
    try {
      const { id, status, type, start_date, end_date, reason, user_id, file_bukti } = req.body;

      if (status && id && !type) {
        const [leaveData] = await db.query('SELECT l.*, u.name, u.email FROM leaves l JOIN users u ON l.user_id = u.id WHERE l.id = ?', [id]);
        const leave = leaveData[0];
        if (!leave) return res.status(404).json({ message: 'Data tidak ditemukan.' });

        await db.query('UPDATE leaves SET status = ? WHERE id = ?', [status, id]);

        // 🌟 TAMBAHKAN: NOTIFIKASI UNTUK USER
        try {
            const statusIndo = status === 'Approved' ? 'Disetujui' : 'Ditolak';
            await db.query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', 
                [leave.user_id, `Izin ${statusIndo}`, `Pengajuan ${leave.type} Anda telah ${statusIndo} oleh HRD.`]
            );
            if (leave.email) sendEmail(leave.email, `HRIS - Izin ${statusIndo}`, `Pengajuan ${leave.type} Anda telah ${statusIndo}.`);
        } catch (e) { console.error("Notif Error"); }

        if (status === 'Approved') {
          const start = new Date(leave.start_date);
          const end = new Date(leave.end_date);
          const [leaveTypeRules] = await db.query('SELECT is_deduct_leave FROM leave_types WHERE name = ?', [leave.type]);
          const isDeduct = leaveTypeRules[0]?.is_deduct_leave || 0;

          if (isDeduct === 1) {
            let deduction = 0;
            if (leave.duration === 'half_day') {
                deduction = 0.5;
            } else {
                let currentDate = new Date(start);
                while (currentDate <= end) {
                    const dayOfWeek = currentDate.getDay();
                    if (dayOfWeek !== 0 && dayOfWeek !== 6) deduction++;
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
            await db.query('UPDATE users SET sisa_cuti = sisa_cuti - ? WHERE id = ?', [deduction, leave.user_id]);
          }

          let currentDate = new Date(start);
          while (currentDate <= end) {
            const dateStr = currentDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
            const isHalf = leave.duration === 'half_day';
            const attStatus = isHalf ? `${leave.type} (Setengah Hari) - ${leave.reason}` : `${leave.type} - ${leave.reason}`;
            const [existing] = await db.query('SELECT id FROM attendance WHERE user_id = ? AND date = ?', [leave.user_id, dateStr]);
            if (existing.length === 0) {
              await db.query('INSERT INTO attendance (user_id, date, check_in, check_out, status) VALUES (?, ?, "-", "-", ?)', [leave.user_id, dateStr, attStatus]);
            } else {
              await db.query('UPDATE attendance SET status = ? WHERE user_id = ? AND date = ?', [attStatus, leave.user_id, dateStr]);
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
        return res.status(200).json({ message: 'Status diperbarui!' });
      }

      if (type && id) {
        await db.query(`UPDATE leaves SET type=?, start_date=?, end_date=?, reason=?, file_bukti=COALESCE(?, file_bukti) WHERE id=? AND status='Pending'`,
          [type, start_date, end_date, reason, file_bukti || null, id]
        );
        return res.status(200).json({ message: 'Data diperbarui!' });
      }
      return res.status(400).json({ message: 'Parameter tidak lengkap.' });
    } catch (error) { return res.status(500).json({ message: 'Terjadi kesalahan pada database.' }); }
  }

  if (method === 'DELETE') {
    try {
      const { id, role } = req.body;
      const [targetData] = await db.query('SELECT * FROM leaves WHERE id = ?', [id]);
      const target = targetData[0];
      if (!target) return res.status(404).json({ message: 'Data tidak ditemukan.' });
      if (role !== 'admin' && target.status !== 'Pending') return res.status(403).json({ message: 'Hanya Admin yang bisa menghapus.' });

      if (target.status === 'Approved') {
        const start = new Date(target.start_date);
        const end = new Date(target.end_date);
        const [rules] = await db.query('SELECT is_deduct_leave FROM leave_types WHERE name = ?', [target.type]);
        if (rules[0]?.is_deduct_leave === 1) {
          let deduction = 0;
          if (target.duration === 'half_day') deduction = 0.5;
          else {
              let currentDate = new Date(start);
              while (currentDate <= end) {
                  if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) deduction++;
                  currentDate.setDate(currentDate.getDate() + 1);
              }
          }
          await db.query('UPDATE users SET sisa_cuti = sisa_cuti + ? WHERE id = ?', [deduction, target.user_id]);
        }
        const startStr = start.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
        const endStr = end.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
        await db.query('DELETE FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ? AND status LIKE ?', [target.user_id, startStr, endStr, `%${target.type}%`]);
      }
      await db.query(`DELETE FROM leaves WHERE id = ?`, [id]);
      return res.status(200).json({ message: 'Berhasil dihapus secara bersih.' });
    } catch (error) { return res.status(500).json({ message: 'Gagal menghapus.' }); }
  }

  return res.status(405).end();
}