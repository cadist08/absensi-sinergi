import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react'; 
import { Home, Users, User, Menu, X, LogOut } from 'lucide-react'; // Tambah icon Menu & X

export default function Layout({ children }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State untuk menu HP

  // Cek Role
  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch('/api/auth/me'); 
        if (res.ok) {
          const data = await res.json();
          if (data.user && data.user.role === 'admin') {
            setIsAdmin(true);
          }
        }
      } catch (error) { console.error(error); }
    };
    checkRole();
  }, []);

  const isActive = (path) => router.pathname === path;

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-slate-900 font-sans">
      
      {/* --- MOBILE HEADER (Hanya Muncul di HP) --- */}
      <div className="md:hidden fixed top-0 w-full bg-white dark:bg-slate-900 z-50 border-b dark:border-slate-800 p-4 flex justify-between items-center shadow-sm">
        <div className="font-bold text-xl text-indigo-600">Sinergi HR</div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600 dark:text-gray-300">
          <Menu size={28} />
        </button>
      </div>

      {/* --- OVERLAY GELAP (Saat menu HP terbuka) --- */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-slate-900 text-white shadow-xl z-50 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 
      `}>
        
        {/* Header Sidebar (Logo & Tombol Close di HP) */}
        <div className="p-6 flex justify-between items-center border-b border-slate-800 bg-white">
          <img 
            src="/logos.png" 
            alt="Logo" 
            className="h-10 w-auto object-contain" 
          />
          {/* Tombol Close hanya di HP */}
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-800">
            <X size={24} />
          </button>
        </div>

        {/* MENU */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <Link href="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/dashboard') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Home size={20} /> <span className="font-medium">Dashboard</span>
          </Link>

          {isAdmin && (
            <Link href="/karyawan" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/karyawan') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Users size={20} /> <span className="font-medium">Karyawan</span>
            </Link>
          )}

          <Link href="/profile" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/profile') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <User size={20} /> <span className="font-medium">Profil Saya</span>
          </Link>
        </nav>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-800 text-center text-xs text-slate-500">
          &copy; 2026 Sinergi HR System
        </div>
      </aside>

      {/* --- KONTEN UTAMA --- */}
      {/* pt-20 di HP agar tidak tertutup header, ml-0 di HP, ml-64 di Laptop */}
      <main className="flex-1 p-4 md:p-8 pt-24 md:pt-8 md:ml-64 transition-all duration-300">
        {children}
      </main>

    </div>
  );
}