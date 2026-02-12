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
  
  // State untuk Loading & Auth
  const [loadingPage, setLoadingPage] = useState(true); 
  const [currentUser, setCurrentUser] = useState(null); 

  // State untuk Modal & Form
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false); 

  // Form Data
  const [form, setForm] = useState({ id: '', name: '', email: '', password: '', role: 'user' });

  const router = useRouter();

  // --- 1. CEK AUTH, LOAD DATA & TEMA ---
  useEffect(() => {
    // A. LOGIKA TEMA
    const savedTheme = Cookies.get('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // B. LOGIKA AUTH & LOAD DATA
    const initPage = async () => {
      try {
        const resAuth = await fetch('/api/auth/me');
        
        if (!resAuth.ok) {
          router.push('/login');
          return;
        }
        
        const dataAuth = await resAuth.json();
        const user = dataAuth.user;

        // --- SECURITY CHECK POINT ---
        // Jika bukan admin, tendang & JANGAN matikan loading
        if (user.role !== 'admin') {
          // Opsional: Alert bisa dihapus jika ingin redirect silent
          // alert("AKSES DITOLAK: Halaman ini khusus Administrator."); 
          router.push('/dashboard'); 
          return; // Stop di sini, jangan lanjut ke bawah
        }

        // Jika Admin, lanjut...
        setCurrentUser(user);
        await fetchUsers(); 
        
        // Baru matikan loading jika sudah pasti Admin
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

  // --- 3. AMBIL DATA DARI API ---
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users'); 
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        setFilteredUsers(data);
      } else {
        console.error("Gagal ambil data");
      }
    } catch (err) {
      // alert('Gagal mengambil data karyawan.'); // Silent error lebih rapi
      console.error(err);
    }
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
        body: JSON.stringify(form),
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
    if (confirm(`Yakin ingin menghapus karyawan "${nama}"? Data ini tidak bisa dikembalikan.`)) {
      try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        const result = await res.json();
        
        if (res.ok) {
            alert(result.message);
            fetchUsers();
        } else {
            alert(result.message);
        }
      } catch (e) {
        alert('Gagal menghapus data.');
      }
    }
  };

  // Helper Functions
  const openAddModal = () => {
    resetForm();
    setIsEditing(false);
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setForm({ ...user, password: '' }); 
    setIsEditing(true);
    setModalOpen(true);
  };

  const resetForm = () => {
    setForm({ id: '', name: '', email: '', password: '', role: 'user' });
  };

  // --- TAMPILAN LOADING / PROTEKSI ---
  // Jika masih loading ATAU user belum terisi (belum lolos cek admin), tampilkan loader
  if (loadingPage || !currentUser) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-slate-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Memverifikasi akses admin...</p>
        </div>
    );
  }

  // --- KONTEN UTAMA (HANYA MUNCUL JIKA ADMIN) ---
  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        
        {/* HEADER & PENCARIAN */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">Manajemen Karyawan</h1>
            <p className="text-gray-500 mt-1 dark:text-gray-400">Kelola data pegawai, akun, dan hak akses.</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input 
                type="text" 
                placeholder="Cari nama / email..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"/>
            </div>
            <button 
              onClick={openAddModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-semibold shadow-md flex items-center transition transform hover:scale-105"
            >
              <UserPlusIcon className="w-5 h-5 mr-2"/>
              <span className="hidden sm:inline">Tambah</span>
            </button>
          </div>
        </div>

        {/* TABEL DATA KARYAWAN */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-indigo-50 dark:bg-slate-900 text-indigo-900 dark:text-indigo-200 text-sm uppercase tracking-wider">
                  <th className="p-5 font-bold">Nama Lengkap</th>
                  <th className="p-5 font-bold">Email Login</th>
                  <th className="p-5 font-bold">Role</th>
                  <th className="p-5 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-gray-700 dark:text-gray-300">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition duration-150">
                    <td className="p-5">
                      <div className="font-semibold text-gray-800 dark:text-white">{u.name}</div>
                      <div className="text-xs text-gray-400">ID: {u.id}</div>
                    </td>
                    <td className="p-5 font-mono text-sm text-gray-600 dark:text-gray-400">{u.email}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                        {u.role === 'admin' ? 'ADMIN' : 'KARYAWAN'}
                      </span>
                    </td>
                    <td className="p-5 flex justify-center gap-3">
                      <button onClick={() => openEditModal(u)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition" title="Edit">
                        <PencilSquareIcon className="w-5 h-5"/>
                      </button>
                      
                      {/* Admin tidak boleh hapus diri sendiri */}
                      {currentUser?.id !== u.id && (
                        <button onClick={() => handleDelete(u.id, u.name)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition" title="Hapus">
                          <TrashIcon className="w-5 h-5"/>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-gray-400">
                      Tidak ada data ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL POPUP */}
      {modalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            
            <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
              <h2 className="text-xl font-bold">{isEditing ? 'Edit Karyawan' : 'Tambah Karyawan'}</h2>
              <button onClick={() => setModalOpen(false)} className="hover:bg-indigo-700 p-1 rounded-full transition">
                <XMarkIcon className="w-6 h-6"/>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Password {isEditing && <span className="text-xs font-normal text-gray-500">(Opsional)</span>}
                </label>
                <input 
                  type="password" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                  placeholder={isEditing ? "Kosongkan jika tidak diganti" : "Minimal 6 karakter"}
                  value={form.password}
                  onChange={(e) => setForm({...form, password: e.target.value})}
                  required={!isEditing}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center cursor-pointer">
                    <input 
                      type="radio" name="role" value="user" 
                      checked={form.role === 'user'} 
                      onChange={(e) => setForm({...form, role: e.target.value})}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">Karyawan</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input 
                      type="radio" name="role" value="admin" 
                      checked={form.role === 'admin'} 
                      onChange={(e) => setForm({...form, role: e.target.value})}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">Admin</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t dark:border-slate-700 mt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg font-medium transition"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={loadingSubmit}
                  className={`px-6 py-2 rounded-lg text-white font-bold shadow-lg transition ${loadingSubmit ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {loadingSubmit ? 'Menyimpan...' : (isEditing ? 'Simpan' : 'Tambah')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}