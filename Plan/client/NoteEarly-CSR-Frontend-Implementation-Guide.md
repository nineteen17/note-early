# NoteEarly Frontend Implementation Guide (Next.js 15) - CSR Focus

**Version:** 1.1 (CSR Strategy)
**Based on API Spec:** `NoteEarly-swagger-2.json` (verified)

## 1. Introduction

This guide details the frontend implementation plan for the NoteEarly platform, **focusing on a Client-Side Rendering (CSR) strategy using TanStack Query for authenticated sections**, while leveraging Server Components for public-facing pages. It outlines the required screens, application architecture, component structure, data fetching/mutation strategies, and state management approach. The goal is to build a robust, maintainable, and consistent user interface using modern web technologies.

**Core Technologies:**

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + ShadCN
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod
- **API Client:** Axios wrapper

## 2. Project Setup

1.  **Initialize Project:**
    ```bash
    npx create-next-app@latest client --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
    cd client
    ```
2.  **Install Dependencies:**
    ```bash
    npm install zustand react-hook-form zod @hookform/resolvers # Core state/forms
    npm install @nextui-org/react framer-motion # Or @heroui/* if migrating/starting with HeroUI
    # Potentially add date formatting (e.g., date-fns), icons library
    npm install clsx tailwind-merge # Utility libraries for Tailwind class composition
    npm install @tanstack/react-query # ★ Client-side state management for API data ★
    npm install axios # ★ HTTP client for API requests with interceptors ★
    ```
3.  **Tailwind CSS & ShadCN UI Setup:**
    - **Tailwind:** Already installed and configured via `create-next-app`.
    - **ShadCN UI:** Initialize ShadCN UI in your project:
      ```bash
      npx shadcn-ui@latest init
      ```
      - Follow the prompts (choose default options or customize as needed, e.g., base color, CSS variables).
    - Add components individually as required:
      ```bash
      npx shadcn-ui@latest add button card input modal table ...
      npx shadcn-ui@latest add sonner # ★ For toast notifications ★
      ```
4.  **TanStack Query Setup:**

    - Create a client component provider (e.g., `src/providers/QueryProvider.tsx`) that initializes `QueryClient` and wraps children with `QueryClientProvider`.

    ```typescript
    // src/providers/QueryProvider.tsx
    "use client";

    import React from "react";
    import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
    import { ReactQueryDevtools } from "@tanstack/react-query-devtools"; // Optional

    function makeQueryClient() {
      return new QueryClient({
        defaultOptions: {
          queries: {
            // Global default options
            staleTime: 60 * 1000, // 1 minute
          },
        },
      });
    }

    let browserQueryClient: QueryClient | undefined = undefined;

    function getQueryClient() {
      if (typeof window === "undefined") {
        // Server: always make a new query client
        return makeQueryClient();
      } else {
        // Browser: make a new query client if we don't already have one
        if (!browserQueryClient) browserQueryClient = makeQueryClient();
        return browserQueryClient;
      }
    }

    export default function QueryProvider({
      children,
    }: {
      children: React.ReactNode;
    }) {
      const queryClient = getQueryClient();

      return (
        <QueryClientProvider client={queryClient}>
          {children}
          {/* Optional: Devtools only render in development */}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      );
    }
    ```

    - Import and use this `QueryProvider` in your root `src/app/layout.tsx` within the `<body>`.

5.  **Environment Variables:**
    - Create `.env.local` in the `client` project root.
    - Define `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1` (or the deployed backend URL).
6.  **TypeScript Configuration (`tsconfig.json`):**
    - Ensure `baseUrl` and `paths` are correctly set for the `@/*` alias.
    - Enable `strict` mode.

## 3. Core Architecture

Consistency is key. We will establish patterns for common tasks.

### 3.1. Directory Structure

**Adopt a feature-centric structure:** Separate routing concerns (`app/`) from feature implementation (`features/`). Group UI components logically.

```
client/
├── src/
│   ├── app/                  # ★ App Router: Layouts, Pages (primarily for routing & rendering features) ★
│   │   ├── (auth)/           #   - Routes requiring authentication (protected by layout)
│   │   │   ├── admin/        #   - Admin & SuperAdmin common routes & layouts
│   │   │   │   ├── students/
│   │   │   │   │   ├── page.tsx             # Renders AdminStudentList feature
│   │   │   │   │   └── [profileId]/
│   │   │   │   │       ├── page.tsx         # Renders AdminStudentDetail feature
│   │   │   │   │       └── edit/
│   │   │   │   │           └── page.tsx     # Renders AdminEditStudent feature (or modal trigger)
│   │   │   │   ├── modules/
│   │   │   │   │   ├── page.tsx             # Renders AdminModuleList feature
│   │   │   │   │   ├── create/
│   │   │   │   │   │   └── page.tsx         # Renders AdminCreateModule feature
│   │   │   │   │   └── [moduleId]/
│   │   │   │   │       ├── page.tsx         # Renders AdminViewModuleProgress feature
│   │   │   │   │       └── edit/
│   │   │   │   │           └── page.tsx     # Renders AdminEditModule feature
│   │   │   │   ├── home/                    # Renamed from dashboard
│   │   │   │   │   └── page.tsx             # Renders AdminHome feature
│   │   │   │   └── layout.tsx               # Layout shared by Admin/SuperAdmin features
│   │   │   ├── student/      #   - Student-specific routes & layouts
│   │   │   │   ├── home/                    # Renamed from dashboard
│   │   │   │   │   └── page.tsx             # Renders StudentHome feature
│   │   │   │   ├── modules/
│   │   │   │   │   └── [moduleId]/
│   │   │   │   │       ├── page.tsx         # Renders StudentModuleReading feature
│   │   │   │   │       └── details/
│   │   │   │   │           └── page.tsx     # Renders StudentModuleDetails feature
│   │   │   │   ├── progress/
│   │   │   │   │   └── page.tsx             # Renders StudentProgressList feature
│   │   │   │   └── layout.tsx               # Layout for student features
│   │   │   ├── superadmin/   #   - Routes strictly for SuperAdmin
│   │   │   │   ├── analytics/
│   │   │   │   │   └── page.tsx             # Renders SuperAdminAnalytics feature
│   │   │   │   ├── curated-modules/
│   │   │   │   │   └── page.tsx             # Renders SuperAdminCuratedModules feature
│   │   │   │   ├── users/
│   │   │   │   │   └── page.tsx             # Renders SuperAdminUserManagement feature (if applicable)
│   │   │   │   └── layout.tsx               # Layout specific to SuperAdmin features
│   │   │   ├── profile/
│   │   │   │   └── page.tsx                 # Renders UserProfile feature
│   │   │   ├── settings/
│   │   │   │   └── page.tsx                 # Renders UserSettings feature
│   │   │   └── layout.tsx                   # ★ Root authenticated layout (handles auth check via useAuth) ★
│   │   ├── (public)/         #   - Routes accessible without authentication
│   │   │   ├── login/
│   │   │   │   └── page.tsx                 # Renders LoginForm feature/component
│   │   │   ├── signup/
│   │   │   │   └── page.tsx                 # Renders SignupForm feature/component
│   │   │   ├── student-login/
│   │   │   │   └── page.tsx                 # Renders StudentLoginForm feature/component
│   │   │   └── layout.tsx                   # Public layout
│   │   ├── api/                # API Routes (Optional, if needed beyond backend API)
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   └── layout.tsx          # Root layout (contains global providers)
│   ├── components/           # ★ Globally Reusable UI Components (dumb components) ★
│   │   ├── layout/             #   - Shared Layout parts (Header, Sidebar, Footer)
│   │   └── ui/                 #   - Base UI elements (from ShadCN: Button, Card, etc.)
│   ├── features/             # ★ Feature-Specific Implementation (Grouped by Role/Area) ★
│   │   ├── admin/              #   - Features accessible by Admin/SuperAdmin
│   │   │   ├── home/             #     - (Formerly dashboard)
│   │   │   │   └── index.tsx
│   │   │   ├── student-list/
│   │   │   │   └── index.tsx
│   │   │   ├── student-detail/
│   │   │   │   └── index.tsx
│   │   │   ├── create-student-modal/
│   │   │   │   └── index.tsx
│   │   │   ├── edit-student-modal/
│   │   │   │   └── index.tsx
│   │   │   ├── module-list/
│   │   │   │   └── index.tsx
│   │   │   ├── create-module/
│   │   │   │   └── index.tsx
│   │   │   └── edit-module/
│   │   │       └── index.tsx
│   │   ├── student/            #   - Features specific to Students
│   │   │   ├── home/
│   │   │   │   └── index.tsx
│   │   │   ├── module-reading/
│   │   │   │   └── index.tsx
│   │   │   ├── module-details/
│   │   │   │   └── index.tsx
│   │   │   └── progress-list/
│   │   │       └── index.tsx
│   │   ├── superadmin/         #   - Features specific to SuperAdmin
│   │   │   ├── analytics/
│   │   │   │   └── index.tsx
│   │   │   └── curated-modules/
│   │   │       └── index.tsx
│   │   ├── public/             #   - Features for public routes
│   │   │   ├── login-form/
│   │   │   │   └── index.tsx
│   │   │   ├── signup-form/
│   │   │   │   └── index.tsx
│   │   │   └── student-login-form/
│   │   │       └── index.tsx
│   │   └── shared/             #   - Features shared across authenticated roles
│   │       ├── user-profile/
│   │       │   └── index.tsx
│   │       └── user-settings/
│   │           └── index.tsx
│   ├── lib/                  # Core utilities, helpers, constants
│   │   ├── apiClient.ts        # Centralized API Axios wrapper
│   │   ├── authUtils.ts        # Auth helpers (may be minimal with store/hooks)
│   │   ├── utils.ts            # General utility functions
│   │   └── constants.ts        # Application constants
│   ├── hooks/                # Custom React hooks
│   │   ├── api/                # ★ Custom hooks wrapping TanStack Query (Organized by Feature/Role) ★
│   │   │   ├── auth/           #   - Core session management
│   │   │   │   └── useLogoutMutation.ts
│   │   │   ├── profile/        #   - Current user's profile/settings
│   │   │   │   ├── useProfileQuery.ts
│   │   │   │   ├── useUpdateProfileMutation.ts
│   │   │   │   ├── useResetPasswordMutation.ts
│   │   │   │   └── useManageSubscriptionMutation.ts
│   │   │   ├── admin/          #   - Actions by Admin/SuperAdmin
│   │   │   │   ├── students/
│   │   │   │   │   ├── useCreateStudentMutation.ts
│   │   │   │   │   ├── useResetStudentPinMutation.ts
│   │   │   │   │   ├── useAdminStudentsQuery.ts
│   │   │   │   │   ├── useAdminStudentQuery.ts
│   │   │   │   │   ├── useUpdateStudentMutation.ts
│   │   │   │   │   └── useDeleteStudentMutation.ts
│   │   │   │   ├── modules/
│   │   │   │   │   ├── useMyModulesQuery.ts
│   │   │   │   │   ├── useCreateModuleMutation.ts
│   │   │   │   │   ├── useUpdateModuleMutation.ts
│   │   │   │   │   ├── useDeleteModuleMutation.ts
│   │   │   │   │   ├── useAddVocabularyMutation.ts
│   │   │   │   │   └── useModuleVocabularyQuery.ts
│   │   │   │   ├── progress/
│   │   │   │   │   ├── useAdminUpdateProgressMutation.ts
│   │   │   │   │   └── useAdminModuleProgressQuery.ts
│   │   │   │   └── subscriptions/
│   │   │   │       └── useSubscriptionPlansQuery.ts
│   │   │   ├── superadmin/     #   - Actions only by SuperAdmin
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── useAnalyticsDashboardQuery.ts
│   │   │   │   │   ├── useAnalyticsStudentQuery.ts
│   │   │   │   │   ├── useAnalyticsPopularModulesQuery.ts
│   │   │   │   │   └── useAnalyticsSubscriptionsQuery.ts
│   │   │   │   └── curatedModules/
│   │   │   │       ├── useCreateCuratedModuleMutation.ts
│   │   │   │       ├── useUpdateAnyModuleMutation.ts
│   │   │   │       └── useDeleteAnyModuleMutation.ts
│   │   │   ├── student/        #   - Actions by Student
│   │   │   │   └── progress/
│   │   │   │       ├── useStartModuleMutation.ts
│   │   │   │       ├── useSubmitSummaryMutation.ts
│   │   │   │       ├── useStudentProgressDetailsQuery.ts
│   │   │   │       └── useMyProgressQuery.ts
│   │   │   ├── readingModules/ #   - Fetching shared/public module data
│   │   │   │   ├── useActiveModulesQuery.ts
│   │   │   │   ├── useModuleQuery.ts
│   │   │   │   ├── useParagraphQuery.ts
│   │   │   │   └── useParagraphVocabularyQuery.ts
│   │   │   └── vocabulary/     #   - Global Vocabulary Actions (Admin/SuperAdmin)
│   │   │       ├── useUpdateVocabularyMutation.ts
│   │   │       └── useDeleteVocabularyMutation.ts
│   │   ├── state/              # ★ Hooks for global client state (Zustand) ★
│   │   │   └── useAuth.ts      #   - Hook to access global Zustand auth state
│   │   ├── ui/                 # ★ Hooks for UI logic/state ★
│   │   │   └── useNotifications.ts # - Example
│   │   └── utils/              # ★ Optional: Generic utility hooks ★
│   │       └── useDebounce.ts    # - Example
│   ├── providers/            # Client-side context providers
│   │   └── QueryProvider.tsx   # TanStack Query Provider
│   ├── store/                # Zustand state management stores
│   │   └── authStore.ts
│   ├── styles/               # Global styles (if needed beyond globals.css)
│   └── types/                # TypeScript definitions
│       ├── api/                # Types generated/derived from Swagger/API Schemas (index.ts)
│       └── index.ts            # General app types
├── public/                 # Static assets
├── tailwind.config.ts
├── tsconfig.json
├── next.config.mjs
├── package.json
└── .env.local              # Local environment variables (e.g., NEXT_PUBLIC_API_BASE_URL)
```

**Note on Structure:** This revised structure separates routing (`app/`) from feature implementation (`features/`). Each `page.tsx` in `app/` primarily imports and renders the corresponding main component from `src/features/`. Feature folders contain their specific logic, components, and utilize hooks from `src/hooks/`.

### 3.2. Layouts (`app/layout.tsx`, `app/(auth)/layout.tsx`, etc.)

- **Root Layout (`app/layout.tsx`):** Contains `<html>`, `<body>`, global providers (NextUI/HeroUI Provider, `QueryProvider`, potentially Zustand Provider). **Also include the `<Toaster />` component from `sonner` here** to render notifications globally.
- **Public Layout (`app/(public)/layout.tsx`):** Basic structure for login, signup pages. Maybe a simple header/footer.
- **Authenticated Layout (`app/(auth)/layout.tsx`):**
  - Wraps all pages requiring login.
  - Includes shared `Header`, `Sidebar`, `Footer` from `src/components/layout/`.
  - **Manages authentication state:** Uses the `useAuth` hook (`src/hooks/state/useAuth.ts`) to check authentication status. If not authenticated, redirects to `/login` using `useRouter` from `next/navigation`. This layout component itself will be a Client Component (`'use client'`) to use these hooks.
  - Fetches the user's profile (`GET /profiles/me`) potentially via the `useAuth` hook (which could internally use `useProfileQuery` on mount/state change) or directly uses `useProfileQuery` to make user data available.
- **Role-Specific Layouts (Optional but recommended):** Nested layouts within `(auth)/admin/layout.tsx` or `(auth)/student/layout.tsx` can provide role-specific navigation (e.g., different sidebar links).

### 3.3. Authentication (`lib/auth.ts`, `store/authStore.ts`, `hooks/useAuth.ts`)

- **Token Storage (`lib/auth.ts`):** Use secure `httpOnly` cookies managed by the backend for refresh tokens. Access tokens obtained from `/login` or `/refresh` should ideally be stored in memory (e.g., in the Zustand store) for the duration of the session. If persistence across page refreshes is needed _without_ hitting `/refresh` immediately, carefully consider `sessionStorage` (cleared on tab close) but be mindful of security implications. Avoid `localStorage` for JWTs.
  - Functions: `saveToken(token)`, `getToken()`, `clearToken()`. These will interact with the Zustand store.
- **Zustand Store (`store/authStore.ts`):**
  - State: `isAuthenticated` (boolean), `user` (ProfileDTO | null), `token` (string | null), `isLoading` (boolean).
  - Actions: `login(credentials)`, `studentLogin(credentials)`, `logout()`, `loadUserSession()`, `setToken(token)`, `setUser(user)`, `clearAuth()`. Actions like `login` will call the API via `apiClient` and update the store state. `setToken` is crucial for the refresh mechanism.
- **Auth Hook (`hooks/useAuth.ts`):** Simple hook to access the `authStore` state and actions easily in components.
- **Auth Guarding:** Primarily handled by the **`app/(auth)/layout.tsx` Client Component**, which uses the `useAuth` hook and `useRouter` for redirection if `!isAuthenticated`. Role-based guarding can also occur within this layout or nested layouts (e.g., `app/(auth)/admin/layout.tsx`) by checking the `user.role` from the `useAuth` hook.

### 3.4. General API Client Wrapper (`lib/apiClient.ts`) - ★ CRUCIAL for Consistency - Now using Axios ★

This wrapper standardizes API interactions using Axios, enabling interceptors for automatic token handling and refresh logic.

```typescript
// src/lib/apiClient.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore"; // Assuming Zustand store hook

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Define a custom error class for API errors, potentially extending AxiosError
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
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.originalError = originalError;
  }
}

// Create an Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // ★ Crucial for sending httpOnly cookies (like refresh token)
});

// --- Request Interceptor ---
// Adds the Authorization header to outgoing requests if a token exists.
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from Zustand store *inside* the interceptor function
    // This ensures the latest token is used if it gets refreshed.
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Handle request configuration errors
    console.error("Request Interceptor Error:", error);
    return Promise.reject(error);
  }
);

// --- Response Interceptor ---
// Handles 401 errors by attempting to refresh the token and retrying the original request.
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
    }; // Add _retry flag type

    // Check if it's a 401 error and not a retry or refresh token failure
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
              originalRequest.headers["Authorization"] = "Bearer " + token;
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
        console.log("Attempting token refresh...");
        // Attempt to refresh the token (Backend uses httpOnly cookie)
        const refreshResponse = await axios.post<{ accessToken: string }>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true } // Ensure cookies are sent
        );

        const newAccessToken = refreshResponse.data.accessToken;

        // Update token in Zustand store
        useAuthStore.getState().setToken(newAccessToken);
        console.log("Token refreshed successfully.");

        // Update the header of the original request
        if (originalRequest.headers) {
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken); // Process queued requests with the new token

        // Retry the original request with the new token
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        // If refresh fails, logout the user and reject queued requests
        useAuthStore.getState().clearAuth(); // Clear Zustand state
        processQueue(
          new ApiError("Session expired. Please log in again.", 401),
          null
        );

        // Redirect to login - This part is tricky in an interceptor.
        // Best practice is often to let the calling code handle the redirect based on the final error.
        // window.location.href = '/login'; // Avoid direct manipulation if possible

        return Promise.reject(
          new ApiError(
            "Session expired. Please log in again.",
            401,
            (refreshError as AxiosError).response?.data,
            refreshError as AxiosError
          )
        );
      } finally {
        isRefreshing = false; // Reset refreshing flag
      }
    }

    // For non-401 errors or errors during refresh, create and reject with ApiError
    const status = error.response?.status || 0; // Use 0 for network errors
    const message =
      (error.response?.data as any)?.message ||
      error.message ||
      "An unexpected error occurred";
    const apiError = new ApiError(message, status, error.response?.data, error);
    console.error(`API Error (${status}):`, apiError);
    return Promise.reject(apiError);
  }
);

// --- Convenience Methods ---
// Define convenience methods using the configured Axios instance

export const api = {
  get: <T>(endpoint: string, config?: InternalAxiosRequestConfig) =>
    apiClient.get<T>(endpoint, config).then((res) => res.data),

  post: <T>(
    endpoint: string,
    data?: any,
    config?: InternalAxiosRequestConfig
  ) => apiClient.post<T>(endpoint, data, config).then((res) => res.data),

  patch: <T>(
    endpoint: string,
    data?: any,
    config?: InternalAxiosRequestConfig
  ) => apiClient.patch<T>(endpoint, data, config).then((res) => res.data),

  put: <T>(endpoint: string, data?: any, config?: InternalAxiosRequestConfig) =>
    apiClient.put<T>(endpoint, data, config).then((res) => res.data),

  delete: <T>(endpoint: string, config?: InternalAxiosRequestConfig) =>
    apiClient.delete<T>(endpoint, config).then((res) => res.data),

  // Expose the raw instance if needed for specific configurations (e.g., file uploads)
  instance: apiClient,
};
```

### 3.5. Data Fetching (GET Requests) - ★ CSR + TanStack Query Strategy ★

- **Public Routes (`app/(public)/...`):**
  - Use **Server Components** primarily.
  - Fetch data directly within the component using `async/await` with `fetch` (or the new `api.get` if preferred, ensuring it handles server-side context appropriately or making it client-only). Consider potential differences in caching between raw `fetch` and Axios on the server.
  - Leverage Next.js caching (`cache: 'force-cache'`, `next: { revalidate: number }`) for static or infrequently changing public content (e.g., Blog posts, Features page). Pass data as props to Client Components if interactivity is needed.
- **Authenticated Routes (`app/(auth)/...`):**

  - Use **Client Components** (`'use client'`) primarily for pages/components requiring data.
  - **Use TanStack Query (`@tanstack/react-query`)** for all data fetching via the `useQuery` hook.
  - **★ Pattern: Wrap `useQuery` calls in custom hooks** organized by feature/domain (e.g., `src/hooks/api/admin/useAdminStudentsQuery.ts`).
  - **Inside Custom Hook:** Define `queryKey`, `queryFn` (using **`api.get` from `lib/apiClient.ts`**, often defined in the same file), and any specific options (`staleTime`, `enabled`, etc.).
  - **Component Usage:** **Feature components** (e.g., `src/features/admin-student-list/index.tsx`) import and call the custom hook, receiving the query state (`data`, `isLoading`, `error`, etc.) and rendering the UI. The corresponding `page.tsx` (e.g., `src/app/(auth)/admin/students/page.tsx`) simply imports and renders this feature component.

    ```typescript
    // Example: Usage within src/features/admin-student-list/index.tsx (Client Component)
    import { useAdminStudentsQuery } from "@/hooks/api/admin/useAdminStudentsQuery";
    // Import UI components from src/components/ui or feature-specific components

    export function AdminStudentList() {
      // Renamed to reflect feature component
      const { data: students, isLoading, error } = useAdminStudentsQuery();

      if (isLoading) return <Spinner />; // Assuming Spinner is a shared UI component
      if (error) return <Alert color="danger">Error: {error.message}</Alert>; // Assuming Alert is shared
      // Render student table using 'students' data and UI components
      // ... Table component, Add button etc. ...
    }

    // Example: src/app/(auth)/admin/students/page.tsx (Server or Client, likely Client to handle potential modals/actions easily)
    import { AdminStudentList } from "@/features/admin-student-list";

    export default function AdminStudentsPage() {
      return <AdminStudentList />;
    }
    ```

  - **Benefits:** TanStack Query handles caching, background refetching, loading/error states, retries, devtools, etc. Custom hooks provide abstraction and reusability.

### 3.6. Data Mutation (POST, PATCH, DELETE) - ★ CSR + TanStack Query Strategy ★

- **ALL** data mutations within **authenticated routes** (`app/(auth)/...`) should be handled via **Client Components using TanStack Query's `useMutation` hook.**
- **★ Pattern: Wrap `useMutation` calls in custom hooks** organized by feature/domain (e.g., `src/hooks/api/admin/useUpdateStudentMutation.ts`). Each hook typically resides in its own file, colocated with its corresponding API call function.
- **Public route mutations** (Login, Signup, Student Login) still use **Server Actions** as described in 4.1, leveraging `useFormState` for feedback.
- **Inside Custom Hook:**
  1.  Get `queryClient` using `useQueryClient()`.
  2.  Define the mutation using `useMutation`.
  3.  **`mutationFn`:** An async function that takes the mutation variables (e.g., form data) and calls the backend API, typically using the `api.post`, `api.patch`, or `api.delete` wrappers from `lib/apiClient.ts`. (This API call function usually lives in the same file).
      - **Alternatively:** The `mutationFn` _can_ call a Server Action if server-side logic (beyond just calling the API) is needed, but TanStack Query still manages the client state.
  4.  **`onSuccess` Callback:** Perform actions after success, like:
      - Invalidating relevant queries using `queryClient.invalidateQueries({ queryKey: [...] })` to refetch stale data (e.g., invalidate `['admin', 'students']` after adding a student).
  5.  **`onError` Callback:** Handle errors (e.g., logging, preparing error message for UI).
  6.  Return the mutation object (`mutate`, `isPending`, `error`, `data`, etc.) from the hook.
- **Component Usage:**

  1.  Call the custom mutation hook to get the `mutate` function and state (`isPending`, `error`).
  2.  Integrate with React Hook Form:
      - Use `useForm` for form state and validation (`zodResolver`).
      - Get the `mutate` function from the custom mutation hook.
      - In the `onSubmit` handler provided by `useForm`, call `mutate(variables, { onSuccess: ..., onError: ... })` with the validated form data and potentially component-specific callbacks.
      - Use the hook's `isPending` state to disable the submit button or show loading indicators.
      - Use the hook's `error` state to display mutation-specific errors. Client-side validation errors are handled by React Hook Form directly.

  ```typescript
  // Example: Usage within src/features/admin-edit-student-modal/EditStudentForm.tsx (Client Component)
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import { useUpdateStudentMutation } from "@/hooks/api/admin/useUpdateStudentMutation";
  import { profileUpdateSchema } from "@/lib/schemas"; // Assuming Zod schema definition
  // Import necessary UI components (Input, Button, Alert) from @/components/ui

  function EditStudentForm({
    // This might be the core part of the feature component
    student,
    onClose, // Callback to close modal/form
  }: {
    student: ProfileDTO;
    onClose: () => void;
  }) {
    // ... rest of the component code remains the same ...
  }

  // The page triggering this might look like:
  // src/app/(auth)/admin/students/[profileId]/page.tsx
  // Renders <AdminStudentDetail studentId={params.profileId} /> from src/features/admin-student-detail
  // The AdminStudentDetail feature component would fetch student data and have a button
  // that opens a Dialog/Modal containing the <EditStudentForm> feature component.
  ```

- This approach centralizes async state management (loading, error, success) for mutations within TanStack Query and provides a clean abstraction via custom hooks.

### 3.7. State Management (Zustand)

- Use for **global state**: Authentication status, user profile, maybe site-wide settings or notifications.
- Use for **cross-feature state**: If multiple unrelated features need to share complex state (use sparingly).
- Avoid overusing it for local component state or simple data fetched for a specific page. Use React's built-in state (`useState`, `useReducer`) or Server Component props for those.
- Structure stores logically (e.g., `authStore`, `moduleStore`, `progressStore`).
- **Notifications:** Use a dedicated Zustand store (`notificationStore.ts`) and hook (`useNotifications.ts`) to manage notification state globally. This store will trigger `toast()` calls from `sonner`.

### 3.8. Type Safety

- Generate TypeScript types from the `NoteEarly-swagger-2.json` spec using tools like `openapi-typescript`. Place generated types in `src/types/api/`.
- Manually define types/interfaces where needed, ensuring they align with API schemas.
- Use Zod schemas for runtime validation (e.g., `VocabularyBodySchema`, `UpdateVocabularyBodySchema`) and derive static types using `z.infer<typeof schema>`. Ensure generated types include `VocabularyEntryDTO`.
- **(Optional) Shared Types:** If using a monorepo structure where types are shared between frontend and backend, consider placing shared types in a dedicated package (e.g., `packages/shared/types`) and configuring path aliases (e.g., `@shared/*` in `tsconfig.json`) for easy imports.

## 4. Screen/Page Implementation Details

This section maps API functionality to frontend features, noting the primary **feature component** (in `src/features/`) that implements the logic and the **route** (`src/app/.../page.tsx`) that renders it.

**(Note:** Feature components within `src/features/` handling authenticated data will generally be Client Components `'use client'` to use hooks like `useQuery` and `useMutation`. The corresponding `page.tsx` files in `src/app/` can often remain Server Components unless they need client-side interactivity themselves.)

---

### 4.1. Public Area (`app/(public)/...`) - SSR / Server Actions

_(These screens use Server Actions for mutations. The UI logic resides in feature components rendered by the pages.)_

- **Screen:** Login (Admin/SuperAdmin)
  - **Route:** `/login` -> Renders `src/features/public/login-form/index.tsx`
  - **Feature:** `src/features/public/login-form/index.tsx`
  - **Purpose:** Allow Admins/SuperAdmins to log in.
  - **Components:** Form (Email, Password), Submit Button, Links, Error Display. Likely uses client components internally for `useFormState`.
  - **Mutation:** **Server Action (`loginAction(formData)`)** invoked by the form within the feature component. // Hook: N/A // API: POST /auth/login
    - Validation, API call, redirect logic as before.
- **Screen:** Signup (Admin/SuperAdmin)
  - **Route:** `/signup` -> Renders `src/features/public/signup-form/index.tsx`
  - **Feature:** `src/features/public/signup-form/index.tsx`
  - **Purpose:** Allow new Admins/SuperAdmins to register.
  - **Components:** Form, Submit Button, Link to Login, Error Display. Uses client components for `useFormState`.
  - **Mutation:** **Server Action (`signupAction(formData)`)** invoked by the form. // Hook: N/A // API: POST /auth/signup
    - Validation, API call, feedback logic as before.
- **Screen:** Student Login
  - **Route:** `/student-login` -> Renders `src/features/public/student-login-form/index.tsx`
  - **Feature:** `src/features/public/student-login-form/index.tsx`
  - **Purpose:** Allow Students to log in using ID and PIN.
  - **Components:** Form, Submit Button, Error Display. Uses client components for `useFormState`.
  - **Mutation:** **Server Action (`studentLoginAction(formData)`)** invoked by the form. // Hook: N/A // API: POST /auth/student/login
    - Validation, API call, redirect logic as before.
- **Screen:** Google Auth Callback (Implicit) - _No Change_
- **Screen:** Password Reset Request / Confirmation (If implemented) - _Likely Server Actions_

---

### 4.2. Authenticated Area - Common (`app/(auth)/...`) - ★ CSR + TanStack Query ★

_(Routes render feature components from `src/features/`. Feature components are Client Components using TanStack Query hooks.)_

- **Screen:** User Profile
  - **Route:** `/profile` -> Renders `src/features/shared/user-profile/index.tsx`
  - **Feature:** `src/features/shared/user-profile/index.tsx` (`'use client'`)
  - **Purpose:** View and edit own profile details.
  - **Components:** Profile display, Edit Form (React Hook Form), Save Button.
  - **Data Fetching:** Feature uses `src/hooks/api/profile/useProfileQuery.ts`. // API: GET /profiles/me
  - **Mutation:** Feature uses `src/hooks/api/profile/useUpdateProfileMutation.ts`. // API: PATCH /profiles/me
    - Component calls `mutate` from hook, handles feedback.
- **Screen:** Settings / Subscription Management
  - **Route:** `/settings` -> Renders `src/features/shared/user-settings/index.tsx` (handles multiple settings aspects)
  - **Feature:** `src/features/shared/user-settings/index.tsx` (`'use client'`)
  - **Purpose:** View/Manage subscription, Reset Password.
  - **Components:** Sections for Subscription, Password Reset.
  - **Data Fetching (Subscription):** Feature uses `src/hooks/api/profile/useProfileQuery.ts` and `src/hooks/api/admin/subscriptions/useSubscriptionPlansQuery.ts`. // APIs: GET /profiles/me, GET /subscriptions/plans
  - **Mutation (Subscription):** Feature uses `src/hooks/api/profile/useManageSubscriptionMutation.ts`. // API: POST /subscriptions/manage
  - **Mutation (Password):** Feature uses `src/hooks/api/profile/useResetPasswordMutation.ts`. // API: POST /auth/reset-password
    - Feature component handles rendering forms and calling `mutate`.
- **Screen:** Admin Home Page
  - **Route:** `/admin/home` -> Renders `src/features/admin/home/index.tsx`
  - **Feature:** `src/features/admin/home/index.tsx` (`'use client'`)
  - **Purpose:** Landing page for Admins/SuperAdmins after login. Show relevant overview/stats/links.
  - **Components:** Stats widgets, quick links, recent activity feed.
  - **Data Fetching:** Potentially `useAdminStudentsQuery` (for counts), `useMyModulesQuery` (for counts), or specific dashboard API if added later. // APIs: GET /profiles/admin/students, GET /reading-modules/my-modules
- **Screen:** Manage Students (List)
  - **Route:** `/admin/students` -> Renders `src/features/admin/student-list/index.tsx`
  - **Feature:** `src/features/admin/student-list/index.tsx` (`'use client'`)
  - **Purpose:** View, search, filter students. Trigger create/edit/reset/delete actions (often modals implemented within this feature or separate features).
  - **Components:** Student Table, Add Button, Filters, Modals (or triggers for modal features).
  - **Data Fetching:** Feature uses `src/hooks/api/admin/students/useAdminStudentsQuery.ts`. // API: GET /profiles/admin/students
  - **Mutations (Triggered from here):** Create (`useCreateStudentMutation.ts`), Reset PIN (`useResetStudentPinMutation.ts`), Delete (`useDeleteStudentMutation.ts`). Edit is often triggered here but implemented in detail view/modal.
- **Screen:** View Student Details
  - **Route:** `/admin/students/{profileId}` -> Renders `src/features/admin/student-detail/index.tsx`
  - **Feature:** `src/features/admin/student-detail/index.tsx` (`'use client'`)
  - **Purpose:** View specific student profile & progress. Trigger edit/progress update actions.
  - **Components:** Profile display, Progress table/list, Edit Button (triggers modal feature), Update Progress controls/modal trigger.
  - **Data Fetching:** Feature uses `src/hooks/api/admin/students/useAdminStudentQuery.ts` and `src/hooks/api/admin/progress/useAdminModuleProgressQuery.ts` (filtered). // APIs: GET /profiles/admin/students/{profileId}, GET /progress/admin/module/{moduleId}
  - **Mutations (Triggered from here):** Edit (`useUpdateStudentMutation.ts` - likely in modal feature), Update Progress (`useAdminUpdateProgressMutation.ts`).
- **Screen:** Create Student (Modal Feature)
  - **Route:** N/A (Modal triggered from `/admin/students` route/feature)
  - **Feature:** `src/features/admin/create-student-modal/index.tsx` (`'use client'`)
  - **Purpose:** Add a new student profile.
  - **Components:** Form (Full Name, PIN), Save Button, Cancel Button.
  - **Mutation:** Feature uses `src/hooks/api/admin/students/useCreateStudentMutation.ts`. // API: POST /auth/admin/student
- **Screen:** Edit Student (Modal Feature)
  - **Route:** N/A (Modal triggered from student list or detail)
  - **Feature:** `src/features/admin/edit-student-modal/index.tsx` (`'use client'`)
  - **Purpose:** Edit student details.
  - **Components:** Form (Full Name, Avatar), Save Button, Cancel Button.
  - **Data Fetching:** Requires student data passed as prop or fetched via `useAdminStudentQuery` if standalone.
  - **Mutation:** Feature uses `src/hooks/api/admin/students/useUpdateStudentMutation.ts`. // API: PATCH /profiles/admin/students/{profileId}
- **Screen:** Manage Reading Modules (Admin View)
  - **Route:** `/admin/modules` -> Renders `src/features/admin/module-list/index.tsx`
  - **Feature:** `src/features/admin/module-list/index.tsx` (`'use client'`)
  - **Purpose:** View list of owned custom modules. Trigger create/delete actions.
  - **Components:** Module Table/Grid, Create Button, Filters, Delete confirmation modal (part of feature).
  - **Data Fetching:** Feature uses `src/hooks/api/admin/modules/useMyModulesQuery.ts`. // API: GET /reading-modules/my-modules
  - **Mutation (Delete):** Feature uses `src/hooks/api/admin/modules/useDeleteModuleMutation.ts`. // API: DELETE /reading-modules/{id}

---

### 4.3. Student Area (`app/(auth)/student/...`) - ★ CSR + TanStack Query ★

_(All components here will likely be Client Components `'use client'` )_

- **Screen:** Student Home Page
  - **Route:** `/student/home`
  - **Feature:** `src/features/student/home/index.tsx` (`'use client'`)
  - **Purpose:** Overview/landing page for students.
  - **Components:** Module lists/cards showing progress status, quick start buttons.
  - **Data Fetching:** Use `src/hooks/api/readingModules/useActiveModulesQuery.ts` and `src/hooks/api/student/progress/useMyProgressQuery.ts`, correlate client-side. // APIs: GET /reading-modules/active, GET /progress/my-progress
- **Screen:** Module Reading Interface
  - **Route:** `/student/modules/{moduleId}`
  - **Feature:** `src/features/student/module-reading/index.tsx` (`'use client'`)
  - **Purpose:** Read module, submit summaries, view vocabulary.
  - **Components:** Content display, Navigation, Summary Input, Vocabulary display.
  - **Data Fetching:**
    - Module details: Use `src/hooks/api/readingModules/useModuleQuery.ts`. // API: GET /reading-modules/{id}
    - Current paragraph: Fetch dynamically using `src/hooks/api/readingModules/useParagraphQuery.ts`. // API: GET /reading-modules/{moduleId}/paragraph/{paragraphIndex}
    - **Vocabulary for current paragraph:** Use `src/hooks/api/readingModules/useParagraphVocabularyQuery.ts`. // API: GET /reading-modules/{moduleId}/paragraphs/{paragraphIndex}/vocabulary
    - Existing progress/submissions: Use `src/hooks/api/student/progress/useStudentProgressDetailsQuery.ts`. // API: GET /progress/details/{moduleId}
  - **State:** Local state (`useState`) for `currentParagraphIndex`, form inputs. Server state managed by TanStack Query via custom hooks.
  - **Mutation (Start):** Use `src/hooks/api/student/progress/useStartModuleMutation.ts`, potentially triggered `onMount` or first interaction if no progress exists. // API: POST /progress/start
  - **Mutation (Submit Summary):** Use `src/hooks/api/student/progress/useSubmitSummaryMutation.ts`. // API: POST /progress/submit-summary
    - Component calls `mutate`, handles local state updates (index, inputs) and success/error feedback.
- **Screen:** View My Progress (List)
  - **Route:** `/student/progress`
  - **Feature:** `src/features/student/progress-list/index.tsx` (`'use client'`)
  - **Purpose:** See list of all modules started/completed.
  - **Components:** Table/List of modules with status/score.
  - **Data Fetching:** Use `src/hooks/api/student/progress/useMyProgressQuery.ts`. Fetch module titles if needed via `src/hooks/api/readingModules/useActiveModulesQuery.ts` and correlate. // APIs: GET /progress/my-progress, GET /reading-modules/active
- **Screen:** View My Progress (Module Detail)
  - **Route:** `/student/modules/{moduleId}/details`
  - **Feature:** `src/features/student/module-details/index.tsx` (`'use client'`)
  - **Purpose:** See detailed progress, summaries, feedback.
  - **Components:** Progress overview, List/Accordion of summaries, Feedback display.
  - **Data Fetching:** Use `src/hooks/api/student/progress/useStudentProgressDetailsQuery.ts`. // API: GET /progress/details/{moduleId}

---

### 4.4. SuperAdmin Area (`app/(auth)/superadmin/...`) - ★ CSR + TanStack Query ★

_(Follows the same CSR + TanStack Query pattern as the Admin area, using appropriate endpoints and custom hooks)_

- **Screen:** Curated Module Management
  - **Route:** `/superadmin/curated-modules` (example)
  - **Feature:** `src/features/superadmin/curated-modules/index.tsx` (`'use client'`)
  - **Purpose:** View, create, edit, delete curated and custom modules.
  - **Data Fetching:** Use `src/hooks/api/readingModules/useActiveModulesQuery.ts` (for active/curated) and `src/hooks/api/admin/modules/useMyModulesQuery.ts` (for custom, if needed) or a combined/dedicated SuperAdmin query. // APIs: GET /reading-modules/active, etc.
  - **Mutations:** Use `src/hooks/api/superadmin/curatedModules/useCreateCuratedModuleMutation.ts`, `src/hooks/api/superadmin/curatedModules/useUpdateAnyModuleMutation.ts`, `src/hooks/api/superadmin/curatedModules/useDeleteAnyModuleMutation.ts`. // APIs: POST /reading-modules/curated, PATCH /reading-modules/curated/{id}, DELETE /reading-modules/curated/{id}
- **Screen:** Analytics Dashboard
  - **Route:** `/superadmin/analytics` (example)
  - **Feature:** `src/features/superadmin/analytics/index.tsx` (`'use client'`)
  - **Purpose:** View overall platform analytics.
  - **Data Fetching:** Use `src/hooks/api/superadmin/analytics/useAnalyticsDashboardQuery.ts`, `src/hooks/api/superadmin/analytics/useAnalyticsPopularModulesQuery.ts`, `src/hooks/api/superadmin/analytics/useAnalyticsSubscriptionsQuery.ts`, `src/hooks/api/superadmin/analytics/useAnalyticsStudentQuery.ts` (if viewing specific student). // APIs: GET /analytics/dashboard, GET /analytics/modules/popular, GET /analytics/subscriptions, GET /analytics/students/{studentId}
- **Screen:** SuperAdmin Home Page (Optional - could just be Admin Home)
  - **Route:** `/superadmin/home` (if needed)
  - **Feature:** `src/features/superadmin/home/index.tsx` or reuse `admin/home` (`'use client'`)
  - **Purpose:** Specific landing page for SuperAdmins if different from Admins.
  - **Components:** Might include links to Analytics, User Management, Curated Modules.
  - **Data Fetching:** Depends on the specific content needed.

---

## 5. Reusable Components (`src/components/...`)

Identify and build common **globally reusable, stateless UI components**:

- `layout/Header`, `layout/Sidebar`, `layout/Footer` (...)
- `ui/Button`, `ui/Input`, `ui/Textarea`, `ui/Card`, `ui/Dialog`, `ui/Table`, `ui/Progress`, `ui/Alert`, `ui/Select`, `ui/Checkbox`, `ui/Avatar` (Base components from ShadCN, customized if needed)
- **Note:** Components with significant state or logic tied to a specific domain belong in `src/features/<feature-name>/components/`. Avoid putting feature-specific components in the global `src/components/`. `SubmitButton` might live here if generic enough, or within specific feature forms if its loading state is tied to feature-specific mutations.

## 6. Testing Strategy

- **Unit/Integration:** Jest + React Testing Library. Test individual components, hooks, utility functions, and potentially Server Actions (mocking API calls). Configure Jest to handle path aliases (`moduleNameMapper`).
- **E2E:** Cypress. Test critical user flows (login, signup, creating module, submitting summary, admin actions). Configure Cypress base URL and potentially use `start-server-and-test`.

## 7. Deployment

- **Platform:** Vercel (recommended for Next.js).
- **Build:** `npm run build`. Ensure no TypeScript errors (unless `ignoreBuildErrors` is _dangerously_ enabled).
- **Environment Variables:** Configure production `NEXT_PUBLIC_API_BASE_URL` and any other necessary variables on the deployment platform.

## 8. Next Steps & Considerations

- **Detailed Error Handling:**
  - Implement user-friendly error messages using `error` states from `useQuery` and `useMutation`, and React Hook Form's `formState.errors`.
  - **Use a global notification system (Zustand store + `useNotifications` hook triggering `sonner`)** to display success/error toasts. Call `toast()` from `sonner` (e.g., `toast.success('Profile updated!')`, `toast.error(error.message)`) within `onSuccess`/`onError` callbacks of mutations or after handling Server Action responses.
- **Loading States:** Use `isLoading` from `useQuery` and `isPending` from `useMutation` to show spinners, skeletons, or disable elements. Leverage Next.js Loading UI (`loading.tsx`) for initial route transitions.
- **Modal Implementation:** Feature-specific modals (like Create/Edit forms) should be implemented as distinct feature components (e.g., `src/features/admin-edit-student-modal/`). Their visibility (`isOpen` state) should typically be managed **locally within the parent feature component** that triggers them (using `useState`). The modal component receives necessary data via props.
- **Optimistic UI:** For mutations like submitting summaries or quick edits, leverage **TanStack Query's optimistic update features** for a smoother UX.
- **Accessibility (a11y):** Ensure semantic HTML, keyboard navigation, ARIA attributes, and color contrast compliance.
- **Internationalization (i18n):** Plan for multi-language support if needed.
- **Real-time Updates (Optional):** Consider WebSockets or polling, potentially integrated with TanStack Query's refetching mechanisms.
- **Axios Configuration:** Fine-tune Axios settings (timeouts, etc.) as needed. Ensure `withCredentials: true` is set for the instance to handle the refresh token cookie.

This guide provides a solid foundation for a CSR-focused approach within the authenticated areas, leveraging TanStack Query for robust client-side state management and Axios for streamlined API communication. **The feature-centric structure enhances modularity.** Remember to always refer back to the `NoteEarly-swagger-2.json` as the source of truth for API details and structure your TanStack Query keys logically.

## 9. Recommended Implementation Order

This section outlines a logical sequence for implementing the application's features and infrastructure, respecting dependencies between components and functionalities.

1.  **Core Client Infrastructure Setup:**

    - Implement the base `apiClient` (`src/lib/apiClient.ts`) with Axios, including basic configuration (baseURL, headers, `withCredentials`). _Initially, interceptors might be minimal, focusing on basic requests._
    - Set up the Zustand `authStore` (`src/store/authStore.ts`) with initial state fields (`token`, `user`, `isAuthenticated`, etc.) and basic actions (`setToken`, `setUser`, `clearAuth`).
    - Create the basic `useAuth` hook (`src/hooks/state/useAuth.ts`) to access the store.
    - Set up the root layout (`src/app/layout.tsx`) including the `QueryProvider` and global styles/providers.
    - Create the basic public layout (`src/app/(public)/layout.tsx`).

2.  **Public Authentication Flows (Server Actions):**

    - Implement the **Admin/SuperAdmin Login** flow: Server Action (`loginAdminAction`), Feature Component (`features/public/login-form`), Page Component (`app/(public)/login/page.tsx`). Ensure direct `fetch` is used in the Server Action and cookies are handled correctly by the backend.
    - Implement the **Admin/SuperAdmin Signup** flow (if applicable via frontend): Server Action, Feature Component, Page Component.
    - Implement the **Student Login** flow: Server Action (`loginStudentAction`), Feature Component (`features/public/student-login-form`), Page Component (`app/(public)/student-login/page.tsx`).

3.  **Client-Side Auth Infrastructure & Profile:**

    - Implement the **Authenticated Layout** (`src/app/(auth)/layout.tsx`): Mark as `'use client'`, add basic structure (Header, Sidebar placeholders), use `useAuth` and `useRouter` for the authentication guard redirecting to `/login`.
    - Implement the **Profile Fetching Hook:** Create `src/hooks/api/profile/useProfileQuery.ts` using the `apiClient`.
    - **Enhance Authenticated Layout:** Call `useProfileQuery` within the layout. Update the `authStore` (e.g., via `onSuccess` in the hook or an effect in the layout) with the fetched user data.
    - **Refine `apiClient`:** Fully implement the request and response interceptors in `src/lib/apiClient.ts` to handle token injection, 401 errors, and the `/auth/refresh` logic using the `authStore`.

4.  **User Profile & Settings Features:**

    - Implement the **User Profile Feature** (`src/features/shared/user-profile`) using `useProfileQuery` and `useUpdateProfileMutation`.
    - Implement the **Settings Feature** (`src/features/shared/user-settings`) using `useProfileQuery`, `useResetPasswordMutation`, `useManageSubscriptionMutation`, and `useSubscriptionPlansQuery`.

5.  **Admin - Student Management Features:**

    - Implement `useAdminStudentsQuery` and the **Student List Feature** (`src/features/admin/student-list`).
    - Implement `useCreateStudentMutation` and the **Create Student Modal Feature** (`src/features/admin/create-student-modal`), integrating the trigger into the Student List.
    - Implement `useAdminStudentQuery`, `useUpdateStudentMutation`, and the **Edit Student Modal Feature** (`src/features/admin/edit-student-modal`), integrating the trigger.
    - Implement `useDeleteStudentMutation` and integrate the action (e.g., into the Student List).
    - Implement `useResetStudentPinMutation` and integrate the action.
    - Implement the **Student Detail Feature** (`src/features/admin/student-detail`), likely combining profile display and potentially progress overview (requiring hooks from step 7).

6.  **Admin - Module Management Features:**

    - Implement `useMyModulesQuery` and the **Module List Feature** (`src/features/admin/module-list`).
    - Implement `useCreateModuleMutation` and the **Create Module Feature** (`src/features/admin/create-module`).
    - Implement `useUpdateModuleMutation`, `useDeleteModuleMutation` and the **Edit Module Feature** (`src/features/admin/edit-module`).
    - Implement Vocabulary hooks (`useAddVocabularyMutation`, `useModuleVocabularyQuery`, `useUpdateVocabularyMutation`, `useDeleteVocabularyMutation`) and integrate vocabulary management into the Create/Edit Module features.

7.  **Admin - Progress Management Features:**

    - Implement `useAdminModuleProgressQuery`.
    - Implement `useAdminUpdateProgressMutation`.
    - Integrate progress viewing and feedback into relevant Admin features (e.g., Student Detail, potentially a dedicated Module Progress view).

8.  **Student - Core Features:**

    - Implement the **Student Home Feature** (`src/features/student/home`) using `useActiveModulesQuery` and `useMyProgressQuery`.
    - Implement `useModuleQuery`, `useParagraphQuery`, `useParagraphVocabularyQuery`, `useStartModuleMutation`, `useSubmitSummaryMutation`, and the **Module Reading Feature** (`src/features/student/module-reading`) including its `SummaryModal` component.
    - Implement the **Student Progress List Feature** (`src/features/student/progress-list`) using `useMyProgressQuery`.
    - Implement `useStudentProgressDetailsQuery` and the **Student Module Detail Feature** (`src/features/student/module-details`).

9.  **SuperAdmin Features:**

    - Implement Analytics hooks and the **Analytics Feature** (`src/features/superadmin/analytics`).
    - Implement Curated Module hooks (`useCreateCuratedModuleMutation`, etc.) and the **Curated Modules Feature** (`src/features/superadmin/curated-modules`).

10. **Testing & Refinement:** Integrate testing (unit, integration, E2E) throughout the process as features are completed. Refine UI/UX based on testing and feedback.
