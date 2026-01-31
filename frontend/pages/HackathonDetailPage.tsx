import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiService } from '../services/realApi';
import { FestEvent } from '../types';
import { Badge } from '../components/Badge';
import { Award, ExternalLink, Clock, ShieldCheck, ArrowLeft, Tag } from 'lucide-react';

export const HackathonDetailPage: React.FC = () => {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
    </div>
  );

  if (error || !event) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold text-zinc-200">Oops!</h2>
      <p className="text-zinc-500 mt-2">{error || "Something went wrong."}</p>
      <Link to="/" className="text-amber-500 hover:underline mt-4 block">Back to Home</Link>
    </div>
  );

  const isExpired = new Date(event.bookingDeadline) < new Date();
  
  const isClosingSoon = (dateStr: string) => {
    const days = (new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return days > 0 && days <= 3;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-zinc-500 hover:text-amber-500 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to listings
      </Link>

      <div className="bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-black p-8 md:p-12 relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-600/20 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant={event.mode === 'Online' ? 'success' : 'warning'} className="bg-zinc-900/50 backdrop-blur border-zinc-700">{event.mode}</Badge>
              {isExpired ? (
                  <Badge variant="filledError">Expired</Badge>
              ) : isClosingSoon(event.bookingDeadline) ? (
                  <Badge variant="filledWarning" className="animate-pulse">Closing Soon</Badge>
              ) : (
                  <Badge variant="filledSuccess">Open to Register</Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">{event.title}</h1>
            <p className="text-xl text-zinc-400 font-medium">Organized by <span className="text-zinc-200">{event.organizer}</span></p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="border-b border-zinc-800 bg-zinc-900/50 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex gap-6 text-sm text-zinc-400">
               <div className="flex items-center">
                  <Award className="w-5 h-5 mr-2 text-amber-500" />
                  <span className="font-semibold text-zinc-200">{event.entryFee}</span>
               </div>
               <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-500" />
                  <span>Deadline: <span className="font-semibold text-zinc-200">{new Date(event.bookingDeadline).toLocaleDateString()}</span></span>
               </div>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
                {(event.sourceUrl || event.link) && (
                  <a 
                    href={event.sourceUrl || event.link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 sm:flex-none justify-center px-4 py-2 border border-zinc-700 rounded-lg text-zinc-300 font-medium hover:bg-zinc-800 hover:text-white transition-colors flex items-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Source
                  </a>
                )}
                {(event.ticketLink || event.sourceUrl || event.link) && (
                  <a 
                    href={event.ticketLink || event.sourceUrl || event.link}
                    target="_blank" 
                    rel="noreferrer"
                    className={`flex-1 sm:flex-none justify-center px-6 py-2 rounded-lg font-bold text-black shadow-lg shadow-amber-900/20 flex items-center transition-all ${isExpired ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed pointer-events-none' : 'bg-amber-500 hover:bg-amber-400 hover:shadow-amber-500/30 hover:-translate-y-0.5'}`}
                  >
                     {isExpired ? 'Registration Closed' : 'Register Now'}
                  </a>
                )}
            </div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-8">
                <section>
                    <h2 className="text-xl font-bold text-white mb-4">Description</h2>
                    <div className="prose prose-invert max-w-none text-zinc-400 whitespace-pre-line leading-relaxed">
                        {event.description}
                    </div>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-white mb-3">Timeline</h3>
                  <div className="space-y-4 bg-zinc-950 p-6 rounded-xl border border-zinc-800">
                      <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Start Date</span>
                          <span className="font-medium text-zinc-200">
                            {event.startDate ? new Date(event.startDate).toLocaleDateString() : event.date || 'TBD'}
                          </span>
                      </div>
                      <div className="w-full h-px bg-zinc-800"></div>
                      <div className="flex justify-between items-center">
                          <span className="text-zinc-500">End Date</span>
                          <span className="font-medium text-zinc-200">
                            {event.endDate ? new Date(event.endDate).toLocaleDateString() : 'TBD'}
                          </span>
                      </div>
                  </div>
                </section>
            </div>

            <aside className="space-y-8">
               <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-6 shadow-sm">
                   <h3 className="font-bold text-white mb-4 flex items-center">
                       <Tag className="w-4 h-4 mr-2 text-amber-500" />
                       Tags
                   </h3>
                   <div className="flex flex-wrap gap-2">
                       {event.tags.map(tag => (
                           <Badge key={tag} variant="outline" className="px-3 py-1 bg-zinc-900 border-zinc-800">#{tag}</Badge>
                       ))}
                   </div>
               </div>

               {event.sourceType === 'ai' && (
                 <div className="bg-zinc-900 rounded-xl border border-blue-900/30 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 blur-xl"></div>
                    <div className="flex items-start gap-3 relative z-10">
                       <ShieldCheck className="w-5 h-5 text-blue-400 mt-0.5" />
                       <div>
                          <h4 className="font-bold text-blue-100 text-sm">AI Verified Entry</h4>
                          <p className="text-blue-300/70 text-xs mt-1">
                              This listing was automatically aggregated by ClawDBot with {Math.round((event.aiConfidence || 0) * 100)}% confidence.
                          </p>
                       </div>
                    </div>
                 </div>
               )}

               <div className="text-xs text-zinc-600 text-center">
                   Last updated: {new Date(event.updatedAt).toLocaleDateString()}
               </div>
            </aside>
        </div>
      </div>
    </div>
  );
};
