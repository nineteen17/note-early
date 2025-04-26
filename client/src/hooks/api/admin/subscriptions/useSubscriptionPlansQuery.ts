import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import type { SubscriptionPlan } from '@/types/api'; // Assuming SubscriptionPlan type exists
import { useAuthStore } from '@/store/authStore'; // Needed to check if user is admin/superadmin

// Define the fetch function
const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  try {
    // Endpoint to get available plans (requires Admin/SuperAdmin auth)
    const response = await api.get<SubscriptionPlan[]>("/subscriptions/plans");
    return response;
  } catch (error) {
    // Let the interceptor handle/rethrow standardized ApiError
    console.error("Error fetching subscription plans:", error);
    throw error;
  }
};

// Define the TanStack Query hook
export const useSubscriptionPlansQuery = () => {
  return useQuery<
    SubscriptionPlan[], // Data type
    ApiError            // Error type
  >({
    queryKey: ["subscriptions", "plans"], // Unique query key
    queryFn: fetchSubscriptionPlans,
    // Optional: Configuration like staleTime, cacheTime, etc.
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes, example
    // Keep data fresh in background, but don't show loading unless necessary
    refetchOnWindowFocus: false, 
  });
}; 