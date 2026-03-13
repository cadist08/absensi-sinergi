import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react'; 
import { Home, Users, User, Menu, X, LayoutDashboard, ChevronRight, ChevronLeft, FileText, LogOut, Banknote, Briefcase } from 'lucide-react'; 

export default function Layout({ children }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  
  const [isMinimized, setIsMinimized] = useState(false);

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

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarMinimized');
    if (savedState === 'true') {
      setIsMinimized(true);
    }
  }, []);

  const toggleMinimize = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    localStorage.setItem('sidebarMinimized', newState.toString());
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout');
      router.push('/');
    } catch (error) {
      console.error("Gagal logout:", error);
    }
  };

  const isActive = (path) => router.pathname === path;

  // 🌟 PERBAIKAN LOGIKA RESPONSIVE: Mengabaikan isMinimized di layar HP (Mobile)
  const NavItem = ({ href, icon: Icon, label, onClick }) => {
    const active = isActive(href);
    return (
      <Link 
        href={href} 
        onClick={onClick}
        className={`
          relative group flex items-center py-3 rounded-xl transition-all duration-200 font-medium
          ${isMinimized ? 'justify-start md:justify-center px-4 md:px-0 mx-4 md:mx-2' : 'justify-between px-4 mx-4'}
          ${active 
            ? 'bg-indigo-50 text-indigo-600 shadow-sm dark:bg-indigo-600 dark:text-white dark:shadow-indigo-900/50' 
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}
        `}
      >
        <div className="flex items-center gap-3">
            <Icon size={20} className={active ? 'text-indigo-600 dark:text-white' : 'text-gray-400 group-hover:text-gray-600 dark:text-slate-500 dark:group-hover:text-white transition-colors'} /> 
            <span className={`animate-in fade-in duration-200 ${isMinimized ? 'md:hidden block' : 'block'}`}>{label}</span>
        </div>
        
        {active && <ChevronRight size={16} className={`text-indigo-400 dark:text-white/50 animate-in fade-in duration-200 ${isMinimized ? 'md:hidden block' : 'block'}`} />}

        {isMinimized && (
            <div className="hidden md:block absolute left-full ml-4 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap shadow-xl dark:bg-white dark:text-slate-900">
               {label}
            </div>
        )}
      </Link>
    );
  };

  const handleMobileNavClick = () => {
      if (window.innerWidth < 768) {
          setIsSidebarOpen(false);
      }
  };

  return (
    <>
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="flex h-[100dvh] bg-gray-50 dark:bg-slate-950 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300 overflow-hidden">
        
        {/* --- MOBILE HEADER --- */}
        <div className="md:hidden fixed top-0 w-full z-50 p-4 flex justify-between items-center shadow-sm backdrop-blur-md border-b bg-white/80 border-gray-200 dark:bg-slate-900/90 dark:border-slate-800 print:hidden">
          <div className="flex items-center">
              <img src="/logos.png" alt="Logo" className="h-8 w-auto object-contain dark:brightness-0 dark:invert dark:opacity-90" />
          </div>
          <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 rounded-lg transition text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Menu size={26} />
          </button>
        </div>

        {/* --- OVERLAY GELAP MOBILE --- */}
        <div 
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden print:hidden
          ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* --- SIDEBAR --- */}
        <aside className={`
          fixed top-0 left-0 h-[100dvh] shadow-2xl z-50 transition-all duration-300 ease-in-out border-r flex flex-col
          bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-800 print:hidden
          ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'} 
          md:translate-x-0 ${isMinimized ? 'md:w-20' : 'md:w-72'}
        `}>
          
          <button 
              onClick={toggleMinimize} 
              className="hidden md:flex absolute -right-3.5 top-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-1.5 z-50 shadow-lg border-2 border-white dark:border-slate-900 transition-transform hover:scale-110"
          >
              {isMinimized ? <ChevronRight size={14} strokeWidth={3}/> : <ChevronLeft size={14} strokeWidth={3}/>}
          </button>

          {/* HEADER LOGO */}
          <div className={`h-20 md:h-24 flex items-center justify-between md:${isMinimized ? 'justify-center' : 'justify-between'} px-6 border-b border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900 transition-all duration-300`}>
            <div className="flex items-center justify-center">
               {/* Mobile Logo Selalu Tampil Penuh */}
               <img src="/logos.png" alt="Logo Sinergi" className="md:hidden h-8 w-auto object-contain dark:brightness-0 dark:invert dark:opacity-90" />
               
               {/* Desktop Logo Adaptif */}
               <div className="hidden md:flex">
                   {isMinimized ? (
                       <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg animate-in zoom-in duration-200">S</div>
                   ) : (
                       <img src="/logos.png" alt="Logo Sinergi" className="h-10 w-auto object-contain dark:brightness-0 dark:invert dark:opacity-90 animate-in fade-in duration-200" />
                   )}
               </div>
            </div>
            
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1.5 rounded-lg text-gray-500 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 focus:outline-none">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 py-6 space-y-1 overflow-y-auto overflow-x-hidden hide-scrollbar">
            
            {isMinimized && <div className="hidden md:block mx-6 mb-4 border-t-2 border-gray-100 dark:border-slate-800"></div>}
            <div className={`px-6 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 ${isMinimized ? 'md:hidden block' : 'block'}`}>Menu Utama</div>
            
            <NavItem href="/dashboard" icon={Home} label="Dashboard" onClick={handleMobileNavClick} />
            <NavItem href="/izin" icon={FileText} label="Izin & Cuti" onClick={handleMobileNavClick} />
            <NavItem href="/penggajian" icon={Banknote} label="Penggajian" onClick={handleMobileNavClick} />
            
            {isAdmin && (
              <>
                  {isMinimized && <div className="hidden md:block mx-6 my-4 border-t-2 border-gray-100 dark:border-slate-800"></div>}
                  <div className={`mt-8 px-6 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 ${isMinimized ? 'md:hidden block' : 'block'}`}>Admin Area</div>
                  
                  <NavItem href="/karyawan" icon={Users} label="Data Karyawan" onClick={handleMobileNavClick} />
                  <NavItem href="/master-data" icon={Briefcase} label="Master Data" onClick={handleMobileNavClick} />
              </>
            )}

            {isMinimized && <div className="hidden md:block mx-6 my-4 border-t-2 border-gray-100 dark:border-slate-800"></div>}
            <div className={`mt-8 px-6 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 ${isMinimized ? 'md:hidden block' : 'block'}`}>Akun</div>
            
            <NavItem href="/profile" icon={User} label="Profil Saya" onClick={handleMobileNavClick} />

            {/* TOMBOL LOGOUT */}
            <button 
              onClick={handleLogout}
              className={`
                relative group flex items-center py-3 mt-2 rounded-xl transition-all duration-200 font-medium 
                text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300
                ${isMinimized ? 'justify-start md:justify-center px-4 md:px-0 mx-4 md:mx-2 md:w-[calc(100%-1rem)]' : 'justify-start px-4 mx-4 w-[calc(100%-2rem)]'}
              `}
            >
              <div className="flex items-center gap-3">
                <LogOut size={20} className="text-rose-400 group-hover:text-rose-600 dark:text-rose-400 dark:group-hover:text-rose-300 transition-colors" />
                <span className={isMinimized ? 'md:hidden block' : 'block'}>Keluar</span>
              </div>

              {isMinimized && (
                  <div className="hidden md:block absolute left-full ml-4 px-3 py-1.5 bg-rose-500 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap shadow-xl">
                     Keluar
                  </div>
              )}
            </button>
          </nav>

          <div className="p-4 border-t border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 pb-safe">
              <div className={`rounded-xl p-3 flex items-center gap-3 md:${isMinimized ? 'justify-center' : 'justify-start'} bg-gray-50 dark:bg-slate-800/50`}>
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex-shrink-0">
                      <LayoutDashboard size={18} />
                  </div>
                  <div className={`animate-in fade-in duration-200 overflow-hidden whitespace-nowrap ${isMinimized ? 'md:hidden block' : 'block'}`}>
                      <p className="text-xs font-semibold text-gray-700 dark:text-white">Versi Aplikasi</p>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">v2.0.0 (Enterprise)</p>
                  </div>
              </div>
          </div>
        </aside>

        {/* --- KONTEN UTAMA --- */}
        <main className={`flex-1 h-[100dvh] overflow-y-auto overflow-x-hidden transition-all duration-300 bg-gray-50 dark:bg-slate-950 ${isMinimized ? 'md:ml-20' : 'md:ml-72'}`}>
           <div className="h-16 md:h-0 print:hidden"></div>
           <div className="p-4 md:p-8 pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 print:p-0">
              {children}
           </div>
        </main>

      </div>
    </>
  );
}