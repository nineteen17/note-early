import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import { toast } from 'sonner';

// Define the type for the expected response (URL)
interface ManageSubscriptionResponse {
    url: string;
}

// Define the mutation function
const manageSubscription = async (): Promise<ManageSubscriptionResponse> => {
    try {
        // POST request to /subscriptions/manage (no request body needed)
        const response = await api.post<ManageSubscriptionResponse>('/subscriptions/manage', {});
        return response;
    } catch (error) {
        if (error instanceof ApiError) {
            console.error(`API Error managing subscription (${error.status}): ${error.message}`, error.data);
            // Customize error message based on potential issues
            const userMessage = error.status === 404
                ? "Could not find subscription details."
                : error.message || 'Failed to access subscription management.';
            throw new Error(userMessage);
        } else {
            console.error("Unexpected error managing subscription:", error);
            throw new Error('An unexpected error occurred.');
        }
    }
};

// Define the custom hook
export const useManageSubscriptionMutation = () => {
    return useMutation<ManageSubscriptionResponse, Error, void>({ // Response type, Error type, Variables type (void)
        mutationFn: manageSubscription,
        onSuccess: (data) => {
            console.log('Manage subscription session created:', data.url);
            // Redirect the user to the Stripe portal URL
            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error("Could not retrieve the subscription management link.");
            }
            // No toast needed here usually, as redirect happens
        },
        onError: (error) => {
            console.error('Manage subscription failed:', error);
            toast.error(error.message || "Failed to access subscription management. Please try again.");
        },
    });
}; 