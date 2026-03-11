import db from '../../../lib/db';
import { sendEmail } from '../../../lib/mailer';
import crypto from 'crypto'; // Library bawaan Node.js untuk membuat token

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { email } = req.body;

    try {
        const [users] = await db.query('SELECT id, name FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'Alamat email tidak terdaftar.' });
        }

        // BUAT TOKEN ACAK (Berlaku sebagai kunci sementara)
        const token = crypto.randomBytes(32).toString('hex');
        
        // Simpan token ke database (Pastikan tabel users punya kolom 'reset_token')
        // Jika belum ada kolomnya, jalankan: ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);
        await db.query('UPDATE users SET reset_token = ? WHERE email = ?', [token, email]);

        const resetLink = `http://localhost:3000/reset-password?token=${token}&email=${email}`;

        const subject = 'Reset Password - HRIS Sinergi';
        const htmlContent = `
            <h1>Permintaan Reset Password</h1>
            <p>Halo ${users[0].name},</p>
            <p>Klik tombol di bawah ini untuk membuat password baru Anda:</p>
            <a href="${resetLink}" style="padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Reset Password Sekarang</a>
            <p>Link ini hanya berlaku untuk satu kali penggunaan.</p>
        `;

        await sendEmail(email, subject, htmlContent);

        return res.status(200).json({ message: 'Berhasil' });
    } catch (error) {
        return res.status(500).json({ message: 'Kesalahan server.' });
    }
}