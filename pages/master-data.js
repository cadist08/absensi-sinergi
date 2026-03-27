import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout'; 
import { ArrowLeft, Loader2, PlusCircle, Trash2, Edit2, Building, Briefcase, Save, X, Search } from 'lucide-react'; 

export default function MasterData() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('position'); 
  const [dataList, setDataList] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [processing, setProcessing] = useState(false);
  // Default diubah jadi string kosong agar mudah dihapus dengan backspace
  const [form, setForm] = useState({ name: '', salary: '', allowance: '' });
  const [editModal, setEditModal] = useState({ show: false, data: {} });

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user.role !== 'admin') {
              router.push('/dashboard'); 
          } else {
              setUser(data.user);
              fetchData(activeTab);
          }
        } else { router.push('/login'); }
      } catch (error) { router.push('/login'); } finally { setLoading(false); }
    };
    init();
  }, [router]);

  useEffect(() => { 
      if (user) {
          setForm({ name: '', salary: '', allowance: '' });
          setSearchTerm('');
          fetchData(activeTab); 
      }
  }, [activeTab, user]);

  const fetchData = async (type) => {
    try {
      const res = await fetch(`/api/master?type=${type}`);
      if (res.ok) setDataList(await res.json());
    } catch (error) { console.error(error); }
  };

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

  // 🌟 FUNGSI BARU: Format Ribuan untuk tampilan input
  const formatInputCurrency = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // 🌟 FUNGSI BARU: Menangani Input Form Tambah
  const handleCurrencyChange = (e, field) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, ''); 
    setForm({ ...form, [field]: rawValue ? parseInt(rawValue, 10) : '' });
  };

  // 🌟 FUNGSI BARU: Menangani Input Form Edit
  const handleEditCurrencyChange = (e, field) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, ''); 
    setEditModal({ 
        ...editModal, 
        data: { ...editModal.data, [field]: rawValue ? parseInt(rawValue, 10) : '' } 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    
    // Pastikan string kosong berubah menjadi 0 sebelum dikirim ke DB
    const payload = {
        ...form,
        salary: Number(form.salary) || 0,
        allowance: Number(form.allowance) || 0
    };

    try {
      const res = await fetch(`/api/master?type=${activeTab}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        setForm({ name: '', salary: '', allowance: '' });
        fetchData(activeTab);
      } else {
        const result = await res.json(); alert(result.message);
      }
    } catch (error) { alert("Terjadi kesalahan."); } finally { setProcessing(false); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);

    // Pastikan data valid
    const payload = {
        ...editModal.data,
        salary: Number(editModal.data.salary) || 0,
        allowance: Number(editModal.data.allowance) || 0
    };

    try {
      const res = await fetch(`/api/master?type=${activeTab}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        setEditModal({ show: false, data: {} });
        fetchData(activeTab);
      } else {
        const result = await res.json(); alert(result.message);
      }
    } catch (error) { alert("Terjadi kesalahan."); } finally { setProcessing(false); }
  };

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

  const filteredData = dataList.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 transition-colors duration-300"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;
  if (!user) return null;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-10 py-6 px-4 transition-colors duration-300">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <button 
             onClick={() => router.push('/dashboard')} 
             className="group flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow-md transition-all hover:-translate-x-1 w-fit"
          >
             <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
             Kembali ke Dashboard
          </button>

          <div className="flex flex-col lg:flex-row gap-8">
              {/* KOLOM KIRI: FORM TAMBAH */}
              <div className="w-full lg:w-1/3 space-y-6">
                 <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 flex gap-2 transition-colors">
                     <button 
                        onClick={() => setActiveTab('position')} 
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'position' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'}`}
                     >
                         <Briefcase size={16}/> Jabatan
                     </button>
                     <button 
                        onClick={() => setActiveTab('department')} 
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'department' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'}`}
                     >
                         <Building size={16}/> Divisi
                     </button>
                 </div>

                 {/* FORM INPUT TAMBAH */}
                 <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden transition-colors">
                    <div className="bg-slate-800 dark:bg-slate-900 p-6 text-white border-b border-slate-700">
                        <h2 className="font-bold flex items-center gap-2">
                            <PlusCircle size={20} className="text-indigo-400"/> 
                            Tambah {activeTab === 'position' ? 'Jabatan' : 'Divisi'} Baru
                        </h2>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama {activeTab === 'position' ? 'Jabatan' : 'Divisi'}</label>
                            <input type="text" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder={activeTab === 'position' ? "Cth: Staff Keuangan" : "Cth: Human Resources"} className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"/>
                        </div>
                        
                        {activeTab === 'position' && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Standar Gaji Pokok (Rp)</label>
                                    {/* 🌟 DIUBAH KE TEXT & DI-FORMAT */}
                                    <input 
                                        type="text" 
                                        inputMode="numeric"
                                        required 
                                        value={formatInputCurrency(form.salary)} 
                                        onChange={(e) => handleCurrencyChange(e, 'salary')} 
                                        className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Standar Tunjangan (Rp)</label>
                                    {/* 🌟 DIUBAH KE TEXT & DI-FORMAT */}
                                    <input 
                                        type="text" 
                                        inputMode="numeric"
                                        required 
                                        value={formatInputCurrency(form.allowance)} 
                                        onChange={(e) => handleCurrencyChange(e, 'allowance')} 
                                        className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                                    />
                                </div>
                            </>
                        )}
                        <button type="submit" disabled={processing} className="w-full py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all mt-6 flex justify-center items-center gap-2 shadow-lg shadow-indigo-500/30 disabled:bg-indigo-400 disabled:shadow-none text-base">
                            {processing ? <Loader2 size={20} className="animate-spin"/> : <><Save size={20} /> Simpan Data</>}
                        </button>
                    </form>
                 </div>
              </div>

              {/* KOLOM KANAN: TABEL DATA */}
              <div className="w-full lg:w-2/3 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col transition-colors">
                 <div className="p-6 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-3 text-lg">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                            {activeTab === 'position' ? <Briefcase size={20} /> : <Building size={20} />}
                        </div>
                        Daftar {activeTab === 'position' ? 'Jabatan' : 'Divisi'}
                    </h3>
                    
                    <div className="relative w-full md:w-72">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder={`Cari ${activeTab === 'position' ? 'jabatan' : 'divisi'}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-800 dark:text-white transition-all shadow-sm"
                        />
                    </div>
                 </div>
                 
                 <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400 uppercase font-bold text-xs tracking-wider border-b border-gray-200 dark:border-slate-700">
                            <tr>
                                <th className="p-5 pl-6">Nama {activeTab === 'position' ? 'Jabatan' : 'Divisi'}</th>
                                {activeTab === 'position' && <><th className="p-5 text-right">Gaji Pokok</th><th className="p-5 text-right">Tunjangan</th></>}
                                <th className="p-5 pr-6 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {filteredData.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-5 pl-6 font-bold text-gray-900 dark:text-white whitespace-nowrap">{row.name}</td>
                                    {activeTab === 'position' && (
                                        <>
                                            <td className="p-5 text-right font-mono font-medium whitespace-nowrap">{formatRupiah(row.salary)}</td>
                                            <td className="p-5 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">+{formatRupiah(row.allowance)}</td>
                                        </>
                                    )}
                                    <td className="p-5 pr-6 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => setEditModal({ show: true, data: row })} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white rounded-lg transition-colors shadow-sm" title="Edit"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDelete(row.id)} className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white rounded-lg transition-colors shadow-sm" title="Hapus"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={activeTab === 'position' ? 4 : 2} className="p-10 text-center text-gray-400 italic">
                                        {searchTerm ? 'Data tidak ditemukan.' : 'Belum ada data.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
              </div>
          </div>
        </div>

        {/* MODAL EDIT DATA */}
        {editModal.show && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                    <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/80">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Edit2 size={18} className="text-blue-500"/> Edit {activeTab === 'position' ? 'Jabatan' : 'Divisi'}</h3>
                        <button onClick={() => setEditModal({ show: false, data: {} })} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleEditSubmit} className="p-6 md:p-8 space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama</label>
                            <input type="text" required value={editModal.data.name} onChange={(e) => setEditModal({...editModal, data: {...editModal.data, name: e.target.value}})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none text-sm focus:ring-2 focus:ring-blue-500 transition-all"/>
                        </div>
                        
                        {activeTab === 'position' && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Standar Gaji Pokok (Rp)</label>
                                    {/* 🌟 DIUBAH KE TEXT & DI-FORMAT UNTUK MODAL EDIT */}
                                    <input 
                                        type="text" 
                                        inputMode="numeric"
                                        required 
                                        value={formatInputCurrency(editModal.data.salary)} 
                                        onChange={(e) => handleEditCurrencyChange(e, 'salary')} 
                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none text-sm focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Standar Tunjangan (Rp)</label>
                                    {/* 🌟 DIUBAH KE TEXT & DI-FORMAT UNTUK MODAL EDIT */}
                                    <input 
                                        type="text" 
                                        inputMode="numeric"
                                        required 
                                        value={formatInputCurrency(editModal.data.allowance)} 
                                        onChange={(e) => handleEditCurrencyChange(e, 'allowance')} 
                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none text-sm focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                                    />
                                </div>
                            </>
                        )}
                        <div className="pt-6 flex gap-3">
                            <button type="button" onClick={() => setEditModal({ show: false, data: {} })} className="flex-1 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Batal</button>
                            <button type="submit" disabled={processing} className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:bg-blue-400 disabled:shadow-none">
                                {processing ? <Loader2 size={18} className="animate-spin"/> : <><Save size={18}/> Simpan</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
}