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
// Update SignupAdminResponse to match backend's AuthResult without specific Supabase types
interface SignupAdminResponse { 
  user: any; // Use 'any' or 'object'
  session: any | null; // Use 'any | null' or 'object | null'
  profile: ProfileDTO | null; // Profile from your DB (can be null initially)
  // Keep message optional if the wrapper still adds it
  message?: string; 
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
  // Backend handles signup, returns AuthResult structure now
  // Assuming api.post correctly returns the nested 'data' object which is AuthResult
  const response = await api.post<SignupAdminResponse>('/auth/signup', details);
  // Adjust based on actual response structure from your api.post wrapper
  // If api.post returns the FULL { status, message, data }, you need to return response.data
  // Assuming it returns the data directly here based on previous examples:
  return response; 
};

const loginStudent = async (credentials: LoginStudentInput): Promise<LoginStudentResponse> => {
  // Backend does NOT set cookie, returns accessToken and profile in body
  // The api.post directly returns the LoginStudentResponse shape
  console.log("[loginStudent Hook] Calling api.post...");
  const response = await api.post<LoginStudentResponse>('/auth/student/login', credentials);
  console.log("[loginStudent Hook] Received response:", response);
  // Directly return the response, assuming it matches LoginStudentResponse
  // Add a check just in case api.post returns something unexpected
  if (response && response.accessToken && response.profile) {
    return response;
  } else {
     console.error("[loginStudent Hook] Unexpected response format from api.post:", response);
     throw new ApiError('Login failed: Invalid data format from server.', 500, response); 
  }
};

const logoutUser = async (): Promise<void> => {
  // Backend invalidates session (Supabase) and clears httpOnly cookie (if any)
  await api.post('/auth/logout');  
};

// --- NEW FUNCTION for Student Logout ---
const logoutStudent = async (): Promise<void> => {
  // Backend clears student_refresh_token cookie
  await api.post('/auth/student/logout'); 
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

// Hook for Student Login (Minimal - side effects handled in component)
export const useLoginStudentMutation = (
  options?: Omit<UseMutationOptions<LoginStudentResponse, ApiError, LoginStudentInput>, 'mutationFn'>
) => {
  // Removed router, toast, and specific onSuccess/onError handlers from here
  return useMutation<LoginStudentResponse, ApiError, LoginStudentInput>({
    mutationFn: loginStudent,
    // Spread options provided by the component, which may include onSuccess/onError
    ...options, 
  });
};
// In the logout hooks, remove the direct localStorage manipulation:

export const useLogoutMutation = (
  options?: Omit<UseMutationOptions<void, ApiError, void>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  
  return useMutation<void, ApiError, void>({
    mutationFn: logoutUser,
    onSuccess: (data, variables, context) => {
      // Let clearAuth handle localStorage removal
      useAuthStore.getState().clearAuth();
      
      // Clear the query cache
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      

      // Add a small delay to ensure storage clearing completes before navigation
      setTimeout(() => {
        router.push('/login');
      }, 50);
      
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      useAuthStore.getState().clearAuth();
      queryClient.clear();
      
      setTimeout(() => {
        router.push('/login');
      }, 50);
      
      options?.onError?.(error, variables, context);
    },
    ...options,
  });
};

// Similarly for useLogoutStudentMutation - remove direct localStorage manipulation:

export const useLogoutStudentMutation = (
  options?: Omit<UseMutationOptions<void, ApiError, void>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  // Helper to ensure localStorage is cleared
  const forceStorageClear = () => {
    try {
      window.localStorage.removeItem('auth-storage');
      
      // Double-check if it was cleared
      const remaining = window.localStorage.getItem('auth-storage');
      if (remaining) {
        window.localStorage.removeItem('auth-storage');
        console.log("Forced second removal of auth-storage");
      }
    } catch (err) {
      console.error("Error clearing localStorage:", err);
    }
  };

  // Handle all cleanup and navigation
  const cleanupAndNavigate = () => {
    // Clear auth state
    useAuthStore.getState().clearAuth();
    
    // Clear localStorage directly 
    forceStorageClear();
    
    // Clear the query cache
    queryClient.clear();
    queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    
    // Delay navigation slightly to ensure storage is cleared
    setTimeout(() => {
      forceStorageClear(); // One final check before navigation
      router.push('/student-login');
    }, 100);
  };

  return useMutation<void, ApiError, void>({
    mutationFn: logoutStudent,
    
    onSuccess: (data, variables, context) => {
      cleanupAndNavigate();
      options?.onSuccess?.(data, variables, context);
    },
    
    onError: (error, variables, context) => {
      cleanupAndNavigate();
      options?.onError?.(error, variables, context);
    },
    
    ...options,
  });
};