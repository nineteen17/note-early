import { useAuthStore } from '@/store/authStore';

/**
 * Custom hook to access the authentication state and actions
 * from the Zustand store.
 *
 * Components use this hook to select specific state slices or actions:
 * @example
 * const token = useAuth(state => state.token);
 * const setToken = useAuth(state => state.setToken);
 */
export const useAuth = () => {
  // Directly return the store hook itself for components to select from.
  return useAuthStore;
};

// Optional: If you prefer exposing specific values/actions:
/*
import {
  useAuthStore,
  selectIsAuthenticated,
  selectUser,
  selectAuthToken,
  selectIsLoadingAuth,
} from '@/store/authStore';

export function useAuth() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const user = useAuthStore(selectUser);
  const token = useAuthStore(selectAuthToken);
  const isLoading = useAuthStore(selectIsLoadingAuth);

  const { setToken, setUser, clearAuth } = useAuthStore.getState();

  return {
    isAuthenticated,
    user,
    token,
    isLoading,
    setToken,
    setUser,
    clearAuth,
  };
}
*/ 