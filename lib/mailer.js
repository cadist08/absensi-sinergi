import nodemailer from 'nodemailer';

export const sendEmail = async (to, subject, text) => {
  try {
    // Ganti user & pass dengan Email Gmail Anda dan App Password Gmail Anda
    // Karena ini untuk tes magang, kita pakai konfigurasi dasar Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'zaenalfanani501@gmail.com', // ⚠️ GANTI DENGAN EMAIL ANDA
        pass: 'ggth haii gwsv casq'    // ⚠️ GANTI DENGAN APP PASSWORD GMAIL ANDA
      }
    });

    if (to) {
        await transporter.sendMail({ from: 'HRIS System', to, subject, text });
        console.log(`Email terkirim ke ${to}`);
    }
  } catch (error) {
    // Jika email gagal (karena belum disetting), aplikasi TIDAK AKAN error/crash!
    console.log('Sistem Email belum dikonfigurasi, mengabaikan pengiriman email...');
  }
};