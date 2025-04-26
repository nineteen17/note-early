'use client';

import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import { 
    adminLoginSchema, 
    adminSignupSchema, 
    studentLoginSchema 
} from '@/lib/schemas/auth';
import { z } from 'zod';
import type { ProfileDTO } from '@/types/api'; // Assuming this is the correct type
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';


// --- Types ---

// Admin Login
type LoginAdminInput = z.infer<typeof adminLoginSchema>;
interface LoginAdminResponse {
  accessToken: string;
  userId?: string; // Optional based on backend response
  email?: string;  // Optional based on backend response
}

// Admin Signup
type SignupAdminInput = z.infer<typeof adminSignupSchema>;
// Signup might not return specific data on success, just a success status/message
interface SignupAdminResponse { 
  message?: string; 
  // Add other fields if backend returns them
}

// Student Login
type LoginStudentInput = z.infer<typeof studentLoginSchema>;
interface LoginStudentResponse {
  accessToken: string;
  profile: ProfileDTO; // Backend returns profile for student login
}

// Logout doesn't typically have a specific response body type on success
// interface LogoutResponse { message?: string; }


// --- API Call Functions ---

const loginAdmin = async (credentials: LoginAdminInput): Promise<LoginAdminResponse> => {
  // Backend sets httpOnly refresh token cookie, returns accessToken in body
  console.log("[loginAdmin Hook] Calling api.post..."); 
  
  // Define the expected full response structure from api.post (which returns res.data from backend)
  interface FullApiResponse {
      status: string;
      message: string;
      data: LoginAdminResponse;
  }

  // Call api.post and expect the FullApiResponse structure
  const response = await api.post<FullApiResponse>('/auth/login', credentials);
  console.log("[loginAdmin Hook] Received full response from api.post:", response);
  
  // Check if the structure is as expected and return the nested data object
  if (response && typeof response === 'object' && response.status === 'success' && response.data && typeof response.data.accessToken === 'string') {
    console.log("[loginAdmin Hook] Returning nested response.data:", response.data);
    return response.data; // Return the { accessToken, ... } object
  } else {
    console.error("[loginAdmin Hook] Unexpected response structure or missing accessToken:", response);
    throw new ApiError('Login failed: Invalid response from server.', 500, response); // Throw an error
  }
};

const signupAdmin = async (details: SignupAdminInput): Promise<SignupAdminResponse> => {
  // Backend handles signup, might return simple success message or status
  const response = await api.post<{ message?: string }>('/auth/signup', details);
  // Adjust based on actual response structure from your api.post wrapper
  return response; 
};

const loginStudent = async (credentials: LoginStudentInput): Promise<LoginStudentResponse> => {
  // Backend does NOT set cookie, returns accessToken and profile in body
  const response = await api.post<{ data: LoginStudentResponse }>('/auth/student/login', credentials);
   // Assuming api.post returns the nested 'data' object
  return response.data;
};

const logoutUser = async (): Promise<void> => {
  // Backend invalidates session (Supabase) and clears httpOnly cookie (if any)
  await api.post('/auth/logout');  
};


// --- Mutation Hooks ---

// Hook for Admin Login
export const useLoginAdminMutation = (
  options?: Omit<UseMutationOptions<LoginAdminResponse, ApiError, LoginAdminInput>, 'mutationFn'>
) => {
  return useMutation<LoginAdminResponse, ApiError, LoginAdminInput>({
    mutationFn: loginAdmin,
    ...options,
  });
};

// Hook for Admin Signup
export const useSignupAdminMutation = (
  options?: Omit<UseMutationOptions<SignupAdminResponse, ApiError, SignupAdminInput>, 'mutationFn'>
) => {
  return useMutation<SignupAdminResponse, ApiError, SignupAdminInput>({
    mutationFn: signupAdmin,
    ...options,
  });
};

// Hook for Student Login
export const useLoginStudentMutation = (
  options?: Omit<UseMutationOptions<LoginStudentResponse, ApiError, LoginStudentInput>, 'mutationFn'>
) => {
  return useMutation<LoginStudentResponse, ApiError, LoginStudentInput>({
    mutationFn: loginStudent,
    ...options,
  });
};

// Hook for Logout (Admin/Student)
export const useLogoutMutation = (
  options?: Omit<UseMutationOptions<void, ApiError, void>, 'mutationFn'> // Takes no variables
) => {
  const queryClient = useQueryClient(); // Get query client instance
  const router = useRouter(); // Move useRouter call here
  
  return useMutation<void, ApiError, void>({
    mutationFn: logoutUser,
    onSuccess: (data, variables, context) => {
      // Clear relevant queries on successful logout
      // Example: Invalidate user profile query
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });       
      useAuthStore.getState().clearAuth();
      router.push('/login');
      queryClient.clear(); // Clear the entire query cache on logout
      // Call user-provided onSuccess if it exists
      options?.onSuccess?.(data, variables, context);
    },
    ...options, // Spread other options like onError, onSettled
  });
}; 