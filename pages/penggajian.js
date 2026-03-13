import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout'; 
import { ArrowLeft, Loader2, DollarSign, PlusCircle, Trash2, Printer, CheckCircle, Clock, Banknote, CalendarDays, FileText, AlertCircle, AlertTriangle } from 'lucide-react'; 

export default function Penggajian() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [payrolls, setPayrolls] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({ user_id: '', month: '', basic_salary: 0, allowance: 0, deduction: 0 });

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 transition-colors duration-300"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;
  if (!user) return null;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-10 py-6 px-4 print:p-0 print:bg-white transition-colors duration-300">
        
        <div className={`mx-auto space-y-6 ${user.role === 'admin' ? 'max-w-7xl' : 'max-w-5xl'} print:hidden`}>
          
          {/* 🌟 PERBAIKAN UI: Tombol Kembali ke Dashboard Interaktif */}
          <button 
             onClick={() => router.push('/dashboard')} 
             className="group flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow-md transition-all hover:-translate-x-1 w-fit"
          >
             <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
             Kembali ke Dashboard
          </button>

          {user.role === 'admin' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 md:p-8 text-white flex items-center gap-4">
                   <div className="p-3.5 bg-white/20 rounded-2xl backdrop-blur-sm shadow-inner"><DollarSign size={28} /></div>
                   <div>
                       <h1 className="text-2xl font-extrabold tracking-tight">Penggajian Terintegrasi</h1>
                       <p className="text-emerald-100 text-sm mt-1 font-medium hidden md:block">Sistem deteksi otomatis: Cuti (Dibayar) vs Alpha/Bolos (Potong Gaji).</p>
                   </div>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 md:p-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pilih Karyawan</label>
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
                                className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none font-medium focus:ring-2 focus:ring-emerald-500 transition-all"
                            >
                                <option value="">-- Pilih Karyawan --</option>
                                {employeeList.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bulan Gaji</label>
                            <input type="month" required value={form.month} onChange={(e) => setForm({...form, month: e.target.value})} className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none font-medium focus:ring-2 focus:ring-emerald-500 transition-all"/>
                        </div>
                     </div>

                     {/* 🌟 PERBAIKAN UI: Mini Dashboard Responsif (Tidak Hancur di HP) */}
                     {form.user_id && form.month && (
                        <div className="mt-6 mb-2 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 transition-all">
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                              <div className="flex items-center gap-2">
                                  <AlertCircle size={18} className="text-blue-500"/>
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Konteks Kehadiran Bulan {form.month}</span>
                              </div>
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-white dark:bg-slate-800 px-3 py-1 rounded-md border dark:border-slate-700 w-fit">{attStats.weekdays} Hari Kerja</span>
                           </div>
                           
                           {attStats.isFetching ? (
                              <div className="flex items-center justify-center p-4 gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin"/> Menarik data absen & menghitung...</div>
                           ) : (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                 <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-slate-700 flex flex-col shadow-sm"><span className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold">Hadir Aktif</span><span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{attStats.present} <span className="text-sm font-semibold opacity-50">Hari</span></span></div>
                                 <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-slate-700 flex flex-col shadow-sm"><span className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold">Cuti / Sakit</span><span className="text-xl sm:text-2xl font-black text-blue-500 dark:text-blue-400 mt-1">{attStats.leave} <span className="text-sm font-semibold opacity-50">Hari</span></span></div>
                                 <div className="bg-rose-50 dark:bg-rose-900/20 p-3 sm:p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 flex flex-col shadow-sm"><span className="text-[10px] sm:text-xs text-rose-600 dark:text-rose-400 uppercase font-bold flex gap-1 items-center"><AlertTriangle size={12}/> Alpha (Mangkir)</span><span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{attStats.alpha} <span className="text-sm font-semibold opacity-50">Hari</span></span></div>
                                 <div className="bg-orange-50 dark:bg-orange-900/20 p-3 sm:p-4 rounded-xl border border-orange-100 dark:border-orange-900/30 flex flex-col shadow-sm"><span className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 uppercase font-bold">Terlambat</span><span className="text-xl sm:text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">{attStats.late} <span className="text-sm font-semibold opacity-50">Kali</span></span></div>
                              </div>
                           )}
                        </div>
                     )}
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        <div className="space-y-2"><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gaji Pokok (Rp)</label><input type="number" required value={form.basic_salary} onChange={(e) => setForm({...form, basic_salary: e.target.value})} className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"/></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Tunjangan / Bonus (Rp)</label><input type="number" value={form.allowance} onChange={(e) => setForm({...form, allowance: e.target.value})} className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"/></div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider flex flex-col gap-0.5">
                                <span>Potongan (Rp)</span>
                                <span className="text-[9px] text-rose-400 dark:text-rose-500/80 font-normal normal-case">*Otomatis = (Alpha × Gaji/Hari) + (Telat × 50rb)</span>
                            </label>
                            <input type="number" value={form.deduction} onChange={(e) => setForm({...form, deduction: e.target.value})} className="w-full p-3.5 rounded-xl border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 outline-none focus:ring-2 focus:ring-rose-500 transition-all font-mono font-bold"/>
                        </div>
                     </div>
                     <button type="submit" disabled={processing} className="w-full md:w-auto px-10 py-4 mt-8 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 disabled:bg-emerald-400 disabled:shadow-none text-lg"><PlusCircle size={20} /> Terbitkan Slip Gaji</button>
                </form>
              </div>
          )}

          {/* TABEL RIWAYAT PENGGAJIAN */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden mt-8 transition-colors duration-300">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 flex items-center gap-3">
               <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400"><Banknote size={20}/></div>
               <h3 className="font-bold text-gray-800 dark:text-white">{user.role === 'admin' ? 'Data Penggajian Perusahaan' : 'Riwayat Slip Gaji Saya'}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                   <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400 uppercase font-bold text-xs tracking-wider border-b border-gray-100 dark:border-slate-700">
                      <tr>
                          <th className="p-5 pl-6">Bulan</th>{user.role === 'admin' && <th className="p-5">Nama Karyawan</th>}<th className="p-5 text-center">Kehadiran</th><th className="p-5">Total Take Home Pay</th><th className="p-5 text-center">Status</th><th className="p-5 pr-6 text-center">Aksi</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {payrolls.map((row) => (
                         <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-5 pl-6 font-bold text-gray-900 dark:text-white whitespace-nowrap">{row.month}</td>
                            {user.role === 'admin' && <td className="p-5 font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{row.name}</td>}
                            <td className="p-5 text-center text-xs whitespace-nowrap">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{row.present_days} Hadir</span><br/>
                                {row.late_days > 0 && <span className="text-rose-500 dark:text-rose-400 mt-0.5 inline-block">{row.late_days} Telat</span>}
                            </td>
                            <td className="p-5 font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">{formatRupiah(row.total_salary)}</td>
                            <td className="p-5 text-center">
                                {/* 🌟 PERBAIKAN UI: Badge Transparan di Dark Mode */}
                                {user.role === 'admin' ? (
                                    <button onClick={() => handleStatusChange(row.id, row.status)} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${row.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60' : 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:hover:bg-orange-900/60'}`}>{row.status}</button>
                                ) : (
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${row.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'}`}>{row.status}</span>
                                )}
                            </td>
                            <td className="p-5 pr-6 text-center">
                                <div className="flex justify-center gap-2">
                                    <button onClick={() => setPrintData(row)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white rounded-lg transition-colors shadow-sm" title="Cetak Slip"><Printer size={16}/></button>
                                    {user.role === 'admin' && <button onClick={() => handleDelete(row.id)} className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white rounded-lg transition-colors shadow-sm" title="Hapus"><Trash2 size={16}/></button>}
                                </div>
                            </td>
                         </tr>
                      ))}
                      {payrolls.length === 0 && (<tr><td colSpan="6" className="p-10 text-center text-gray-400 italic">Belum ada riwayat penggajian.</td></tr>)}
                   </tbody>
                </table>
            </div>
          </div>
        </div>

        {/* TAMPILAN SLIP GAJI (PRINT VIEW) */}
        {printData && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:relative print:bg-white print:p-0 print:block animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-full print:border-none animate-in zoom-in-95 duration-200">
                    <div className="p-8 border-b-4 border-emerald-500 flex justify-between items-center bg-gray-50 print:bg-transparent print:p-0 print:mb-6">
                        <div><h1 className="text-3xl font-black text-gray-800 tracking-tight">SLIP GAJI</h1><p className="text-gray-500 font-medium mt-1">Periode: <span className="text-emerald-600">{printData.month}</span></p></div>
                        <div className="text-right"><h2 className="font-bold text-gray-800 text-xl uppercase">{printData.name}</h2><p className="text-sm text-gray-500 mt-1">Dicetak pada: {new Date().toLocaleDateString('id-ID')}</p></div>
                    </div>

                    <div className="p-8 space-y-8 print:p-0 print:mt-4">
                        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 print:bg-white print:border-gray-200">
                            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full print:hidden hidden sm:block"><CalendarDays size={28}/></div>
                            <div className="flex-1 flex w-full justify-around text-center">
                                <div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Hadir</p><p className="text-xl font-black text-emerald-600 print:text-gray-800 mt-1">{printData.present_days} <span className="text-sm font-medium opacity-60">Hari</span></p></div>
                                <div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Terlambat</p><p className="text-xl font-black text-rose-500 print:text-gray-800 mt-1">{printData.late_days} <span className="text-sm font-medium opacity-60">Kali</span></p></div>
                                <div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status Gaji</p><p className={`text-sm font-bold mt-1.5 px-4 py-1 rounded-full inline-block ${printData.status === 'Paid' ? 'bg-emerald-500 text-white print:bg-transparent print:text-gray-800 print:border' : 'bg-orange-400 text-white print:bg-transparent print:text-gray-800 print:border'}`}>{printData.status}</p></div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-3 mb-4">Rincian Pendapatan</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Gaji Pokok</span><span className="font-mono font-bold text-gray-800 text-lg">{formatRupiah(printData.basic_salary)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Tunjangan / Bonus</span><span className="font-mono font-bold text-emerald-600 print:text-gray-800 text-lg">+{formatRupiah(printData.allowance)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-600 font-medium text-rose-500 print:text-gray-800">Potongan (Absen/Telat dll)</span><span className="font-mono font-bold text-rose-500 print:text-gray-800 text-lg">-{formatRupiah(printData.deduction)}</span></div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-2 print:bg-gray-100 print:text-gray-900 print:border-2 print:border-gray-800 shadow-xl print:shadow-none">
                            <span className="font-bold uppercase tracking-widest text-xs opacity-80">Total Penerimaan Bersih</span>
                            <span className="text-3xl font-black font-mono text-emerald-400 print:text-gray-900">{formatRupiah(printData.total_salary)}</span>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 flex justify-end gap-3 print:hidden border-t">
                        <button onClick={() => setPrintData(null)} className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 transition-colors">Tutup</button>
                        <button onClick={handlePrint} className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"><Printer size={18}/> Cetak PDF</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
}