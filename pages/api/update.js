import db from '../../lib/db';
import bcrypt from 'bcrypt';
import { parse, serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).end();
  
  const cookies = parse(req.headers.cookie || '');
  const userSession = cookies.user_session ? JSON.parse(cookies.user_session) : null;

  if (!userSession) return res.status(401).json({ message: 'Unauthorized' });

  const myId = userSession.id; 
  const { name, password } = req.body;

  try {
    if (password) {
      const salt = 10;
      const hashedPassword = await bcrypt.hash(password, salt);
      await db.execute('UPDATE users SET name = ?, password = ? WHERE id = ?', [name, hashedPassword, myId]);
    } else {
      await db.execute('UPDATE users SET name = ? WHERE id = ?', [name, myId]);
    }

    // FITUR TAMBAHAN: UPDATE COOKIE AGAR TIDAK PERLU LOGOUT
    // Kita buat object session baru dengan nama yang baru saja diupdate
    const updatedUser = {
        ...userSession, // Copy data lama (id, email, role)
        name: name      // Timpa nama lama dengan nama baru
    };

    // Bungkus ulang jadi cookie
    const cookieSerialized = serialize('user_session', JSON.stringify(updatedUser), {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 1 Hari
        path: '/',
    });

    // Kirim cookie baru ke browser
    res.setHeader('Set-Cookie', cookieSerialized);

    res.status(200).json({ message: 'Profil berhasil diperbarui', user: updatedUser });

  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}