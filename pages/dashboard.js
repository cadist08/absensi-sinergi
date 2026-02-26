import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie'; 
import Layout from '../components/layout'; 
import Webcam from 'react-webcam'; // <--- TAMBAHAN: Import Webcam
import * as faceapi from 'face-api.js'; // <--- TAMBAHAN: Import AI Wajah
import { 
  Sun, Moon, LogOut, Loader2, 
  Users, CheckCircle, Clock, MapPin, List, Calendar, Filter
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // STATE DATA
  const [attendanceHistory, setAttendanceHistory] = useState([]); 
  const [todayRecord, setTodayRecord] = useState(null); 
  
  // STATE UI
  const [currentTime, setCurrentTime] = useState('');
  const [todayDateDisplay, setTodayDateDisplay] = useState('');
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({ hadir: 0, terlambat: 0 });
  const [filterDate, setFilterDate] = useState('');

  // --- 🌟 TAMBAHAN: STATE & LOGIKA FACE RECOGNITION 🌟 ---
  const webcamRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Load Model AI saat halaman pertama kali dibuka
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        setModelsLoaded(true);
      } catch (e) {
        console.error("Gagal load model AI. Pastikan folder /public/models sudah ada", e);
      }
    };
    loadModels();
  }, []);

  // Fungsi Scan Wajah Real-time
  const handleVideoOnPlay = () => {
    const scanInterval = setInterval(async () => {
      if (webcamRef.current && webcamRef.current.video && isScanning) {
        const video = webcamRef.current.video;
        const detection = await faceapi.detectSingleFace(
          video, 
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.8 })
        );

        if (detection) {
          clearInterval(scanInterval); // Stop scan
          setIsScanning(false); // Tutup kamera
          handleAbsensi(); // Lanjutkan ke fungsi absen asli milik Anda
        }
      } else {
        clearInterval(scanInterval);
      }
    }, 500); // AI mengecek setiap setengah detik
  };
  // --- AKHIR TAMBAHAN FACE RECOGNITION ---

  // --- FUNGSI TOMBOL FILTER CEPAT ---
  const setFilterToday = () => {
      setFilterDate(getJakartaDateISO(new Date()));
  };

  const setFilterYesterday = () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      setFilterDate(getJakartaDateISO(yesterday));
  };

  // 1. HELPER: FORMAT TANGGAL JAKARTA (WIB)
  const getJakartaDateISO = (dateInput = new Date()) => {
    return new Date(dateInput).toLocaleDateString('en-CA', { 
        timeZone: 'Asia/Jakarta' 
    }); 
  };

  const getJakartaTimeDisplay = () => {
    return new Date().toLocaleTimeString('en-GB', { 
        timeZone: 'Asia/Jakarta',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).replace(/:/g, '.'); 
  };

  const getJakartaDateDisplay = () => {
    return new Date().toLocaleDateString('id-ID', { 
        timeZone: 'Asia/Jakarta',
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
    });
  };

  // 2. JAM DIGITAL BERJALAN
  useEffect(() => {
    setCurrentTime(getJakartaTimeDisplay());
    setTodayDateDisplay(getJakartaDateDisplay());

    const timer = setInterval(() => {
      setCurrentTime(getJakartaTimeDisplay());
      setTodayDateDisplay(getJakartaDateDisplay());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. LOAD DATA (ANTI CACHE & FILTER JAKARTA)
  const loadAttendance = useCallback(async (role) => {
    try {
      const res = await fetch(`/api/attendance?t=${new Date().getTime()}`); 
      if (res.ok) {
        const data = await res.json();
        setAttendanceHistory(data);

        const todayJakarta = getJakartaDateISO(new Date()); 

        if (role === 'admin') {
           const todayData = data.filter(item => {
              const itemJakarta = getJakartaDateISO(item.date);
              return itemJakarta === todayJakarta;
           });
           setStats({ 
             hadir: todayData.length, 
             terlambat: todayData.filter(i => i.status === 'Terlambat').length 
           });
        }

        if (role !== 'admin') {
           const todayData = data.find(item => {
              const itemJakarta = getJakartaDateISO(item.date);
              return itemJakarta === todayJakarta;
           });
           setTodayRecord(todayData || null);
        }
      }
    } catch (e) { console.error("Gagal load absensi", e); }
  }, []);

  // 4. INIT USER
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

  // 5. HANDLE TOMBOL ABSEN
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
      
      if (res.ok) { 
        alert(result.message); 
        await loadAttendance(user.role); 
      } else { 
        alert(result.message); 
      }
    } catch (e) { 
      alert('Gagal terhubung ke server'); 
    } finally { 
      setProcessing(false); 
    }
  };

  const handleLogout = async () => { await fetch('/api/auth/logout'); router.push('/'); };
  
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) { document.documentElement.classList.add('dark'); Cookies.set('theme', 'dark', { expires: 365 }); } 
    else { document.documentElement.classList.remove('dark'); Cookies.set('theme', 'light', { expires: 365 }); }
  };

  const filteredHistory = attendanceHistory.filter((row) => {
      if (!filterDate) return true; 
      return getJakartaDateISO(row.date) === filterDate;
  });

  // --- HITUNG STATISTIK KARTU SECARA DINAMIS ---
  const totalHadir = filteredHistory.length;
  const totalTerlambat = filteredHistory.filter((row) => row.status === 'Terlambat').length;
  const totalTepatWaktu = totalHadir - totalTerlambat;
  
  // Ubah judul kartu agar sesuai dengan filter yang dipilih
  const labelHadir = filterDate === getJakartaDateISO(new Date()) 
        ? 'Hadir Hari Ini' 
        : filterDate ? 'Total Hadir' : 'Semua Kehadiran';

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;
  if (!user) return null;

  // --- VARIABLES UI ---
  const isCheckedIn = todayRecord && todayRecord.check_in;
  const isCheckedOut = todayRecord && todayRecord.check_out;
  const jamMasuk = isCheckedIn ? todayRecord.check_in.substring(0,5) : '--:--';
  const jamPulang = isCheckedOut ? todayRecord.check_out.substring(0,5) : '--:--';

  // --- TAMPILAN ADMIN ---
  if (user.role === 'admin') {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors pb-10">
          <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-6 py-4 flex flex-col md:flex-row justify-between items-center sticky top-0 z-10 shadow-sm">
              <div>
                  <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Users className="text-indigo-600"/> Dashboard Admin
                  </h1>
                  <p className="text-xs text-gray-500 mt-1">Monitoring Absensi Real-time (WIB)</p>
              </div>
              <div className="flex gap-3 mt-4 md:mt-0">
                  <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:text-yellow-400 transition">
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                  </button>
                  <button onClick={handleLogout} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow text-sm transition font-medium flex items-center gap-2">
                    <LogOut size={16}/> Logout
                  </button>
              </div>
          </div>
          
          <div className="p-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group hover:shadow-md transition">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition transform group-hover:scale-110">
                        <Users size={80} className="text-indigo-600"/>
                    </div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">{labelHadir}</h3>
                    <p className="text-4xl font-bold text-gray-800 dark:text-white mt-2">{totalHadir}</p>
                    <div className="mt-4 h-1 w-full bg-indigo-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 w-full"></div></div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group hover:shadow-md transition">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition transform group-hover:scale-110">
                        <CheckCircle size={80} className="text-emerald-500"/>
                    </div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">Tepat Waktu</h3>
                    <p className="text-4xl font-bold text-gray-800 dark:text-white mt-2">{totalTepatWaktu}</p>
                    <div className="mt-4 h-1 w-full bg-emerald-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-full"></div></div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group hover:shadow-md transition">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition transform group-hover:scale-110">
                        <Clock size={80} className="text-rose-500"/>
                    </div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">Terlambat</h3>
                    <p className="text-4xl font-bold text-gray-800 dark:text-white mt-2">{totalTerlambat}</p>
                    <div className="mt-4 h-1 w-full bg-rose-100 rounded-full overflow-hidden"><div className="h-full bg-rose-500 w-full"></div></div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
               <div className="p-4 md:p-6 border-b border-gray-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                    <List className="text-indigo-500"/> Riwayat Absensi
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      <div className="flex bg-gray-100 dark:bg-slate-700/50 p-1 rounded-lg">
                          <button 
                              onClick={setFilterToday}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${filterDate === getJakartaDateISO(new Date()) ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                          >
                              Hari Ini
                          </button>
                          <button 
                              onClick={setFilterYesterday}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${filterDate === getJakartaDateISO(new Date(new Date().setDate(new Date().getDate() - 1))) ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                          >
                              Kemarin
                          </button>
                      </div>

                      <div className="relative w-full md:w-auto flex-1">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <Calendar size={16} className="text-gray-400"/>
                          </div>
                          <input 
                              type="date" 
                              value={filterDate}
                              onChange={(e) => setFilterDate(e.target.value)}
                              onClick={(e) => e.target.showPicker && e.target.showPicker()} 
                              className="pl-10 pr-4 py-1.5 w-full border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 dark:text-white cursor-pointer"
                          />
                      </div>

                      {filterDate && (
                          <button onClick={() => setFilterDate('')} className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg whitespace-nowrap transition">
                              Reset
                          </button>
                      )}
                      
                      <span className="hidden md:inline-block text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap">
                          {filteredHistory.length} Data
                      </span>
                  </div>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                     <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-800 dark:text-white uppercase font-bold text-xs tracking-wider">
                        <tr>
                           <th className="p-5">Nama</th>
                           <th className="p-5">Tanggal</th>
                           <th className="p-5">Check In</th>
                           <th className="p-5">Check Out</th>
                           <th className="p-5">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {filteredHistory.map((row) => (
                           <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                              <td className="p-5 font-medium text-gray-900 dark:text-white whitespace-nowrap">{row.name}</td>
                              <td className="p-5 whitespace-nowrap">{getJakartaDateISO(row.date)}</td>
                              <td className="p-5 font-mono text-emerald-600 font-semibold">{row.check_in ? row.check_in.substring(0,5) : '-'}</td>
                              <td className="p-5 font-mono text-orange-600 font-semibold">{row.check_out ? row.check_out.substring(0,5) : '-'}</td>
                              <td className="p-5 whitespace-nowrap">
                                 <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1
                                    ${row.status === 'Terlambat' ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'Terlambat' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                                    {row.status}
                                 </span>
                              </td>
                           </tr>
                        ))}
                        {filteredHistory.length === 0 && (
                           <tr>
                             <td colSpan="5" className="p-10 text-center text-gray-400 italic">
                               {filterDate ? `Tidak ada data absensi untuk tanggal ${filterDate}` : 'Belum ada data absensi hari ini.'}
                             </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // --- TAMPILAN KARYAWAN ---
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors pb-10">
        
        {/* HEADER KARYAWAN */}
        <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
            <div>
                 <h1 className="text-xl font-bold text-gray-800 dark:text-white">Halo, {user.name} 👋</h1>
                 <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Calendar size={12}/> {todayDateDisplay}</p>
            </div>
            <div className="flex gap-2">
                <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:text-yellow-400 transition">
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button onClick={handleLogout} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm shadow font-medium transition">
                    Keluar
                </button>
            </div>
        </div>

        <div className="p-6 max-w-4xl mx-auto space-y-8">
            
            {/* HERO CARD (JAM & TOMBOL) */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-slate-700 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Waktu Indonesia Barat</h2>
                <div className="text-5xl md:text-7xl font-black text-gray-800 dark:text-white mb-8 font-mono tracking-wider tabular-nums">
                  {currentTime}
                </div>
                
                <div className="flex justify-center">
                    {!isCheckedOut ? (
                        // 🌟 TAMPILAN BARU: Kamera Jadi Besar Saat Memindai 🌟
                        isScanning ? (
                            <div className="relative w-full max-w-xl h-72 md:h-96 rounded-3xl border-8 border-indigo-100 dark:border-slate-700 overflow-hidden bg-black shadow-2xl flex items-center justify-center animate-in zoom-in duration-300">
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    onPlay={handleVideoOnPlay}
                                    screenshotFormat="image/jpeg"
                                    videoConstraints={{ facingMode: "user" }}
                                    className="w-full h-full object-cover"
                                />
                                
                                {/* Overlay: Garis Panduan Wajah (Face Guide) */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-48 h-56 md:w-56 md:h-72 border-4 border-white/50 border-dashed rounded-[40%]"></div>
                                </div>
                                
                                {/* Label Status Scan */}
                                <div className="absolute bottom-6 bg-white/95 dark:bg-slate-800/95 px-5 py-2 rounded-full text-xs font-bold text-indigo-600 dark:text-indigo-400 z-10 flex items-center gap-2 shadow-lg">
                                    <Loader2 className="animate-spin w-4 h-4"/> Memindai Wajah...
                                </div>
                                
                                {/* Tombol Tutup Kamera */}
                                <button 
                                    onClick={() => setIsScanning(false)} 
                                    className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white text-xs px-4 py-2 rounded-full z-10 transition shadow-md"
                                >
                                    Batal
                                </button>
                            </div>
                        ) : (
                            // INI KODE TOMBOL ASLI MILIK ANDA (TIDAK ADA YANG DIHAPUS)
                            <button 
                                onClick={() => {
                                  if (!modelsLoaded) alert("Model AI sedang dimuat ke browser, tunggu sebentar...");
                                  else setIsScanning(true);
                                }} 
                                disabled={processing}
                                className={`
                                  group relative w-48 h-48 rounded-full border-8 flex flex-col items-center justify-center text-white font-bold text-2xl shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-offset-2
                                  ${!isCheckedIn 
                                    ? 'bg-indigo-600 border-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-500/30 focus:ring-indigo-500' 
                                    : 'bg-orange-500 border-orange-100 hover:bg-orange-600 hover:shadow-orange-500/30 focus:ring-orange-500'}
                                `}>
                                {processing ? (
                                    <Loader2 className="animate-spin w-10 h-10"/>
                                ) : (
                                    <>
                                        <div className="mb-2 transition-transform group-hover:-translate-y-1">
                                            {!isCheckedIn ? <MapPin size={32}/> : <LogOut size={32}/>}
                                        </div>
                                        {!isCheckedIn ? 'MASUK' : 'PULANG'}
                                        <span className="text-xs font-normal opacity-80 mt-1">Tekan untuk absen</span>
                                    </>
                                )}
                            </button>
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center w-48 h-48 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border-8 border-emerald-100 dark:border-emerald-800 animate-in zoom-in duration-300">
                            <CheckCircle size={64} className="text-emerald-500 mb-2"/>
                            <div className="font-bold text-xl text-emerald-700 dark:text-emerald-400">Selesai</div>
                            <p className="text-emerald-600/70 text-xs">Sampai jumpa!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* INFO GRID */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center gap-2 group hover:border-indigo-200 transition">
                    <span className="p-3 bg-indigo-50 dark:bg-slate-700 rounded-full text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition"><Clock size={24} /></span>
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Jam Masuk</span>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white font-mono">{jamMasuk}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center gap-2 group hover:border-orange-200 transition">
                    <span className="p-3 bg-orange-50 dark:bg-slate-700 rounded-full text-orange-600 dark:text-orange-400 group-hover:scale-110 transition"><LogOut size={24} /></span>
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Jam Pulang</span>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white font-mono">{jamPulang}</div>
                </div>
            </div>

            {/* TABEL RIWAYAT */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 md:p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <List size={18} className="text-gray-500"/> Riwayat Absensi Saya
                    </h3>
                    
                    {/* BUNGKUSAN FILTER TANGGAL */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        {/* TOMBOL CEPAT */}
                        <div className="flex bg-gray-100 dark:bg-slate-700/50 p-1 rounded-lg">
                            <button 
                                onClick={setFilterToday}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${filterDate === getJakartaDateISO(new Date()) ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                            >
                                Hari Ini
                            </button>
                            <button 
                                onClick={setFilterYesterday}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${filterDate === getJakartaDateISO(new Date(new Date().setDate(new Date().getDate() - 1))) ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                            >
                                Kemarin
                            </button>
                        </div>

                        {/* INPUT KALENDER */}
                        <div className="relative w-full md:w-auto flex-1">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Calendar size={16} className="text-gray-400"/>
                            </div>
                            <input 
                                type="date" 
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                onClick={(e) => e.target.showPicker && e.target.showPicker()} 
                                className="pl-10 pr-4 py-1.5 w-full border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 dark:text-white cursor-pointer"
                            />
                        </div>

                        {/* TOMBOL RESET */}
                        {filterDate && (
                            <button onClick={() => setFilterDate('')} className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg whitespace-nowrap transition">
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                       <thead className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 text-gray-400 uppercase text-xs font-semibold">
                          <tr>
                             <th className="p-4 pl-6">Tanggal</th>
                             <th className="p-4">Masuk</th>
                             <th className="p-4">Pulang</th>
                             <th className="p-4 pr-6">Status</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                          {filteredHistory.map((row) => (
                             <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                                <td className="p-4 pl-6 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                    {getJakartaDateISO(row.date)}
                                </td>
                                <td className="p-4 font-mono text-emerald-600">{row.check_in ? row.check_in.substring(0,5) : '-'}</td>
                                <td className="p-4 font-mono text-orange-600">{row.check_out ? row.check_out.substring(0,5) : '-'}</td>
                                <td className="p-4 pr-6">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border
                                    ${row.status === 'Terlambat' 
                                        ? 'bg-rose-50 text-rose-600 border-rose-100' 
                                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                    {row.status}
                                  </span>
                                </td>
                             </tr>
                          ))}
                          {filteredHistory.length === 0 && (
                              <tr>
                                <td colSpan="4" className="p-8 text-center text-gray-400 text-sm">
                                  {filterDate ? `Tidak ada data absensi untuk tanggal ${filterDate}` : 'Belum ada riwayat absensi.'}
                                </td>
                              </tr>
                          )}
                       </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </Layout>
  );
}