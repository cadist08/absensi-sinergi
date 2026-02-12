import mysql from 'mysql2/promise';

const db = mysql.createPool({
  host: process.env.DB_HOST,      // Baca dari .env
  user: process.env.DB_USER,      // Baca dari .env
  password: process.env.DB_PASSWORD, // Baca dari .env
  database: process.env.DB_NAME,  // Baca dari .env
  
  // Konfigurasi Tambahan agar Pool lebih stabil (Enterprise Standard)
  waitForConnections: true,
  connectionLimit: 10, // Maksimal 10 koneksi sekaligus (biar DB gak overload)
  queueLimit: 0
});

export default db;