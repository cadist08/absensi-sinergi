import db from '../../lib/db';
import bcrypt from 'bcryptjs'; // 🌟 PERUBAHAN: Menggunakan bcryptjs agar aman dari error instalasi
import { parse, serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).end();
  
  const cookies = parse(req.headers.cookie || '');
  const userSession = cookies.user_session ? JSON.parse(cookies.user_session) : null;

  if (!userSession) return res.status(401).json({ message: 'Unauthorized' });

  const myId = userSession.id; 
  // 🌟 PERUBAHAN: Menangkap 'email' dari request body frontend
  const { name, email, password, phone, address } = req.body;

  try {
    if (password) {
      const salt = 10;
      const hashedPassword = await bcrypt.hash(password, salt);
      // 🌟 PERUBAHAN: Memasukkan kolom email ke query UPDATE
      await db.execute(
        'UPDATE users SET name = ?, email = ?, password = ?, phone = ?, address = ? WHERE id = ?', 
        [name, email || null, hashedPassword, phone || null, address || null, myId]
      );
    } else {
      // 🌟 PERUBAHAN: Memasukkan kolom email ke query UPDATE tanpa password
      await db.execute(
        'UPDATE users SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?', 
        [name, email || null, phone || null, address || null, myId]
      );
    }

    const updatedUser = {
        ...userSession,
        name: name,
        email: email, // 🌟 PERUBAHAN: Memperbarui email di session cookie
        phone: phone, 
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
    // 🌟 PERUBAHAN: Menangkap error jika email sudah dipakai user lain
    if (e.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: 'Email tersebut sudah digunakan oleh akun lain.' });
    }
    res.status(500).json({ message: e.message });
  }
}