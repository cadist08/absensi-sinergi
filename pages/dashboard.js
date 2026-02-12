import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie'; 
import Layout from '../components/layout'; 
import { 
  Sun, Moon, LogOut, Loader2, 
  Users, CheckCircle, Clock, MapPin, Calendar, List
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // STATE
  const [attendanceHistory, setAttendanceHistory] = useState([]); 
  const [todayRecord, setTodayRecord] = useState(null); 
  const [currentTime, setCurrentTime] = useState('');
  const [todayDate, setTodayDate] = useState('');
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({ hadir: 0, terlambat: 0 });

  // 1. JAM DIGITAL
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTodayDate(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. LOAD DATA
  const loadAttendance = useCallback(async (role) => {
    try {
      const res = await fetch('/api/attendance'); 
      if (res.ok) {
        const data = await res.json();
        setAttendanceHistory(data);

        if (role === 'admin') {
           const todayISO = new Date().toISOString().split('T')[0];
           const todayData = data.filter(item => {
              const itemDate = typeof item.date === 'string' ? item.date.substring(0, 10) : new Date(item.date).toISOString().split('T')[0];
              return itemDate === todayISO;
           });
           const countHadir = todayData.length;
           const countTerlambat = todayData.filter(i => i.status === 'Terlambat').length;
           setStats({ hadir: countHadir, terlambat: countTerlambat });
        }

        if (role !== 'admin') {
           const todayISO = new Date().toISOString().split('T')[0];
           const todayData = data.find(item => {
              const itemDate = typeof item.date === 'string' ? item.date.substring(0, 10) : new Date(item.date).toISOString().split('T')[0];
              return itemDate === todayISO;
           });
           setTodayRecord(todayData || null);
        }
      }
    } catch (e) { console.error("Gagal load absensi", e); }
  }, []);

  // 3. INIT USER
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          await loadAttendance(data.user.role);
        } else { router.push('/login'); }
      } catch (error) { router.push('/login'); } finally { setLoading(false); }
    };
    init();
    const savedTheme = Cookies.get('theme');
    if (savedTheme === 'dark') document.documentElement.classList.add('dark');
  }, [loadAttendance, router]);

  const handleAbsensi = async () => {
    setProcessing(true);
    const type = !todayRecord ? 'in' : 'out';
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }) 
      });
      const result = await res.json();
      if (res.ok) { alert(result.message); await loadAttendance(user.role); } 
      else { alert(result.message); }
    } catch (e) { alert('Gagal terhubung ke server'); } 
    finally { setProcessing(false); }
  };

  const handleLogout = async () => { await fetch('/api/auth/logout'); router.push('/'); };
  
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) { document.documentElement.classList.add('dark'); Cookies.set('theme', 'dark', { expires: 365 }); } 
    else { document.documentElement.classList.remove('dark'); Cookies.set('theme', 'light', { expires: 365 }); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900"><Loader2 className="animate-spin text-indigo-600" /></div>;
  if (!user) return null;

  // TAMPILAN ADMIN
  if (user.role === 'admin') {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Dashboard Admin</h1>
                  <p className="text-sm text-gray-500">Monitoring Absensi Real-time</p>
              </div>
              <div className="flex gap-3">
                  <button onClick={toggleTheme} className="p-2 rounded-full bg-white shadow hover:bg-gray-100 dark:bg-slate-800 dark:text-yellow-400">
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                  </button>
                  <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded shadow text-sm hover:bg-red-700">Logout</button>
              </div>
          </div>
          
          {/* STATISTIK: Grid 1 kolom di HP, 3 di Laptop */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
              {/* Kartu 1 */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-indigo-100 dark:border-slate-700">
                  <div className="flex justify-between"><h3 className="text-gray-500 dark:text-gray-400">Hadir</h3><List className="text-indigo-500"/></div>
                  <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.hadir}</p>
              </div>
              {/* Kartu 2 */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-green-100 dark:border-slate-700">
                  <div className="flex justify-between"><h3 className="text-gray-500 dark:text-gray-400">Tepat Waktu</h3><CheckCircle className="text-green-500"/></div>
                  <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.hadir - stats.terlambat}</p>
              </div>
              {/* Kartu 3 */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-red-100 dark:border-slate-700">
                  <div className="flex justify-between"><h3 className="text-gray-500 dark:text-gray-400">Terlambat</h3><Clock className="text-red-500"/></div>
                  <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.terlambat}</p>
              </div>
          </div>

          {/* TABEL RESPONSIF */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
             <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white">Riwayat Absensi</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                   <thead className="bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white uppercase font-bold">
                      <tr>
                         <th className="p-4 whitespace-nowrap">Nama</th>
                         <th className="p-4 whitespace-nowrap">Tanggal</th>
                         <th className="p-4 whitespace-nowrap">Check In</th>
                         <th className="p-4 whitespace-nowrap">Check Out</th>
                         <th className="p-4 whitespace-nowrap">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {attendanceHistory.map((row) => (
                         <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            <td className="p-4 font-medium text-gray-800 dark:text-white whitespace-nowrap">{row.name}</td>
                            <td className="p-4 whitespace-nowrap">{typeof row.date === 'string' ? row.date.substring(0,10) : new Date(row.date).toLocaleDateString('id-ID')}</td>
                            <td className="p-4 text-green-600 font-mono whitespace-nowrap">{row.check_in?.substring(0,5) || '-'}</td>
                            <td className="p-4 text-orange-600 font-mono whitespace-nowrap">{row.check_out?.substring(0,5) || '-'}</td>
                            <td className="p-4 whitespace-nowrap">
                               <span className={`px-2 py-1 rounded text-xs font-bold ${row.status === 'Terlambat' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                  {row.status}
                               </span>
                            </td>
                         </tr>
                      ))}
                      {attendanceHistory.length === 0 && (
                         <tr><td colSpan="5" className="p-6 text-center">Belum ada data.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      </Layout>
    );
  }

  // TAMPILAN KARYAWAN
  const isCheckedIn = todayRecord && todayRecord.check_in;
  const isCheckedOut = todayRecord && todayRecord.check_out;
  const jamMasuk = isCheckedIn ? todayRecord.check_in.substring(0,5) : '--:--';
  const jamPulang = isCheckedOut ? todayRecord.check_out.substring(0,5) : '--:--';

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
        
        {/* Header Karyawan */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                 <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Halo, {user.name} 👋</h1>
                 <p className="text-sm text-gray-500">{todayDate}</p>
            </div>
            <div className="flex gap-2">
                <button onClick={toggleTheme} className="p-2 rounded-full bg-white shadow hover:bg-gray-100 dark:bg-slate-800 dark:text-yellow-400">
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded text-sm shadow hover:bg-red-700">Keluar</button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* KARTU TOMBOL ABSEN */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 shadow-lg text-center flex flex-col items-center border border-gray-100 dark:border-slate-700">
                {/* Jam Responsif: Kecil di HP, Besar di Laptop */}
                <div className="text-4xl md:text-6xl font-black text-indigo-600 dark:text-indigo-400 mb-6 font-mono tracking-widest">
                  {currentTime}
                </div>
                
                {!isCheckedOut ? (
                    <button 
                        onClick={handleAbsensi} 
                        disabled={processing}
                        className={`
                          w-40 h-40 md:w-48 md:h-48 rounded-full border-8 flex flex-col items-center justify-center text-white font-bold text-xl shadow-xl transition-transform hover:scale-105 active:scale-95
                          ${!isCheckedIn ? 'bg-indigo-600 border-indigo-100 hover:bg-indigo-700' : 'bg-orange-500 border-orange-100 hover:bg-orange-600'}
                        `}>
                        {processing ? <Loader2 className="animate-spin w-8 h-8"/> : (!isCheckedIn ? 'MASUK' : 'PULANG')}
                    </button>
                ) : (
                    <div className="flex flex-col items-center text-green-500">
                        <CheckCircle size={64} className="mb-2"/>
                        <div className="font-bold text-2xl">Sudah Pulang!</div>
                        <p className="text-gray-400 text-sm">Sampai jumpa besok.</p>
                    </div>
                )}
            </div>

            {/* KARTU STATUS JAM */}
            <div className="space-y-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-l-4 border-indigo-500 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <span className="text-gray-500 text-sm">Jam Masuk</span>
                        <div className="text-2xl font-bold text-gray-800 dark:text-white">{jamMasuk}</div>
                    </div>
                    <Clock className="text-indigo-500" size={32} />
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-l-4 border-orange-500 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <span className="text-gray-500 text-sm">Jam Pulang</span>
                        <div className="text-2xl font-bold text-gray-800 dark:text-white">{jamPulang}</div>
                    </div>
                    <LogOut className="text-orange-500" size={32} />
                </div>
            </div>
        </div>

        {/* LIST RIWAYAT SENDIRI (User Only) */}
        <div className="mt-8">
            <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">Riwayat Absensi Saya</h3>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                   <thead className="bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white font-bold">
                      <tr>
                         <th className="p-4 whitespace-nowrap">Tanggal</th>
                         <th className="p-4 whitespace-nowrap">Check In</th>
                         <th className="p-4 whitespace-nowrap">Check Out</th>
                         <th className="p-4 whitespace-nowrap">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {attendanceHistory.map((row) => (
                         <tr key={row.id}>
                            <td className="p-4 whitespace-nowrap">{typeof row.date === 'string' ? row.date.substring(0,10) : new Date(row.date).toLocaleDateString('id-ID')}</td>
                            <td className="p-4 font-mono whitespace-nowrap">{row.check_in?.substring(0,5) || '-'}</td>
                            <td className="p-4 font-mono whitespace-nowrap">{row.check_out?.substring(0,5) || '-'}</td>
                            <td className="p-4 whitespace-nowrap">{row.status}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
            </div>
        </div>

      </div>
    </Layout>
  );
}