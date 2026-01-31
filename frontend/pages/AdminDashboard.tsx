import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiService } from '../services/realApi';
import { FestEvent } from '../types';
import { Badge } from '../components/Badge';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [events, setEvents] = useState<FestEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!ApiService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    const res = await ApiService.getEvents({});
    if (res.success && res.data) {
      setEvents(res.data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("DELETE EVENT? THIS ACTION CANNOT BE UNDONE.")) {
      await ApiService.deleteEvent(id);
      loadData();
    }
  };

  const filteredEvents = events.filter(h => 
    h.title.toLowerCase().includes(filter.toLowerCase()) || 
    h.organizer.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-zinc-800 pb-8">
        <div>
           <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Console</h1>
           <p className="text-zinc-500 font-mono text-sm mt-2 uppercase tracking-widest">Manage Delhi-NCR Data Feed</p>
        </div>
        <Link 
          to="/admin/new" 
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 font-bold uppercase tracking-widest flex items-center transition-colors rounded-none"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Link>
      </div>

      <div className="bg-black border border-zinc-800 p-1 flex items-center">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
          <input 
            type="text" 
            placeholder="SEARCH DATABASE..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-zinc-950 text-white font-mono text-sm focus:outline-none focus:bg-black placeholder-zinc-700 uppercase"
          />
        </div>
        <div className="px-6 border-l border-zinc-800 text-xs font-mono text-zinc-400">
            TOTAL: <strong className="text-white">{events.length}</strong>
        </div>
      </div>

      <div className="border border-zinc-800 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-950 border-b border-zinc-800 text-xs uppercase text-zinc-500 font-bold tracking-widest">
              <th className="px-6 py-4">Event</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4 text-right">Ops</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-mono uppercase">Syncing Data...</td></tr>
            ) : filteredEvents.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-mono uppercase">No records found.</td></tr>
            ) : (
              filteredEvents.map(h => (
                <tr key={h._id} className="hover:bg-zinc-900/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white uppercase">{h.title}</div>
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">{h.organizer}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={h.status === 'published' ? 'filledSuccess' : h.status === 'expired' ? 'filledError' : 'default'} className="rounded-none">
                      {h.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400 font-mono uppercase truncate max-w-xs">{h.location}</td>
                  <td className="px-6 py-4 text-sm text-zinc-400 font-mono">
                    {h.startDate ? new Date(h.startDate).toLocaleDateString() : h.date || 'TBD'}
                  </td>
                  <td className="px-6 py-4">
                      <Badge variant={h.sourceType === 'ai' ? 'blue' : 'outline'} className="rounded-none">
                          {h.sourceType === 'ai' ? 'BOT' : 'MANUAL'}
                      </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                     <div className="flex justify-end gap-0">
                       <Link 
                         to={`/admin/edit/${h._id}`} 
                         className="p-2 text-zinc-400 hover:bg-blue-600 hover:text-white transition-colors border border-transparent hover:border-blue-500"
                       >
                          <Edit2 className="w-4 h-4" />
                       </Link>
                       <button 
                         onClick={() => handleDelete(h._id)}
                         className="p-2 text-zinc-400 hover:bg-red-600 hover:text-white transition-colors border border-transparent hover:border-red-500"
                       >
                          <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
