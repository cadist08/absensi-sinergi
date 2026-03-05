import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout';
import Cookies from 'js-cookie'; 
import { 
  PencilSquareIcon, 
  TrashIcon, 
  UserPlusIcon, 
  XMarkIcon, 
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';

export default function Karyawan() {
  // --- STATE ---
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search, setSearch] = useState('');
  
  // State untuk Master Data (Divisi & Jabatan)
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  
  // State untuk Loading & Auth
  const [loadingPage, setLoadingPage] = useState(true); 
  const [currentUser, setCurrentUser] = useState(null); 

  // State untuk Modal & Form
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false); 

  // Form Data (Lengkap dengan phone & address)
  const [form, setForm] = useState({ 
    id: '', name: '', email: '', password: '', role: 'user', 
    department_id: '', position_id: '', phone: '', address: '' 
  });

  const router = useRouter();

  // --- 1. CEK AUTH & LOAD SEMUA DATA ---
  useEffect(() => {
    const savedTheme = Cookies.get('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const initPage = async () => {
      try {
        const resAuth = await fetch('/api/auth/me');
        if (!resAuth.ok) {
          router.push('/login');
          return;
        }
        
        const dataAuth = await resAuth.json();
        if (dataAuth.user.role !== 'admin') {
          router.push('/dashboard'); 
          return; 
        }

        setCurrentUser(dataAuth.user);
        
        // Load Karyawan, Divisi, dan Jabatan secara paralel
        await Promise.all([
            fetchUsers(),
            fetchMasterData()
        ]);
        
        setLoadingPage(false);
      } catch (err) {
        console.error("Auth Error:", err);
        router.push('/login');
      }
    };

    initPage();
  }, []);

  // --- 2. LOGIKA FILTER PENCARIAN ---
  useEffect(() => {
    const result = users.filter(u => 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.email.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredUsers(result);
  }, [search, users]);

  // --- 3. FUNGSI AMBIL DATA ---
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users'); 
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        setFilteredUsers(data);
      }
    } catch (err) { console.error(err); }
  };

  const fetchMasterData = async () => {
    try {
        const [resDept, resPos] = await Promise.all([
            fetch('/api/master?type=department'),
            fetch('/api/master?type=position')
        ]);
        if (resDept.ok) setDepartments(await resDept.json());
        if (resPos.ok) setPositions(await resPos.json());
    } catch (err) { console.error("Gagal load master data", err); }
  };

  // --- 4. HANDLE SUBMIT (CREATE / UPDATE) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingSubmit(true);

    try {
      const url = isEditing ? `/api/users/${form.id}` : '/api/users'; 
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...form,
            department_id: form.department_id || null,
            position_id: form.position_id || null,
            phone: form.phone || null,
            address: form.address || null
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Terjadi kesalahan');

      alert(result.message);
      setModalOpen(false);
      fetchUsers(); 
      resetForm();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoadingSubmit(false);
    }
  };

  // --- 5. HANDLE DELETE ---
  const handleDelete = async (id, nama) => {
    if (confirm(`Hapus karyawan "${nama}"?`)) {
      try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (res.ok) { fetchUsers(); } else {
            const result = await res.json(); alert(result.message);
        }
      } catch (e) { alert('Gagal menghapus.'); }
    }
  };

  // Helpers
  const openEditModal = (user) => {
    setForm({ 
        ...user, 
        password: '',
        department_id: user.department_id || '',
        position_id: user.position_id || '',
        phone: user.phone || '',
        address: user.address || ''
    }); 
    setIsEditing(true); setModalOpen(true);
  };

  const resetForm = () => {
    setForm({ id: '', name: '', email: '', password: '', role: 'user', department_id: '', position_id: '', phone: '', address: '' });
  };

  const getDeptName = (id) => departments.find(d => d.id === id)?.name || '-';
  const getPosName = (id) => positions.find(p => p.id === id)?.name || '-';

  if (loadingPage || !currentUser) return <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">Data Karyawan</h1>
            <p className="text-gray-500 mt-1 dark:text-gray-400">Manajemen pegawai, divisi, dan informasi kontak.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input type="text" placeholder="Cari..." className="w-full pl-10 pr-4 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"/>
            </div>
            <button onClick={() => { resetForm(); setIsEditing(false); setModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-bold flex items-center shadow-md transition"><UserPlusIcon className="w-5 h-5 mr-2"/> Tambah</button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-300 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-5">Karyawan</th>
                  <th className="p-5">Divisi & Jabatan</th>
                  <th className="p-5">Kontak & Alamat</th>
                  <th className="p-5 text-center">Role</th>
                  <th className="p-5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-gray-700 dark:text-gray-300">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                    <td className="p-5">
                      <div className="font-bold text-gray-900 dark:text-white text-base">{u.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{u.email}</div>
                    </td>
                    <td className="p-5">
                        <div className="font-bold text-indigo-600 dark:text-indigo-400">{getPosName(u.position_id)}</div>
                        <div className="text-xs text-gray-500">{getDeptName(u.department_id)}</div>
                    </td>
                    <td className="p-5">
                        <div className="text-xs font-bold text-gray-700 dark:text-gray-200">{u.phone || '-'}</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[150px]">{u.address || 'Alamat kosong'}</div>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>{u.role}</span>
                    </td>
                    <td className="p-5 text-center">
                        <div className="flex justify-center gap-2">
                            <button onClick={() => openEditModal(u)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition"><PencilSquareIcon className="w-5 h-5"/></button>
                            {currentUser?.id !== u.id && <button onClick={() => handleDelete(u.id, u.name)} className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition"><TrashIcon className="w-5 h-5"/></button>}
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-6 flex justify-between items-center text-white"><h2 className="text-xl font-bold">{isEditing ? 'Edit Karyawan' : 'Tambah Karyawan'}</h2><button onClick={() => setModalOpen(false)} className="hover:bg-indigo-500 p-1 rounded-full"><XMarkIcon className="w-6 h-6"/></button></div>
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap</label><input type="text" className="w-full px-4 py-3 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required /></div>
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label><input type="email" className="w-full px-4 py-3 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required /></div>
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password {isEditing && <span className="lowercase font-normal text-rose-500">(Opsional)</span>}</label><input type="password" className="w-full px-4 py-3 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required={!isEditing} /></div>
                  </div>
                  <div className="space-y-4">
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Divisi</label><select className="w-full px-4 py-3 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none" value={form.department_id} onChange={(e) => setForm({...form, department_id: e.target.value})}><option value="">-- Pilih Divisi --</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jabatan</label><select className="w-full px-4 py-3 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none" value={form.position_id} onChange={(e) => setForm({...form, position_id: e.target.value})}><option value="">-- Pilih Jabatan --</option>{positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Role</label><div className="flex gap-4"><label className="flex-1 flex items-center justify-center p-3 border rounded-xl cursor-pointer dark:text-white"><input type="radio" name="role" value="user" checked={form.role === 'user'} onChange={(e) => setForm({...form, role: e.target.value})} className="mr-2"/> Karyawan</label><label className="flex-1 flex items-center justify-center p-3 border rounded-xl cursor-pointer dark:text-white"><input type="radio" name="role" value="admin" checked={form.role === 'admin'} onChange={(e) => setForm({...form, role: e.target.value})} className="mr-2"/> Admin</label></div></div>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">No. Telepon</label><input type="text" className="w-full px-4 py-3 border rounded-xl dark:bg-slate-700 dark:text-white outline-none" value={form.phone || ''} onChange={(e) => setForm({...form, phone: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alamat Rumah</label><input type="text" className="w-full px-4 py-3 border rounded-xl dark:bg-slate-700 dark:text-white outline-none" value={form.address || ''} onChange={(e) => setForm({...form, address: e.target.value})} /></div>
              </div>
              <div className="pt-6 border-t dark:border-slate-700 flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="px-6 py-3 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 rounded-xl font-bold transition">Batal</button><button type="submit" disabled={loadingSubmit} className={`px-8 py-3 rounded-xl text-white font-bold shadow-lg transition ${loadingSubmit ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{loadingSubmit ? 'Menyimpan...' : (isEditing ? 'Simpan' : 'Tambah')}</button></div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}