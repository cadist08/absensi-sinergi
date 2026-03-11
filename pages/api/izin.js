import db from '../../lib/db';
import { sendEmail } from '../../lib/mailer'; // 🌟 TAMBAHKAN INI

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method tidak diizinkan' });

  try {
    const { user_id, type, start_date, end_date, reason, file_bukti, duration } = req.body;

    if (!user_id || !type || !start_date || !end_date || !reason || !duration) {
      return res.status(400).json({ message: 'Semua kolom formulir harus diisi lengkap.' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    if (start < today) {
      return res.status(400).json({ message: 'Anda tidak dapat mengajukan izin untuk tanggal yang sudah terlewat.' });
    }

    if (end < start) {
      return res.status(400).json({ message: 'Tanggal selesai tidak boleh mendahului tanggal mulai.' });
    }

    const [leaveTypeRules] = await db.query('SELECT * FROM leave_types WHERE name = ?', [type]);
    const rule = leaveTypeRules[0];

    if (!rule) {
        return res.status(400).json({ message: 'Jenis izin tidak valid atau tidak terdaftar di sistem.' });
    }

    if (rule.requires_attachment === 1 && (!file_bukti || file_bukti === '')) {
      return res.status(400).json({ message: `Jenis pengajuan ${type} WAJIB melampirkan bukti.` });
    }

    let jumlahHari = 0;
    if (duration === 'half_day') {
        jumlahHari = 0.5;
    } else {
        let currentDate = new Date(start);
        while (currentDate <= end) {
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) jumlahHari++;
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    if (rule.is_deduct_leave === 1) {
      const [userDb] = await db.query('SELECT sisa_cuti FROM users WHERE id = ?', [user_id]);
      const sisaCuti = userDb[0]?.sisa_cuti || 0;
      
      if (jumlahHari > sisaCuti) {
        return res.status(400).json({ message: `Gagal! Pengajuan Anda ${jumlahHari} hari, tapi sisa cuti Anda hanya ${sisaCuti} hari.` });
      }
    }

    const [existingLeaves] = await db.query(
      `SELECT id FROM leaves WHERE user_id = ? AND status != 'Rejected' 
       AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?))`, 
      [user_id, end_date, start_date, start_date, end_date]
    );

    if (existingLeaves.length > 0) {
      return res.status(400).json({ message: 'Gagal: Anda sudah memiliki pengajuan pada rentang tanggal tersebut!' });
    }

    await db.query(
      'INSERT INTO leaves (user_id, type, start_date, end_date, reason, status, file_bukti, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, type, start_date, end_date, reason, 'Pending', file_bukti || null, duration]
    );

    // 🌟 TAMBAHKAN: PELATUK NOTIFIKASI UNTUK ADMIN
    try {
        const [admins] = await db.query('SELECT id, email FROM users WHERE role = "admin"');
        const [sender] = await db.query('SELECT name FROM users WHERE id = ?', [user_id]);
        const senderName = sender[0]?.name || 'Karyawan';

        for (const admin of admins) {
            await db.query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', 
                [admin.id, 'Pengajuan Izin Baru', `${senderName} mengajukan ${type} (${jumlahHari} hari).`]
            );
            if (admin.email) sendEmail(admin.email, 'HRIS - Pengajuan Baru', `Ada pengajuan ${type} baru dari ${senderName}.`);
        }
    } catch (e) { console.error("Notif Error"); }

    return res.status(200).json({ message: 'Pengajuan berhasil dikirim dan menunggu persetujuan.' });
    
  } catch (error) {
    console.error("🔴 ERROR MYSQL:", error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada sistem.' });
  }
}