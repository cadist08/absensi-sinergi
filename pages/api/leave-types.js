import db from '../../lib/db';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const [rows] = await db.query('SELECT * FROM leave_types ORDER BY id ASC');
      return res.status(200).json(rows);
    } catch (error) {
      return res.status(500).json({ message: 'Gagal mengambil master data izin.' });
    }
  }
  return res.status(405).end();
}