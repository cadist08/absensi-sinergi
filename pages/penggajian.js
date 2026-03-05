import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout'; 
import { ArrowLeft, Loader2, DollarSign, PlusCircle, Trash2, Printer, CheckCircle, Clock, Banknotes, CalendarDays } from 'lucide-react';

export default function Penggajian() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [payrolls, setPayrolls] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  
  // State Form Admin
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({ user_id: '', month: '', basic_salary: 0, allowance: 0, deduction: 0 });

  // State Slip Gaji (Print)
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

  // 🌟 EFEK AUTO-HITUNG POTONGAN TELAT (50.000 / Telat) 🌟
  useEffect(() => {
    const checkLateDeduction = async () => {
      if (form.user_id && form.month) {
        try {
          const res = await fetch(`/api/payrolls?action=checkAttendance&checkUserId=${form.user_id}&month=${form.month}`);
          if (res.ok) {
            const data = await res.json();
            // Kalkulasi denda Rp 50.000 per telat
            const lateDeduction = data.late_days * 50000;
            setForm(prev => ({ ...prev, deduction: lateDeduction }));
          }
        } catch (e) { console.error("Gagal cek absensi:", e); }
      }
    };
    checkLateDeduction();
  }, [form.user_id, form.month]); // Berjalan otomatis saat Karyawan ATAU Bulan berubah

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await fetch('/api/payrolls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      if (res.ok) {
        alert("Slip Gaji Berhasil Dibuat!");
        setForm({ user_id: '', month: '', basic_salary: 0, allowance: 0, deduction: 0 });
        fetchPayrolls();
      } else {
        const result = await res.json();
        alert(result.message);
      }
    } catch (error) { alert("Terjadi kesalahan."); } finally { setProcessing(false); }
  };

  const handleStatusChange = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Pending' ? 'Paid' : 'Pending';
    if(!confirm(`Ubah status menjadi ${newStatus}?`)) return;
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;
  if (!user) return null;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-10 py-6 px-4 print:p-0 print:bg-white">
        
        <div className={`mx-auto space-y-6 ${user.role === 'admin' ? 'max-w-7xl' : 'max-w-4xl'} print:hidden`}>
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-medium text-sm"><ArrowLeft size={16} /> Kembali ke Dashboard</button>

          {user.role === 'admin' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="bg-emerald-600 p-6 text-white flex items-center gap-3">
                   <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"><DollarSign size={24} /></div>
                   <div><h1 className="text-xl font-bold">Generate Penggajian Cerdas</h1><p className="text-emerald-100 text-sm mt-1">Sistem otomatis mengisi gaji, tunjangan, dan menghitung Rp 50.000 / keterlambatan.</p></div>
                </div>
                <form onSubmit={handleSubmit} className="p-6 md:p-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase">Pilih Karyawan</label>
                            {/* 🌟 AUTO FILL SAAT KARYAWAN DIPILIH 🌟 */}
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
                                className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:text-white outline-none"
                            >
                                <option value="">-- Pilih Karyawan --</option>
                                {employeeList.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase">Bulan Gaji</label>
                            <input type="month" required value={form.month} onChange={(e) => setForm({...form, month: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:text-white outline-none"/>
                        </div>
                        
                        <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase">Gaji Pokok (Rp)</label><input type="number" required value={form.basic_salary} onChange={(e) => setForm({...form, basic_salary: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:text-white outline-none bg-gray-50"/></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-emerald-500 uppercase">Tunjangan / Bonus (Rp)</label><input type="number" value={form.allowance} onChange={(e) => setForm({...form, allowance: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:text-white outline-none bg-gray-50"/></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-rose-500 uppercase flex gap-2">Potongan (Rp) <span className="text-[10px] text-rose-400 font-normal lowercase">*Denda Telat 50.000 x Hari</span></label><input type="number" value={form.deduction} onChange={(e) => setForm({...form, deduction: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:text-white outline-none bg-rose-50 text-rose-600 font-bold"/></div>
                     </div>
                     <button type="submit" disabled={processing} className="mt-6 w-full md:w-auto px-8 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center justify-center gap-2">{processing ? <Loader2 size={18} className="animate-spin"/> : <><PlusCircle size={18} /> Buat Slip Gaji</>}</button>
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
                          <th className="p-4">Bulan</th>{user.role === 'admin' && <th className="p-4">Nama</th>}<th className="p-4 text-center">Kehadiran</th><th className="p-4">Total Gaji</th><th className="p-4 text-center">Status</th><th className="p-4 text-center">Aksi</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {payrolls.map((row) => (
                         <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                            <td className="p-4 font-bold text-gray-900 dark:text-white">{row.month}</td>
                            {user.role === 'admin' && <td className="p-4 font-medium">{row.name}</td>}
                            <td className="p-4 text-center text-xs"><span className="text-emerald-600 font-bold">{row.present_days} Hadir</span><br/><span className="text-rose-500">{row.late_days} Telat</span></td>
                            <td className="p-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(row.total_salary)}</td>
                            <td className="p-4 text-center">
                               {user.role === 'admin' ? (
                                   <button onClick={() => handleStatusChange(row.id, row.status)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${row.status === 'Paid' ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>{row.status}</button>
                               ) : (
                                   <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${row.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>{row.status}</span>
                               )}
                            </td>
                            <td className="p-4 text-center">
                                <div className="flex justify-center gap-2">
                                    <button onClick={() => setPrintData(row)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition" title="Cetak Slip"><Printer size={16}/></button>
                                    {user.role === 'admin' && <button onClick={() => handleDelete(row.id)} className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition" title="Hapus"><Trash2 size={16}/></button>}
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

        {/* TAMPILAN SLIP GAJI */}
        {printData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:relative print:bg-white print:p-0 print:block">
                <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-full">
                    <div className="p-8 border-b-4 border-emerald-500 flex justify-between items-center bg-gray-50 print:bg-transparent">
                        <div><h1 className="text-3xl font-black text-gray-800 tracking-tight">SLIP GAJI</h1><p className="text-gray-500 font-medium mt-1">Periode: <span className="text-emerald-600">{printData.month}</span></p></div>
                        <div className="text-right"><h2 className="font-bold text-gray-800 text-xl uppercase">{printData.name}</h2><p className="text-sm text-gray-500 mt-1">Dicetak pada: {new Date().toLocaleDateString('id-ID')}</p></div>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="flex items-center gap-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full"><CalendarDays size={24}/></div>
                            <div className="flex-1 flex justify-around text-center">
                                <div><p className="text-xs font-bold text-gray-500 uppercase">Total Hadir</p><p className="text-xl font-bold text-emerald-600">{printData.present_days} Hari</p></div>
                                <div><p className="text-xs font-bold text-gray-500 uppercase">Total Terlambat</p><p className="text-xl font-bold text-rose-500">{printData.late_days} Hari</p></div>
                                <div><p className="text-xs font-bold text-gray-500 uppercase">Status</p><p className={`text-sm font-bold mt-1 px-3 py-0.5 rounded-full ${printData.status === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-orange-400 text-white'}`}>{printData.status}</p></div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2 mb-4">Rincian Pendapatan</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Gaji Pokok</span><span className="font-mono font-bold text-gray-800">{formatRupiah(printData.basic_salary)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Tunjangan / Bonus</span><span className="font-mono font-bold text-emerald-600">+{formatRupiah(printData.allowance)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-600 font-medium text-rose-500">Potongan (Absen/Telat dll)</span><span className="font-mono font-bold text-rose-500">-{formatRupiah(printData.deduction)}</span></div>
                            </div>
                        </div>

                        <div className="p-5 bg-gray-800 text-white rounded-xl flex justify-between items-center print:bg-gray-100 print:text-gray-900 print:border-2 print:border-gray-800">
                            <span className="font-bold uppercase tracking-wider text-sm">Total Penerimaan Bersih (Take Home Pay)</span>
                            <span className="text-2xl font-black font-mono text-emerald-400 print:text-emerald-600">{formatRupiah(printData.total_salary)}</span>
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