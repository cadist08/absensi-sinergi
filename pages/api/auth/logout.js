import { serialize } from 'cookie';

export default function handler(req, res) {
  // Timpa cookie dengan masa berlaku kadaluarsa (maxAge: -1)
  const cookieSerialized = serialize('user_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    maxAge: -1,
    path: '/',
  });

  res.setHeader('Set-Cookie', cookieSerialized);
  res.status(200).json({ message: 'Logout sukses' });
}