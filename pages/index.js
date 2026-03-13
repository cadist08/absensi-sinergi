import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { Loader2, Sun, Moon, Cpu, CalendarCheck, Wallet, ShieldCheck } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  
  // State untuk Login
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State untuk Tema
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Inisialisasi Tema
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

  // Fungsi Login
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
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Head>
        <title>Sinergi Nusantara Integrasi</title>
        <meta name="description" content="Sistem absensi dan HRIS modern berbasis Face Recognition" />
      </Head>

      {/* NAVBAR */}
      <nav className={`fixed w-full z-50 transition-colors duration-300 border-b backdrop-blur-md ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex-shrink-0 flex items-center">
              <Image 
                 src="/logos.png" 
                 alt="Logo Sinergi" 
                 width={180} 
                 height={50} 
                 className={`object-contain transition-all ${isDarkMode ? 'brightness-0 invert opacity-90' : ''}`} 
                 priority
              />
            </div>
            <div>
              <button onClick={toggleTheme} className={`p-2.5 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                 {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO SECTION DENGAN FORM LOGIN */}
      <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Dekorasi Background */}
        {!isDarkMode && <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-transparent z-0"></div>}
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          
          {/* KIRI: TEKS BRANDING */}
          <div className="text-center lg:text-left animate-in fade-in slide-in-from-left-8 duration-700">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm mb-6 ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
              Sistem HRIS & Absensi Enterprise v2.0
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              Revolusi SDM <br className="hidden md:block" />
              dengan <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Teknologi AI</span>.
            </h1>
            
            <p className={`max-w-xl mx-auto lg:mx-0 text-lg sm:text-xl mb-8 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Tinggalkan cara lama. PT Sinergi Nusantara Integrasi menghadirkan sistem presensi pengenalan wajah, manajemen cuti, dan penggajian otomatis dalam satu platform terpadu.
            </p>
          </div>

          {/* KANAN: FORM LOGIN */}
          <div className="flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-8 duration-700">
             <div className={`w-full max-w-md p-8 sm:p-10 rounded-3xl shadow-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-indigo-900/10' : 'bg-white border-slate-100 shadow-indigo-100/50'}`}>
                <div className="mb-2">
                    <h2 className="text-2xl font-bold tracking-tight">Selamat Datang</h2>
                    <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Silakan login ke akun Anda.</p>
                </div>

                {/* Penahan Error agar UI tidak loncat (Nge-zoom / Layout Shift) */}
                <div className="min-h-[52px] mt-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm animate-in fade-in zoom-in-95 duration-200 font-medium flex items-center gap-2">
                            {error}
                        </div>
                    )}
                </div>

                <form className="space-y-5" onSubmit={handleLogin}>
                    <div>
                        <label className={`block text-sm font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Email / Username</label>
                        <input 
                            type="text" 
                            required 
                            placeholder="nama@email.com" 
                            // text-base (16px) wajib ada untuk mencegah auto-zoom di iPhone/Safari
                            className={`w-full p-3.5 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-base sm:text-sm ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`} 
                            onChange={e => setIdentifier(e.target.value)} 
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Password</label>
                            <Link href="/forgot-password" className="text-sm font-semibold text-indigo-500 hover:text-indigo-600 transition-colors">
                                Lupa Password?
                            </Link>
                        </div>
                        <input 
                            type="password" 
                            required 
                            placeholder="••••••••" 
                            className={`w-full p-3.5 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-base sm:text-sm ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`} 
                            onChange={e => setPassword(e.target.value)} 
                        />
                    </div>

                    <button type="submit" disabled={loading} className="w-full py-4 mt-2 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 disabled:bg-indigo-400 disabled:shadow-none flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="animate-spin" size={24}/> : 'Masuk Dashboard'}
                    </button>
                </form>
             </div>
          </div>

        </div>
      </div>

      {/* FEATURES SECTION */}
      <div className={`py-24 border-t ${isDarkMode ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">
            <h2 className="text-3xl font-extrabold tracking-tight">Kenapa Memilih Platform Kami?</h2>
            <p className={`mt-4 text-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Fitur cerdas yang dirancang untuk efisiensi perusahaan modern.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              isDark={isDarkMode}
              icon={<Cpu size={32} className="text-indigo-500" />}
              title="Face Recognition"
              desc="Absensi real-time anti-kecurangan menggunakan pemindaian 128 fitur wajah (AI)."
            />
            <FeatureCard 
              isDark={isDarkMode}
              icon={<CalendarCheck size={32} className="text-emerald-500" />}
              title="Manajemen Cuti"
              desc="Pengajuan izin dan cuti digital dengan alur persetujuan (approval) terpusat."
            />
            <FeatureCard 
              isDark={isDarkMode}
              icon={<Wallet size={32} className="text-amber-500" />}
              title="Smart Payroll"
              desc="Penghitungan gaji instan terintegrasi dengan denda keterlambatan dan absen mangkir."
            />
            <FeatureCard 
              isDark={isDarkMode}
              icon={<ShieldCheck size={32} className="text-blue-500" />}
              title="Data Terpusat"
              desc="Keamanan data tingkat tinggi untuk master data divisi, jabatan, dan riwayat karyawan."
            />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className={`py-10 border-t ${isDarkMode ? 'bg-slate-950 border-slate-900' : 'bg-slate-50 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center md:items-start gap-3">
             <Image 
                src="/logos.png" 
                alt="Sinergi" 
                width={130} 
                height={35} 
                className={`object-contain ${isDarkMode ? 'brightness-0 invert opacity-50' : 'grayscale opacity-60'}`} 
             />
          </div>
          <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
            &copy; {new Date().getFullYear()} PT. Sinergi Nusantara Integrasi. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

// Komponen Kartu Fitur
function FeatureCard({ isDark, icon, title, desc }) {
  return (
    <div className={`p-8 rounded-3xl border transition-all duration-300 group hover:-translate-y-2 ${isDark ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10' : 'bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-xl hover:shadow-indigo-100/50'}`}>
      <div className={`w-14 h-14 rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className={`leading-relaxed text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{desc}</p>
    </div>
  );
}