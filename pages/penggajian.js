import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout'; 
import { ArrowLeft, Loader2, DollarSign, PlusCircle, Trash2, Printer, CheckCircle, Clock, Banknotes, CalendarDays, FileText, AlertCircle, AlertTriangle } from 'lucide-react'; // 🌟 Tambah AlertTriangle

export default function Penggajian() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [payrolls, setPayrolls] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({ user_id: '', month: '', basic_salary: 0, allowance: 0, deduction: 0 });

  // 🌟 PERUBAHAN: State attStats sekarang menampung alpha_days dan weekdays
  const [attStats, setAttStats] = useState({ present: 0, late: 0, leave: 0, alpha: 0, weekdays: 0, isFetching: false });

  const [printData, setPrintData] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          fetchPayrolls();
          if (data.user.role === 'admin') fetchEmployees();
        } else { router.push('/login'); }
      } catch (error) { router.push('/login'); } finally { setLoading(false); }
    };
    init();
  }, [router]);

  const fetchPayrolls = async () => {
    try {
      const res = await fetch('/api/payrolls');
      if (res.ok) setPayrolls(await res.json());
    } catch (error) { console.error(error); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/payrolls?action=getUsers');
      if (res.ok) setEmployeeList(await res.json());
    } catch (error) { console.error(error); }
  };

  // 🌟 LOGIKA CERDAS: Memicu pengambilan absen SETIAP KALI User, Bulan, atau Gaji Pokok berubah (karena Alpha butuh gaji pokok untuk dihitung)
  useEffect(() => {
    const fetchAttendanceContext = async () => {
      if (form.user_id && form.month && form.basic_salary >= 0) {
        setAttStats(prev => ({ ...prev, isFetching: true }));
        try {
          const res = await fetch(`/api/payrolls?action=checkAttendance&checkUserId=${form.user_id}&month=${form.month}&basicSalary=${form.basic_salary}`);
          if (res.ok) {
            const data = await res.json();
            setAttStats({ 
                present: data.present_days, 
                late: data.late_days, 
                leave: data.leave_days, 
                alpha: data.alpha_days,
                weekdays: data.weekdays,
                isFetching: false 
            });
            
            // Set otomatis nilai potongan dari backend (Telat + Alpha)
            setForm(prev => ({ ...prev, deduction: data.suggested_deduction }));
          }
        } catch (e) { 
          setAttStats(prev => ({ ...prev, isFetching: false }));
        }
      } else {
        setAttStats({ present: 0, late: 0, leave: 0, alpha: 0, weekdays: 0, isFetching: false });
      }
    };
    fetchAttendanceContext();
  }, [form.user_id, form.month, form.basic_salary]);

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await fetch('/api/payrolls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      if (res.ok) {
        alert("Slip Gaji Berhasil Dibuat & Notifikasi Terkirim!");
        setForm({ user_id: '', month: '', basic_salary: 0, allowance: 0, deduction: 0 });
        setAttStats({ present: 0, late: 0, leave: 0, alpha: 0, weekdays: 0, isFetching: false });
        fetchPayrolls();
      } else {
        const result = await res.json();
        alert(result.message);
      }
    } catch (error) { alert("Terjadi kesalahan."); } finally { setProcessing(false); }
  };

  const handleStatusChange = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Pending' ? 'Paid' : 'Pending';
    if(!confirm(`Ubah status menjadi ${newStatus}? Karyawan akan menerima notifikasi jika dibayarkan.`)) return;
    try {
      const res = await fetch('/api/payrolls', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: newStatus }) });
      if (res.ok) fetchPayrolls();
    } catch (e) {}
  };

  const handleDelete = async (id) => {
    if(!confirm('Hapus slip gaji ini secara permanen?')) return;
    try {
      const res = await fetch('/api/payrolls', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (res.ok) fetchPayrolls();
    } catch (e) {}
  };

  const handlePrint = () => { window.print(); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;
  if (!user) return null;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-10 py-6 px-4 print:p-0 print:bg-white transition-colors">
        
        <div className={`mx-auto space-y-6 ${user.role === 'admin' ? 'max-w-7xl' : 'max-w-4xl'} print:hidden`}>
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 font-medium text-sm"><ArrowLeft size={16} /> Kembali ke Dashboard</button>

          {user.role === 'admin' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="bg-emerald-600 p-6 text-white flex items-center gap-3">
                   <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"><DollarSign size={24} /></div>
                   <div><h1 className="text-xl font-bold">Penggajian Terintegrasi</h1><p className="text-emerald-100 text-sm mt-1">Sistem deteksi otomatis: Cuti (Dibayar) vs Alpha/Bolos (Potong Gaji).</p></div>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 md:p-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase">Pilih Karyawan</label>
                            <select 
                                required 
                                value={form.user_id} 
                                onChange={(e) => {
                                    const selectedId = e.target.value;
                                    const selectedEmp = employeeList.find(emp => emp.id == selectedId);
                                    setForm(prev => ({
                                        ...prev, 
                                        user_id: selectedId,
                                        basic_salary: selectedEmp ? (selectedEmp.default_salary || 0) : 0,
                                        allowance: selectedEmp ? (selectedEmp.default_allowance || 0) : 0
                                    }));
                                }} 
                                className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">-- Pilih Karyawan --</option>
                                {employeeList.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase">Bulan Gaji</label>
                            <input type="month" required value={form.month} onChange={(e) => setForm({...form, month: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"/>
                        </div>
                     </div>

                     {/* 🌟 FITUR BARU: TAMPILAN MINI DASHBOARD DENGAN DETEKSI ALPHA 🌟 */}
                     {form.user_id && form.month && (
                        <div className="mt-6 mb-2 p-5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                           <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                  <AlertCircle size={18} className="text-blue-500"/>
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Konteks Kehadiran Bulan {form.month}</span>
                              </div>
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{attStats.weekdays} Hari Kerja</span>
                           </div>
                           
                           {attStats.isFetching ? (
                              <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin"/> Menarik data absen & menghitung...</div>
                           ) : (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                 <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border dark:border-slate-700 flex flex-col"><span className="text-[10px] text-gray-500 uppercase font-bold">Hadir Aktif</span><span className="text-xl font-black text-emerald-600">{attStats.present} Hari</span></div>
                                 <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border dark:border-slate-700 flex flex-col"><span className="text-[10px] text-gray-500 uppercase font-bold">Cuti / Sakit (Paid)</span><span className="text-xl font-black text-blue-500">{attStats.leave} Hari</span></div>
                                 <div className="bg-rose-50 dark:bg-rose-900/10 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 flex flex-col"><span className="text-[10px] text-rose-500 uppercase font-bold flex gap-1 items-center"><AlertTriangle size={10}/> Alpha (Mangkir)</span><span className="text-xl font-black text-rose-600">{attStats.alpha} Hari</span></div>
                                 <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-xl border border-orange-100 dark:border-orange-900/30 flex flex-col"><span className="text-[10px] text-orange-600 uppercase font-bold">Terlambat</span><span className="text-xl font-black text-orange-600">{attStats.late} Kali</span></div>
                              </div>
                           )}
                        </div>
                     )}
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase">Gaji Pokok (Rp)</label><input type="number" required value={form.basic_salary} onChange={(e) => setForm({...form, basic_salary: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none bg-gray-50 dark:bg-slate-800"/></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-emerald-500 uppercase">Tunjangan / Bonus (Rp)</label><input type="number" value={form.allowance} onChange={(e) => setForm({...form, allowance: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none bg-gray-50 dark:bg-slate-800"/></div>
                        
                        {/* 🌟 PENJELASAN LOGIKA POTONGAN 🌟 */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-rose-500 uppercase flex flex-col gap-0.5">
                                <span>Potongan (Rp)</span>
                                <span className="text-[9px] text-rose-400 font-normal normal-case">*Otomatis = (Alpha × Gaji/Hari) + (Telat × 50rb)</span>
                            </label>
                            <input type="number" value={form.deduction} onChange={(e) => setForm({...form, deduction: e.target.value})} className="w-full p-3 rounded-xl border-rose-200 dark:border-rose-900/50 dark:bg-rose-900/20 outline-none bg-rose-50 text-rose-600 font-bold"/>
                        </div>
                     </div>
                     <button type="submit" disabled={processing} className="mt-8 w-full md:w-auto px-8 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 dark:shadow-none transition flex items-center justify-center gap-2 disabled:bg-emerald-400">{processing ? <Loader2 size={18} className="animate-spin"/> : <><PlusCircle size={18} /> Terbitkan Slip Gaji</>}</button>
                </form>
              </div>
          )}

          {/* TABEL RIWAYAT PENGGAJIAN */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden mt-8">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800 flex items-center gap-3">
               <DollarSign size={20} className="text-emerald-500"/><h3 className="font-bold text-gray-800 dark:text-white">{user.role === 'admin' ? 'Data Penggajian Perusahaan' : 'Riwayat Slip Gaji Saya'}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                   <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-800 dark:text-white uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                          <th className="p-4 pl-6">Bulan</th>{user.role === 'admin' && <th className="p-4">Nama</th>}<th className="p-4 text-center">Kehadiran</th><th className="p-4">Total Gaji</th><th className="p-4 text-center">Status</th><th className="p-4 pr-6 text-center">Aksi</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {payrolls.map((row) => (
                         <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                            <td className="p-4 pl-6 font-bold text-gray-900 dark:text-white">{row.month}</td>
                            {user.role === 'admin' && <td className="p-4 font-medium">{row.name}</td>}
                            <td className="p-4 text-center text-xs">
                                <span className="text-emerald-600 font-bold">{row.present_days} Hadir</span><br/>
                                {row.late_days > 0 && <span className="text-rose-500">{row.late_days} Telat</span>}
                            </td>
                            <td className="p-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(row.total_salary)}</td>
                            <td className="p-4 text-center">
                               {user.role === 'admin' ? (
                                   <button onClick={() => handleStatusChange(row.id, row.status)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${row.status === 'Paid' ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>{row.status}</button>
                               ) : (
                                   <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${row.status === 'Paid' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}>{row.status}</span>
                               )}
                            </td>
                            <td className="p-4 pr-6 text-center">
                                <div className="flex justify-center gap-2">
                                    <button onClick={() => setPrintData(row)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white rounded-lg transition" title="Cetak Slip"><Printer size={16}/></button>
                                    {user.role === 'admin' && <button onClick={() => handleDelete(row.id)} className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-500 dark:hover:text-white rounded-lg transition" title="Hapus"><Trash2 size={16}/></button>}
                                </div>
                            </td>
                         </tr>
                      ))}
                      {payrolls.length === 0 && (<tr><td colSpan="6" className="p-10 text-center text-gray-400 italic">Belum ada data penggajian.</td></tr>)}
                   </tbody>
                </table>
            </div>
          </div>
        </div>

        {/* TAMPILAN SLIP GAJI (PRINT VIEW) */}
        {printData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:relative print:bg-white print:p-0 print:block">
                <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-full print:border-none">
                    <div className="p-8 border-b-4 border-emerald-500 flex justify-between items-center bg-gray-50 print:bg-transparent print:p-0 print:mb-6">
                        <div><h1 className="text-3xl font-black text-gray-800 tracking-tight">SLIP GAJI</h1><p className="text-gray-500 font-medium mt-1">Periode: <span className="text-emerald-600">{printData.month}</span></p></div>
                        <div className="text-right"><h2 className="font-bold text-gray-800 text-xl uppercase">{printData.name}</h2><p className="text-sm text-gray-500 mt-1">Dicetak pada: {new Date().toLocaleDateString('id-ID')}</p></div>
                    </div>

                    <div className="p-8 space-y-8 print:p-0 print:mt-4">
                        <div className="flex items-center gap-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 print:bg-white print:border-gray-200">
                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full print:hidden"><CalendarDays size={24}/></div>
                            <div className="flex-1 flex justify-around text-center">
                                <div><p className="text-xs font-bold text-gray-500 uppercase">Total Hadir</p><p className="text-xl font-bold text-emerald-600 print:text-gray-800">{printData.present_days} Hari</p></div>
                                <div><p className="text-xs font-bold text-gray-500 uppercase">Total Terlambat</p><p className="text-xl font-bold text-rose-500 print:text-gray-800">{printData.late_days} Hari</p></div>
                                <div><p className="text-xs font-bold text-gray-500 uppercase">Status Gaji</p><p className={`text-sm font-bold mt-1 px-3 py-0.5 rounded-full ${printData.status === 'Paid' ? 'bg-emerald-500 text-white print:bg-transparent print:text-gray-800 print:border' : 'bg-orange-400 text-white print:bg-transparent print:text-gray-800 print:border'}`}>{printData.status}</p></div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2 mb-4">Rincian Pendapatan</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Gaji Pokok</span><span className="font-mono font-bold text-gray-800">{formatRupiah(printData.basic_salary)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Tunjangan / Bonus</span><span className="font-mono font-bold text-emerald-600 print:text-gray-800">+{formatRupiah(printData.allowance)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-600 font-medium text-rose-500 print:text-gray-800">Potongan (Absen/Telat dll)</span><span className="font-mono font-bold text-rose-500 print:text-gray-800">-{formatRupiah(printData.deduction)}</span></div>
                            </div>
                        </div>

                        <div className="p-5 bg-gray-800 text-white rounded-xl flex justify-between items-center print:bg-gray-100 print:text-gray-900 print:border-2 print:border-gray-800">
                            <span className="font-bold uppercase tracking-wider text-sm">Total Penerimaan Bersih</span>
                            <span className="text-2xl font-black font-mono text-emerald-400 print:text-gray-900">{formatRupiah(printData.total_salary)}</span>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 flex justify-end gap-3 print:hidden">
                        <button onClick={() => setPrintData(null)} className="px-6 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 transition">Tutup</button>
                        <button onClick={handlePrint} className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-2"><Printer size={18}/> Cetak PDF</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
}