import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiService } from '../services/mockApi';
import { EventInput, EventStatus, EventMode, SourceType } from '../types';
import { DEFAULT_TAGS } from '../constants';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';

const INITIAL_STATE: EventInput = {
  title: '',
  organizer: '',
  description: '',
  mode: EventMode.OFFLINE,
  location: '',
  startDate: '',
  endDate: '',
  bookingDeadline: '',
  entryFee: '',
  tags: [],
  ticketLink: '',
  sourceUrl: '',
  sourceType: SourceType.MANUAL,
  status: EventStatus.DRAFT,
};

export const AdminEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<EventInput>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ApiService.isAuthenticated()) {
      navigate('/login');
      return;
    }

    if (isEdit && id) {
      loadEvent(id);
    }
  }, [id, isEdit, navigate]);

  const loadEvent = async (eventId: string) => {
    setLoading(true);
    const res = await ApiService.getEventById(eventId);
    if (res.success && res.data) {
      const { _id, createdAt, updatedAt, slug, ...rest } = res.data;
      setFormData(rest);
    } else {
      setError("Failed to load event data");
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTagToggle = (tag: string) => {
    setFormData(prev => {
      const currentTags = prev.tags;
      if (currentTags.includes(tag)) {
        return { ...prev, tags: currentTags.filter(t => t !== tag) };
      } else {
        return { ...prev, tags: [...currentTags, tag] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEdit && id) {
        await ApiService.updateEvent(id, formData);
      } else {
        const res = await ApiService.createEvent(formData);
        if (!res.success) throw new Error(res.error);
      }
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-white focus:border-blue-500 focus:outline-none focus:bg-black rounded-none transition-colors placeholder-zinc-700 font-mono text-sm";
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800">
        <button onClick={() => navigate('/admin')} className="flex items-center text-zinc-500 hover:text-white transition-colors font-bold uppercase tracking-wider text-xs">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancel
        </button>
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">{isEdit ? 'Edit Event' : 'Initialize Event'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        {error && (
          <div className="bg-red-900/10 text-red-500 p-4 border border-red-500 flex items-center font-mono text-sm">
             <AlertTriangle className="w-5 h-5 mr-3" />
             {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white uppercase border-l-4 border-blue-500 pl-4">Manifest</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className={labelClass}>Title</label>
              <input name="title" value={formData.title} onChange={handleChange} required className={inputClass} placeholder="EVENT NAME" />
            </div>
            
            <div>
              <label className={labelClass}>Organizer</label>
              <input name="organizer" value={formData.organizer} onChange={handleChange} required className={inputClass} placeholder="ORGANIZATION" />
            </div>

            <div>
              <label className={labelClass}>Mode</label>
              <select name="mode" value={formData.mode} onChange={handleChange} className={inputClass}>
                {Object.values(EventMode).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Venue & Fee */}
        <div className="space-y-6">
           <h3 className="text-xl font-bold text-white uppercase border-l-4 border-pink-500 pl-4">Logistics</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="col-span-2">
                <label className={labelClass}>Location / Venue</label>
                <input name="location" value={formData.location} onChange={handleChange} required className={inputClass} placeholder="FULL ADDRESS" />
             </div>
             <div>
                <label className={labelClass}>Entry Fee</label>
                <input name="entryFee" value={formData.entryFee} onChange={handleChange} required className={inputClass} placeholder="PRICE / FREE" />
             </div>
             <div>
                <label className={labelClass}>Booking Deadline</label>
                <input type="datetime-local" name="bookingDeadline" value={formData.bookingDeadline.substring(0, 16)} onChange={handleChange} className={`${inputClass} [color-scheme:dark]`} />
             </div>
           </div>
        </div>

        {/* Schedule */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white uppercase border-l-4 border-zinc-500 pl-4">Timeline</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <label className={labelClass}>Start Date</label>
               <input type="datetime-local" name="startDate" value={formData.startDate.substring(0, 16)} onChange={handleChange} required className={`${inputClass} [color-scheme:dark]`} />
             </div>
             <div>
               <label className={labelClass}>End Date</label>
               <input type="datetime-local" name="endDate" value={formData.endDate.substring(0, 16)} onChange={handleChange} required className={`${inputClass} [color-scheme:dark]`} />
             </div>
          </div>
        </div>

        {/* Links & Content */}
        <div className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Ticket Link</label>
                <input type="url" name="ticketLink" value={formData.ticketLink} onChange={handleChange} required className={inputClass} placeholder="HTTPS://" />
              </div>
              <div>
                <label className={labelClass}>Source URL</label>
                <input type="url" name="sourceUrl" value={formData.sourceUrl} onChange={handleChange} required className={inputClass} placeholder="HTTPS://" />
              </div>
              
              <div className="col-span-2">
                 <label className={labelClass}>Description (Markdown)</label>
                 <textarea name="description" value={formData.description} onChange={handleChange} rows={6} className={inputClass} placeholder="# MARKDOWN SUPPORTED" />
              </div>

              <div className="col-span-2">
                 <label className={labelClass}>Tags</label>
                 <div className="flex flex-wrap gap-2 border border-zinc-800 p-4 bg-zinc-950">
                    {DEFAULT_TAGS.map(tag => (
                      <button 
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors rounded-none ${formData.tags.includes(tag) ? 'bg-blue-600 text-white border-blue-600' : 'bg-black text-zinc-500 border-zinc-800 hover:border-white hover:text-white'}`}
                      >
                        {tag}
                      </button>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        {/* Status Control */}
        <div className="bg-zinc-950 border border-zinc-800 p-6 flex items-center justify-between">
           <div>
             <span className="block text-white font-bold uppercase tracking-wider">Status</span>
             <span className="text-zinc-500 text-xs font-mono">CURRENT: {formData.status}</span>
           </div>
           <select name="status" value={formData.status} onChange={handleChange} className="px-4 py-2 border border-zinc-700 bg-black text-white font-mono text-sm focus:border-blue-500 outline-none rounded-none uppercase">
              <option value={EventStatus.DRAFT}>Draft</option>
              <option value={EventStatus.PUBLISHED}>Published</option>
              <option value={EventStatus.EXPIRED}>Expired</option>
           </select>
        </div>

        <div className="flex justify-end pt-8">
           <button 
             type="submit" 
             disabled={loading}
             className="bg-white hover:bg-zinc-200 text-black px-10 py-4 font-black uppercase tracking-widest flex items-center transition-all disabled:opacity-50 rounded-none border border-transparent hover:border-blue-500"
           >
             <Save className="w-5 h-5 mr-3" />
             {loading ? 'Processing...' : 'Commit Changes'}
           </button>
        </div>
      </form>
    </div>
  );
};