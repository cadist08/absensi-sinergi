import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout'; 
import { FileText, ArrowLeft, Loader2, Send, CheckCircle, Calendar, Check, X, Clock, List, Edit2, Trash2, Save, UploadCloud, Eye, Download, Info } from 'lucide-react';

export default function PengajuanIzin() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [masterLeaveTypes, setMasterLeaveTypes] = useState([]);
  const [form, setForm] = useState({ type: '', duration: 'full_day', start_date: '', end_date: '', reason: '', file_bukti: '' });
  const [fileName, setFileName] = useState('');
  const [editModal, setEditModal] = useState({ show: false, data: {} });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [sisaCuti, setSisaCuti] = useState(0);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewImageModal, setViewImageModal] = useState({ show: false, src: '' });

  const todayDateOnly = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

  const calculateWorkingDays = (startDate, endDate, duration) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    
    if (duration === 'half_day_late' || duration === 'half_day_early') return 0.5;

    let count = 0;
    let currentDate = new Date(start);
    while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { count++; }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return count;
  };

  useEffect(() => {
    if ((form.duration === 'half_day_late' || form.duration === 'half_day_early') && form.start_date) {
      setForm(prev => ({ ...prev, end_date: prev.start_date }));
    }
  }, [form.duration, form.start_date]);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setSisaCuti(data.user.sisa_cuti !== undefined && data.user.sisa_cuti !== null ? data.user.sisa_cuti : 12);
          await fetchMasterLeaveTypes();
          if (data.user.role === 'admin') fetchLeaveRequests();
          else fetchLeaveRequests(data.user.id);
        } else { router.push('/login'); }
      } catch (error) { router.push('/login'); } finally { setLoading(false); }
    };
    init();
  }, [router]);

  const fetchMasterLeaveTypes = async () => {
      try {
          const res = await fetch('/api/leave-types');
          if (res.ok) {
              const types = await res.json();
              setMasterLeaveTypes(types);
              if (types.length > 0) setForm(prev => ({ ...prev, type: types[0].name }));
          }
      } catch (error) { console.error("Gagal load master izin"); }
  };

  const fetchLeaveRequests = async (userId = null) => {
    try {
      const url = userId ? `/api/leaves?userId=${userId}` : '/api/leaves';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLeaveRequests(data);
      }
    } catch (error) { console.error("Gagal load leaves"); }
  };

  const selectedLeaveRule = masterLeaveTypes.find(t => t.name === form.type);
  const selectedEditRule = editModal.show ? masterLeaveTypes.find(t => t.name === editModal.data.type) : null;

  const handleFileChange = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return alert("Ukuran file maksimal 5MB!");
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) setEditModal({ ...editModal, data: { ...editModal.data, file_bukti: reader.result } });
        else { setFileName(file.name); setForm({ ...form, file_bukti: reader.result }); }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await fetch('/api/izin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, ...form })
      });
      if (res.ok) {
        setSuccess(true);
        fetchLeaveRequests(user.id);
        setTimeout(() => { 
            setSuccess(false); 
            setForm({ type: masterLeaveTypes[0]?.name || '', duration: 'full_day', start_date: '', end_date: '', reason: '', file_bukti: '' });
            setFileName('');
        }, 3000);
      } else { 
          const result = await res.json();
          alert(result.message); 
      }
    } catch (error) { alert("Gagal mengirim."); } finally { setProcessing(false); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, ...editModal.data })
      });
      if (res.ok) {
        alert("Berhasil diperbarui!"); setEditModal({ show: false, data: {} }); fetchLeaveRequests(user.id);
      } else { const result = await res.json(); alert(result.message); }
    } catch (error) { alert("Terjadi kesalahan sistem."); } finally { setProcessing(false); }
  };

  const handleApproval = async (id, newStatus) => {
    if(!confirm(`Yakin ingin ${newStatus} pengajuan ini?`)) return;
    try {
      const res = await fetch('/api/leaves', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: newStatus }) });
      if (res.ok) { fetchLeaveRequests(); } else { alert("Gagal mengubah status."); }
    } catch (error) { alert("Terjadi kesalahan."); }
  };

  const handleDelete = async (id) => {
      if(!confirm('Yakin ingin menghapus permanen?')) return;
      try {
          const res = await fetch('/api/leaves', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, role: user.role }) });
          if (res.ok) fetchLeaveRequests(user.role === 'admin' ? null : user.id); 
      } catch (error) { alert('Terjadi kesalahan.'); }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  
  const formatInputDate = (dateString) => {
      if (!dateString) return '';
      try {
          return new Date(dateString).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      } catch (e) {
          return '';
      }
  };

  const exportToCSV = () => {
      const filteredData = leaveRequests.filter(row => {
          const monthMatch = filterMonth ? row.start_date.startsWith(filterMonth) : true;
          const statusMatch = filterStatus ? row.status === filterStatus : true;
          return monthMatch && statusMatch;
      });
      if (filteredData.length === 0) return alert("Tidak ada data untuk diexport!");
      const headers = ["Nama,Jenis,Durasi,Tanggal Mulai,Tanggal Selesai,Alasan,Status\n"];
      const rows = filteredData.map(r => {
        const durasiLabel = r.duration === 'half_day_late' ? 'Datang Terlambat' : r.duration === 'half_day_early' ? 'Pulang Cepat' : 'Seharian';
        return `${r.name},${r.type},${durasiLabel},${r.start_date.split('T')[0]},${r.end_date.split('T')[0]},${r.reason.replace(/,/g, ' ')},${r.status}`;
      }).join("\n");
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Laporan_Cuti_${new Date().getTime()}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 transition-colors duration-300"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;
  if (!user) return null;

  const filteredRequests = leaveRequests.filter(row => {
      const monthMatch = filterMonth ? row.start_date.startsWith(filterMonth) : true;
      const statusMatch = filterStatus ? row.status === filterStatus : true;
      return monthMatch && statusMatch;
  });

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 pb-10 py-6 px-4">
        <div className={`mx-auto space-y-6 ${user.role === 'admin' ? 'max-w-7xl' : 'max-w-4xl'}`}>
          
          <button 
             onClick={() => router.push('/dashboard')} 
             className="group flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow-md transition-all hover:-translate-x-1 w-fit"
          >
             <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
             Kembali ke Dashboard
          </button>

          {/* AREA KARYAWAN: FORM PENGAJUAN */}
          {user.role !== 'admin' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div className="flex gap-4 items-center">
                       <div className="p-3.5 bg-white/20 rounded-2xl backdrop-blur-sm shadow-inner"><FileText size={28} /></div>
                       <div>
                          <h1 className="text-2xl font-extrabold tracking-tight">Pengajuan Izin / Cuti</h1>
                          <p className="text-indigo-100 text-sm mt-1 font-medium">Lengkapi formulir di bawah ini dengan benar.</p>
                       </div>
                   </div>
                   <div className="px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-sm">
                      <span className="text-xs uppercase tracking-wider font-semibold opacity-80">Sisa Cuti Tahunan</span>
                      <div className="text-xl font-black text-yellow-300">{sisaCuti} Hari</div>
                   </div>
                </div>

                {success ? (
                   <div className="p-16 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in duration-300">
                      <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-2"><CheckCircle size={40} /></div>
                      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Berhasil Dikirim!</h2>
                      <p className="text-gray-500 dark:text-gray-400">Pengajuan Anda saat ini berstatus <span className="font-bold text-orange-500">Pending</span> menunggu persetujuan HRD.</p>
                   </div>
                ) : (
                   <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Jenis Pengajuan</label>
                            <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none font-medium focus:ring-2 focus:ring-indigo-500 transition-all">
                                {masterLeaveTypes.map(type => (
                                    <option key={type.id} value={type.name}>{type.name}</option>
                                ))}
                            </select>
                            
                            {selectedLeaveRule?.is_deduct_leave === 1 && (
                                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-1"><Info size={14}/> Memotong saldo cuti tahunan.</p>
                            )}
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durasi Izin</label>
                            <select value={form.duration} onChange={(e) => setForm({...form, duration: e.target.value})} className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none font-medium focus:ring-2 focus:ring-indigo-500 transition-all">
                                <option value="full_day">Seharian Penuh (Full Day)</option>
                                <option value="half_day_late">Setengah Hari (Datang Terlambat)</option>
                                <option value="half_day_early">Setengah Hari (Pulang Cepat)</option>
                            </select>
                         </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1"><Calendar size={14}/> Dari Tanggal</label>
                            <input type="date" required min={todayDateOnly} value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none text-sm focus:ring-2 focus:ring-indigo-500 transition-all"/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1"><Calendar size={14}/> Sampai Tanggal</label>
                            <input type="date" required disabled={form.duration === 'half_day_late' || form.duration === 'half_day_early'} min={form.start_date || todayDateOnly} value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none text-sm disabled:opacity-50 focus:ring-2 focus:ring-indigo-500 transition-all"/>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alasan Lengkap</label>
                        <textarea required rows="3" placeholder="Jelaskan alasan Anda secara singkat..." value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none resize-none transition-all focus:ring-2 focus:ring-indigo-500"></textarea>
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            Lampiran Bukti
                            {selectedLeaveRule?.requires_attachment === 1 ? <span className="text-rose-500 ml-1">(Wajib)</span> : <span className="text-gray-400 ml-1">(Opsional)</span>}
                        </label>
                        <div className="relative">
                            <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
                            <div className={`w-full p-5 border-2 border-dashed rounded-2xl flex items-center justify-center gap-3 transition-colors ${selectedLeaveRule?.requires_attachment === 1 && !fileName ? 'border-rose-300 bg-rose-50 text-rose-500 dark:bg-rose-900/10 dark:border-rose-800' : 'border-gray-300 dark:border-slate-600 text-gray-500 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
                                <UploadCloud size={24} className={fileName ? "text-indigo-500" : ""}/>
                                <span className="text-sm font-medium truncate max-w-[250px]">{fileName || "Klik atau Seret file ke sini (Maks 5MB)"}</span>
                            </div>
                        </div>
                     </div>

                     {form.start_date && form.end_date && (
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl flex items-center justify-between text-indigo-800 dark:text-indigo-300 transition-all animate-in fade-in duration-300">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-800/50 rounded-lg text-indigo-600 dark:text-indigo-400"><Calendar size={20}/></div>
                                <span className="text-sm font-bold">Total Hari Diajukan:</span>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-black">{calculateWorkingDays(form.start_date, form.end_date, form.duration)} Hari</span>
                                <div className="text-[10px] opacity-80 mt-0.5 font-medium">Sabtu & Minggu tidak dihitung</div>
                            </div>
                        </div>
                     )}

                     <button type="submit" disabled={processing} className="w-full py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all flex justify-center gap-2 disabled:bg-indigo-400 disabled:shadow-none mt-4 text-lg">
                        {processing ? <Loader2 size={24} className="animate-spin"/> : <><Send size={20} /> Kirim Pengajuan Sekarang</>}
                     </button>
                   </form>
                )}
              </div>
          )}

          {/* TABEL RIWAYAT / APPROVAL */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden mt-8 transition-colors duration-300">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400"><List size={20} /></div>
                    <h3 className="font-bold text-gray-800 dark:text-white">{user.role === 'admin' ? 'Pusat Approval Izin & Cuti' : 'Riwayat Pengajuan Saya'}</h3>
                </div>
                
                {user.role === 'admin' && (
                    <div className="flex flex-wrap items-center gap-2 bg-gray-100 dark:bg-slate-900/50 p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 w-full md:w-auto">
                        <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="p-2 w-full md:w-auto rounded-lg text-sm border-none bg-white dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"/>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="p-2 w-full md:w-auto rounded-lg text-sm border-none bg-white dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                            <option value="">Semua Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                        <button onClick={exportToCSV} className="flex-1 md:flex-none flex justify-center items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"><Download size={16}/> Export</button>
                    </div>
                )}
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                   <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400 uppercase font-bold text-xs tracking-wider border-b border-gray-100 dark:border-slate-700">
                     <tr>
                        {user.role === 'admin' && <th className="p-5 pl-6">Nama Karyawan</th>}
                        <th className={`p-5 ${user.role !== 'admin' ? 'pl-6' : ''}`}>Tanggal</th>
                        <th className="p-5">Jenis</th>
                        <th className="p-5">Alasan</th>
                        <th className="p-5 text-center">Bukti</th>
                        <th className="p-5 text-center">Status</th>
                        <th className="p-5 pr-6 text-center">Aksi</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {filteredRequests.map((row) => (
                         <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                            {user.role === 'admin' && <td className="p-5 pl-6 font-bold text-gray-900 dark:text-white whitespace-nowrap">{row.name}</td>}
                            <td className={`p-5 whitespace-nowrap text-xs ${user.role !== 'admin' ? 'pl-6' : ''}`}>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{formatDate(row.start_date)}</span> 
                                <span className="mx-1 text-gray-400">s/d</span> <br className="md:hidden"/>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{formatDate(row.end_date)}</span>
                            </td>
                            <td className="p-5 font-bold text-indigo-600 dark:text-indigo-400">
                                {row.type}
                                {row.duration === 'half_day_late' && <span className="block text-[10px] font-semibold text-blue-500 mt-0.5">(Datang Terlambat)</span>}
                                {row.duration === 'half_day_early' && <span className="block text-[10px] font-semibold text-orange-500 mt-0.5">(Pulang Cepat)</span>}
                            </td>
                            <td className="p-5 max-w-[150px] truncate" title={row.reason}>{row.reason}</td>
                            <td className="p-5 text-center">
                                {row.file_bukti ? <button onClick={() => setViewImageModal({ show: true, src: row.file_bukti })} className="p-2 text-indigo-500 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded-lg transition mx-auto shadow-sm"><Eye size={16}/></button> : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="p-5 text-center">
                               <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 
                                   ${row.status === 'Pending' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 
                                     row.status === 'Approved' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                                     'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                   {row.status === 'Pending' && <Clock size={12}/>}
                                   {row.status === 'Approved' && <Check size={12}/>}
                                   {row.status === 'Rejected' && <X size={12}/>}
                                   {row.status}
                               </span>
                            </td>
                            <td className="p-5 pr-6 text-center">
                                {user.role === 'admin' ? (
                                    <div className="flex justify-center gap-2">
                                        {row.status === 'Pending' && (
                                            <>
                                                <button onClick={() => handleApproval(row.id, 'Approved')} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-900/20 dark:hover:bg-emerald-600 rounded-lg transition" title="Setujui"><Check size={16}/></button>
                                                <button onClick={() => handleApproval(row.id, 'Rejected')} className="p-2 bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white dark:bg-orange-900/20 dark:hover:bg-orange-600 rounded-lg transition" title="Tolak"><X size={16}/></button>
                                            </>
                                        )}
                                        <button onClick={() => handleDelete(row.id)} className="p-2 bg-gray-50 text-gray-500 hover:bg-rose-500 hover:text-white dark:bg-slate-700 dark:text-gray-400 dark:hover:bg-rose-600 rounded-lg transition" title="Hapus"><Trash2 size={16} /></button>
                                    </div>
                                ) : (
                                    row.status === 'Pending' ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setEditModal({ show: true, data: { ...row, start_date: formatInputDate(row.start_date), end_date: formatInputDate(row.end_date) } })} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white rounded-lg transition" title="Edit"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDelete(row.id)} className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white rounded-lg transition" title="Hapus"><Trash2 size={16}/></button>
                                        </div>
                                    ) : <span className="text-gray-400">-</span>
                                )}
                            </td>
                         </tr>
                      ))}
                      {filteredRequests.length === 0 && (<tr><td colSpan={user.role === 'admin' ? 7 : 6} className="p-10 text-center text-gray-400 italic">Belum ada riwayat pengajuan.</td></tr>)}
                   </tbody>
                </table>
            </div>
          </div>
        </div>

        {/* MODAL EDIT PENGAJUAN */}
        {editModal.show && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                    <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/80">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Edit2 size={18} className="text-blue-500"/> Edit Pengajuan Izin</h3>
                        <button onClick={() => setEditModal({ show: false, data: {} })} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleEditSubmit} className="p-6 md:p-8 space-y-5">
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Jenis</label>
                                <select value={editModal.data.type} onChange={(e) => setEditModal({...editModal, data: {...editModal.data, type: e.target.value}})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none text-sm transition-all focus:ring-2 focus:ring-blue-500">
                                    {masterLeaveTypes.map(type => (
                                        <option key={type.id} value={type.name}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durasi</label>
                                <select value={editModal.data.duration || 'full_day'} onChange={(e) => {
                                    const newDuration = e.target.value;
                                    const newData = {...editModal.data, duration: newDuration};
                                    if(newDuration === 'half_day_late' || newDuration === 'half_day_early') newData.end_date = newData.start_date;
                                    setEditModal({...editModal, data: newData});
                                }} className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none text-sm transition-all focus:ring-2 focus:ring-blue-500">
                                    <option value="full_day">Seharian</option>
                                    <option value="half_day_late">Setengah Hari (Datang Terlambat)</option>
                                    <option value="half_day_early">Setengah Hari (Pulang Cepat)</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dari</label>
                                <input type="date" required 
                                    min={editModal.data.start_date < todayDateOnly ? editModal.data.start_date : todayDateOnly} 
                                    value={editModal.data.start_date || ''} 
                                    onChange={(e) => {
                                        const newStart = e.target.value;
                                        const newData = {...editModal.data, start_date: newStart};
                                        if(newData.duration === 'half_day_late' || newData.duration === 'half_day_early') newData.end_date = newStart;
                                        setEditModal({...editModal, data: newData});
                                    }} 
                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sampai</label>
                                <input type="date" required disabled={editModal.data.duration === 'half_day_late' || editModal.data.duration === 'half_day_early'} 
                                    min={editModal.data.start_date || todayDateOnly} 
                                    value={editModal.data.end_date || ''} 
                                    onChange={(e) => setEditModal({...editModal, data: {...editModal.data, end_date: e.target.value}})} 
                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none text-sm disabled:opacity-50 focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alasan Lengkap</label>
                            <textarea required rows="3" value={editModal.data.reason} onChange={(e) => setEditModal({...editModal, data: {...editModal.data, reason: e.target.value}})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none text-sm resize-none focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                Lampiran Bukti
                                {selectedEditRule?.requires_attachment === 1 ? <span className="text-rose-500 ml-1">(Wajib)</span> : <span className="text-gray-400 ml-1">(Opsional)</span>}
                            </label>
                            <div className="relative">
                                <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, true)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
                                <div className={`w-full p-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 transition-colors text-sm ${selectedEditRule?.requires_attachment === 1 && !editModal.data.file_bukti ? 'border-rose-300 bg-rose-50 text-rose-500 dark:bg-rose-900/20' : 'border-gray-300 bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:border-slate-600'}`}>
                                    <UploadCloud size={20}/>
                                    <span className="truncate max-w-[250px] font-medium">
                                        {editModal.data.file_bukti && editModal.data.file_bukti.startsWith('data:') 
                                            ? "File Baru Siap Disimpan" 
                                            : editModal.data.file_bukti 
                                                ? "File Lama Sudah Ada (Klik ubah)" 
                                                : "Pilih File (Maks 5MB)"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex gap-3">
                            <button type="button" onClick={() => setEditModal({ show: false, data: {} })} className="flex-1 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Batal</button>
                            <button type="submit" disabled={processing} className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:bg-blue-400 disabled:shadow-none">{processing ? <Loader2 size={18} className="animate-spin"/> : <><Save size={18}/> Simpan Perubahan</>}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL PREVIEW GAMBAR */}
        {viewImageModal.show && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setViewImageModal({show: false, src: ''})}>
                <div className="bg-transparent p-2 rounded-2xl max-w-3xl w-full relative flex flex-col items-center animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setViewImageModal({show: false, src: ''})} className="absolute -top-12 right-0 bg-white/10 hover:bg-rose-500 text-white p-2.5 rounded-full backdrop-blur-sm transition-colors"><X size={24}/></button>
                    {viewImageModal.src.includes('application/pdf') ? (
                        <iframe src={viewImageModal.src} className="w-full h-[70vh] rounded-2xl bg-white" title="Bukti PDF"></iframe>
                    ) : (
                        <img src={viewImageModal.src} alt="Bukti Izin" className="w-full h-auto rounded-2xl object-contain max-h-[85vh] shadow-2xl" />
                    )}
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
}