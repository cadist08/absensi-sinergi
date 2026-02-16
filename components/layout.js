import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react'; 
import { Home, Users, User, Menu, X, LayoutDashboard, ChevronRight } from 'lucide-react'; 

export default function Layout({ children }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 

  // Cek Role User
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

  // Komponen Menu Item
  const NavItem = ({ href, icon: Icon, label }) => {
    const active = isActive(href);
    return (
      <Link href={href} className={`
        group flex items-center justify-between px-4 py-3 mx-2 rounded-xl transition-all duration-200 font-medium
        ${active 
          ? 'bg-indigo-50 text-indigo-600 shadow-sm dark:bg-indigo-600 dark:text-white dark:shadow-indigo-900/50' 
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}
      `}>
        <div className="flex items-center gap-3">
            <Icon size={20} className={active ? 'text-indigo-600 dark:text-white' : 'text-gray-400 group-hover:text-gray-600 dark:text-slate-500 dark:group-hover:text-white transition-colors'} /> 
            <span>{label}</span>
        </div>
        {active && <ChevronRight size={16} className="text-indigo-400 dark:text-white/50" />}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950 font-sans text-gray-900 dark:text-gray-100">
      
      {/* --- MOBILE HEADER --- */}
      <div className="md:hidden fixed top-0 w-full z-50 p-4 flex justify-between items-center shadow-sm backdrop-blur-md border-b
        bg-white/80 border-gray-200 
        dark:bg-slate-900/90 dark:border-slate-800
      ">
        <div className="flex items-center">
            {/* LOGO DI HP (Tanpa Teks) */}
            <img 
              src="/logos.png" 
              alt="Logo" 
              className="h-10 w-auto object-contain" 
            />
        </div>
        <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 rounded-lg transition
            text-gray-600 hover:bg-gray-100 
            dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Menu size={26} />
        </button>
      </div>

      {/* --- OVERLAY GELAP --- */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden
        ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* --- SIDEBAR --- */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 shadow-2xl z-50 transition-transform duration-300 ease-out border-r flex flex-col
        bg-white border-gray-200 
        dark:bg-slate-900 dark:border-slate-800
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 
      `}>
        
        {/* HEADER SIDEBAR (Hanya Logo) */}
        <div className="h-24 flex items-center justify-between px-6 border-b 
            border-gray-100 bg-white
            dark:border-slate-800 dark:bg-slate-900
        ">
          <div className="flex items-center w-full">
             {/* Logo Sedikit Lebih Besar karena tanpa teks */}
             <img 
                src="/logos.png" 
                alt="Logo Sinergi" 
                className="h-12 w-auto object-contain" 
             />
          </div>
          
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 rounded-md
            text-gray-500 hover:bg-gray-100
            dark:text-slate-400 dark:hover:bg-slate-800
          ">
            <X size={20} />
          </button>
        </div>

        {/* MENU LIST */}
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
          <div className="px-6 mb-2 text-xs font-bold uppercase tracking-wider
            text-gray-400 
            dark:text-slate-500
          ">Menu Utama</div>
          
          <NavItem href="/dashboard" icon={Home} label="Dashboard" />
          
          {isAdmin && (
            <>
                <div className="mt-6 px-6 mb-2 text-xs font-bold uppercase tracking-wider
                    text-gray-400 
                    dark:text-slate-500
                ">Admin Area</div>
                <NavItem href="/karyawan" icon={Users} label="Data Karyawan" />
            </>
          )}

          <div className="mt-6 px-6 mb-2 text-xs font-bold uppercase tracking-wider
            text-gray-400 
            dark:text-slate-500
          ">Akun</div>
          <NavItem href="/profile" icon={User} label="Profil Saya" />
        </nav>

        {/* FOOTER SIDEBAR */}
        <div className="p-4 border-t 
            border-gray-100 bg-white
            dark:border-slate-800 dark:bg-slate-900
        ">
            <div className="rounded-xl p-4 flex items-center gap-3
                bg-gray-50 
                dark:bg-slate-800/50
            ">
                <div className="p-2 rounded-lg 
                    bg-indigo-100 text-indigo-600
                    dark:bg-indigo-500/20 dark:text-indigo-400
                ">
                    <LayoutDashboard size={18} />
                </div>
                <div>
                    <p className="text-xs font-semibold text-gray-700 dark:text-white">Versi Aplikasi</p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">v1.0.0 (Stable)</p>
                </div>
            </div>
        </div>
      </aside>

      {/* --- KONTEN UTAMA --- */}
      <main className="flex-1 min-h-screen transition-all duration-300 md:ml-72 bg-gray-50 dark:bg-slate-950">
         <div className="h-20 md:h-0"></div>
         <div className="p-4 md:p-8 animate-fade-in">
            {children}
         </div>
      </main>

    </div>
  );
}