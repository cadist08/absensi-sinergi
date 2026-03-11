import db from '../../lib/db';
import { sendEmail } from '../../lib/mailer'; 

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
      const { id, status, type, duration, start_date, end_date, reason, user_id, file_bukti } = req.body;

      // === SKENARIO 1: ADMIN APPROVE / REJECT ===
      if (status && id && !type) {
        const [leaveData] = await db.query('SELECT l.*, u.name, u.email FROM leaves l JOIN users u ON l.user_id = u.id WHERE l.id = ?', [id]);
        const leave = leaveData[0];
        if (!leave) return res.status(404).json({ message: 'Data tidak ditemukan.' });

        await db.query('UPDATE leaves SET status = ? WHERE id = ?', [status, id]);

        // Notifikasi User
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

      // === SKENARIO 2: KARYAWAN EDIT DATA (SEBELUM APPROVED) ===
      if (type && id) {
        
        const start = new Date(start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        if (start < today) {
            return res.status(400).json({ message: 'Gagal: Anda tidak dapat mengubah izin ke tanggal yang sudah terlewat.' });
        }

        const [existingLeaves] = await db.query(
          `SELECT id FROM leaves WHERE user_id = ? AND id != ? AND status != 'Rejected' 
           AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?))`, 
          [user_id, id, end_date, start_date, start_date, end_date]
        );

        if (existingLeaves.length > 0) {
          return res.status(400).json({ message: 'Gagal: Tanggal yang Anda edit bentrok dengan pengajuan lain.' });
        }

        const [leaveTypeRules] = await db.query('SELECT requires_attachment FROM leave_types WHERE name = ?', [type]);
        const requiresAttachment = leaveTypeRules[0]?.requires_attachment === 1;

        if (requiresAttachment) {
            const [oldData] = await db.query('SELECT file_bukti FROM leaves WHERE id = ?', [id]);
            if (!file_bukti && (!oldData[0] || !oldData[0].file_bukti)) {
                return res.status(400).json({ message: `Gagal! Jenis pengajuan ${type} WAJIB melampirkan bukti. Silakan upload file.` });
            }
        }

        await db.query(
          `UPDATE leaves SET type=?, duration=?, start_date=?, end_date=?, reason=?, file_bukti=COALESCE(?, file_bukti) WHERE id=? AND status='Pending'`,
          [type, duration, start_date, end_date, reason, file_bukti || null, id]
        );
        return res.status(200).json({ message: 'Data berhasil diperbarui!' });
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
      if (role !== 'admin' && target.status !== 'Pending') return res.status(403).json({ message: 'Hanya Admin yang bisa menghapus data yang sudah diproses.' });

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
        
        // 🌟 PERUBAHAN: Logika Hapus Absensi yang Lebih Pintar & Aman
        const [attRecords] = await db.query(
            'SELECT id, check_in, check_out FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ? AND status LIKE ?',
            [target.user_id, startStr, endStr, `%${target.type}%`]
        );

        for (const att of attRecords) {
            // Jika karyawan sudah absen masuk atau absen pulang secara manual
            if (att.check_in !== '-' || att.check_out !== '-') {
                // JANGAN DIHAPUS, cukup reset statusnya kembali menjadi "Hadir"
                await db.query('UPDATE attendance SET status = ? WHERE id = ?', ['Hadir', att.id]);
            } else {
                // Jika belum absen sama sekali (hanya data sisipan sistem), aman untuk dihapus
                await db.query('DELETE FROM attendance WHERE id = ?', [att.id]);
            }
        }
      }
      
      await db.query(`DELETE FROM leaves WHERE id = ?`, [id]);
      return res.status(200).json({ message: 'Berhasil dihapus.' });
    } catch (error) { return res.status(500).json({ message: 'Gagal menghapus.' }); }
  }

  return res.status(405).end();
}