import db from '../../lib/db';

// Konfigurasi agar Next.js bisa menerima file gambar/dokumen yang agak besar (Maks 5MB)
export const config = { api: { bodyParser: { sizeLimit: '5mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method tidak diizinkan' });

  try {
    const { user_id, type, start_date, end_date, reason, file_bukti } = req.body;

    if (!user_id || !type || !start_date || !end_date || !reason) {
      return res.status(400).json({ message: 'Semua kolom formulir harus diisi lengkap.' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    
    if (end < start) {
        return res.status(400).json({ message: 'Tanggal selesai tidak boleh mendahului tanggal mulai.' });
    }

    // Hitung jumlah hari yang diajukan
    const diffTime = Math.abs(end - start);
    const jumlahHari = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // 🌟 CEK KUOTA JIKA TIPE ADALAH CUTI 🌟
    if (type === 'Cuti') {
        const [userDb] = await db.query('SELECT sisa_cuti FROM users WHERE id = ?', [user_id]);
        const sisaCuti = userDb[0]?.sisa_cuti || 0;
        
        if (jumlahHari > sisaCuti) {
            return res.status(400).json({ message: `Gagal! Pengajuan Anda ${jumlahHari} hari, tapi sisa cuti Anda hanya ${sisaCuti} hari.` });
        }
    }

    // Cek tabrakan tanggal
    const [existingLeaves] = await db.query(
      `SELECT id FROM leaves WHERE user_id = ? AND (start_date <= ? AND end_date >= ?) AND status != 'Rejected'`, 
      [user_id, end_date, start_date]
    );

    if (existingLeaves.length > 0) {
      return res.status(400).json({ message: 'Gagal: Anda sudah memiliki pengajuan aktif pada tanggal tersebut!' });
    }

    // Simpan ke database (termasuk file bukti jika ada)
    await db.query(
      'INSERT INTO leaves (user_id, type, start_date, end_date, reason, status, file_bukti) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id, type, start_date, end_date, reason, 'Pending', file_bukti || null]
    );

    return res.status(200).json({ message: 'Pengajuan berhasil dikirim dan menunggu persetujuan.' });
    
  } catch (error) {
    console.error("🔴 ERROR MYSQL:", error);
    return res.status(500).json({ message: 'Gagal menyimpan pengajuan ke database.' });
  }
}