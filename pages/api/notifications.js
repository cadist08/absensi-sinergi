import db from '../../lib/db';

export default async function handler(req, res) {
  const { method } = req;
  const userId = req.query.userId || req.body.userId;

  if (method === 'GET') {
    try {
      // Menampilkan 20 notifikasi terbaru
      const [rows] = await db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [userId]);
      return res.status(200).json(rows);
    } catch (e) { return res.status(500).json({ message: 'Gagal memuat notifikasi' }); }
  }

  if (method === 'PUT') {
    try {
      const { id } = req.body;
      
      if (id === 'all') {
        // Logika HRIS Profesional: Tandai semua dibaca
        await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE', [userId]);
      } else {
        // Tandai satu dibaca
        await db.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);
      }
      
      return res.status(200).json({ message: 'Berhasil diupdate' });
    } catch (e) { return res.status(500).json({ message: 'Gagal update' }); }
  }
}