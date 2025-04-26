import axios, { type InternalAxiosRequestConfig, AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore'; // Import Zustand store hook

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  console.warn('Warning: NEXT_PUBLIC_API_BASE_URL is not defined. API calls might fail.');
}

// Define a basic custom error class for potential future use in interceptors
export class ApiError extends Error {
  status: number;
  data?: any;
  originalError?: AxiosError; // Store original Axios error if needed

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
    // Ensure the prototype chain is correct
    Object.setPrototypeOf(this, ApiError.prototype);
  }
} 

// List of endpoints that don't follow the standard ApiResponse wrapper structure
const NON_STANDARD_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/logout',
  // Add other non-standard endpoints here
];

// Create an Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL || '', 
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for cross-origin requests if needed
  timeout: 10000, // 10 seconds
});

// --- Request Interceptor ---
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from Zustand store *inside* the interceptor function
    const token = useAuthStore.getState().token;
    
    // Log token status for debugging (consider removing in production)
    if (token) {
      console.log(`Request Interceptor: Adding token to ${config.url}`);
    } else {
      console.log(`Request Interceptor: No token available for ${config.url}`);
    }
    
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("Request Interceptor Error:", error);
    return Promise.reject(error);
  }
);

// --- Response Interceptor --- 
let isRefreshing = false; // Flag to prevent multiple refresh attempts concurrently
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}> = []; // Queue for requests that failed while refreshing

const processQueue = (error: ApiError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token); // Resolve with new token for retry logic
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // Any status code within 2xx range cause this function to trigger
    return response;
  },
  async (error: AxiosError) => {
    // Any status codes outside 2xx range cause this function to trigger
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    }; 

    // Check if it's a 401 error, not a retry, and not the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      error.config?.url !== "/auth/refresh"
    ) {
      if (isRefreshing) {
        // If token is already being refreshed, queue the original request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = "Bearer " + token;
            }
            return apiClient(originalRequest); // Retry with new token
          })
          .catch((err) => {
            return Promise.reject(err); // Propagate error if refresh failed
          });
      }

      originalRequest._retry = true; // Mark as retried
      isRefreshing = true;

      try {
        console.log("Response Interceptor: Attempting token refresh...");
        // Define the expected response structure
        type RefreshResponse = {
          status: string;
          message: string;
          data: { accessToken: string };
        };
        
        // Attempt to refresh the token
        const refreshResponse = await axios.post<RefreshResponse>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true } // Ensure cookies are sent
        );

        // Access token correctly from nested structure - adapt this to match your API's refresh response
        const newAccessToken = refreshResponse.data.data.accessToken;

        // Update token in Zustand store - the persistence will be handled by Zustand middleware
        useAuthStore.getState().setToken(newAccessToken);
        console.log("Response Interceptor: Token refreshed successfully");

        // Update the header of the original request
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken); // Process queued requests with the new token

        // Retry the original request with the new token
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("Response Interceptor: Token refresh failed:", refreshError);
        // If refresh fails, logout the user and reject queued requests
        useAuthStore.getState().clearAuth(); // Clear Zustand state
        const logoutError = new ApiError("Session expired. Please log in again.", 401);
        processQueue(logoutError, null);

        // Reject the original request and the queued requests with the logout error
        return Promise.reject(logoutError);
      } finally {
        isRefreshing = false; // Reset refreshing flag
      }
    }

    // For non-401 errors or errors during refresh, create and reject with ApiError
    const status = error.response?.status || 0; 
    // Attempt to get a more specific message from the backend response
    const message = 
      (error.response?.data as any)?.message || 
      error.message || 
      "An unexpected error occurred";
    const apiError = new ApiError(message, status, error.response?.data, error);
    console.error(`API Error Interceptor (${status}):`, apiError);
    return Promise.reject(apiError); // Reject with the custom ApiError
  }
);

// Helper function to check if an endpoint is in the NON_STANDARD_ENDPOINTS list
const isNonStandardEndpoint = (endpoint: string): boolean => {
  return NON_STANDARD_ENDPOINTS.some(prefix => 
    endpoint === prefix || endpoint.startsWith(`${prefix}/`)
  );
};

// --- Convenience Methods (Using the interceptor-configured instance) ---
export const api = {
  get: async <T>(endpoint: string, config?: InternalAxiosRequestConfig): Promise<T> => {
    console.log(`api.get: Requesting ${endpoint}`);
    try {
      // Perform the request using the configured instance
      const response = await apiClient.get(endpoint, config);
      console.log(`api.get: Raw Response for ${endpoint}`, response);

      // Check if this is a non-standard endpoint
      if (isNonStandardEndpoint(endpoint)) {
        return response.data as T; // Return the raw data for non-standard endpoints
      }

      // Check the wrapper structure for standard endpoints
      if (response.data && response.data.status === 'success' && response.data.data !== undefined) {
          console.log(`api.get: Extracting data for ${endpoint}`, response.data.data);
          return response.data.data; // Return the nested data
      } else if (response.data && response.data.status === 'error') {
          console.error(`api.get: API returned error for ${endpoint}`, response.data.message, response.data.errors);
          throw new ApiError(
              response.data.message || `API Error on ${endpoint}`,
              response.status, // Use original response status if available
              response.data
          );
      } else {
           // Handle unexpected successful response structure
           console.error(`api.get: Unexpected success response structure for ${endpoint}`, response.data);
           throw new ApiError(`Invalid API response structure received from ${endpoint}`, response.status, response.data);
      }
    } catch (error) {
      console.error(`api.get: Catching error for ${endpoint}`, error);
      // Re-throw the processed error (likely already an ApiError from the interceptor or the try block above)
      // Ensure it's an instance of ApiError before re-throwing if possible
       if (error instanceof ApiError) {
           throw error;
       } else if (axios.isAxiosError(error)) {
           // Convert AxiosError to ApiError if not already done by interceptor (should be rare)
            const status = error.response?.status || 0; 
            const message = (error.response?.data as any)?.message || error.message;
            throw new ApiError(message, status, error.response?.data, error);
       } else {
           // Throw a generic error for unexpected types
           throw new ApiError( (error as Error).message || 'Unknown error in api.get', 0);
       }
    }
  },

  post: async <T>(
    endpoint: string,
    data?: any,
    config?: InternalAxiosRequestConfig
  ): Promise<T> => {
    console.log(`api.post: Requesting ${endpoint}`);
    try {
      const response = await apiClient.post(endpoint, data, config);
      console.log(`api.post: Raw Response for ${endpoint}`, response);

      // Check if this is a non-standard endpoint
      if (isNonStandardEndpoint(endpoint)) {
        return response.data as T; // Return the raw data for non-standard endpoints
      }

      // Check the wrapper structure for standard endpoints
      if (response.data && response.data.status === 'success' && response.data.data !== undefined) {
          return response.data.data; // Return the nested data
      } else if (response.data && response.data.status === 'error') {
          throw new ApiError(
              response.data.message || `API Error on ${endpoint}`,
              response.status,
              response.data
          );
      } else {
           throw new ApiError(`Invalid API response structure received from ${endpoint}`, response.status, response.data);
      }
    } catch (error) {
      console.error(`api.post: Catching error for ${endpoint}`, error);
      if (error instanceof ApiError) {
          throw error;
      } else if (axios.isAxiosError(error)) {
          const status = error.response?.status || 0; 
          const message = (error.response?.data as any)?.message || error.message;
          throw new ApiError(message, status, error.response?.data, error);
      } else {
          throw new ApiError((error as Error).message || 'Unknown error in api.post', 0);
      }
    }
  },

  patch: async <T>(
    endpoint: string,
    data?: any,
    config?: InternalAxiosRequestConfig
  ): Promise<T> => {
    console.log(`api.patch: Requesting ${endpoint}`);
    try {
      const response = await apiClient.patch(endpoint, data, config);
      
      // Check if this is a non-standard endpoint
      if (isNonStandardEndpoint(endpoint)) {
        return response.data as T; // Return the raw data for non-standard endpoints
      }
      
      // Check response structure for standard endpoints
      if (response.data && response.data.status === 'success' && response.data.data !== undefined) {
          return response.data.data;
      } else if (response.data && response.data.status === 'error') {
          throw new ApiError(
              response.data.message || `API Error on ${endpoint}`,
              response.status,
              response.data
          );
      } else {
           throw new ApiError(`Invalid API response structure received from ${endpoint}`, response.status, response.data);
      }
    } catch (error) {
      // Handle errors consistently
      if (error instanceof ApiError) {
          throw error;
      } else if (axios.isAxiosError(error)) {
          const status = error.response?.status || 0; 
          const message = (error.response?.data as any)?.message || error.message;
          throw new ApiError(message, status, error.response?.data, error);
      } else {
          throw new ApiError((error as Error).message || 'Unknown error in api.patch', 0);
      }
    }
  },

  put: async <T>(
    endpoint: string, 
    data?: any, 
    config?: InternalAxiosRequestConfig
  ): Promise<T> => {
    console.log(`api.put: Requesting ${endpoint}`);
    try {
      const response = await apiClient.put(endpoint, data, config);
      
      // Check if this is a non-standard endpoint
      if (isNonStandardEndpoint(endpoint)) {
        return response.data as T; // Return the raw data for non-standard endpoints
      }
      
      // Check response structure for standard endpoints
      if (response.data && response.data.status === 'success' && response.data.data !== undefined) {
          return response.data.data;
      } else if (response.data && response.data.status === 'error') {
          throw new ApiError(
              response.data.message || `API Error on ${endpoint}`,
              response.status,
              response.data
          );
      } else {
           throw new ApiError(`Invalid API response structure received from ${endpoint}`, response.status, response.data);
      }
    } catch (error) {
      // Handle errors consistently
      if (error instanceof ApiError) {
          throw error;
      } else if (axios.isAxiosError(error)) {
          const status = error.response?.status || 0; 
          const message = (error.response?.data as any)?.message || error.message;
          throw new ApiError(message, status, error.response?.data, error);
      } else {
          throw new ApiError((error as Error).message || 'Unknown error in api.put', 0);
      }
    }
  },

  delete: async <T>(
    endpoint: string, 
    config?: InternalAxiosRequestConfig
  ): Promise<T> => {
    console.log(`api.delete: Requesting ${endpoint}`);
    try {
      const response = await apiClient.delete(endpoint, config);
      
      // Check if this is a non-standard endpoint
      if (isNonStandardEndpoint(endpoint)) {
        return response.data as T; // Return the raw data for non-standard endpoints
      }
      
      // Check response structure for standard endpoints
      if (response.data && response.data.status === 'success' && response.data.data !== undefined) {
          return response.data.data;
      } else if (response.data && response.data.status === 'error') {
          throw new ApiError(
              response.data.message || `API Error on ${endpoint}`,
              response.status,
              response.data
          );
      } else {
           throw new ApiError(`Invalid API response structure received from ${endpoint}`, response.status, response.data);
      }
    } catch (error) {
      // Handle errors consistently
      if (error instanceof ApiError) {
          throw error;
      } else if (axios.isAxiosError(error)) {
          const status = error.response?.status || 0; 
          const message = (error.response?.data as any)?.message || error.message;
          throw new ApiError(message, status, error.response?.data, error);
      } else {
          throw new ApiError((error as Error).message || 'Unknown error in api.delete', 0);
      }
    }
  },

  // Provide direct access to the configured axios instance if needed
  instance: apiClient,
};