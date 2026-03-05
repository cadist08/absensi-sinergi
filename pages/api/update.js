import db from '../../lib/db';
import bcrypt from 'bcrypt';
import { parse, serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).end();
  
  const cookies = parse(req.headers.cookie || '');
  const userSession = cookies.user_session ? JSON.parse(cookies.user_session) : null;

  if (!userSession) return res.status(401).json({ message: 'Unauthorized' });

  const myId = userSession.id; 
  // 🌟 Tambahkan phone dan address dari body
  const { name, password, phone, address } = req.body;

  try {
    if (password) {
      const salt = 10;
      const hashedPassword = await bcrypt.hash(password, salt);
      // 🌟 Masukkan phone dan address ke query
      await db.execute(
        'UPDATE users SET name = ?, password = ?, phone = ?, address = ? WHERE id = ?', 
        [name, hashedPassword, phone || null, address || null, myId]
      );
    } else {
      // 🌟 Masukkan phone dan address ke query tanpa ganti password
      await db.execute(
        'UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?', 
        [name, phone || null, address || null, myId]
      );
    }

    const updatedUser = {
        ...userSession,
        name: name,
        phone: phone,   // 🌟 Update data di session cookie
        address: address
    };

    const cookieSerialized = serialize('user_session', JSON.stringify(updatedUser), {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
        path: '/',
    });

    res.setHeader('Set-Cookie', cookieSerialized);
    res.status(200).json({ message: 'Profil berhasil diperbarui', user: updatedUser });

  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}