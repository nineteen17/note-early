import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ProfileDTO } from '@/types/api';

// Improved Auth State with persistence
export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: ProfileDTO | null;
  setToken: (token: string | null) => void;
  setProfile: (profile: any) => void; // CHANGED: Accept any to handle API response format
  clearAuth: () => void;
  setIsLoading: (loading: boolean) => void;
}

// Use persist middleware to save auth state to localStorage
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      token: null,
      isAuthenticated: false,
      isLoading: true,
      profile: null,
      
      // Actions
      setToken: (token) => {
        const newState = {
          token,
          isAuthenticated: !!token,
        };
        console.log("AuthStore: Setting token state:", {
          tokenExists: !!token,
          isAuthenticated: !!token,
        });
        set(newState);
        // If token is cleared, also clear profile
        if (!token) {
          console.log("AuthStore: Token cleared, also clearing profile.");
          set({ profile: null });
        }
      },
      
      setProfile: (profile) => {
        console.log("AuthStore: Setting profile", profile);
        
        // ADDED: Handle null profile case
        if (!profile) {
          set({ profile: null });
          return;
        }
        
        // ADDED: Normalize the profile data to match ProfileDTO interface
        const normalizedProfile: ProfileDTO = {
          ...profile,
          // ADDED: Ensure profileId exists - use either profileId or id from API response
          profileId: profile.profileId || profile.id,
        };
        
        console.log("AuthStore: Normalized profile:", normalizedProfile); // ADDED: Debug log
        set({ profile: normalizedProfile }); // CHANGED: Store normalized profile
      },
      
      clearAuth: () => {
        console.log("AuthStore: Clearing auth state.");
        
        // First clear the state
        set({
          token: null,
          profile: null,
          isAuthenticated: false,
          isLoading: false,
        });
        
        // Clear both ways - this is more aggressive
        try {
          // Remove directly using localStorage API
          window.localStorage.removeItem('auth-storage');
          // Also use the persist API 
          useAuthStore.persist.clearStorage();
          console.log("AuthStore: Storage cleared successfully");
        } catch (error) {
          console.error("AuthStore: Error clearing storage:", error);
        }
      },
      
      setIsLoading: (loading) => {
        console.log("AuthStore: Setting isLoading:", loading);
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        profile: state.profile,
      }),
    }
  )
);

// Selectors
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectProfile = (state: AuthState) => state.profile;
export const selectAuthToken = (state: AuthState) => state.token;
export const selectIsLoadingAuth = (state: AuthState) => state.isLoading;