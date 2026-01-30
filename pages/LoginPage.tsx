import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../services/mockApi';
import { Lock } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await ApiService.login(username, password);
    if (success) {
      navigate('/admin');
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md bg-black border border-zinc-800 p-10 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-pink-600"></div>
        
        <div className="mb-10">
          <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 mb-6">
             <Lock className="w-6 h-6 text-blue-500" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Admin Access</h1>
          <p className="text-zinc-500 text-sm mt-2 font-mono uppercase tracking-widest">Restricted Area</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border-l-4 border-red-500 text-red-500 text-sm p-4 font-mono">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-white focus:border-blue-500 focus:outline-none focus:bg-black transition-colors rounded-none placeholder-zinc-700"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-white focus:border-blue-500 focus:outline-none focus:bg-black transition-colors rounded-none placeholder-zinc-700"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest py-4 transition-colors rounded-none border border-transparent hover:border-white"
          >
            Authenticate
          </button>
        </form>
        
        <div className="mt-8 text-center text-[10px] text-zinc-600 font-mono uppercase">
           Sys: admin / password123
        </div>
      </div>
    </div>
  );
};