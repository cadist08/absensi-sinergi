import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout'; 
import { ArrowLeft, Loader2, PlusCircle, Trash2, Edit2, Building, Briefcase, Save, X } from 'lucide-react';

export default function MasterData() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('position'); // 'position' atau 'department'
  const [dataList, setDataList] = useState([]);
  
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({ name: '', salary: 0, allowance: 0 });
  const [editModal, setEditModal] = useState({ show: false, data: {} });

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user.role !== 'admin') {
              router.push('/dashboard'); // Tendang kalau bukan admin
          } else {
              setUser(data.user);
              fetchData(activeTab);
          }
        } else { router.push('/login'); }
      } catch (error) { router.push('/login'); } finally { setLoading(false); }
    };
    init();
  }, [router]);

  // Fetch data setiap tab berubah
  useEffect(() => { if (user) fetchData(activeTab); }, [activeTab]);

  const fetchData = async (type) => {
    try {
      const res = await fetch(`/api/master?type=${type}`);
      if (res.ok) setDataList(await res.json());
    } catch (error) { console.error(error); }
  };

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

  // --- FUNGSI TAMBAH DATA ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await fetch(`/api/master?type=${activeTab}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      if (res.ok) {
        setForm({ name: '', salary: 0, allowance: 0 });
        fetchData(activeTab);
      } else {
        const result = await res.json(); alert(result.message);
      }
    } catch (error) { alert("Terjadi kesalahan."); } finally { setProcessing(false); }
  };

  // --- FUNGSI EDIT DATA ---
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await fetch(`/api/master?type=${activeTab}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editModal.data)
      });
      if (res.ok) {
        setEditModal({ show: false, data: {} });
        fetchData(activeTab);
      } else {
        const result = await res.json(); alert(result.message);
      }
    } catch (error) { alert("Terjadi kesalahan."); } finally { setProcessing(false); }
  };

  // --- FUNGSI HAPUS DATA ---
  const handleDelete = async (id) => {
    if(!confirm('Yakin ingin menghapus data ini?')) return;
    try {
      const res = await fetch(`/api/master?type=${activeTab}`, { 
          method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) 
      });
      if (res.ok) { fetchData(activeTab); } else {
          const result = await res.json(); alert(result.message);
      }
    } catch (e) { alert("Terjadi kesalahan saat menghapus."); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;
  if (!user) return null;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-10 py-6 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-medium text-sm"><ArrowLeft size={16} /> Kembali ke Dashboard</button>

          <div className="flex flex-col md:flex-row gap-6">
              {/* KOLOM KIRI: FORM TAMBAH */}
              <div className="w-full md:w-1/3 space-y-6">
                 {/* SWITCH TAB */}
                 <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex gap-2">
                     <button onClick={() => setActiveTab('position')} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${activeTab === 'position' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700'}`}><Briefcase size={16}/> Jabatan</button>
                     <button onClick={() => setActiveTab('department')} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${activeTab === 'department' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700'}`}><Building size={16}/> Divisi</button>
                 </div>

                 {/* FORM INPUT */}
                 <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="bg-slate-800 dark:bg-slate-900 p-5 text-white"><h2 className="font-bold">Tambah {activeTab === 'position' ? 'Jabatan' : 'Divisi'} Baru</h2></div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Nama {activeTab === 'position' ? 'Jabatan' : 'Divisi'}</label><input type="text" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder={activeTab === 'position' ? "Cth: Staff Keuangan" : "Cth: Human Resources"} className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:text-white outline-none"/></div>
                        
                        {activeTab === 'position' && (
                            <>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Standar Gaji Pokok</label><input type="number" required value={form.salary} onChange={(e) => setForm({...form, salary: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:text-white outline-none"/></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Standar Tunjangan</label><input type="number" required value={form.allowance} onChange={(e) => setForm({...form, allowance: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:text-white outline-none"/></div>
                            </>
                        )}
                        <button type="submit" disabled={processing} className="w-full py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition mt-4 flex justify-center gap-2">{processing ? <Loader2 size={18} className="animate-spin"/> : <><PlusCircle size={18} /> Simpan Data</>}</button>
                    </form>
                 </div>
              </div>

              {/* KOLOM KANAN: TABEL DATA */}
              <div className="w-full md:w-2/3 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                 <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800"><h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">{activeTab === 'position' ? <Briefcase size={18} className="text-indigo-500"/> : <Building size={18} className="text-indigo-500"/>} Daftar {activeTab === 'position' ? 'Jabatan & Standar Gaji' : 'Divisi (Departemen)'}</h3></div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-800 dark:text-white uppercase font-bold text-[10px] tracking-wider">
                            <tr>
                                <th className="p-4">Nama {activeTab === 'position' ? 'Jabatan' : 'Divisi'}</th>
                                {activeTab === 'position' && <><th className="p-4 text-right">Gaji Pokok</th><th className="p-4 text-right">Tunjangan</th></>}
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {dataList.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                                    <td className="p-4 font-bold text-gray-900 dark:text-white">{row.name}</td>
                                    {activeTab === 'position' && (
                                        <>
                                            <td className="p-4 text-right font-mono font-medium">{formatRupiah(row.salary)}</td>
                                            <td className="p-4 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">+{formatRupiah(row.allowance)}</td>
                                        </>
                                    )}
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => setEditModal({ show: true, data: row })} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDelete(row.id)} className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {dataList.length === 0 && (<tr><td colSpan="4" className="p-10 text-center text-gray-400 italic">Belum ada data.</td></tr>)}
                        </tbody>
                    </table>
                 </div>
              </div>
          </div>
        </div>

        {/* 🌟 MODAL EDIT DATA 🌟 */}
        {editModal.show && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border dark:border-slate-700">
                    <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-700/50">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Edit2 size={18} className="text-blue-500"/> Edit {activeTab === 'position' ? 'Jabatan' : 'Divisi'}</h3>
                        <button onClick={() => setEditModal({ show: false, data: {} })} className="text-gray-500 hover:text-rose-500"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Nama</label><input type="text" required value={editModal.data.name} onChange={(e) => setEditModal({...editModal, data: {...editModal.data, name: e.target.value}})} className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:text-white outline-none"/></div>
                        
                        {activeTab === 'position' && (
                            <>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Standar Gaji Pokok</label><input type="number" required value={editModal.data.salary} onChange={(e) => setEditModal({...editModal, data: {...editModal.data, salary: e.target.value}})} className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:text-white outline-none"/></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Standar Tunjangan</label><input type="number" required value={editModal.data.allowance} onChange={(e) => setEditModal({...editModal, data: {...editModal.data, allowance: e.target.value}})} className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:text-white outline-none"/></div>
                            </>
                        )}
                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setEditModal({ show: false, data: {} })} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">Batal</button>
                            <button type="submit" disabled={processing} className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center justify-center gap-2">{processing ? <Loader2 size={16} className="animate-spin"/> : <><Save size={16}/> Simpan</>}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
}