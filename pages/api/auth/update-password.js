import db from '../../../lib/db';
import bcrypt from 'bcryptjs'; // Disarankan pakai bcrypt untuk keamanan

export default async function handler(req, res) {
    const { token, email, newPassword } = req.body;

    // 1. Validasi token
    const [users] = await db.query('SELECT id FROM users WHERE email = ? AND reset_token = ?', [email, token]);

    if (users.length === 0) {
        return res.status(400).json({ message: 'Token tidak valid.' });
    }

    // 2. Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. Update password dan hapus token agar tidak bisa dipakai lagi
    await db.query('UPDATE users SET password = ?, reset_token = NULL WHERE email = ?', [hashedPassword, email]);

    return res.status(200).json({ message: 'Password updated' });
}