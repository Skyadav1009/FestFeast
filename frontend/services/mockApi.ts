import { FestEvent, EventInput, EventStatus, ApiResponse, SourceType } from "../types";
import { INITIAL_EVENTS_SEED } from "../constants";

const STORAGE_KEY = 'delhipulse_data';
const AUTH_KEY = 'delhipulse_auth_token';

const getDB = (): FestEvent[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EVENTS_SEED));
    return INITIAL_EVENTS_SEED as FestEvent[];
  }
  return JSON.parse(stored);
};

const saveDB = (data: FestEvent[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const ApiService = {
  getEvents: async (
    filter?: { mode?: string; tag?: string; status?: string }
  ): Promise<ApiResponse<FestEvent[]>> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let data = getDB();
    const now = new Date();
    let hasUpdates = false;
    
    // Auto-expiry logic based on End Date for fests
    data = data.map(h => {
      if (h.status === EventStatus.PUBLISHED && new Date(h.endDate) < now) {
        hasUpdates = true;
        return { ...h, status: EventStatus.EXPIRED }; 
      }
      return h;
    });

    if (hasUpdates) saveDB(data);

    if (filter?.status) {
      data = data.filter(h => h.status === filter.status);
    }

    if (filter?.mode) {
      data = data.filter(h => h.mode === filter.mode);
    }

    if (filter?.tag) {
      data = data.filter(h => h.tags.includes(filter.tag));
    }

    // Sort: Happening soonest first
    data.sort((a, b) => {
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        return dateA - dateB;
    });

    return { success: true, data };
  },

  getEventById: async (id: string): Promise<ApiResponse<FestEvent>> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const data = getDB();
    const event = data.find(h => h._id === id);
    if (event) return { success: true, data: event };
    return { success: false, error: "Event not found" };
  },

  createEvent: async (input: EventInput): Promise<ApiResponse<FestEvent>> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    const data = getDB();
    
    const duplicate = data.find(h => h.sourceUrl === input.sourceUrl || h.title === input.title);
    if (duplicate) {
        return { success: false, error: "An event with this Source URL or Title already exists." };
    }

    const newEvent: FestEvent = {
      ...input,
      _id: `evt_${Date.now()}`,
      slug: input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceType: input.sourceType || SourceType.MANUAL, 
    };

    data.push(newEvent);
    saveDB(data);
    return { success: true, data: newEvent };
  },

  updateEvent: async (id: string, input: Partial<EventInput>): Promise<ApiResponse<FestEvent>> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    const data = getDB();
    const index = data.findIndex(h => h._id === id);

    if (index === -1) return { success: false, error: "Event not found" };

    const updatedEvent = {
      ...data[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };

    data[index] = updatedEvent;
    saveDB(data);
    return { success: true, data: updatedEvent };
  },

  deleteEvent: async (id: string): Promise<ApiResponse<null>> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    let data = getDB();
    data = data.filter(h => h._id !== id);
    saveDB(data);
    return { success: true };
  },

  isAuthenticated: () => !!localStorage.getItem(AUTH_KEY),
  
  login: async (username: string, password: string): Promise<boolean> => {
     await new Promise(resolve => setTimeout(resolve, 500));
     if (username === 'admin' && password === 'password123') {
         localStorage.setItem(AUTH_KEY, 'mock_jwt_token_xyz');
         return true;
     }
     return false;
  },

  logout: () => localStorage.removeItem(AUTH_KEY)
};
