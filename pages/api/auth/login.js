import db from '../../../lib/db';
import { serialize } from 'cookie';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  // UBAH 1: Terima 'identifier' (bukan cuma email)
  const { identifier, password } = req.body;

  try {
    // 1. Cek Database
    // UBAH 2: Query SQL pakai "OR" untuk cek Email ATAU Nama
    // Kita masukkan parameter [identifier, identifier] karena ada 2 tanda tanya (?)
    const [users] = await db.execute(
        'SELECT * FROM users WHERE email = ? OR name = ?', 
        [identifier, identifier]
    );

    const user = users[0];

    // Jika user tidak ditemukan
    if (!user) {
      return res.status(401).json({ message: 'Akun tidak ditemukan atau password salah!' });
    }

    // 2. Validasi Password (HASHING)
    const match = await bcrypt.compare(password, user.password);

    // Jika password salah
    if (!match) {
      return res.status(401).json({ message: 'Akun tidak ditemukan atau password salah!' });
    }

    // --- LOGIN BERHASIL ---

    // 3. BERSIHKAN DATA (Buang password)
    const { password: _, ...userWithoutPassword } = user;

    // 4. SETTING COOKIE
    const cookieSerialized = serialize('user_session', JSON.stringify(userWithoutPassword), {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 Hari
      path: '/',
    });

    // 5. Kirim Header
    res.setHeader('Set-Cookie', cookieSerialized);

    // 6. Response
    res.status(200).json({ message: 'Login berhasil', user: userWithoutPassword });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}