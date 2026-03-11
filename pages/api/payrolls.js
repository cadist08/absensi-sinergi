import db from '../../lib/db';
import { parse } from 'cookie';

export default async function handler(req, res) {
  const { method } = req;
  const cookies = parse(req.headers.cookie || '');
  const userSession = cookies.user_session ? JSON.parse(cookies.user_session) : null;

  if (!userSession) return res.status(401).json({ message: 'Anda belum login' });

  const userId = userSession.id;
  const userRole = userSession.role;

  if (method === 'GET') {
    try {
      const { action, checkUserId, month, basicSalary } = req.query;

      // A. Ambil data karyawan + Gaji Default
      if (action === 'getUsers' && userRole === 'admin') {
          const [users] = await db.query(`
              SELECT u.id, u.name, p.salary as default_salary, p.allowance as default_allowance 
              FROM users u 
              LEFT JOIN positions p ON u.position_id = p.id 
              WHERE u.role != "admin"
          `);
          return res.status(200).json(users);
      }

      // B. 🌟 FITUR BARU: Analitik Absen & Deteksi Alpha (Mangkir) 🌟
      if (action === 'checkAttendance' && userRole === 'admin') {
          if (!checkUserId || !month) return res.status(400).json({ present_days: 0, late_days: 0, leave_days: 0, alpha_days: 0, suggested_deduction: 0 });
          
          const monthLike = `${month}-%`;
          const [attData] = await db.query(`
              SELECT 
                  SUM(CASE WHEN status = 'Hadir' OR status = 'Terlambat' THEN 1 ELSE 0 END) as present_days,
                  SUM(CASE WHEN status = 'Terlambat' THEN 1 ELSE 0 END) as late_days,
                  SUM(CASE WHEN status LIKE '%Izin%' OR status LIKE '%Sakit%' OR status LIKE '%Cuti%' THEN 1 ELSE 0 END) as leave_days
              FROM attendance
              WHERE user_id = ? AND date LIKE ?
          `, [checkUserId, monthLike]);
          
          const present = attData[0]?.present_days || 0;
          const late = attData[0]?.late_days || 0;
          const leave = attData[0]?.leave_days || 0;

          // 1. Hitung total hari kerja (Senin-Jumat) di bulan tersebut
          const [year, mth] = month.split('-');
          const daysInMonth = new Date(year, mth, 0).getDate();
          let weekdays = 0;
          for (let d = 1; d <= daysInMonth; d++) {
              const date = new Date(year, mth - 1, d);
              if (date.getDay() !== 0 && date.getDay() !== 6) weekdays++; // Bukan Minggu(0) & Sabtu(6)
          }

          // 2. Hitung Alpha (Mangkir)
          const totalRecorded = present + leave;
          let alpha = weekdays - totalRecorded;
          if (alpha < 0) alpha = 0; // Jaga-jaga jika karyawan kerja di hari libur

          // 3. Kalkulasi Potongan (Denda Telat 50rb + Potong Gaji Pokok untuk Alpha)
          const salaryPerDay = basicSalary ? (Number(basicSalary) / weekdays) : 0;
          const lateDeduction = late * 50000;
          const alphaDeduction = alpha * salaryPerDay;
          const totalSuggestedDeduction = Math.round(lateDeduction + alphaDeduction);

          return res.status(200).json({ 
              present_days: present,
              late_days: late,
              leave_days: leave,
              alpha_days: alpha,
              weekdays: weekdays,
              suggested_deduction: totalSuggestedDeduction
          });
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

      const [existing] = await db.query('SELECT id FROM payrolls WHERE user_id = ? AND month = ?', [user_id, month]);
      if (existing.length > 0) return res.status(400).json({ message: `Slip gaji bulan ${month} untuk karyawan ini sudah ada!` });

      // Cek kehadiran sekali lagi untuk disimpan di database
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

      const total_salary = Number(basic_salary) + Number(allowance) - Number(deduction);
      const payment_date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

      await db.query(
        `INSERT INTO payrolls (user_id, month, present_days, late_days, basic_salary, allowance, deduction, total_salary, payment_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
        [user_id, month, present_days, late_days, basic_salary, allowance, deduction, total_salary, payment_date]
      );

      // Notifikasi Karyawan
      try {
          await db.query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', 
              [user_id, 'Slip Gaji Diterbitkan 📄', `Slip gaji periode ${month} Anda telah diterbitkan dan sedang menunggu proses pencairan oleh HRD.`]
          );
      } catch (e) { console.error("Gagal kirim notif gaji"); }

      return res.status(200).json({ message: 'Slip Gaji berhasil dibuat!' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Gagal menyimpan data.' });
    }
  }

  // --- 3. PUT & DELETE (Tidak ada perubahan logika dasar, hanya disertakan agar lengkap) ---
  if (method === 'PUT') {
      if (userRole !== 'admin') return res.status(403).json({ message: 'Akses ditolak.' });
      try {
          const { id, status } = req.body;
          const [payrollData] = await db.query('SELECT user_id, month FROM payrolls WHERE id = ?', [id]);
          await db.query('UPDATE payrolls SET status = ? WHERE id = ?', [status, id]);

          if (status === 'Paid' && payrollData.length > 0) {
              try {
                  await db.query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', 
                      [payrollData[0].user_id, 'Gaji Dicairkan! 💰', `Hore! Gaji Anda untuk periode ${payrollData[0].month} telah berhasil ditransfer. Silakan cek rekening Anda.`]
                  );
              } catch (e) { console.error("Gagal kirim notif cair"); }
          }
          return res.status(200).json({ message: 'Status gaji diperbarui!' });
      } catch (e) { return res.status(500).json({ message: 'Gagal update status.' }); }
  }

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