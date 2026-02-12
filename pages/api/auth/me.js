import { parse } from 'cookie'; // Butuh library 'cookie' (npm install cookie)

export default function handler(req, res) {
  // 1. Ambil cookie dari request header
  const cookies = parse(req.headers.cookie || '');
  const sessionData = cookies.user_session; // Sesuaikan nama cookie Anda ('user_session')

  if (!sessionData) {
    return res.status(401).json({ message: 'Tidak terautentikasi' });
  }

  try {
    // 2. Parse JSON string menjadi Object
    const user = JSON.parse(sessionData);
    
    // 3. Kembalikan data user ke frontend
    return res.status(200).json({ user });
  } catch (e) {
    return res.status(401).json({ message: 'Session invalid' });
  }
}