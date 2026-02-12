import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie'; 
import Image from 'next/image';
import { Mail, Lock, Sun, Moon, Loader2 } from 'lucide-react';
import Link from 'next/link'; // Tambahkan ini untuk navigasi

export default function Login() {
  const router = useRouter();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = Cookies.get('theme'); 
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      Cookies.set('theme', 'dark', { expires: 365 }); 
    } else {
      document.documentElement.classList.remove('dark');
      Cookies.set('theme', 'light', { expires: 365 });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError(data.message || 'Login gagal');
      }

    } catch (err) {
      setError('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 overflow-hidden">
        {/* BAGIAN KIRI (BRANDING DESKTOP) */}
        <div className="hidden lg:flex flex-col justify-between bg-slate-900 relative p-12 text-white">
            <div className="absolute inset-0 opacity-20">
                <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0 100 C 20 0 50 0 100 100 Z" fill="url(#grad1)" />
                    <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{stopColor:'rgb(99, 102, 241)', stopOpacity:1}} />
                        <stop offset="100%" style={{stopColor:'rgb(168, 85, 247)', stopOpacity:1}} />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-slate-900/90 z-0"></div>

            <div className="relative z-10">
                <div className="w-48"> 
                   <Image 
                     src="/logos.png" 
                     alt="Sinergi Nusantara Integrasi" 
                     width={250} 
                     height={80} 
                     className="object-contain brightness-0 invert opacity-90"
                     priority
                   />
                </div>
            </div>

            <div className="relative z-10 max-w-md">
                 <h2 className="text-4xl font-extrabold tracking-tight leading-tight mb-6">
                    SINERGI NUSANTARA INTEGRASI
                </h2>
                <p className="text-indigo-200">
                    PT. Sinergi Nusantara Integrasi (SINERGI) adalah perusahaan dengan solusi teknologi kelas dunia yang memberikan berbagai solusi inovatif berdasarkan teknologi yang terintegrasi.
                </p>
            </div>
            
            <div className="relative z-10 text-sm text-slate-400">
               <p>© 2026 PT Sinergi Nusantara Integrasi. All rights reserved.</p>
            </div>
        </div>

        {/* BAGIAN KANAN (FORM LOGIN) */}
        <div className={`flex flex-col justify-center items-center p-6 sm:p-12 transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
            <div className="w-full max-w-md space-y-8">
                
                <div className="lg:hidden flex justify-center mb-6">
                    <div className="w-40">
                         <Image 
                            src="/logos.png" 
                            alt="Sinergi Nusantara Integrasi" 
                            width={200} 
                            height={60}
                            className="object-contain" 
                         />
                    </div>
                </div>

                <div className="text-center lg:text-left">
                    <h2 className={`text-3xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Selamat Datang</h2>
                    <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Silakan login ke akun Anda.</p>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-5" onSubmit={handleLogin}>
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Email / Username</label>
                        <input 
                            type="text" 
                            required 
                            placeholder="Masukkan email atau username" 
                            className={`w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} 
                            onChange={e => setIdentifier(e.target.value)} 
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Password</label>
                            
                            {/* TAMBAHAN: Link Lupa Password */}
                            <Link 
                                href="/forgot-password" 
                                className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                            >
                                Lupa Password?
                            </Link>
                        </div>
                        <input 
                            type="password" 
                            required 
                            placeholder="Password" 
                            className={`w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} 
                            onChange={e => setPassword(e.target.value)} 
                        />
                    </div>

                    <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30">
                        {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={20}/> Memproses...</span> : 'Masuk'}
                    </button>
                </form>

                <div className="mt-6 flex justify-between items-center border-t pt-6 border-slate-200 dark:border-slate-800">
                    <button onClick={toggleTheme} className={`flex items-center gap-2 text-sm font-medium p-2 rounded-md transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        <span>{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
}