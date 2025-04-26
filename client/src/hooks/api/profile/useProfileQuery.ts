import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { ProfileDTO } from "@/types/api";
import { useAuthStore } from "@/store/authStore";

// Define a constant query key to ensure consistent caching
const PROFILE_QUERY_KEY = ["profile", "me"];

/**
 * Fetches the user profile from the API
 * This function is optimized to handle API responses and avoid unnecessary requests
 */
export const fetchUserProfile = async (): Promise<ProfileDTO> => {
  console.log("(fetchUserProfile): Fetching user profile...");
  
  try {
    const token = useAuthStore.getState().token;
    
    if (!token) {
      console.warn("(fetchUserProfile): No token found, aborting fetch.");
      throw new Error("Attempted to fetch profile without a token.");
    }
    
    // The api.get method now handles unwrapping and error checking
    const profileData = await api.get<ProfileDTO>("/profiles/me");
    console.log("(fetchUserProfile): Received profile data:", profileData);
    
    // Basic validation of the profile data structure
    if (!profileData || typeof profileData.profileId !== 'string' || !profileData.role) {
      console.error("(fetchUserProfile): Received data is not a valid ProfileDTO:", profileData);
      throw new Error('Invalid profile data received');
    }
    
    return profileData; // Return the validated profile data
  } catch (error: any) {
    // Log the error with details
    console.error(
      `(fetchUserProfile): Error fetching profile:`,
      error.message || error,
      error.status ? `(Status: ${error.status})` : "",
      error.data || ""
    );
    
    // Re-throw the error to be handled by useQuery
    throw error;
  }
};

/**
 * Custom hook to fetch the current user's profile.
 * This hook implements caching and optimized fetching strategies.
 * The query is only enabled when a token exists in the auth store.
 */
export const useProfileQuery = (
  options?: Omit<UseQueryOptions<ProfileDTO, Error, ProfileDTO>, 'queryKey' | 'queryFn'>
) => {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  return useQuery<ProfileDTO, Error, ProfileDTO>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: fetchUserProfile,
    // Only fetch if we have a token and are authenticated
    enabled: !!token && isAuthenticated,
    // Don't retry too many times
    retry: 1,
    // Keep data fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Merge any additional options provided
    ...options,
  });
};