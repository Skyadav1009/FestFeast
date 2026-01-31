/**
 * Device Token Service
 * Manages anonymous device tokens for saving events
 */

const DEVICE_TOKEN_KEY = 'festfeast_device_token';
const SAVED_EVENTS_CACHE_KEY = 'festfeast_saved_events';

// API base URL from environment variable
const API_BASE: string = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get stored device token from localStorage
 */
export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(DEVICE_TOKEN_KEY);
  } catch {
    return null;
  }
};

/**
 * Store device token in localStorage
 */
export const storeToken = (token: string): void => {
  try {
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
  } catch (e) {
    console.warn('Failed to store device token:', e);
  }
};

/**
 * Get or create a device token
 */
export const getOrCreateDeviceToken = async (): Promise<string> => {
  // Check for existing token
  const existingToken = getStoredToken();
  
  if (existingToken) {
    // Verify it's still valid by calling the API
    try {
      const response = await fetch(`${API_BASE}/saved/token`, {
        headers: {
          'X-Device-Token': existingToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.token) {
          return existingToken;
        }
      }
    } catch {
      // Token invalid, will generate new one below
    }
  }
  
  // Generate new token
  try {
    const response = await fetch(`${API_BASE}/saved/token`, {
      method: 'POST'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.token) {
        storeToken(data.data.token);
        return data.data.token;
      }
    }
  } catch (e) {
    console.error('Failed to get device token:', e);
  }
  
  // Fallback - return existing or empty
  return existingToken || '';
};

/**
 * Saved Events API with token handling
 */
export const SavedEventsService = {
  /**
   * Get auth headers with device token
   */
  async getHeaders(): Promise<HeadersInit> {
    const token = await getOrCreateDeviceToken();
    return {
      'Content-Type': 'application/json',
      'X-Device-Token': token
    };
  },

  /**
   * Get all saved events
   */
  async getSavedEvents(): Promise<{ success: boolean; data: any[]; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE}/saved`, { headers });
      const data = await response.json();
      return data;
    } catch (error: any) {
      return { success: false, data: [], error: error.message };
    }
  },

  /**
   * Get saved event IDs (for quick checking on homepage)
   */
  async getSavedEventIds(): Promise<string[]> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE}/saved/ids`, { headers });
      const data = await response.json();
      
      if (data.success) {
        // Cache locally for quick access
        try {
          localStorage.setItem(SAVED_EVENTS_CACHE_KEY, JSON.stringify(data.data));
        } catch {}
        return data.data;
      }
      return [];
    } catch {
      // Return cached data if available
      try {
        const cached = localStorage.getItem(SAVED_EVENTS_CACHE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {}
      return [];
    }
  },

  /**
   * Save an event
   */
  async saveEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE}/saved/${eventId}`, {
        method: 'POST',
        headers
      });
      const data = await response.json();
      
      if (data.success) {
        // Update local cache
        this.updateCache(eventId, true);
      }
      
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Unsave an event
   */
  async unsaveEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE}/saved/${eventId}`, {
        method: 'DELETE',
        headers
      });
      const data = await response.json();
      
      if (data.success) {
        // Update local cache
        this.updateCache(eventId, false);
      }
      
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Toggle saved status
   */
  async toggleSaved(eventId: string, currentlySaved: boolean): Promise<boolean> {
    if (currentlySaved) {
      const result = await this.unsaveEvent(eventId);
      return !result.success; // Return new saved status
    } else {
      const result = await this.saveEvent(eventId);
      return result.success; // Return new saved status
    }
  },

  /**
   * Check if event is saved (from cache)
   */
  isEventSavedLocally(eventId: string): boolean {
    try {
      const cached = localStorage.getItem(SAVED_EVENTS_CACHE_KEY);
      if (cached) {
        const ids = JSON.parse(cached);
        return ids.includes(eventId);
      }
    } catch {}
    return false;
  },

  /**
   * Update local cache
   */
  updateCache(eventId: string, saved: boolean): void {
    try {
      const cached = localStorage.getItem(SAVED_EVENTS_CACHE_KEY);
      let ids: string[] = cached ? JSON.parse(cached) : [];
      
      if (saved && !ids.includes(eventId)) {
        ids.push(eventId);
      } else if (!saved) {
        ids = ids.filter(id => id !== eventId);
      }
      
      localStorage.setItem(SAVED_EVENTS_CACHE_KEY, JSON.stringify(ids));
    } catch {}
  },

  /**
   * Get cached saved IDs (synchronous)
   */
  getCachedSavedIds(): string[] {
    try {
      const cached = localStorage.getItem(SAVED_EVENTS_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  }
};

export default SavedEventsService;
