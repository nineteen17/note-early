import axios, { type InternalAxiosRequestConfig, AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

if (!API_BASE_URL) {
  console.warn('Warning: NEXT_PUBLIC_API_BASE_URL is not defined. API calls might fail.');
}

// Define a basic custom error class for potential future use in interceptors
export class ApiError extends Error {
  status: number;
  data?: any;
  originalError?: AxiosError;

  constructor(
    message: string,
    status: number,
    data?: any,
    originalError?: AxiosError
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.originalError = originalError;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Helper for debug logging token state
const logTokenStatus = (context: string) => {
  const { token, profile, isAuthenticated } = useAuthStore.getState();
  console.log(`[Token Debug - ${context}]:`, {
    hasToken: !!token,
    isAuthenticated,
    tokenFirstChars: token ? `${token.substring(0, 10)}...` : 'none',
    hasProfile: !!profile,
    role: profile?.role || 'unknown'
  });
};

// List of endpoints that don't follow the standard ApiResponse wrapper structure
const NON_STANDARD_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/logout',
  '/auth/student/login',
  '/auth/student/logout',
  '/auth/forgot-password',
  '/auth/update-password',
  '/auth/invalidate-all-sessions',
  // Add other non-standard endpoints here
];

// Helper function to check if an endpoint is a logout endpoint
const isLogoutEndpoint = (endpoint: string): boolean => {
  return endpoint === '/auth/logout' || endpoint === '/auth/student/logout';
};

// Create an Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL, 
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for cross-origin requests
  timeout: 10000, // 10 seconds
});

// --- Request Interceptor ---
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from Zustand store
    const token = useAuthStore.getState().token;
    
    // Log token status for debugging
    logTokenStatus(`Request to ${config.url}`);
    
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log(`Request Interceptor: Added token to ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error("Request Interceptor Error:", error);
    return Promise.reject(error);
  }
);

// --- Response Interceptor --- 
let isRefreshing = false; // Flag to prevent multiple refresh attempts
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}> = []; // Queue for requests that failed while refreshing

const processQueue = (error: ApiError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // Any status code within 2xx range
    return response;
  },
  async (error: AxiosError) => {
    // Any status codes outside 2xx range
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    }; 

    // Define the expected response structure for refresh endpoints
    type RefreshResponse = {
      status: string;
      message?: string;
      data: { accessToken: string };
    };

    // Check if it's a 401 error, not a retry, and not the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      error.config?.url !== "/auth/refresh" && 
      error.config?.url !== "/auth/student/refresh"
    ) {
      logTokenStatus('401 Error - Before Refresh Attempt');
      
      if (isRefreshing) {
        // If token is already being refreshed, queue the original request
        console.log("Response Interceptor: A refresh is already in progress, queueing this request");
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = "Bearer " + token;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      console.log("Response Interceptor: Starting token refresh attempt");

      try {
        // --- IMPROVED REFRESH URL DETERMINATION --- //
        const authState = useAuthStore.getState();
        const userRole = authState.profile?.role;
        const hasToken = !!authState.token;
        
        // Default to the admin refresh endpoint
        let refreshUrl = `${API_BASE_URL}/auth/refresh`;
        let userType = 'ADMIN'; // Default assumption
        
        if (userRole === 'STUDENT') {
          refreshUrl = `${API_BASE_URL}/auth/student/refresh`;
          userType = 'STUDENT';
          console.log("Response Interceptor: Attempting STUDENT token refresh");
        } else if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
          console.log(`Response Interceptor: Attempting ${userRole} token refresh`);
        } else if (hasToken) {
          // No specific role but we have a token - try admin endpoint as default
          console.log("Response Interceptor: Role unknown but token exists, trying admin refresh");
        } else {
          // No role, no token - can't refresh, proceed to logout
          console.error("Response Interceptor: Cannot refresh token, no authentication data available");
          useAuthStore.getState().clearAuth();
          const logoutError = new ApiError("Authentication error. Please log in again.", 401);
          processQueue(logoutError, null);
          isRefreshing = false;
          return Promise.reject(logoutError);
        }
        
        // Attempt to refresh token
        console.log(`Response Interceptor: Attempting token refresh at ${refreshUrl}`);
        const refreshResponse = await axios.post<RefreshResponse>(
          refreshUrl,
          {},
          { withCredentials: true }
        );

        if (!refreshResponse.data || !refreshResponse.data.data || !refreshResponse.data.data.accessToken) {
          throw new Error('Invalid refresh token response format');
        }

        const newAccessToken = refreshResponse.data.data.accessToken;
        
        // Update token in store
        useAuthStore.getState().setToken(newAccessToken);
        console.log(`Response Interceptor: Token refreshed successfully for ${userType}`);
        
        // Update authorization header
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        
        logTokenStatus('After Successful Token Refresh');
        
        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("Response Interceptor: Token refresh failed:", refreshError);
        
        // Clear auth and reject all queued requests
        useAuthStore.getState().clearAuth();
        const logoutError = new ApiError("Session expired. Please log in again.", 401);
        processQueue(logoutError, null);
        
        // Redirect could be handled by consumer of this error
        return Promise.reject(logoutError);
      } finally {
        isRefreshing = false;
      }
    }

    // For non-401 errors or errors during refresh, create and reject with ApiError
    const status = error.response?.status || 0; 
    const message = 
      (error.response?.data as any)?.message || 
      error.message || 
      "An unexpected error occurred";
    const apiError = new ApiError(message, status, error.response?.data, error);
    console.error(`API Error (${status}): ${message}`);
    return Promise.reject(apiError);
  }
);

// Helper function to check if an endpoint uses standard response format
const isNonStandardEndpoint = (endpoint: string): boolean => {
  return NON_STANDARD_ENDPOINTS.some(prefix => 
    endpoint === prefix || endpoint.startsWith(`${prefix}/`)
  );
};

// Extract data from response based on endpoint type
const extractResponseData = <T>(endpoint: string, response: any): T => {
  // Handle 204 No Content responses (common for DELETE operations)
  if (response.status === 204) {
    return undefined as T; // Return undefined for void responses
  }
  
  if (isNonStandardEndpoint(endpoint)) {
    return response.data as T;
  }
  
  if (response.data && response.data.status === 'success' && response.data.data !== undefined) {
    return response.data.data;
  } else if (response.data && response.data.status === 'error') {
    throw new ApiError(
      response.data.message || `API Error on ${endpoint}`,
      response.status,
      response.data
    );
  } else {
    throw new ApiError(`Invalid API response structure from ${endpoint}`, response.status, response.data);
  }
};

// Process API errors consistently
const handleApiError = (error: unknown, endpoint: string): never => {
  console.error(`Error in API call to ${endpoint}:`, error);
  
  if (error instanceof ApiError) {
    throw error;
  } else if (axios.isAxiosError(error)) {
    const status = error.response?.status || 0;
    const message = (error.response?.data as any)?.message || error.message || `Error calling ${endpoint}`;
    throw new ApiError(message, status, error.response?.data, error);
  } else {
    throw new ApiError((error as Error).message || `Unknown error in call to ${endpoint}`, 0);
  }
};

// --- API Methods ---
export const api = {
  get: async <T>(endpoint: string, config?: InternalAxiosRequestConfig): Promise<T> => {
    try {
      console.log(`API GET: ${endpoint}`);
      const response = await apiClient.get(endpoint, config);
      return extractResponseData<T>(endpoint, response);
    } catch (error) {
      return handleApiError(error, endpoint);
    }
  },

  post: async <T>(
    endpoint: string,
    data?: any,
    config?: InternalAxiosRequestConfig
  ): Promise<T> => {
    try {
      console.log(`API POST: ${endpoint}`);
      // For logout endpoints, use the instance directly and don't expect a response structure
      if (isLogoutEndpoint(endpoint)) {
        await apiClient.post(endpoint, data, config);
        return {} as T; // Return empty object as the response is not needed
      }
      const response = await apiClient.post(endpoint, data, config);
      return extractResponseData<T>(endpoint, response);
    } catch (error) {
      return handleApiError(error, endpoint);
    }
  },

  patch: async <T>(
    endpoint: string,
    data?: any,
    config?: InternalAxiosRequestConfig
  ): Promise<T> => {
    try {
      console.log(`API PATCH: ${endpoint}`);
      const response = await apiClient.patch(endpoint, data, config);
      return extractResponseData<T>(endpoint, response);
    } catch (error) {
      return handleApiError(error, endpoint);
    }
  },

  put: async <T>(
    endpoint: string, 
    data?: any, 
    config?: InternalAxiosRequestConfig
  ): Promise<T> => {
    try {
      console.log(`API PUT: ${endpoint}`);
      const response = await apiClient.put(endpoint, data, config);
      return extractResponseData<T>(endpoint, response);
    } catch (error) {
      return handleApiError(error, endpoint);
    }
  },

  delete: async <T>(
    endpoint: string, 
    config?: InternalAxiosRequestConfig
  ): Promise<T> => {
    try {
      console.log(`API DELETE: ${endpoint}`);
      const response = await apiClient.delete(endpoint, config);
      return extractResponseData<T>(endpoint, response);
    } catch (error) {
      return handleApiError(error, endpoint);
    }
  },

  // Provide direct access to the configured axios instance if needed
  instance: apiClient,
};