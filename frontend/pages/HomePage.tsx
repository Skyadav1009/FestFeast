import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Ticket, Clock, ArrowRight } from 'lucide-react';
import { ApiService } from '../services/realApi';
import { FestEvent, EventStatus, EventMode } from '../types';
import { Badge } from '../components/Badge';
import { DEFAULT_TAGS } from '../constants';

export const HomePage: React.FC = () => {
  const [events, setEvents] = useState<FestEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [selectedMode, selectedTag]);

  const fetchEvents = async () => {
    setLoading(true);
    const filter: any = { status: EventStatus.PUBLISHED };
    if (selectedMode !== 'all') filter.mode = selectedMode;
    if (selectedTag) filter.tag = selectedTag;

    const response = await ApiService.getEvents(filter);
    if (response.success && response.data) {
      setEvents(response.data);
    }
    setLoading(false);
  };

  const isClosingSoon = (dateStr: string) => {
    const days = (new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return days > 0 && days <= 3;
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="py-12 border-b border-zinc-800 relative">
        <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter mb-6 uppercase leading-none">
          Delhi<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-pink-600">Pulse</span>
        </h1>
        <p className="text-xl md:text-2xl text-zinc-400 font-mono border-l-4 border-blue-600 pl-6 max-w-3xl">
          The curated feed for NCR's underground fests, concerts, and cultural riots.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between sticky top-16 bg-black/95 backdrop-blur-sm z-40 py-6 border-b border-zinc-800">
        <div className="flex gap-0 border border-zinc-800">
          <button 
            onClick={() => setSelectedMode('all')}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${selectedMode === 'all' ? 'bg-blue-600 text-white' : 'bg-black text-zinc-500 hover:bg-zinc-900 hover:text-white'}`}
          >
            All
          </button>
          {Object.values(EventMode).map(mode => (
             <button 
             key={mode}
             onClick={() => setSelectedMode(mode)}
             className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-l border-zinc-800 ${selectedMode === mode ? 'bg-blue-600 text-white' : 'bg-black text-zinc-500 hover:bg-zinc-900 hover:text-white'}`}
           >
             {mode}
           </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
           {selectedTag && (
             <Badge variant="magenta" className="cursor-pointer" onClick={() => setSelectedTag(null)}>
               {selectedTag} ×
             </Badge>
           )}
           {!selectedTag && DEFAULT_TAGS.slice(0, 4).map(tag => (
             <Badge 
              key={tag} 
              variant="outline" 
              className="cursor-pointer hover:bg-zinc-900 hover:border-blue-500 hover:text-blue-400"
              onClick={() => setSelectedTag(tag)}
            >
               {tag}
             </Badge>
           ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-zinc-800">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-black border-r border-b border-zinc-800 h-96 p-8 animate-pulse">
               <div className="h-48 bg-zinc-900 mb-6"></div>
               <div className="h-6 bg-zinc-900 w-3/4 mb-4"></div>
               <div className="h-4 bg-zinc-900 w-1/2"></div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-32 border border-zinc-800 bg-zinc-950">
          <div className="text-zinc-700 mb-4">
             <Calendar className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-2xl font-bold text-white uppercase tracking-wider mb-2">No Events Found</h3>
          <p className="text-zinc-500 font-mono">Reset filters to see more.</p>
          {selectedTag || selectedMode !== 'all' ? (
              <button 
                onClick={() => {setSelectedMode('all'); setSelectedTag(null);}} 
                className="mt-6 text-blue-500 font-bold uppercase tracking-widest hover:text-white border-b-2 border-blue-500 pb-1"
              >
                Clear Filters
              </button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map(event => (
            <Link 
              to={`/event/${event._id}`} 
              key={event._id}
              className="group relative bg-black border border-zinc-800 hover:border-blue-600 transition-colors duration-200 flex flex-col h-full"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-pink-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              
              <div className="p-8 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <Badge variant="outline" className="text-zinc-500 border-zinc-800 group-hover:border-blue-500/50 group-hover:text-blue-500">{event.mode}</Badge>
                  {isClosingSoon(event.bookingDeadline) && (
                    <Badge variant="filledError" className="animate-pulse">Fast Filling</Badge>
                  )}
                </div>

                <h3 className="text-2xl font-black text-white mb-2 uppercase leading-tight group-hover:text-blue-500 transition-colors">
                  {event.title}
                </h3>
                
                <p className="text-sm text-zinc-500 font-mono mb-6 uppercase tracking-wider">
                   // {event.organizer}
                </p>

                <div className="mt-auto space-y-4 border-t border-zinc-900 pt-6">
                  <div className="flex items-center text-sm font-bold text-zinc-300">
                    <MapPin className="w-4 h-4 mr-3 text-pink-600" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-zinc-400">
                        <Calendar className="w-4 h-4 mr-3 text-zinc-600" />
                        <span className="font-mono">{new Date(event.startDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}).toUpperCase()}</span>
                    </div>
                    <div className="flex items-center text-blue-500 font-black tracking-wider">
                        <Ticket className="w-4 h-4 mr-2" />
                        <span>{event.entryFee}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-8 pb-8 flex flex-wrap gap-2">
                  {event.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] uppercase font-bold text-zinc-600 bg-zinc-900/50 px-2 py-1">#{tag}</span>
                  ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
