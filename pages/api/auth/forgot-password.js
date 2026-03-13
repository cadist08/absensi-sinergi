import db from '../../../lib/db';
import { sendEmail } from '../../../lib/mailer';
import crypto from 'crypto'; 

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
        
        // Simpan token ke database 
        await db.query('UPDATE users SET reset_token = ? WHERE email = ?', [token, email]);

        const resetLink = `http://localhost:3000/reset-password?token=${token}&email=${email}`;

        const subject = 'Reset Password - HRIS Sinergi';
        
        // 🌟 PERUBAHAN: Mengubah format pesan menjadi Plain Text murni yang profesional
        const textContent = `Halo ${users[0].name},

Kami menerima permintaan untuk mereset password akun HRIS Sinergi Anda.

Silakan salin dan buka link di bawah ini pada browser Anda untuk membuat password baru:
${resetLink}

*Catatan: Link ini hanya berlaku untuk satu kali penggunaan. Jika Anda tidak merasa meminta reset password, silakan abaikan email ini. Keamanan akun Anda tetap terjamin.

Salam hangat,
Tim HRIS Sinergi`;

        await sendEmail(email, subject, textContent);

        return res.status(200).json({ message: 'Berhasil' });
    } catch (error) {
        return res.status(500).json({ message: 'Kesalahan server.' });
    }
}