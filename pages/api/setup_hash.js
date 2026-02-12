import db from '../../lib/db';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  // Hanya jalankan jika di local
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Dilarang di Production!' });
  }

  const passwordDefault = '123456';

  try {
    // 1. Hash Password
    const salt = 10;
    const hash = await bcrypt.hash(passwordDefault, salt);

    // 2. Update Semua User
    await db.execute(
      'UPDATE users SET password = ?', 
      [hash]
    );

    res.status(200).json({ 
      message: 'SUKSES! Password SEMUA user (Admin & Karyawan) sekarang adalah: ' + passwordDefault, 
    });

  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}