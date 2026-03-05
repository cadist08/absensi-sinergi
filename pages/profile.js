import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import Layout from '../components/layout';
import { Loader2, Save, User, Lock, Phone, MapPin } from 'lucide-react';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  // 🌟 State baru untuk Phone dan Address
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const savedTheme = Cookies.get('theme');
    if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setName(data.user.name);
          // 🌟 Isi otomatis dari database
          setPhone(data.user.phone || '');
          setAddress(data.user.address || '');
        } else { router.push('/login'); }
      } catch (e) { router.push('/login'); } finally { setLoading(false); }
    };
    fetchUser();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage('');

    try {
      // 🌟 Kirim juga data phone dan address
      const res = await fetch('/api/update', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password, phone, address }), 
      });

      if (res.ok) {
        alert('Profil berhasil diperbarui!');
        if (password) {
            alert('Password diganti, silakan login ulang.');
            await fetch('/api/auth/logout');
            router.push('/');
        }
      } else {
        const data = await res.json();
        setMessage(data.message || 'Gagal update profil');
      }
    } catch (err) { setMessage('Terjadi kesalahan koneksi'); } finally { setUpdating(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900"><Loader2 className="animate-spin h-10 w-10 text-indigo-600"/></div>;
  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8 text-slate-800 dark:text-white">Profil Saya</h1>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2"><span className="flex items-center gap-2"><User size={14}/> Nama Lengkap</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 dark:text-white outline-none" required />
            </div>

            {/* 🌟 Input Nomor Telepon */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2"><span className="flex items-center gap-2"><Phone size={14}/> Nomor Telepon</span></label>
              <input type="text" placeholder="Cth: 08123456789" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 dark:text-white outline-none" />
            </div>

            {/* 🌟 Input Alamat */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2"><span className="flex items-center gap-2"><MapPin size={14}/> Alamat Rumah</span></label>
              <textarea rows="3" placeholder="Masukkan alamat lengkap..." value={address} onChange={e => setAddress(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 dark:text-white outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2"><span className="flex items-center gap-2"><Lock size={14}/> Password Baru (Opsional)</span></label>
              <input type="password" placeholder="Kosongkan jika tidak diganti" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 dark:text-white outline-none" />
            </div>

            <button type="submit" disabled={updating} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition flex justify-center gap-2 shadow-lg">
              {updating ? <Loader2 className="animate-spin"/> : <Save size={18}/>}
              {updating ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}