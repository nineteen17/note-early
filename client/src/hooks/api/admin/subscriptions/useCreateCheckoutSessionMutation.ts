'use client';

import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import { toast } from 'sonner';

// Define the input type for the mutation
interface CreateCheckoutInput {
  planId: string; // Stripe Price ID
}

// Define the expected response type from the API
interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

// Define the API call function
const createCheckoutSession = async (input: CreateCheckoutInput): Promise<CheckoutSessionResponse> => {
  try {
    console.log(`api.post: Requesting /subscriptions/checkout-session with planId: ${input.planId}`);
    // Use the actual endpoint from your Swagger/backend implementation if different
    const response = await api.post<CheckoutSessionResponse>('/subscriptions/checkout-session', input);
    console.log(`api.post: Raw Response for /subscriptions/checkout-session`, response);
    return response; // Assuming api.post already extracts data
  } catch (error) {
    console.error("Error creating checkout session:", error);
    // Let the interceptor handle generic errors, rethrow specific ones if needed
    // Or handle specific AppErrors here
    throw error;
  }
};

// Define the TanStack Query mutation hook
export const useCreateCheckoutSessionMutation = () => {
  return useMutation<CheckoutSessionResponse, ApiError, CreateCheckoutInput>({
    mutationFn: createCheckoutSession,
    onSuccess: (data) => {
      // Redirect the user to the Stripe Checkout page
      if (data.url) {
        console.log("Redirecting to Stripe Checkout...", data.url);
        window.location.href = data.url;
      } else {
        console.error('Checkout session URL not found in response:', data);
        toast.error("Checkout Error", {
          description: "Could not retrieve the checkout page URL. Please try again.",
        });
      }
    },
    onError: (error) => {
      console.error("Checkout Session Mutation Error:", error);
      toast.error("Checkout Error", {
        description: error.message || "Failed to initiate checkout. Please try again.",
      });
    },
  });
}; 