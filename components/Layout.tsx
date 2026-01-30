import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MapPin, LogOut, ShieldCheck, Github } from 'lucide-react';
import { ApiService } from '../services/mockApi';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = ApiService.isAuthenticated();

  const handleLogout = () => {
    ApiService.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Header */}
      <header className="bg-black border-b border-zinc-800 text-white sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 font-extrabold text-xl hover:text-blue-500 transition-colors group tracking-tighter">
            <div className="p-1.5 bg-blue-600 rounded-none border border-blue-400 group-hover:bg-blue-500 transition-colors">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span>DELHI<span className="text-blue-500">PULSE</span></span>
          </Link>

          <nav className="flex items-center space-x-8">
            <Link to="/" className={`text-sm font-bold uppercase tracking-widest hover:text-blue-500 transition-colors ${location.pathname === '/' ? 'text-blue-500' : 'text-zinc-400'}`}>
              Events
            </Link>
            
            {isAdmin ? (
              <>
                <Link to="/admin" className={`text-sm font-bold uppercase tracking-widest hover:text-blue-500 transition-colors ${location.pathname.includes('/admin') ? 'text-blue-500' : 'text-zinc-400'}`}>
                  Dashboard
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest bg-zinc-900 border border-zinc-700 hover:border-red-500 hover:text-red-500 text-zinc-300 px-4 py-2 rounded-none transition-all"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <Link to="/login" className="flex items-center space-x-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-zinc-800 py-10 text-center text-zinc-500 text-xs uppercase tracking-widest">
        <div className="container mx-auto px-4">
          <p className="mb-4 text-zinc-400">&copy; {new Date().getFullYear()} DelhiPulse. NCR's Event Engine.</p>
          <div className="flex justify-center items-center space-x-6 font-bold">
            <a href="#" className="hover:text-blue-500 transition-colors">About</a>
            <a href="#" className="hover:text-ec4899 transition-colors text-pink-500">Submit Event</a>
            <span className="flex items-center gap-1 hover:text-white transition-colors">
                 Powered by <Github size={12}/> Open Source
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};