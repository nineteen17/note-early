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

// Password Reset
interface PasswordResetInput {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string; // Only used for client-side validation
}

interface PasswordResetResponse {
  message: string;
}

// Forgot Password
interface ForgotPasswordInput {
  email: string;
}

interface ForgotPasswordResponse {
  message: string;
}

// Update Password (for reset flow)
interface UpdatePasswordInput {
  newPassword: string;
  confirmNewPassword: string;
}

interface UpdatePasswordResponse {
  message: string;
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
  const response = await api.post<SignupAdminResponse>('/auth/signup', details);
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

// Hook for Admin Signup - UPDATED with email verification flow
export const useSignupAdminMutation = (
  options?: Omit<UseMutationOptions<SignupAdminResponse, ApiError, SignupAdminInput>, 'mutationFn'>
) => {
  const router = useRouter();
  
  return useMutation<SignupAdminResponse, ApiError, SignupAdminInput>({
    mutationFn: signupAdmin,
    onSuccess: (data, variables, context) => {
      console.log('Signup mutation successful:', data);
      
      // Store email for verification page
      localStorage.setItem('signup_email', variables.email);
      
      // Call the custom onSuccess if provided
      options?.onSuccess?.(data, variables, context);
      
      // Redirect to email verification page
      router.push(`/email-verification?email=${encodeURIComponent(variables.email)}`);
    },
    onError: (error, variables, context) => {
      console.error('Signup mutation error:', error);
      
      // Call the custom onError if provided
      options?.onError?.(error, variables, context);
    },
    // Spread other options but override onSuccess/onError
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
      // For single session logout, only clear local state - don't force global logout
      useAuthStore.getState().clearAuth();
      
      // Clear the query cache for this session
      queryClient.clear();
      
      // Navigate to login
      setTimeout(() => {
        router.push('/login');
      }, 50);
      
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Even on error, clear local state and redirect
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

const resetPassword = async (data: PasswordResetInput): Promise<PasswordResetResponse> => {
  const { currentPassword, newPassword } = data;
  try {
    // API returns a simple success message on 200
    const response = await api.post<PasswordResetResponse>('/auth/reset-password', {
      currentPassword,
      newPassword,
    });
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API Error resetting password (${error.status}): ${error.message}`, error.data);
      // Customize error message based on potential status codes (e.g., 403 for wrong current password)
      const userMessage = error.status === 403
        ? "Incorrect current password."
        : error.message || 'Failed to reset password.';
      throw new Error(userMessage);
    } else {
      console.error("Unexpected error resetting password:", error);
      throw new Error('An unexpected error occurred while resetting the password.');
    }
  }
};

const forgotPassword = async (data: ForgotPasswordInput): Promise<ForgotPasswordResponse> => {
  try {
    // The backend returns { status: 'success', message: '...' }
    // Since we added it to NON_STANDARD_ENDPOINTS, we get the raw response
    const response = await api.post<{ status: string; message: string }>('/auth/forgot-password', {
      email: data.email,
    });
    
    // Return the message from the response
    return { message: response.message };
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API Error requesting password reset (${error.status}): ${error.message}`, error.data);
      // For security, always show the same message regardless of whether email exists
      throw new Error('If an account with this email exists, a password reset link has been sent.');
    } else {
      console.error("Unexpected error requesting password reset:", error);
      throw new Error('An unexpected error occurred while requesting password reset.');
    }
  }
};

const updatePassword = async (data: UpdatePasswordInput): Promise<UpdatePasswordResponse> => {
  try {
    // Get the stored reset token
    const resetToken = localStorage.getItem('reset_token');
    if (!resetToken) {
      throw new Error('Invalid password reset session. Please request a new password reset.');
    }

    // Use the stored token in the Authorization header
    // Since we added it to NON_STANDARD_ENDPOINTS, we get the raw response
    const response = await api.post<{ status: string; message: string }>('/auth/update-password', {
      newPassword: data.newPassword,
    }, {
      headers: {
        Authorization: `Bearer ${resetToken}`
      }
    } as any);
    
    return { message: response.message };
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API Error updating password (${error.status}): ${error.message}`, error.data);
      const userMessage = error.status === 401
        ? "Your password reset session has expired. Please request a new password reset."
        : error.message || 'Failed to update password.';
      throw new Error(userMessage);
    } else {
      console.error("Unexpected error updating password:", error);
      throw new Error('An unexpected error occurred while updating password.');
    }
  }
};



// Resend verification email (uses signup endpoint)
const resendVerificationEmail = async (email: string): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>('/auth/resend-verification', { email });
  return response;
};

// Invalidate all sessions
const invalidateAllSessions = async (): Promise<{ message: string }> => {
  const response = await api.post<{ status: string; message: string }>('/auth/invalidate-all-sessions');
  return { message: response.message };
};

// Hook for Password Reset (logged-in users)
export const useResetPasswordMutation = (
  options?: Omit<UseMutationOptions<PasswordResetResponse, Error, PasswordResetInput>, 'mutationFn'>
) => {
  return useMutation<PasswordResetResponse, Error, PasswordResetInput>({
    mutationFn: resetPassword,
    ...options,
  });
};

// Hook for Forgot Password (public users)
export const useForgotPasswordMutation = (
  options?: Omit<UseMutationOptions<ForgotPasswordResponse, Error, ForgotPasswordInput>, 'mutationFn'>
) => {
  return useMutation<ForgotPasswordResponse, Error, ForgotPasswordInput>({
    mutationFn: forgotPassword,
    ...options,
  });
};

// Hook for Update Password (password reset flow)
export const useUpdatePasswordMutation = (
  options?: Omit<UseMutationOptions<UpdatePasswordResponse, Error, UpdatePasswordInput>, 'mutationFn'>
) => {
  const router = useRouter();
  return useMutation<UpdatePasswordResponse, Error, UpdatePasswordInput>({
    mutationFn: updatePassword,
    onSuccess: () => {
      router.push('/admin/login?message=Password updated successfully');
    },
    ...options,
  });
};



// Hook for Resend Verification Email
export const useResendVerificationMutation = (
  options?: Omit<UseMutationOptions<{ message: string }, ApiError, string>, 'mutationFn'>
) => {
  return useMutation<{ message: string }, ApiError, string>({
    mutationFn: resendVerificationEmail,
    ...options,
  });
};

export const useInvalidateAllSessionsMutation = (
  options?: Omit<UseMutationOptions<{ message: string }, ApiError, void>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  return useMutation<{ message: string }, ApiError, void>({
    mutationFn: invalidateAllSessions,
    onSuccess: (data) => {
      // Clear auth state since we're invalidating all sessions (user will be logged out)
      useAuthStore.getState().clearAuth();
      
      // Clear all query cache since user will be logged out
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      
      // Navigate to login after a small delay
      setTimeout(() => {
        router.push('/login');
      }, 50);
      
      // The success callback can be handled by the component
      options?.onSuccess?.(data, undefined, undefined);
    },
    onError: (error, variables, context) => {
      // Also clear auth on error since sessions might have been invalidated
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