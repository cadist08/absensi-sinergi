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
    
    if (duration === 'half_day') return 0.5;

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
    if (form.duration === 'half_day' && form.start_date) {
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
  
  // 🌟 PERUBAHAN: Parser Tanggal yang Lebih Aman untuk Input
  const formatInputDate = (dateString) => {
      if (!dateString) return '';
      try {
          // 'en-CA' otomatis menghasilkan format YYYY-MM-DD
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
        const durasiLabel = r.duration === 'half_day' ? 'Setengah Hari' : 'Seharian';
        return `${r.name},${r.type},${durasiLabel},${r.start_date.split('T')[0]},${r.end_date.split('T')[0]},${r.reason.replace(/,/g, ' ')},${r.status}`;
      }).join("\n");
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Laporan_Cuti_${new Date().getTime()}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;
  if (!user) return null;

  const filteredRequests = leaveRequests.filter(row => {
      const monthMatch = filterMonth ? row.start_date.startsWith(filterMonth) : true;
      const statusMatch = filterStatus ? row.status === filterStatus : true;
      return monthMatch && statusMatch;
  });

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-10 py-6 px-4">
        <div className={`mx-auto space-y-6 ${user.role === 'admin' ? 'max-w-6xl' : 'max-w-3xl'}`}>
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 font-medium text-sm"><ArrowLeft size={16} /> Kembali ke Dashboard</button>

          {user.role !== 'admin' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                   <div className="flex gap-3 items-center">
                       <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"><FileText size={24} /></div>
                       <div><h1 className="text-xl font-bold">Pengajuan Izin / Cuti</h1><p className="text-indigo-100 text-sm mt-1">Sisa Cuti Tahunan: <strong className="text-yellow-300">{sisaCuti} Hari</strong></p></div>
                   </div>
                </div>
                {success ? (
                   <div className="p-10 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in duration-300"><CheckCircle size={64} className="text-emerald-500" /><h2 className="text-2xl font-bold text-gray-800 dark:text-white">Berhasil Dikirim!</h2><p className="text-gray-500">Status saat ini: <span className="font-bold text-orange-500">Pending</span>.</p></div>
                ) : (
                   <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Jenis Pengajuan</label>
                            <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none font-medium transition">
                                {masterLeaveTypes.map(type => (
                                    <option key={type.id} value={type.name}>{type.name}</option>
                                ))}
                            </select>
                            
                            {selectedLeaveRule?.is_deduct_leave === 1 ? (
                                <p className="text-[10px] text-amber-600 flex items-center gap-1"><Info size={12}/> Pengajuan ini akan memotong saldo cuti tahunan.</p>
                            ) : null}
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Durasi Izin</label>
                            <select value={form.duration} onChange={(e) => setForm({...form, duration: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none font-medium transition">
                                <option value="full_day">Seharian Penuh (Full Day)</option>
                                <option value="half_day">Setengah Hari (Pulang Awal / Telat)</option>
                            </select>
                         </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-slate-700/30 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                        <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Calendar size={14}/> Dari Tanggal</label><input type="date" required min={todayDateOnly} value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none text-sm"/></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Calendar size={14}/> Sampai Tanggal</label><input type="date" required disabled={form.duration === 'half_day'} min={form.start_date || todayDateOnly} value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none text-sm disabled:opacity-50"/></div>
                     </div>
                     <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase">Alasan Lengkap</label><textarea required rows="3" value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none resize-none transition focus:ring-2 focus:ring-indigo-500"></textarea></div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                            Lampiran Bukti
                            {selectedLeaveRule?.requires_attachment === 1 ? <span className="text-rose-500 ml-1">(Wajib)</span> : <span className="text-gray-400 ml-1">(Opsional)</span>}
                        </label>
                        <div className="relative">
                            <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                            <div className={`w-full p-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-3 transition ${selectedLeaveRule?.requires_attachment === 1 && !fileName ? 'border-rose-300 bg-rose-50 text-rose-500' : 'border-gray-300 dark:border-slate-600 text-gray-500 bg-gray-50 dark:bg-slate-700/30'}`}>
                                <UploadCloud size={20}/><span className="text-sm font-medium truncate max-w-[200px]">{fileName || "Upload Bukti (Maks 5MB)"}</span>
                            </div>
                        </div>
                     </div>

                     {form.start_date && form.end_date && (
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl flex items-center justify-between text-indigo-800 dark:text-indigo-300 transition-all animate-in fade-in duration-300">
                            <div className="flex items-center gap-2">
                                <Calendar size={18} className="text-indigo-500"/>
                                <span className="text-sm font-semibold">Total Hari Diajukan:</span>
                            </div>
                            <div className="text-right">
                                <span className="text-xl font-black">{calculateWorkingDays(form.start_date, form.end_date, form.duration)} Hari</span>
                                <div className="text-[10px] opacity-70 mt-0.5">Sabtu & Minggu tidak dihitung</div>
                            </div>
                        </div>
                     )}

                     <button type="submit" disabled={processing} className="w-full py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition flex justify-center gap-2 disabled:bg-indigo-400">{processing ? <Loader2 size={20} className="animate-spin"/> : <><Send size={18} /> Kirim Pengajuan</>}</button>
                   </form>
                )}
              </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden mt-8">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex items-center gap-3"><List size={20} className="text-indigo-500"/><h3 className="font-bold text-gray-800 dark:text-white">{user.role === 'admin' ? 'Approval Izin & Cuti' : 'Riwayat Pengajuan Saya'}</h3></div>
                {user.role === 'admin' && (
                    <div className="flex flex-wrap gap-2">
                        <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="p-2 border rounded-lg text-sm dark:bg-slate-700 dark:text-white dark:border-slate-600 outline-none"/>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="p-2 border rounded-lg text-sm dark:bg-slate-700 dark:text-white dark:border-slate-600 outline-none"><option value="">Semua Status</option><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option></select>
                        <button onClick={exportToCSV} className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"><Download size={16}/> Export</button>
                    </div>
                )}
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                   <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-800 dark:text-white uppercase font-bold text-xs tracking-wider">
                     <tr>
                        {user.role === 'admin' && <th className="p-4">Nama</th>}
                        <th className="p-4 pl-6">Tanggal</th><th className="p-4">Jenis</th><th className="p-4">Alasan</th><th className="p-4 text-center">Bukti</th><th className="p-4 text-center">Status</th><th className="p-4 pr-6 text-center">Aksi</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {filteredRequests.map((row) => (
                         <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                            {user.role === 'admin' && <td className="p-4 font-bold text-gray-900 dark:text-white">{row.name}</td>}
                            <td className="p-4 pl-6 whitespace-nowrap text-xs"><span className="font-semibold text-gray-800 dark:text-gray-200">{formatDate(row.start_date)}</span> <span className="mx-1 text-gray-400">s/d</span> <br className="md:hidden"/><span className="font-semibold text-gray-800 dark:text-gray-200">{formatDate(row.end_date)}</span></td>
                            <td className="p-4 font-semibold text-indigo-600 dark:text-indigo-400">
                                {row.type}
                                {row.duration === 'half_day' && <span className="block text-xs font-normal text-orange-500 mt-0.5">(Setengah Hari)</span>}
                            </td>
                            <td className="p-4 max-w-[150px] truncate" title={row.reason}>{row.reason}</td>
                            <td className="p-4 text-center">
                                {row.file_bukti ? <button onClick={() => setViewImageModal({ show: true, src: row.file_bukti })} className="p-1.5 text-indigo-500 bg-indigo-50 hover:bg-indigo-100 rounded-md transition mx-auto"><Eye size={16}/></button> : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="p-4 text-center">
                               <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${row.status === 'Pending' ? 'bg-orange-100 text-orange-600' : row.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{row.status === 'Pending' && <Clock size={10}/>}{row.status === 'Approved' && <Check size={10}/>}{row.status === 'Rejected' && <X size={10}/>}{row.status}</span>
                            </td>
                            <td className="p-4 pr-6 text-center">
                                {user.role === 'admin' ? (
                                    <div className="flex justify-center gap-2">
                                        {row.status === 'Pending' && <><button onClick={() => handleApproval(row.id, 'Approved')} className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg transition"><Check size={16}/></button><button onClick={() => handleApproval(row.id, 'Rejected')} className="p-2 bg-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white rounded-lg transition"><X size={16}/></button></>}
                                        <button onClick={() => handleDelete(row.id)} className="p-2 bg-gray-100 text-gray-500 hover:bg-red-500 hover:text-white rounded-lg transition"><Trash2 size={16} /></button>
                                    </div>
                                ) : (
                                    row.status === 'Pending' ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setEditModal({ show: true, data: { ...row, start_date: formatInputDate(row.start_date), end_date: formatInputDate(row.end_date) } })} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-md transition"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDelete(row.id)} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-md transition"><Trash2 size={16}/></button>
                                        </div>
                                    ) : <span className="text-gray-400">-</span>
                                )}
                            </td>
                         </tr>
                      ))}
                      {filteredRequests.length === 0 && (<tr><td colSpan="7" className="p-10 text-center text-gray-400 italic">Belum ada data.</td></tr>)}
                   </tbody>
                </table>
            </div>
          </div>
        </div>

        {/* MODAL EDIT */}
        {editModal.show && (() => {
            const selectedEditRule = masterLeaveTypes.find(t => t.name === editModal.data.type);
            
            return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border dark:border-slate-700">
                    <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-700/50">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Edit2 size={18} className="text-blue-500"/> Edit Pengajuan</h3>
                        <button onClick={() => setEditModal({ show: false, data: {} })} className="text-gray-500 hover:text-rose-500"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Jenis</label>
                                <select value={editModal.data.type} onChange={(e) => setEditModal({...editModal, data: {...editModal.data, type: e.target.value}})} className="w-full p-2.5 rounded-xl border dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none text-sm transition focus:ring-2 focus:ring-blue-500">
                                    {masterLeaveTypes.map(type => (
                                        <option key={type.id} value={type.name}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Durasi</label>
                                <select value={editModal.data.duration || 'full_day'} onChange={(e) => {
                                    const newDuration = e.target.value;
                                    const newData = {...editModal.data, duration: newDuration};
                                    if(newDuration === 'half_day') newData.end_date = newData.start_date;
                                    setEditModal({...editModal, data: newData});
                                }} className="w-full p-2.5 rounded-xl border dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none text-sm transition focus:ring-2 focus:ring-blue-500">
                                    <option value="full_day">Seharian</option>
                                    <option value="half_day">Setengah Hari</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {/* 🌟 PERUBAHAN: Aturan logika 'min' agar tanggal masa lalu yang sudah masuk tidak error di UI */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Dari</label>
                                <input type="date" required 
                                    min={editModal.data.start_date < todayDateOnly ? editModal.data.start_date : todayDateOnly} 
                                    value={editModal.data.start_date || ''} 
                                    onChange={(e) => {
                                        const newStart = e.target.value;
                                        const newData = {...editModal.data, start_date: newStart};
                                        if(newData.duration === 'half_day') newData.end_date = newStart;
                                        setEditModal({...editModal, data: newData});
                                    }} 
                                    className="w-full p-2.5 rounded-xl border dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Sampai</label>
                                <input type="date" required disabled={editModal.data.duration === 'half_day'} 
                                    min={editModal.data.start_date || todayDateOnly} 
                                    value={editModal.data.end_date || ''} 
                                    onChange={(e) => setEditModal({...editModal, data: {...editModal.data, end_date: e.target.value}})} 
                                    className="w-full p-2.5 rounded-xl border dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                />
                            </div>
                        </div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Alasan</label><textarea required rows="3" value={editModal.data.reason} onChange={(e) => setEditModal({...editModal, data: {...editModal.data, reason: e.target.value}})} className="w-full p-2.5 rounded-xl border dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none text-sm resize-none focus:ring-2 focus:ring-blue-500"></textarea></div>
                        
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                Lampiran Bukti
                                {selectedEditRule?.requires_attachment === 1 ? <span className="text-rose-500 ml-1">(Wajib)</span> : <span className="text-gray-400 ml-1">(Opsional)</span>}
                            </label>
                            <div className="relative">
                                <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, true)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                                <div className={`w-full p-3 border border-dashed rounded-xl flex items-center justify-center gap-2 transition text-sm ${selectedEditRule?.requires_attachment === 1 && !editModal.data.file_bukti ? 'border-rose-300 bg-rose-50 text-rose-500' : 'border-gray-300 bg-gray-50 dark:bg-slate-700/30 text-gray-500 dark:border-slate-600'}`}>
                                    <UploadCloud size={18}/>
                                    <span className="truncate max-w-[250px]">
                                        {editModal.data.file_bukti && editModal.data.file_bukti.startsWith('data:') 
                                            ? "File Baru Siap Disimpan" 
                                            : editModal.data.file_bukti 
                                                ? "File Lama Sudah Ada (Klik ubah)" 
                                                : "Pilih File (Maks 5MB)"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setEditModal({ show: false, data: {} })} className="flex-1 py-2.5 rounded-xl font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition">Batal</button>
                            <button type="submit" disabled={processing} className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition flex items-center justify-center gap-2 disabled:bg-blue-400">{processing ? <Loader2 size={16} className="animate-spin"/> : <><Save size={16}/> Simpan</>}</button>
                        </div>
                    </form>
                </div>
            </div>
            );
        })()}

        {/* MODAL LIHAT GAMBAR */}
        {viewImageModal.show && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in zoom-in duration-200" onClick={() => setViewImageModal({show: false, src: ''})}>
                <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl max-w-lg w-full relative" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setViewImageModal({show: false, src: ''})} className="absolute -top-4 -right-4 bg-rose-500 text-white p-2 rounded-full shadow-lg hover:bg-rose-600 transition"><X size={20}/></button>
                    <img src={viewImageModal.src} alt="Bukti Izin" className="w-full h-auto rounded-xl object-contain max-h-[80vh]" />
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
}