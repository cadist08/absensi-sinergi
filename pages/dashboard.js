import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie'; 
import Layout from '../components/layout'; 
import Webcam from 'react-webcam'; 
import { 
  Sun, Moon, LogOut, Loader2, 
  Users, CheckCircle, Clock, MapPin, List, Calendar, ScanFace, FileDown, Trash2, FileText, Bell, X, CheckCheck, Info 
} from 'lucide-react'; 

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [faceapi, setFaceapi] = useState(null);

  const [attendanceHistory, setAttendanceHistory] = useState([]); 
  const [todayRecord, setTodayRecord] = useState(null); 
  const [allUsers, setAllUsers] = useState([]); 
  
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const [currentTime, setCurrentTime] = useState('');
  const [todayDateDisplay, setTodayDateDisplay] = useState('');
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({ hadir: 0, terlambat: 0 });
  
  const [filterDate, setFilterDate] = useState(''); 
  const [filterName, setFilterName] = useState(''); 
  const [startDate, setStartDate] = useState('');   
  const [endDate, setEndDate] = useState('');       

  const webcamRef = useRef(null);
  const isDetectingRef = useRef(false);
  const scanIntervalRef = useRef(null); 
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState(''); 
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [hasRegisteredFace, setHasRegisteredFace] = useState(false); 

  const timeAgo = (dateInput) => {
      if (!dateInput) return '';
      const date = new Date(dateInput);
      const now = new Date();
      const seconds = Math.round((now - date) / 1000);
      const minutes = Math.round(seconds / 60);
      const hours = Math.round(minutes / 60);
      const days = Math.round(hours / 24);

      if (seconds < 60) return 'Baru saja';
      if (minutes < 60) return `${minutes}m yang lalu`;
      if (hours < 24) return `${hours}j yang lalu`;
      if (days === 1) return 'Kemarin';
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const fetchNotif = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const res = await fetch(`/api/notifications?userId=${uid}`);
      if (res.ok) setNotifications(await res.json());
    } catch (e) { console.error("Gagal load notif"); }
  }, []);

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'all', userId: user.id }) });
  };

  useEffect(() => {
    return () => { if (scanIntervalRef.current) clearInterval(scanIntervalRef.current); };
  }, []);

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
      } catch (e) { console.error("Gagal load model AI.", e); }
    };
    if (typeof window !== 'undefined') loadFaceApiAndModels();
  }, []);

  const handleVideoOnPlay = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = setInterval(async () => {
      if (!webcamRef.current || !webcamRef.current.video || !isScanning || !faceapi) return;
      if (isDetectingRef.current) return; 

      const video = webcamRef.current.video;
      if (video.readyState === 4 && video.videoWidth > 0) {
          isDetectingRef.current = true; 
          try {
              const detection = await faceapi.detectSingleFace(
                video, 
                new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }) 
              ).withFaceLandmarks().withFaceDescriptor();

              if (detection) {
                const landmarks = detection.landmarks;
                const mouth = landmarks.getMouth(); 
                const nose = landmarks.getNose();
                const leftEye = landmarks.getLeftEye(); 
                const rightEye = landmarks.getRightEye(); 

                const isFaceClear = mouth && mouth.length >= 20 && nose && nose.length >= 9;
                const isEyesClear = leftEye && leftEye.length >= 6 && rightEye && rightEye.length >= 6;

                if (!isFaceClear || !isEyesClear || detection.detection.score < 0.82) {
                  console.log("Mohon lepaskan kacamata/masker");
                  isDetectingRef.current = false;
                  return; 
                }

                clearInterval(scanIntervalRef.current); 
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
      if (res.ok) { alert("📸 BERHASIL! Wajah Anda tersimpan."); setHasRegisteredFace(true); } 
      else alert("Gagal: " + result.message);
    } catch (error) { alert("Kesalahan database."); } 
    finally { setProcessing(false); setScanMode(''); }
  };

  const deleteAttendance = async (id) => {
    if (!confirm('Hapus riwayat absensi ini?')) return;
    try {
      const res = await fetch('/api/attendance', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
      });
      if (res.ok) loadAttendance(user.role);
    } catch (error) { alert('Kesalahan sistem.'); }
  };

  const setFilterToday = () => { setFilterDate(getJakartaDateISO(new Date())); setStartDate(''); setEndDate(''); };
  const setFilterYesterday = () => {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      setFilterDate(getJakartaDateISO(yesterday)); setStartDate(''); setEndDate(''); 
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
    if (!user || !user.id) return;

    try {
      const resAtt = await fetch('/api/attendance');
      const dataAtt = await resAtt.json();
      setAttendanceHistory(dataAtt);
      const todayJakarta = getJakartaDateISO(new Date()); 

      if (role === 'admin') {
         const todayData = dataAtt.filter(item => getJakartaDateISO(item.date) === todayJakarta);
         setStats({ hadir: todayData.length, terlambat: todayData.filter(i => i.status === 'Terlambat').length });
         const uniqueUsers = [...new Set(dataAtt.map(item => item.name))].filter(Boolean);
         setAllUsers(uniqueUsers);
      } else {
         const todayData = dataAtt.find(item => getJakartaDateISO(item.date) === todayJakarta);
         setTodayRecord(todayData || null);
      }
    } catch (e) { console.error("Gagal load data", e); }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          if (data.user?.face_descriptor) setHasRegisteredFace(true);
          fetchNotif(data.user.id);
        } else router.push('/login'); 
      } catch (error) { router.push('/login'); } 
      finally { setLoading(false); }
    };
    init();
    if (Cookies.get('theme') === 'dark') document.documentElement.classList.add('dark');
  }, [router, fetchNotif]);

  useEffect(() => { if (user?.id) loadAttendance(user.role); }, [user, loadAttendance]);

  const handleAbsensi = async () => {
    setProcessing(true);
    const type = !todayRecord || todayRecord.check_in === '-' || todayRecord.check_in === null ? 'in' : 'out';
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) 
      });
      const result = await res.json();
      if (res.ok) { alert(result.message); await loadAttendance(user.role); } 
      else alert(result.message); 
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

  const totalHadirSemua = filteredHistory.length;
  const totalTerlambat = filteredHistory.filter((row) => row.status === 'Terlambat').length;
  const totalIzinSakit = filteredHistory.filter((row) => 
    row.status && (row.status.includes('Sakit') || row.status.includes('Izin') || row.status.includes('Cuti'))
  ).length;
  const totalTepatWaktu = totalHadirSemua - totalTerlambat - totalIzinSakit;

  const labelHadir = filterDate === getJakartaDateISO(new Date()) ? 'Hadir Hari Ini' : filterDate ? 'Total Hadir' : 'Semua Kehadiran';

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 transition-colors duration-300"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;
  if (!user) return null;

  const isIzinHalfDay = todayRecord?.status?.includes('(Setengah Hari)');
  const isCutiSakitFull = todayRecord?.status && (todayRecord.status.includes('Sakit') || todayRecord.status.includes('Izin') || todayRecord.status.includes('Cuti')) && !isIzinHalfDay;

  const isCheckedIn = (todayRecord && todayRecord.check_in && todayRecord.check_in !== '-') || isCutiSakitFull;
  const isCheckedOut = (todayRecord && todayRecord.check_out && todayRecord.check_out !== '-') || isCutiSakitFull || isIzinHalfDay; 
  
  const jamMasuk = isCutiSakitFull ? 'IZIN' : (todayRecord && todayRecord.check_in && todayRecord.check_in !== '-' ? todayRecord.check_in.substring(0,5) : '--:--');
  const jamPulang = (isIzinHalfDay || isCutiSakitFull) ? 'IZIN' : (todayRecord && todayRecord.check_out && todayRecord.check_out !== '-' ? todayRecord.check_out.substring(0,5) : '--:--');

  const exportToCSV = () => {
    if (filteredHistory.length === 0) return alert("Tidak ada data untuk diexport!");
    const headers = "Nama,Tanggal,Check In,Check Out,Status\n";
    const rows = filteredHistory.map(row => {
        const rowIsHalf = row.status?.includes('(Setengah Hari)');
        const rowIsFull = row.status && (row.status.includes('Sakit') || row.status.includes('Izin') || row.status.includes('Cuti')) && !rowIsHalf;
        
        const csvCheckIn = rowIsFull ? 'IZIN' : (row.check_in || '-');
        const csvCheckOut = (rowIsHalf || rowIsFull) ? 'IZIN' : (row.check_out || '-');
        
        return `${row.name},${getJakartaDateISO(row.date)},${csvCheckIn},${csvCheckOut},${row.status}`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Absensi_${new Date().toLocaleDateString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const TableRow = ({ row }) => {
    const isRowHalf = row.status?.includes('(Setengah Hari)');
    const isRowFull = row.status && (row.status.includes('Sakit') || row.status.includes('Izin') || row.status.includes('Cuti')) && !isRowHalf;
    
    const displayCheckIn = isRowFull ? 'IZIN' : (row.check_in && row.check_in !== '-' ? row.check_in.substring(0,5) : '-');
    const displayCheckOut = (isRowHalf || isRowFull) ? 'IZIN' : (row.check_out && row.check_out !== '-' ? row.check_out.substring(0,5) : '-');

    return (
      <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
        {user.role === 'admin' && (
            <td className="p-4 md:p-5 font-medium text-gray-900 dark:text-white whitespace-nowrap">{row.name}</td>
        )}
        <td className="p-4 md:p-5 whitespace-nowrap text-gray-700 dark:text-gray-300">{getJakartaDateISO(row.date)}</td>
        <td className="p-4 md:p-5 font-mono text-emerald-600 dark:text-emerald-400">{displayCheckIn}</td>
        <td className="p-4 md:p-5 font-mono text-orange-600 dark:text-orange-400">{displayCheckOut}</td>
        <td className="p-4 md:p-5">
           <span className={`px-2 md:px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 
              ${row.status === 'Terlambat' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 
                (isRowFull || isRowHalf) ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
              {row.status}
           </span>
        </td>
        {user.role === 'admin' && (
          <td className="p-4 md:p-5 text-center">
             <button onClick={() => deleteAttendance(row.id)} className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-500 dark:hover:text-white rounded-lg transition-colors">
                 <Trash2 size={16}/>
             </button>
          </td>
        )}
      </tr>
    );
  };

  return (
    <Layout>
      <div className="min-h-[100dvh] bg-gray-50 dark:bg-slate-900 transition-colors duration-300 pb-10">
        
        {/* HEADER ATAS - Responsif Flex-Wrap */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center sticky top-0 z-10 shadow-sm transition-colors duration-300 gap-4 sm:gap-0">
            <div>
                {user.role === 'admin' ? (
                  <>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <Users className="text-indigo-600 dark:text-indigo-400 w-5 h-5 md:w-6 md:h-6"/> Dashboard Admin
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Monitoring Absensi Real-time (WIB)</p>
                  </>
                ) : (
                  <>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white transition-colors">Halo, {user.name} 👋</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 transition-colors"><Calendar size={12}/> {todayDateDisplay}</p>
                  </>
                )}
            </div>
            
            <div className="flex items-center justify-end w-full sm:w-auto gap-3">
                {/* BLOK UI NOTIFIKASI */}
                <div className="relative z-50">
                  <button onClick={() => setShowNotif(!showNotif)} className="p-2 relative rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-200 transition-colors">
                    <Bell size={20} />
                    {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-bounce font-bold shadow-sm">{unreadCount}</span>}
                  </button>

                  {showNotif && (
                    <div className="absolute right-0 mt-3 w-[300px] sm:w-80 md:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden z-[110] animate-in slide-in-from-top-2 duration-200">
                      <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/80 dark:bg-slate-800/80 backdrop-blur-sm">
                        <span className="font-bold text-gray-800 dark:text-white flex items-center gap-2">Notifikasi</span>
                        <div className="flex items-center gap-3">
                          {unreadCount > 0 && (
                              <button onClick={markAllAsRead} className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 transition-colors">
                                  <CheckCheck size={14}/> Tandai dibaca
                              </button>
                          )}
                          <button onClick={() => setShowNotif(false)} className="text-gray-400 hover:text-rose-500 transition-colors"><X size={16}/></button>
                        </div>
                      </div>
                      
                      <div className="max-h-[350px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {notifications.length === 0 ? (
                            <div className="p-10 flex flex-col items-center justify-center text-gray-400">
                                <Bell size={40} className="mb-3 opacity-20"/>
                                <span className="text-sm italic">Belum ada notifikasi</span>
                            </div>
                        ) : 
                        notifications.map(n => (
                          <div key={n.id} onClick={() => markAsRead(n.id)} className={`relative p-4 border-b dark:border-slate-700/50 cursor-pointer transition-colors flex gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 ${!n.is_read ? 'bg-indigo-50/40 dark:bg-indigo-900/20' : ''}`}>
                            {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full"></div>}
                            
                            <div className={`mt-1 p-2 rounded-full h-fit flex-shrink-0 ${n.title.toLowerCase().includes('disetujui') ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : n.title.toLowerCase().includes('ditolak') ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                                {n.title.toLowerCase().includes('disetujui') ? <CheckCircle size={14}/> : n.title.toLowerCase().includes('ditolak') ? <X size={14}/> : <Info size={14}/>}
                            </div>
                            
                            <div className="flex-1 pr-2">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-0.5 sm:gap-0">
                                <span className={`text-sm font-bold leading-tight ${!n.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{n.title}</span>
                                <span className="text-[10px] text-gray-400 whitespace-nowrap font-medium">{timeAgo(n.created_at)}</span>
                              </div>
                              <p className={`text-xs leading-relaxed line-clamp-2 mt-1 sm:mt-0 ${!n.is_read ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>{n.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-yellow-400 transition-colors">
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>
        </div>

        {/* --- KONTEN BERDASARKAN ROLE --- */}
        {user.role === 'admin' ? (
            <div className="p-4 md:p-6 max-w-7xl mx-auto">
              {/* GRID STATISTIK - Responsif HP, Tablet, Desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                  <div className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                      <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Users size={60} className="text-indigo-600 dark:text-indigo-400 md:w-20 md:h-20"/></div>
                      <h3 className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium uppercase tracking-wider">{labelHadir}</h3>
                      <p className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mt-1 md:mt-2">{totalHadirSemua}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                      <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><CheckCircle size={60} className="text-emerald-500 dark:text-emerald-400 md:w-20 md:h-20"/></div>
                      <h3 className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium uppercase tracking-wider">Tepat Waktu</h3>
                      <p className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mt-1 md:mt-2">{totalTepatWaktu}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                      <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Clock size={60} className="text-rose-500 dark:text-rose-400 md:w-20 md:h-20"/></div>
                      <h3 className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium uppercase tracking-wider">Terlambat</h3>
                      <p className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mt-1 md:mt-2">{totalTerlambat}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                      <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><FileText size={60} className="text-amber-500 dark:text-amber-400 md:w-20 md:h-20"/></div>
                      <h3 className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium uppercase tracking-wider">Izin/Sakit</h3>
                      <p className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mt-1 md:mt-2">{totalIzinSakit}</p>
                  </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
                  <div className="p-4 md:p-6 border-b border-gray-100 dark:border-slate-700 flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-white dark:bg-slate-800">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                      <List className="text-indigo-500 dark:text-indigo-400"/> Rekapitulasi Absensi
                    </h3>
                    
                    {/* FILTER ADMIN - Memanjang di HP */}
                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 md:gap-3 bg-gray-50 dark:bg-slate-900/50 p-2 rounded-xl border border-gray-100 dark:border-slate-700">
                        <select value={filterName} onChange={(e) => setFilterName(e.target.value)} className="p-2.5 sm:p-2 w-full sm:w-32 rounded-lg text-sm border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"><option value="">Semua Nama</option>{allUsers.map(n => <option key={n} value={n}>{n}</option>)}</select>
                        <input type="date" value={startDate} onChange={(e) => {setStartDate(e.target.value); setFilterDate('');}} className="p-2.5 sm:p-2 w-full sm:w-32 rounded-lg text-sm border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"/>
                        <input type="date" value={endDate} onChange={(e) => {setEndDate(e.target.value); setFilterDate('');}} className="p-2.5 sm:p-2 w-full sm:w-32 rounded-lg text-sm border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"/>
                        <button onClick={exportToCSV} className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm">
                            <FileDown size={16}/> Export CSV
                        </button>
                    </div>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                       <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-800 dark:text-gray-200 uppercase font-bold text-[10px] md:text-xs tracking-wider border-b border-gray-200 dark:border-slate-700">
                          <tr><th className="p-4 md:p-5 whitespace-nowrap">Nama</th><th className="p-4 md:p-5 whitespace-nowrap">Tanggal</th><th className="p-4 md:p-5">Masuk</th><th className="p-4 md:p-5">Pulang</th><th className="p-4 md:p-5">Status</th><th className="p-4 md:p-5 text-center">Aksi</th></tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                          {filteredHistory.map((row) => <TableRow key={row.id} row={row} />)}
                          {filteredHistory.length === 0 && (<tr><td colSpan="6" className="p-10 text-center text-gray-400 italic">Data absensi tidak ditemukan.</td></tr>)}
                       </tbody>
                    </table>
                 </div>
              </div>
            </div>
        ) : (
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 md:space-y-8">
              {/* KARTU JAM & WEBCAM */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-slate-700 text-center relative overflow-hidden transition-colors duration-300">
                  <div className="absolute top-0 left-0 w-full h-1 md:h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                  <h2 className="text-xs md:text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 md:mb-4 transition-colors">Waktu Indonesia Barat</h2>
                  <div className="text-4xl sm:text-5xl md:text-7xl font-black text-gray-800 dark:text-white mb-6 md:mb-8 font-mono tracking-wider tabular-nums transition-colors">{currentTime}</div>
                  
                  <div className="flex justify-center flex-col items-center w-full">
                      {!isCheckedOut ? (
                          isScanning ? (
                              <div className="relative w-full max-w-xl aspect-[3/4] sm:aspect-square md:aspect-video rounded-2xl md:rounded-3xl border-4 md:border-8 border-indigo-100 dark:border-slate-700 overflow-hidden bg-black shadow-2xl flex items-center justify-center animate-in zoom-in duration-300">
                                  <Webcam audio={false} ref={webcamRef} onPlay={handleVideoOnPlay} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} className="w-full h-full object-cover"/>
                                  
                                  {/* Ring Pemindai Adaptif HP */}
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <div className="w-[60%] h-[50%] md:w-56 md:h-72 border-2 md:border-4 border-white/60 border-dashed rounded-[40%] animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.5)]"></div>
                                  </div>
                                  
                                  <div className="absolute bottom-4 md:bottom-6 bg-white/95 dark:bg-slate-800/95 px-4 md:px-5 py-2 rounded-full text-[10px] md:text-xs font-bold text-indigo-600 dark:text-indigo-400 z-10 flex items-center gap-2 shadow-lg backdrop-blur-sm border border-gray-200 dark:border-slate-600"><Loader2 className="animate-spin w-3 h-3 md:w-4 md:h-4"/> Memindai Wajah...</div>
                                  <button onClick={() => { setIsScanning(false); setScanMode(''); if (scanIntervalRef.current) clearInterval(scanIntervalRef.current); }} className="absolute top-3 right-3 md:top-4 md:right-4 bg-rose-500/90 hover:bg-rose-600 text-white text-[10px] md:text-xs px-3 md:px-4 py-1.5 md:py-2 rounded-full z-10 transition-colors backdrop-blur-sm shadow-md">Batal</button>
                              </div>
                          ) : (
                              <div className="flex flex-col items-center gap-4 md:gap-6">
                                  {hasRegisteredFace ? (
                                    <button onClick={() => { if (!modelsLoaded) alert("Memuat model AI, harap tunggu..."); else { setScanMode('absen'); setIsScanning(true); } }} disabled={processing} className={`group relative w-36 h-36 md:w-48 md:h-48 rounded-full border-[6px] md:border-8 flex flex-col items-center justify-center text-white font-bold text-xl md:text-2xl shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${!isCheckedIn ? 'bg-indigo-600 border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-700' : 'bg-orange-500 border-orange-100 dark:border-orange-900/50 hover:bg-orange-600'}`}>
                                        {processing ? <Loader2 className="animate-spin w-8 h-8 md:w-10 md:h-10"/> : <><div className="mb-1 md:mb-2 group-hover:-translate-y-1 transition-transform">{!isCheckedIn ? <MapPin className="w-6 h-6 md:w-8 md:h-8"/> : <LogOut className="w-6 h-6 md:w-8 md:h-8"/>}</div>{!isCheckedIn ? 'MASUK' : 'PULANG'}</>}
                                    </button>
                                  ) : (
                                    <button onClick={() => { if (!modelsLoaded) alert("Memuat model AI, harap tunggu..."); else { setScanMode('register'); setIsScanning(true); } }} className="w-36 h-36 md:w-48 md:h-48 rounded-full border-[6px] md:border-8 bg-indigo-500 border-indigo-100 dark:border-indigo-900/50 text-white font-bold flex flex-col items-center justify-center shadow-xl transition-all hover:scale-105 hover:bg-indigo-600 group">
                                        <ScanFace className="w-8 h-8 md:w-10 md:h-10 mb-1 md:mb-2 group-hover:rotate-12 transition-transform"/> <span className="text-xs md:text-sm">DAFTAR WAJAH</span>
                                    </button>
                                  )}
                              </div>
                          )
                      ) : (
                          <div className="flex flex-col items-center justify-center w-36 h-36 md:w-48 md:h-48 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border-[6px] md:border-8 border-emerald-100 dark:border-emerald-900/50 animate-in zoom-in duration-300 shadow-lg">
                              {isCutiSakitFull ? (
                                  <><FileText className="w-10 h-10 md:w-12 md:h-12 text-amber-500 dark:text-amber-400 mb-1 md:mb-2"/><div className="font-bold text-amber-700 dark:text-amber-400 text-center leading-tight text-xs md:text-base">Sedang Izin<br/>(Seharian)</div></>
                              ) : isIzinHalfDay ? (
                                  <><LogOut className="w-10 h-10 md:w-12 md:h-12 text-orange-500 dark:text-orange-400 mb-1 md:mb-2"/><div className="font-bold text-orange-700 dark:text-orange-400 text-center leading-tight text-xs md:text-base">Selesai<br/><span className="text-[10px] md:text-xs font-normal">(Setengah Hari)</span></div></>
                              ) : (
                                  <><CheckCircle className="w-12 h-12 md:w-16 md:h-16 text-emerald-500 dark:text-emerald-400 mb-1 md:mb-2"/><div className="font-bold text-lg md:text-xl text-emerald-700 dark:text-emerald-400">Selesai</div></>
                              )}
                          </div>
                      )}
                      
                      {/* Tombol Ajukan Izin - Lebar Penuh di HP */}
                      {!isCheckedIn && !isScanning && (
                          <button onClick={() => router.push('/izin')} className="mt-6 md:mt-8 flex items-center justify-center gap-2 text-xs md:text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 px-5 py-3 md:py-2.5 rounded-full border border-gray-200 dark:border-slate-700 transition-colors shadow-sm w-full max-w-xs"><FileText size={16}/> Tidak hadir? Ajukan Izin</button>
                      )}
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-1.5 md:gap-2 group">
                    <span className="p-2.5 md:p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform"><Clock className="w-5 h-5 md:w-6 md:h-6" /></span>
                    <span className="text-gray-400 dark:text-gray-500 text-[10px] md:text-xs uppercase font-semibold tracking-wider text-center">Jam Masuk</span>
                    <div className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white font-mono">{jamMasuk}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-1.5 md:gap-2 group">
                    <span className="p-2.5 md:p-3 bg-orange-50 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform"><LogOut className="w-5 h-5 md:w-6 md:h-6" /></span>
                    <span className="text-gray-400 dark:text-gray-500 text-[10px] md:text-xs uppercase font-semibold tracking-wider text-center">Jam Pulang</span>
                    <div className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white font-mono">{jamPulang}</div>
                  </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
                  <div className="p-4 md:p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <h3 className="font-bold text-base md:text-lg text-gray-800 dark:text-white flex items-center gap-2"><List className="w-4 h-4 md:w-5 md:h-5 text-indigo-500 dark:text-indigo-400"/> Riwayat Absensi</h3>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-lg border border-gray-200 dark:border-slate-700 w-full sm:w-auto">
                              <button onClick={setFilterToday} className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-all ${filterDate === getJakartaDateISO(new Date()) ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Hari Ini</button>
                              <button onClick={setFilterYesterday} className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-all ${filterDate === getJakartaDateISO(new Date(new Date().setDate(new Date().getDate() - 1))) ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Kemarin</button>
                          </div>
                      </div>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                         <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 uppercase text-[10px] md:text-xs font-semibold tracking-wider">
                           <tr><th className="p-4 whitespace-nowrap">Tanggal</th><th className="p-4">Masuk</th><th className="p-4">Pulang</th><th className="p-4">Status</th></tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                          {filteredHistory.map((row) => <TableRow key={row.id} row={row} />)}
                          {filteredHistory.length === 0 && (<tr><td colSpan="4" className="p-10 text-center text-gray-400 italic">Belum ada riwayat absensi.</td></tr>)}
                         </tbody>
                      </table>
                  </div>
              </div>
            </div>
        )}

      </div>
    </Layout>
  );
}