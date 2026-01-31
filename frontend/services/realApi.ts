/**
 * API Service for FestFeast Frontend
 * Connects to the Node.js backend API
 * 
 * Replace mockApi.ts with this for production use
 */

import { FestEvent, EventInput, EventStatus, ApiResponse, SourceType } from "../types";

// API Base URL - set via environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Helper function for making API requests
 */
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Request failed',
      };
    }

    return {
      success: true,
      data: data.data,
      meta: data.meta,
    };
  } catch (error) {
    console.error(`API Error: ${endpoint}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Real API Service - connects to Node.js backend
 */
export const RealApiService = {
  getEvents: async (
    filter?: { mode?: string; tag?: string; status?: string }
  ): Promise<ApiResponse<FestEvent[]>> => {
    const params = new URLSearchParams();
    
    if (filter?.status) params.append('status', filter.status);
    if (filter?.mode) params.append('mode', filter.mode);
    if (filter?.tag) params.append('tag', filter.tag);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/events?${queryString}` : '/events';
    
    return apiRequest<FestEvent[]>(endpoint);
  },

  getLatestEvents: async (limit: number = 20): Promise<ApiResponse<FestEvent[]>> => {
    return apiRequest<FestEvent[]>(`/events/latest?limit=${limit}`);
  },

  getEventById: async (id: string): Promise<ApiResponse<FestEvent>> => {
    return apiRequest<FestEvent>(`/events/${id}`);
  },

  getStats: async (): Promise<ApiResponse<any>> => {
    return apiRequest(`/events/stats`);
  },

  getTags: async (): Promise<ApiResponse<string[]>> => {
    return apiRequest<string[]>(`/events/tags`);
  },

  getEventsByCategory: async (category: string, limit: number = 50): Promise<ApiResponse<FestEvent[]>> => {
    return apiRequest<FestEvent[]>(`/events/category/${category}?limit=${limit}`);
  },

  createEvent: async (input: EventInput): Promise<ApiResponse<FestEvent>> => {
    return apiRequest<FestEvent>('/events', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateEvent: async (id: string, input: Partial<EventInput>): Promise<ApiResponse<FestEvent>> => {
    return apiRequest<FestEvent>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  deleteEvent: async (id: string): Promise<ApiResponse<null>> => {
    return apiRequest<null>(`/events/${id}`, {
      method: 'DELETE',
    });
  },

  triggerScrape: async (apiKey: string): Promise<ApiResponse<any>> => {
    return apiRequest('/scrape', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
    });
  },

  getScraperStatus: async (): Promise<ApiResponse<any>> => {
    return apiRequest('/scrape/status');
  },

  healthCheck: async (): Promise<ApiResponse<any>> => {
    return apiRequest('/health');
  },

  isAuthenticated: () => !!localStorage.getItem('delhipulse_auth_token'),
  
  login: async (username: string, password: string): Promise<boolean> => {
    if (username === 'admin' && password === 'password123') {
      localStorage.setItem('delhipulse_auth_token', 'mock_jwt_token_xyz');
      return true;
    }
    return false;
  },

  logout: () => localStorage.removeItem('delhipulse_auth_token')
};

export const HybridApiService = {
  getEvents: RealApiService.getEvents,
  getEventById: RealApiService.getEventById,
  getLatestEvents: RealApiService.getLatestEvents,
  getStats: RealApiService.getStats,
  getTags: RealApiService.getTags,
  getEventsByCategory: RealApiService.getEventsByCategory,
  createEvent: RealApiService.createEvent,
  updateEvent: RealApiService.updateEvent,
  deleteEvent: RealApiService.deleteEvent,
  isAuthenticated: RealApiService.isAuthenticated,
  login: RealApiService.login,
  logout: RealApiService.logout,
  triggerScrape: RealApiService.triggerScrape,
  getScraperStatus: RealApiService.getScraperStatus,
  healthCheck: RealApiService.healthCheck,
};

// Export as ApiService for drop-in replacement of mockApi
export const ApiService = HybridApiService;

export default HybridApiService;
