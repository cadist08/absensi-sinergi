import db from '../../lib/db'; // Pastikan ini mengarah ke file koneksi database Anda

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method tidak diizinkan' });
  }

  try {
    const { userId, face_descriptor } = req.body;
    
    if (!userId || !face_descriptor) {
      return res.status(400).json({ message: 'Data tidak lengkap. Gagal memproses wajah.' });
    }

    // 1. Cek apakah user sudah pernah daftar sebelumnya
    const [rows] = await db.query('SELECT face_descriptor FROM users WHERE id = ?', [userId]);
    
    if (rows.length > 0 && rows[0].face_descriptor) {
      return res.status(403).json({ message: 'Wajah sudah terdaftar! Hubungi admin jika ingin reset.' });
    }

    // 2. Simpan pola wajah ke database
    await db.query('UPDATE users SET face_descriptor = ? WHERE id = ?', [face_descriptor, userId]);
    
    return res.status(200).json({ message: 'Wajah berhasil disimpan permanen!' });
    
  } catch (error) {
    // INI AKAN MEMUNCULKAN ALASAN ERRORNYA DI TERMINAL VS CODE
    console.error("🔴 ERROR DATABASE SAAT SIMPAN WAJAH:", error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server database.' });
  }
}