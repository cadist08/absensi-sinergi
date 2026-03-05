import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie'; 
import Layout from '../components/layout'; 
import Webcam from 'react-webcam'; 
import { 
  Sun, Moon, LogOut, Loader2, 
  Users, CheckCircle, Clock, MapPin, List, Calendar, Filter, ScanFace, FileDown, Trash2, FileText
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Menyimpan library face-api
  const [faceapi, setFaceapi] = useState(null);

  // STATE DATA
  const [attendanceHistory, setAttendanceHistory] = useState([]); 
  const [todayRecord, setTodayRecord] = useState(null); 
  const [allUsers, setAllUsers] = useState([]); 
  
  // STATE UI
  const [currentTime, setCurrentTime] = useState('');
  const [todayDateDisplay, setTodayDateDisplay] = useState('');
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({ hadir: 0, terlambat: 0 });
  
  // STATE FILTER REKAPITULASI
  const [filterDate, setFilterDate] = useState(''); 
  const [filterName, setFilterName] = useState(''); 
  const [startDate, setStartDate] = useState('');   
  const [endDate, setEndDate] = useState('');       

  // --- LOGIKA FACE RECOGNITION ---
  const webcamRef = useRef(null);
  const isDetectingRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState(''); 
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [hasRegisteredFace, setHasRegisteredFace] = useState(false); 

  useEffect(() => {
    const loadFaceApiAndModels = async () => {
      try {
        const loadedModule = await import('@vladmandic/face-api');
        const api = loadedModule.default || loadedModule;
        setFaceapi(api);

        await Promise.all([
            api.nets.tinyFaceDetector.loadFromUri('/models'),
            api.nets.faceLandmark68Net.loadFromUri('/models'),
            api.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        
        setModelsLoaded(true);
      } catch (e) {
        console.error("Gagal load model AI.", e);
      }
    };

    if (typeof window !== 'undefined') {
        loadFaceApiAndModels();
    }
  }, []);

  const handleVideoOnPlay = () => {
    const scanInterval = setInterval(async () => {
      if (!webcamRef.current || !webcamRef.current.video || !isScanning || !faceapi) return;
      if (isDetectingRef.current) return; 

      const video = webcamRef.current.video;
      if (video.readyState === 4 && video.videoWidth > 0) {
          isDetectingRef.current = true; 
          try {
              // 1. Deteksi wajah lengkap dengan Landmarks (titik wajah)
              // 1. Deteksi wajah lengkap dengan Landmarks
const detection = await faceapi.detectSingleFace(
  video, 
  new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }) 
).withFaceLandmarks().withFaceDescriptor();

if (detection) {
  const landmarks = detection.landmarks;
  const mouth = landmarks.getMouth(); 
  const nose = landmarks.getNose();
  const leftEye = landmarks.getLeftEye(); // 🌟 Titik mata kiri
  const rightEye = landmarks.getRightEye(); // 🌟 Titik mata kanan

  // 1. Cek apakah area mulut dan hidung terbuka (Anti-Masker/Tangan)
  const isFaceClear = mouth && mouth.length >= 20 && nose && nose.length >= 9;

  // 2. Cek integritas mata (Jika pakai kacamata hitam/frame tebal, landmarks sering terganggu)
  const isEyesClear = leftEye && leftEye.length >= 6 && rightEye && rightEye.length >= 6;

  // 🌟 KALIBRASI SKOR UNTUK KACAMATA 🌟
  // Naikkan sedikit ke 0.82 jika ingin kacamata lebih sulit lolos
  if (!isFaceClear || !isEyesClear || detection.detection.score < 0.82) {
      alert("⚠️ Mohon lepaskan aksesoris (Kacamata/Masker/Tangan) dan pastikan cahaya terang agar wajah terdeteksi 100%.");
      isDetectingRef.current = false;
      return; 
  }

  // Jika lolos, lanjut absen
  clearInterval(scanInterval); 
  setIsScanning(false); 
  isDetectingRef.current = false; 
  
  if (scanMode === 'register') handleSaveFaceToDB(detection.descriptor);
  else if (scanMode === 'absen') handleAbsensi(); 
} else {
                isDetectingRef.current = false; 
              }
          } catch (error) {
              isDetectingRef.current = false; 
          }
      }
    }, 500); 
  };

  const handleSaveFaceToDB = async (descriptor) => {
    setProcessing(true);
    try {
      const res = await fetch('/api/register-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, face_descriptor: JSON.stringify(Array.from(descriptor)) })
      });
      const result = await res.json();
      if (res.ok) {
        alert("📸 BERHASIL! Data wajah Anda sudah tersimpan.");
        setHasRegisteredFace(true); 
      } else {
        alert("Gagal: " + result.message);
      }
    } catch (error) {
      alert("Terjadi kesalahan saat menghubungi database.");
    } finally {
      setProcessing(false);
      setScanMode('');
    }
  };

  const deleteAttendance = async (id) => {
    if (!confirm('Hapus riwayat absensi ini secara permanen?')) return;
    try {
      const res = await fetch('/api/attendance', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        loadAttendance(user.role);
      } else {
        alert('Gagal menghapus data.');
      }
    } catch (error) {
      alert('Terjadi kesalahan sistem.');
    }
  };

  const setFilterToday = () => { setFilterDate(getJakartaDateISO(new Date())); setStartDate(''); setEndDate(''); };
  const setFilterYesterday = () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      setFilterDate(getJakartaDateISO(yesterday));
      setStartDate(''); setEndDate(''); 
  };

  const getJakartaDateISO = (dateInput = new Date()) => new Date(dateInput).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); 
  const getJakartaTimeDisplay = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '.'); 
  const getJakartaDateDisplay = () => new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    setCurrentTime(getJakartaTimeDisplay());
    setTodayDateDisplay(getJakartaDateDisplay());
    const timer = setInterval(() => {
      setCurrentTime(getJakartaTimeDisplay());
      setTodayDateDisplay(getJakartaDateDisplay());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAttendance = useCallback(async (role) => {
    try {
      const res = await fetch(`/api/attendance?t=${new Date().getTime()}`); 
      if (res.ok) {
        const data = await res.json();
        setAttendanceHistory(data);
        const todayJakarta = getJakartaDateISO(new Date()); 

        if (role === 'admin') {
           const todayData = data.filter(item => getJakartaDateISO(item.date) === todayJakarta);
           setStats({ hadir: todayData.length, terlambat: todayData.filter(i => i.status === 'Terlambat').length });
           setAllUsers([...new Set(data.map(item => item.name))]);
        } else {
           const todayData = data.find(item => getJakartaDateISO(item.date) === todayJakarta);
           setTodayRecord(todayData || null);
        }
      }
    } catch (e) { console.error("Gagal load absensi", e); }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          if (data.user && data.user.face_descriptor) {
              setHasRegisteredFace(true);
          }
          await loadAttendance(data.user.role);
        } else { router.push('/login'); }
      } catch (error) { router.push('/login'); } finally { setLoading(false); }
    };
    init();
    if (Cookies.get('theme') === 'dark') document.documentElement.classList.add('dark');
  }, [loadAttendance, router]);

  const handleAbsensi = async () => {
    setProcessing(true);
    const type = !todayRecord ? 'in' : 'out';
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) 
      });
      const result = await res.json();
      if (res.ok) { alert(result.message); await loadAttendance(user.role); } 
      else { alert(result.message); }
    } catch (e) { alert('Gagal terhubung ke server'); } 
    finally { setProcessing(false); setScanMode(''); }
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode; setIsDarkMode(newMode);
    if (newMode) { document.documentElement.classList.add('dark'); Cookies.set('theme', 'dark', { expires: 365 }); } 
    else { document.documentElement.classList.remove('dark'); Cookies.set('theme', 'light', { expires: 365 }); }
  };

  const filteredHistory = attendanceHistory.filter((row) => {
      const rowDate = getJakartaDateISO(row.date);
      if (filterDate) {
          if (filterName && row.name !== filterName) return false;
          return rowDate === filterDate;
      }
      const matchName = filterName === '' || row.name === filterName;
      const matchStart = startDate === '' || rowDate >= startDate;
      const matchEnd = endDate === '' || rowDate <= endDate;
      return matchName && matchStart && matchEnd;
  });

  // 🌟 LOGIKA STATISTIK DINAMIS (ADMIN) - DIPISAHKAN ANTARA HADIR, TEPAT WAKTU, TELAT, IZIN 🌟
  const totalHadirSemua = filteredHistory.length;
  const totalTerlambat = filteredHistory.filter((row) => row.status === 'Terlambat').length;
  const totalIzinSakit = filteredHistory.filter((row) => 
    row.status.includes('Sakit') || row.status.includes('Izin') || row.status.includes('Cuti')
  ).length;
  // Tepat Waktu adalah kehadiran fisik dikurangi keterlambatan
  const totalTepatWaktu = totalHadirSemua - totalTerlambat - totalIzinSakit;

  const labelHadir = filterDate === getJakartaDateISO(new Date()) ? 'Hadir Hari Ini' : filterDate ? 'Total Hadir' : 'Semua Kehadiran';

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;
  if (!user) return null;

  const isCutiSakit = todayRecord && (todayRecord.status.includes('Sakit') || todayRecord.status.includes('Izin') || todayRecord.status.includes('Cuti'));
  const isCheckedIn = (todayRecord && todayRecord.check_in && todayRecord.check_in !== '-') || isCutiSakit;
  const isCheckedOut = (todayRecord && todayRecord.check_out && todayRecord.check_out !== '-') || isCutiSakit;
  
  const jamMasuk = todayRecord && todayRecord.check_in && todayRecord.check_in !== '-' ? todayRecord.check_in.substring(0,5) : '--:--';
  const jamPulang = todayRecord && todayRecord.check_out && todayRecord.check_out !== '-' ? todayRecord.check_out.substring(0,5) : '--:--';

  const exportToCSV = () => {
    if (filteredHistory.length === 0) return alert("Tidak ada data untuk diexport!");
    const headers = ["Nama,Tanggal,Check In,Check Out,Status\n"];
    const rows = filteredHistory.map(row => 
      `${row.name},${getJakartaDateISO(row.date)},${row.check_in || '-'},${row.check_out || '-'},${row.status}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Absensi_${new Date().toLocaleDateString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

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
              </div>
          </div>
          
          <div className="p-6 max-w-7xl mx-auto">
            {/* 🌟 STATISTIK 4 KOTAK 🌟 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group hover:shadow-md transition">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition transform group-hover:scale-110"><Users size={80} className="text-indigo-600"/></div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">{labelHadir}</h3>
                    <p className="text-4xl font-bold text-gray-800 dark:text-white mt-2">{totalHadirSemua}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group hover:shadow-md transition">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition transform group-hover:scale-110"><CheckCircle size={80} className="text-emerald-500"/></div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">Tepat Waktu</h3>
                    <p className="text-4xl font-bold text-gray-800 dark:text-white mt-2">{totalTepatWaktu}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group hover:shadow-md transition">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition transform group-hover:scale-110"><Clock size={80} className="text-rose-500"/></div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">Terlambat</h3>
                    <p className="text-4xl font-bold text-gray-800 dark:text-white mt-2">{totalTerlambat}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group hover:shadow-md transition">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition transform group-hover:scale-110"><FileText size={80} className="text-amber-500"/></div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">Izin/Sakit</h3>
                    <p className="text-4xl font-bold text-gray-800 dark:text-white mt-2">{totalIzinSakit}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                    <List className="text-indigo-500"/> Rekapitulasi Absensi
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-slate-700/30 p-2 rounded-xl">
                      <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Karyawan</span>
                          <select value={filterName} onChange={(e) => setFilterName(e.target.value)} className="p-2 w-36 rounded-lg text-sm border dark:bg-slate-800 dark:text-white outline-none">
                              <option value="">Semua</option>
                              {allUsers.map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                      </div>
                      <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mulai</span>
                          <input type="date" value={startDate} onChange={(e) => {setStartDate(e.target.value); setFilterDate('');}} className="p-2 w-36 rounded-lg text-sm border dark:bg-slate-800 dark:text-white outline-none"/>
                      </div>
                      <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Selesai</span>
                          <input type="date" value={endDate} onChange={(e) => {setEndDate(e.target.value); setFilterDate('');}} className="p-2 w-36 rounded-lg text-sm border dark:bg-slate-800 dark:text-white outline-none"/>
                      </div>
                      <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition shadow-sm mt-4">
                          <FileDown size={16}/> Export CSV
                      </button>
                  </div>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                     <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-800 dark:text-white uppercase font-bold text-xs tracking-wider">
                        <tr>
                            <th className="p-5">Nama</th><th className="p-5">Tanggal</th><th className="p-5">Masuk</th><th className="p-5">Pulang</th><th className="p-5">Status</th><th className="p-5 text-center">Aksi</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {filteredHistory.map((row) => (
                           <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                              <td className="p-5 font-medium text-gray-900 dark:text-white whitespace-nowrap">{row.name}</td>
                              <td className="p-5 whitespace-nowrap">{getJakartaDateISO(row.date)}</td>
                              <td className="p-5 font-mono text-emerald-600">{row.check_in && row.check_in !== '-' ? row.check_in.substring(0,5) : '-'}</td>
                              <td className="p-5 font-mono text-orange-600">{row.check_out && row.check_out !== '-' ? row.check_out.substring(0,5) : '-'}</td>
                              <td className="p-5">
                                 <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 
                                    ${row.status === 'Terlambat' ? 'bg-rose-100 text-rose-600' : 
                                      row.status.includes('Sakit') || row.status.includes('Izin') || row.status.includes('Cuti') ? 'bg-amber-100 text-amber-700' : 
                                      'bg-emerald-100 text-emerald-600'}`}>
                                    {row.status}
                                 </span>
                              </td>
                              <td className="p-5 text-center">
                                 <button onClick={() => deleteAttendance(row.id)} className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition">
                                     <Trash2 size={16}/>
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors pb-10">
        <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
            <div>
                 <h1 className="text-xl font-bold text-gray-800 dark:text-white">Halo, {user.name} 👋</h1>
                 <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Calendar size={12}/> {todayDateDisplay}</p>
            </div>
            <div className="flex gap-2">
                <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:text-yellow-400 transition">
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
        </div>

        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-slate-700 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Waktu Indonesia Barat</h2>
                <div className="text-5xl md:text-7xl font-black text-gray-800 dark:text-white mb-8 font-mono tracking-wider tabular-nums">{currentTime}</div>
                
                <div className="flex justify-center flex-col items-center">
                    {!isCheckedOut ? (
                        isScanning ? (
                            <div className="relative w-full max-w-xl h-72 md:h-96 rounded-3xl border-8 border-indigo-100 dark:border-slate-700 overflow-hidden bg-black shadow-2xl flex items-center justify-center animate-in zoom-in duration-300">
                                <Webcam audio={false} ref={webcamRef} onPlay={handleVideoOnPlay} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} className="w-full h-full object-cover"/>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-48 h-56 md:w-56 md:h-72 border-4 border-white/50 border-dashed rounded-[40%]"></div></div>
                                <div className="absolute bottom-6 bg-white/95 dark:bg-slate-800/95 px-5 py-2 rounded-full text-xs font-bold text-indigo-600 dark:text-indigo-400 z-10 flex items-center gap-2 shadow-lg"><Loader2 className="animate-spin w-4 h-4"/> Memindai...</div>
                                <button onClick={() => {setIsScanning(false); setScanMode('');}} className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white text-xs px-4 py-2 rounded-full z-10 transition">Batal</button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-6">
                                {/* 🌟 LOGIKA TOMBOL DAFTAR WAJAH VS ABSEN 🌟 */}
                                {hasRegisteredFace ? (
                                  <button 
                                      onClick={() => {
                                        if (!modelsLoaded) alert("Memuat model...");
                                        else { setScanMode('absen'); setIsScanning(true); }
                                      }} 
                                      disabled={processing}
                                      className={`group relative w-48 h-48 rounded-full border-8 flex flex-col items-center justify-center text-white font-bold text-2xl shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${!isCheckedIn ? 'bg-indigo-600 border-indigo-100 hover:bg-indigo-700' : 'bg-orange-500 border-orange-100 hover:bg-orange-600'}`}>
                                      {processing ? <Loader2 className="animate-spin w-10 h-10"/> : <><div className="mb-2">{!isCheckedIn ? <MapPin size={32}/> : <LogOut size={32}/>}</div>{!isCheckedIn ? 'MASUK' : 'PULANG'}</>}
                                  </button>
                                ) : (
                                  <button 
                                      onClick={() => { if (!modelsLoaded) alert("Memuat..."); else { setScanMode('register'); setIsScanning(true); } }} 
                                      className="w-48 h-48 rounded-full border-8 bg-indigo-500 border-indigo-100 text-white font-bold flex flex-col items-center justify-center shadow-xl hover:bg-indigo-600 transition"
                                  >
                                      <ScanFace size={40} className="mb-2"/> <span className="text-sm">DAFTAR WAJAH</span>
                                  </button>
                                )}
                            </div>
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center w-48 h-48 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border-8 border-emerald-100 dark:border-emerald-800 animate-in zoom-in duration-300">
                            {isCutiSakit ? (
                                <><FileText size={48} className="text-amber-500 mb-2"/><div className="font-bold text-amber-700 dark:text-amber-400">Sedang Cuti</div></>
                            ) : (
                                <><CheckCircle size={64} className="text-emerald-500 mb-2"/><div className="font-bold text-xl text-emerald-700 dark:text-emerald-400">Selesai</div></>
                            )}
                        </div>
                    )}
                    {/* TOMBOL KE HALAMAN IZIN */}
                    {!isCheckedIn && !isScanning && (
                        <button onClick={() => router.push('/izin')} className="mt-8 flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-indigo-600 transition bg-gray-50 dark:bg-slate-700/50 px-4 py-2 rounded-xl border">
                            <FileText size={16}/> Tidak hadir? Ajukan Izin / Cuti
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border flex flex-col items-center justify-center gap-2"><span className="p-3 bg-indigo-50 dark:bg-slate-700 rounded-full text-indigo-600 dark:text-indigo-400"><Clock size={24} /></span><span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Jam Masuk</span><div className="text-2xl font-bold text-gray-800 dark:text-white font-mono">{jamMasuk}</div></div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border flex flex-col items-center justify-center gap-2"><span className="p-3 bg-orange-50 dark:bg-slate-700 rounded-full text-orange-600 dark:text-orange-400"><LogOut size={24} /></span><span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Jam Pulang</span><div className="text-2xl font-bold text-gray-800 dark:text-white font-mono">{jamPulang}</div></div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 md:p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><List size={18} className="text-gray-500"/> Riwayat Absensi Saya</h3>
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <div className="flex bg-gray-100 dark:bg-slate-700/50 p-1 rounded-lg">
                            <button onClick={setFilterToday} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${filterDate === getJakartaDateISO(new Date()) ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}>Hari Ini</button>
                            <button onClick={setFilterYesterday} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${filterDate === getJakartaDateISO(new Date(new Date().setDate(new Date().getDate() - 1))) ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}>Kemarin</button>
                        </div>
                        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="p-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"/>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                       <thead className="bg-white dark:bg-slate-800 border-b text-gray-400 uppercase text-xs font-semibold">
                         <tr><th className="p-4 pl-6">Tanggal</th><th className="p-4">Masuk</th><th className="p-4">Pulang</th><th className="p-4 pr-6">Status</th></tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {filteredHistory.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                              <td className="p-4 pl-6 font-medium text-gray-900 dark:text-white whitespace-nowrap">{getJakartaDateISO(row.date)}</td>
                              <td className="p-4 font-mono text-emerald-600">{row.check_in && row.check_in !== '-' ? row.check_in.substring(0,5) : '-'}</td>
                              <td className="p-4 font-mono text-orange-600">{row.check_out && row.check_out !== '-' ? row.check_out.substring(0,5) : '-'}</td>
                              <td className="p-4 pr-6">
                                 <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border 
                                    ${row.status === 'Terlambat' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                      row.status.includes('Sakit') || row.status.includes('Izin') || row.status.includes('Cuti') ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                      'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                    {row.status}
                                 </span>
                              </td>
                            </tr>
                        ))}
                       </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </Layout>
  );
}