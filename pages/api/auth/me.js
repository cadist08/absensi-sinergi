import { parse } from 'cookie';
import db from '../../../lib/db'; // Mengakses koneksi database

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method tidak diizinkan' });
  }

  // 1. Ambil cookie dari request header
  const cookies = parse(req.headers.cookie || '');
  const sessionData = cookies.user_session; 

  if (!sessionData) {
    return res.status(401).json({ message: 'Tidak terautentikasi' });
  }

  try {
    // 2. Parse JSON string menjadi Object untuk mendapatkan ID User
    const sessionUser = JSON.parse(sessionData);
    
    // 3. 🌟 HRIS ASLI: Jangan percaya 100% pada cookie lama. 
    // Ambil data paling SEGAR (Real-Time) dari Database berdasarkan ID tersebut!
    const [rows] = await db.query(
      'SELECT id, name, role, sisa_cuti, face_descriptor FROM users WHERE id = ?', 
      [sessionUser.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan di database' });
    }

    const freshUser = rows[0];

    // 4. Kembalikan data segar (termasuk sisa_cuti terbaru) ke frontend
    return res.status(200).json({ user: freshUser });
    
  } catch (e) {
    console.error("Auth Error:", e);
    return res.status(401).json({ message: 'Session invalid' });
  }
}