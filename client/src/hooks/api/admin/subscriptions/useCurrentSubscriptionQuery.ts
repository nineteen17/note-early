import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
// Remove logger import for now to resolve linter error
// import { logger } from "@/lib/logger"; 

// Define the expected response type from GET /api/v1/subscriptions/current
// Import the newly defined CustomerSubscriptionDTO type
import type { SubscriptionPlan, CustomerSubscriptionDTO } from "@/types/api"; 
interface CurrentSubscriptionResponse {
    plan: SubscriptionPlan | null;
    // Use the correct type name
    subscription: CustomerSubscriptionDTO | null; 
}

// Define a query key
const CURRENT_SUBSCRIPTION_QUERY_KEY = ["subscriptions", "current"];

/**
 * Fetches the current user's subscription details.
 */
export const fetchCurrentSubscription = async (): Promise<CurrentSubscriptionResponse> => {
    // logger.debug("(fetchCurrentSubscription): Fetching current subscription..."); // Logger removed
    const token = useAuthStore.getState().token;

    if (!token) {
        // logger.warn("(fetchCurrentSubscription): No token found, aborting fetch."); // Logger removed
        throw new Error("Authentication required to fetch subscription.");
    }

    try {
        const response = await api.get<CurrentSubscriptionResponse>("/subscriptions/current");
        // logger.debug("(fetchCurrentSubscription): Received data:", response); // Logger removed
        
        // Optional: Add validation if needed
        if (!response || typeof response.plan === 'undefined' || typeof response.subscription === 'undefined') {
            // logger.error("(fetchCurrentSubscription): Invalid data received:", response); // Logger removed
            throw new Error('Invalid subscription data received from API');
        }

        return response;
    } catch (error: any) {
        // logger.error(
        //     `(fetchCurrentSubscription): Error fetching current subscription:`,
        //     error.message || error,
        //     error.status ? `(Status: ${error.status})` : "",
        //     error.data || ""
        // ); // Logger removed
        console.error("Error fetching current subscription:", error); // Basic console log
        throw error; // Re-throw for useQuery to handle
    }
};

/**
 * Custom hook to fetch the current user's subscription details.
 */
export const useCurrentSubscriptionQuery = (
    options?: Omit<UseQueryOptions<CurrentSubscriptionResponse, Error, CurrentSubscriptionResponse>, 'queryKey' | 'queryFn'>
) => {
    const token = useAuthStore((state) => state.token);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    return useQuery<CurrentSubscriptionResponse, Error, CurrentSubscriptionResponse>({
        queryKey: CURRENT_SUBSCRIPTION_QUERY_KEY,
        queryFn: fetchCurrentSubscription,
        enabled: !!token && isAuthenticated, // Only run if authenticated
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000,   // Cache for 10 minutes
        retry: 1,                 // Retry once on error
        ...options,
    });
}; 