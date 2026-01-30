import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiService } from '../services/mockApi';
import { FestEvent } from '../types';
import { Badge } from '../components/Badge';
import { Calendar, MapPin, Ticket, ExternalLink, Clock, ShieldCheck, ArrowLeft, Tag } from 'lucide-react';

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<FestEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      const res = await ApiService.getEventById(id);
      if (res.success && res.data) {
        setEvent(res.data);
      } else {
        setError("Event not found or removed.");
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  );

  if (error || !event) return (
    <div className="text-center py-20">
      <h2 className="text-4xl font-black text-white uppercase">404 Error</h2>
      <p className="text-zinc-500 mt-4 font-mono">{error || "Event data corrupted."}</p>
      <Link to="/" className="inline-block mt-8 px-6 py-3 bg-white text-black font-bold uppercase hover:bg-blue-600 hover:text-white transition-colors">Return Home</Link>
    </div>
  );

  const isExpired = new Date(event.endDate) < new Date();

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm font-bold uppercase tracking-widest text-zinc-500 hover:text-white mb-8 transition-colors group">
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Pulse
      </Link>

      <div className="bg-black border border-zinc-800">
        {/* Header Banner */}
        <div className="p-8 md:p-16 border-b border-zinc-800 bg-zinc-950/50 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[80px]"></div>
           
           <div className="relative z-10">
            <div className="flex flex-wrap gap-3 mb-6">
              <Badge variant="outline" className="border-zinc-600 text-zinc-300">{event.mode}</Badge>
              {isExpired ? (
                  <Badge variant="filledError">Event Ended</Badge>
              ) : (
                  <Badge variant="filledSuccess">Upcoming</Badge>
              )}
            </div>
            <h1 className="text-4xl md:text-7xl font-black text-white mb-6 uppercase leading-none tracking-tight">{event.title}</h1>
            <p className="text-xl text-blue-500 font-mono uppercase tracking-widest">// {event.organizer}</p>
           </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 border-b border-zinc-800 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
            <div className="p-8 flex flex-col justify-center space-y-4">
               <div className="flex items-center">
                  <Ticket className="w-6 h-6 mr-4 text-pink-500" />
                  <div>
                      <span className="block text-xs text-zinc-500 uppercase tracking-widest">Entry Fee</span>
                      <span className="text-xl font-bold text-white">{event.entryFee}</span>
                  </div>
               </div>
               <div className="flex items-center">
                  <MapPin className="w-6 h-6 mr-4 text-blue-500" />
                  <div>
                      <span className="block text-xs text-zinc-500 uppercase tracking-widest">Location</span>
                      <span className="text-lg font-bold text-white">{event.location}</span>
                  </div>
               </div>
            </div>

            <div className="p-8 flex flex-col sm:flex-row gap-4 items-center justify-center bg-zinc-950">
                <a 
                  href={event.sourceUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full sm:w-auto text-center px-6 py-4 border border-zinc-700 text-white font-bold uppercase tracking-wider hover:bg-zinc-800 hover:border-white transition-colors"
                >
                  Source
                </a>
                <a 
                  href={event.ticketLink}
                  target="_blank" 
                  rel="noreferrer"
                  className={`w-full sm:w-auto text-center px-8 py-4 font-bold uppercase tracking-wider text-white transition-all ${isExpired ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]'}`}
                >
                   {isExpired ? 'Closed' : 'Book Tickets'}
                </a>
            </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
            <div className="lg:col-span-2 p-8 md:p-12">
                <section className="mb-12">
                    <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-wider border-l-4 border-pink-500 pl-4">About</h2>
                    <div className="prose prose-invert max-w-none text-zinc-400 font-sans leading-relaxed">
                        <p className="whitespace-pre-line">{event.description}</p>
                    </div>
                </section>

                <section>
                  <h3 className="text-xl font-black text-white mb-6 uppercase tracking-wider border-l-4 border-blue-500 pl-4">Schedule</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-zinc-950 border border-zinc-800 p-6">
                          <span className="block text-xs text-zinc-500 uppercase tracking-widest mb-2">Starts</span>
                          <span className="text-lg font-bold text-white block">
                             {new Date(event.startDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="text-blue-500 font-mono">
                             {new Date(event.startDate).toLocaleTimeString(undefined, { hour: '2-digit', minute:'2-digit' })}
                          </span>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-800 p-6">
                          <span className="block text-xs text-zinc-500 uppercase tracking-widest mb-2">Ends</span>
                          <span className="text-lg font-bold text-white block">
                             {new Date(event.endDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="text-pink-500 font-mono">
                             {new Date(event.endDate).toLocaleTimeString(undefined, { hour: '2-digit', minute:'2-digit' })}
                          </span>
                      </div>
                  </div>
                </section>
            </div>

            <aside className="p-8 space-y-8 bg-zinc-950/30">
               <div>
                   <h3 className="font-bold text-white mb-4 flex items-center uppercase tracking-widest text-xs">
                       <Tag className="w-4 h-4 mr-2 text-zinc-500" />
                       Tags
                   </h3>
                   <div className="flex flex-wrap gap-2">
                       {event.tags.map(tag => (
                           <Badge key={tag} variant="default" className="bg-black border-zinc-800 text-zinc-400">#{tag}</Badge>
                       ))}
                   </div>
               </div>

               {event.sourceType === 'ai' && (
                 <div className="border border-blue-900/50 bg-blue-900/10 p-6">
                    <div className="flex items-start gap-3">
                       <ShieldCheck className="w-5 h-5 text-blue-500 mt-1" />
                       <div>
                          <h4 className="font-bold text-blue-400 text-sm uppercase tracking-wider">AI Verified</h4>
                          <p className="text-blue-300/60 text-xs mt-2 font-mono">
                              Confidence: {Math.round((event.aiConfidence || 0) * 100)}%
                          </p>
                       </div>
                    </div>
                 </div>
               )}

               <div className="pt-8 border-t border-zinc-800">
                   <p className="text-[10px] uppercase tracking-widest text-zinc-600 text-center font-mono">
                       Updated: {new Date(event.updatedAt).toLocaleDateString()}
                   </p>
               </div>
            </aside>
        </div>
      </div>
    </div>
  );
};