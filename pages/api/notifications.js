import db from '../../lib/db';

export default async function handler(req, res) {
  const { method } = req;
  const userId = req.query.userId || req.body.userId;

  if (method === 'GET') {
    try {
      const [rows] = await db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [userId]);
      return res.status(200).json(rows);
    } catch (e) { return res.status(500).json({ message: 'Gagal memuat notifikasi' }); }
  }

  if (method === 'PUT') {
    try {
      await db.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.body.id]);
      return res.status(200).json({ message: 'Read' });
    } catch (e) { return res.status(500).json({ message: 'Gagal update' }); }
  }
}