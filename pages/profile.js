import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import Layout from '../components/layout';
import { Loader2, Save, User, Lock } from 'lucide-react';

export default function Profile() {
  const router = useRouter();
  
  // State Data
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  
  // State UI
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');

  // CEK AUTH, DATA USER & TEMA
  useEffect(() => {
    // LOGIKA TEMA
    const savedTheme = Cookies.get('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // AMBIL DATA USER
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setName(data.user.name); // Isi form nama otomatis
        } else {
          router.push('/login');
        }
      } catch (e) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage('');

    try {
      // 2. KIRIM DATA KE API
      const res = await fetch('/api/update', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }), 
      });

      const data = await res.json();

      if (res.ok) {
        alert('Profil berhasil diperbarui! Silakan login ulang.');
        
        // LOGOUT VIA API (Hapus Cookie)
        await fetch('/api/auth/logout');
        router.push('/');
      } else {
        setMessage(data.message || 'Gagal update profil');
      }
    } catch (err) {
      setMessage('Terjadi kesalahan koneksi');
    } finally {
      setUpdating(false);
    }
  };

  // Tampilkan loading saat ambil data
  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
            <Loader2 className="animate-spin h-10 w-10 text-indigo-600"/>
        </div>
    );
  }

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8 text-slate-800 dark:text-white">Edit Profil</h1>
        
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          
          {message && (
            <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg text-sm border border-red-200">
                {message}
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-6">
            
            {/* Input Nama */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <span className="flex items-center gap-2"><User size={16}/> Nama Lengkap</span>
              </label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-white transition" 
                required
              />
            </div>

            {/* Input Email (Read Only) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email (Tidak bisa diubah)
              </label>
              <input 
                type="text" 
                value={user.email} 
                disabled
                className="w-full p-3 border bg-slate-100 text-slate-500 rounded-lg cursor-not-allowed dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-400"
              />
            </div>

            {/* Input Password Baru */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <span className="flex items-center gap-2"><Lock size={16}/> Password Baru (Opsional)</span>
              </label>
              <input 
                type="password" 
                placeholder="Biarkan kosong jika tidak ingin mengganti"
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-white transition"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Jika password diganti, Anda harus login ulang.</p>
            </div>

            {/* Tombol Simpan */}
            <button 
                type="submit" 
                disabled={updating}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {updating ? <Loader2 className="animate-spin"/> : <Save size={18}/>}
              {updating ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>

          </form>
        </div>
      </div>
    </Layout>
  );
}