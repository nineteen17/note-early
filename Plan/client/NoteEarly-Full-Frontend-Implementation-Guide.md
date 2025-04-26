# NoteEarly Frontend Implementation Guide (Next.js 15)

**Version:** 1.0
**Based on API Spec:** `NoteEarly-swagger-2.json` (verified)

## 1. Introduction

This guide details the frontend implementation plan for the NoteEarly platform. It outlines the required screens, application architecture, component structure, data fetching/mutation strategies, and state management approach. The goal is to build a robust, maintainable, and consistent user interface using modern web technologies.

**Core Technologies:**

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + NextUI (or HeroUI - ensure consistency based on final choice)
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod
- **API Client:** Custom `fetch` wrapper

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
    ```
3.  **Tailwind CSS & NextUI/HeroUI Setup:**
    - Follow the official NextUI/HeroUI documentation for integrating with Next.js and Tailwind CSS. This involves configuring `tailwind.config.ts` (adding the plugin and content paths) and wrapping the root layout in the `<Provider>`.
    - [NextUI Next.js Guide](https://nextui.org/docs/frameworks/nextjs)
4.  **Environment Variables:**
    - Create `.env.local` in the `client` project root.
    - Define `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1` (or the deployed backend URL).
5.  **TypeScript Configuration (`tsconfig.json`):**
    - Ensure `baseUrl` and `paths` are correctly set for the `@/*` alias.
    - Enable `strict` mode.

## 3. Core Architecture

Consistency is key. We will establish patterns for common tasks.

### 3.1. Directory Structure

Adopt a feature-oriented or domain-based structure within the standard Next.js App Router conventions:

```
client/
├── src/
│   ├── app/                  # App Router pages, layouts, loading, error files
│   │   ├── (auth)/           # Routes requiring authentication
│   │   │   ├── admin/        # Admin-specific routes & layouts
│   │   │   │   ├── students/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [profileId]/
│   │   │   │   │       ├── edit/
│   │   │   │   │       │   └── page.tsx
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── modules/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── create/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── [moduleId]/
│   │   │   │   │       ├── edit/
│   │   │   │   │       │   └── page.tsx
│   │   │   │   │       └── page.tsx
│   │   │   │   └── dashboard/
│   │   │   │       └── page.tsx
│   │   │   ├── student/      # Student-specific routes & layouts
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── modules/
│   │   │   │   │   └── [moduleId]/
│   │   │   │   │       ├── page.tsx      # Module reading interface
│   │   │   │   │       └── details/    # Progress details
│   │   │   │   │           └── page.tsx
│   │   │   │   └── progress/
│   │   │   │       └── page.tsx      # List of all progress
│   │   │   ├── superadmin/   # SuperAdmin routes (e.g., analytics, curated modules)
│   │   │   │   └── ...
│   │   │   ├── profile/        # User's own profile view/edit
│   │   │   │   └── page.tsx
│   │   │   ├── settings/       # Settings (e.g., subscription)
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx      # Authenticated layout (handles auth state)
│   │   ├── (public)/         # Routes accessible without authentication
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── signup/
│   │   │   │   └── page.tsx
│   │   │   ├── student-login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx      # Public layout
│   │   ├── api/                # API Routes (Optional, if needed beyond Server Actions)
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   └── layout.tsx          # Root layout
│   ├── components/           # Reusable UI components (dumb components)
│   │   ├── layout/             # Layout components (Header, Sidebar, Footer)
│   │   ├── ui/                 # Generic UI elements (Button, Card, Modal, Input etc.)
│   │   └── features/           # Components specific to features (e.g., ModuleCard, ProgressTable)
│   ├── lib/                  # Core utilities, helpers, constants
│   │   ├── apiClient.ts        # Centralized API fetch wrapper (CRUCIAL)
│   │   ├── auth.ts             # Auth token storage/retrieval logic
│   │   ├── utils.ts            # General utility functions
│   │   └── constants.ts        # Application constants
│   ├── hooks/                # Custom React hooks
│   │   └── useAuth.ts          # Hook to access auth state
│   ├── store/                # Zustand state management stores
│   │   ├── authStore.ts
│   │   └── /* feature stores */
│   ├── styles/               # Global styles (if needed beyond globals.css)
│   └── types/                # TypeScript definitions
│       ├── api/                # Types generated/derived from Swagger/API Schemas
│       └── index.ts
├── public/                 # Static assets
├── tailwind.config.ts
├── tsconfig.json
├── next.config.mjs
├── package.json
└── .env.local
```

**Note on Structure:** While this guide places feature-specific logic (components, actions) within the `app/` route groups (e.g., `app/(auth)/admin/`), an alternative approach is to create a top-level `src/features/` directory. This can offer clearer separation between routing concerns (`app/`) and feature implementation (`features/`), as seen in some common patterns. Choose the structure that best suits the team's preference for organization.

### 3.2. Layouts (`app/layout.tsx`, `app/(auth)/layout.tsx`, etc.)

- **Root Layout (`app/layout.tsx`):** Contains `<html>`, `<body>`, global providers (NextUI/HeroUI Provider, potentially Zustand Provider if needed client-side).
- **Public Layout (`app/(public)/layout.tsx`):** Basic structure for login, signup pages. Maybe a simple header/footer.
- **Authenticated Layout (`app/(auth)/layout.tsx`):**
  - Wraps all pages requiring login.
  - Likely includes main site Header, Sidebar (potentially role-specific), and Footer.
  - Crucially, it should **manage authentication state**. On load, check for a valid token (using `lib/auth.ts`). If no valid token, redirect to `/login`.
  - It can fetch the user's profile (`GET /profiles/me`) using the `apiClient` (client-side or server-side via route handler/server component logic) and make it available via Context or Zustand store (`useAuth` hook).
- **Role-Specific Layouts (Optional but recommended):** Nested layouts within `(auth)/admin/layout.tsx` or `(auth)/student/layout.tsx` can provide role-specific navigation (e.g., different sidebar links).

### 3.3. Authentication (`lib/auth.ts`, `store/authStore.ts`, `hooks/useAuth.ts`)

- **Token Storage (`lib/auth.ts`):** Use secure `httpOnly` cookies managed by the backend for refresh tokens. Access tokens obtained from `/login` or `/refresh` should ideally be stored in memory (e.g., in the Zustand store) for the duration of the session. If persistence across page refreshes is needed _without_ hitting `/refresh` immediately, carefully consider `sessionStorage` (cleared on tab close) but be mindful of security implications. Avoid `localStorage` for JWTs.
  - Functions: `saveToken(token)`, `getToken()`, `clearToken()`.
- **Zustand Store (`store/authStore.ts`):**
  - State: `isAuthenticated` (boolean), `user` (ProfileDTO | null), `token` (string | null), `isLoading` (boolean).
  - Actions: `login(credentials)`, `studentLogin(credentials)`, `logout()`, `loadUserSession()`, `setToken(token)`, `setUser(user)`, `clearAuth()`. Actions like `login` will call the API via `apiClient` and update the store state.
- **Auth Hook (`hooks/useAuth.ts`):** Simple hook to access the `authStore` state and actions easily in components.
- **Auth Guarding:** Primarily handled by the `(auth)/layout.tsx` checking for token/user state and redirecting. Middleware (`middleware.ts` at root or `src/`) can also be used for route protection based on tokens _before_ rendering layouts.

### 3.4. General API Client Wrapper (`lib/apiClient.ts`) - ★ Crucial for Consistency ★

This wrapper standardizes API interactions, particularly useful for client-side fetching or simpler server-side calls. See Section 3.6 for Server Action specific considerations.

```typescript
// src/lib/apiClient.ts
import { getToken } from "./auth"; // Function to get token from store/memory

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Define a custom error class for API errors
export class ApiError extends Error {
  status: number;
  data?: any; // Optional: include error response body

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  useAuth?: boolean; // Flag to indicate if auth token should be sent
  // Add other custom options if needed
}

async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    useAuth = true,
    headers: customHeaders,
    body,
    ...fetchOptions
  } = options;
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (useAuth) {
    const token = getToken(); // Get token from your auth store/logic
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      // Optionally handle missing token for authenticated requests early
      // console.warn(`Auth token missing for request to ${endpoint}`);
      // Depending on strategy, could throw error or let backend handle 401
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      body: body ? JSON.stringify(body) : null, // Stringify body if present
    });

    // Check if the response is successful
    if (!response.ok) {
      let errorData;
      try {
        // Try to parse error response body
        errorData = await response.json();
      } catch (e) {
        // If no JSON body, use status text
        errorData = { message: response.statusText };
      }
      // Use message from parsed error data if available, otherwise default
      const errorMessage =
        errorData?.message || `HTTP error! status: ${response.status}`;
      throw new ApiError(errorMessage, response.status, errorData);
    }

    // Handle successful responses with no content (e.g., 204)
    if (response.status === 204) {
      return undefined as T; // Or handle as appropriate for your use case
    }

    // Parse successful JSON response
    const data: T = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      // Re-throw API errors for specific handling
      throw error;
    } else if (error instanceof Error) {
      // Handle network errors or other fetch-related issues
      console.error("Network or fetch error:", error);
      throw new ApiError(error.message || "Network error occurred", 0, error); // Use status 0 for network errors
    } else {
      // Handle unexpected errors
      console.error("Unexpected error:", error);
      throw new ApiError("An unexpected error occurred", -1, error);
    }
  }
}

// Define convenience methods for HTTP verbs

export const api = {
  get: <T>(
    endpoint: string,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ) => apiClient<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(
    endpoint: string,
    body: any,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ) => apiClient<T>(endpoint, { ...options, method: "POST", body }),

  patch: <T>(
    endpoint: string,
    body: any,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ) => apiClient<T>(endpoint, { ...options, method: "PATCH", body }),

  put: <T>(
    endpoint: string,
    body: any,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ) => apiClient<T>(endpoint, { ...options, method: "PUT", body }),

  delete: <T>(
    endpoint: string,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ) => apiClient<T>(endpoint, { ...options, method: "DELETE" }),
};
```

### 3.5. Data Fetching (GET Requests) - Consistency

- **Server Components:** Use `async/await` with `fetch` (wrapped by `api.get`) directly within Server Components for initial data loading. Leverage Next.js caching (`cache: 'force-cache'`, `cache: 'no-store'`, `next: { revalidate: number }`) as appropriate. Pass data as props to Client Components.
- **Client Components:** For dynamic data, updates, or data needed after initial render, use:
  - `useEffect` hook with `api.get`. Manage loading/error states manually.
  - **(Recommended for complex cases):** Libraries like SWR or TanStack Query (React Query) simplify client-side fetching, caching, revalidation, and state management. If used, ensure they also utilize the `api.get` wrapper.

### 3.6. Data Mutation (POST, PATCH, DELETE) - Consistency using Server Actions

- **ALL** data mutations should be handled via **Server Actions**.
- Define Server Actions (`'use server';`) in separate files (e.g., `app/(auth)/admin/students/actions.ts`) or colocated within Server Components if simple.
- **Server Actions Calling the Backend API:**
  - Server Actions run on the server and can directly call your backend API endpoints using `fetch`.
  - **Authentication:** If your backend API relies on cookies for authentication, you can forward them from the browser to your API. Use `cookies()` from `next/headers` within the Server Action to get the incoming request cookies and pass them in the `fetch` call's `headers`.
  - **Caching:** Leverage Next.js server-side `fetch` caching options (`cache: 'no-store'`, `next: { revalidate: ... }`, `next: { tags: [...] }`) as needed within the Server Action's `fetch` call to control data freshness.
  - **Error Handling:** Use the custom `ApiError` class (defined in `apiClient.ts` or a similar server-side utility) to handle errors consistently.
  - **Using the General Wrapper:** You _can_ use the `apiClient` from Section 3.4 within Server Actions if you don't need automatic cookie forwarding or fine-grained Next.js caching controls managed directly within the action. If using it, manually pass necessary headers (like auth tokens if not using cookies).
- **Inside Server Actions:**
  1.  Perform necessary authorization checks (e.g., check user role from session/token).
  2.  Validate input data using Zod schemas (can reuse schemas defined for API). Use `schema.safeParse()` to handle validation errors gracefully.
  3.  Call the backend API using `fetch` (potentially with forwarded cookies/cache options) or the `apiClient`.
  4.  Handle potential `ApiError` exceptions from `apiClient`.
  5.  Return meaningful success/error objects (serializable) for the client.
- **Client-Side (Forms):**
  1.  Use React Hook Form (`useForm`) with Zod resolver (`zodResolver`) for client-side validation.
  2.  Use the `useFormState` hook (from `react-dom`) to handle pending/response states from the Server Action.
  3.  Pass the Server Action directly to the `<form action={...}>` prop or `form.handleSubmit()`.
  4.  Display validation errors or success/error messages based on the state returned by `useFormState`.

### 3.7. State Management (Zustand)

- Use for **global state**: Authentication status, user profile, maybe site-wide settings or notifications.
- Use for **cross-feature state**: If multiple unrelated features need to share complex state (use sparingly).
- Avoid overusing it for local component state or simple data fetched for a specific page. Use React's built-in state (`useState`, `useReducer`) or Server Component props for those.
- Structure stores logically (e.g., `authStore`, `moduleStore`, `progressStore`).

### 3.8. Type Safety

- Generate TypeScript types from the `NoteEarly-swagger-2.json` spec using tools like `openapi-typescript`. Place generated types in `src/types/api/`.
- Manually define types/interfaces where needed, ensuring they align with API schemas.
- Use Zod schemas for runtime validation (e.g., `VocabularyBodySchema`, `UpdateVocabularyBodySchema`) and derive static types using `z.infer<typeof schema>`. Ensure generated types include `VocabularyEntryDTO`.
- **(Optional) Shared Types:** If using a monorepo structure where types are shared between frontend and backend, consider placing shared types in a dedicated package (e.g., `packages/shared/types`) and configuring path aliases (e.g., `@shared/*` in `tsconfig.json`) for easy imports.

## 4. Screen/Page Implementation Details

This section maps API functionality to frontend screens.

**(Note:** This assumes separate dashboards/views for Admin and Student roles, adjust routes if a single interface with conditional rendering is used.)

---

### 4.1. Public Area (`app/(public)/...`)

- **Screen:** Login (Admin/SuperAdmin)
  - **Route:** `/login`
  - **Purpose:** Allow Admins/SuperAdmins to log in.
  - **Components:** Form (Email, Password), Submit Button, Link to Signup/Password Reset (if applicable), Error Message Display.
  - **Mutation:** Server Action (`loginAction(formData)`)
    - Validates with `AdminLoginInput` Zod schema.
    - Calls `api.post('/auth/login', validatedData)`.
    - On success: Saves token (`saveToken`), updates `authStore`, redirects to admin dashboard (`redirect('/admin/dashboard')`).
    - On error: Returns error message for `useFormState`.
- **Screen:** Signup (Admin/SuperAdmin)
  - **Route:** `/signup`
  - **Purpose:** Allow new Admins/SuperAdmins to register.
  - **Components:** Form (Full Name, Email, Password), Submit Button, Link to Login, Error Message Display.
  - **Mutation:** Server Action (`signupAction(formData)`)
    - Validates with `AdminSignupInput` Zod schema.
    - Calls `api.post('/auth/signup', validatedData)`.
    - On success: Shows success message, maybe redirects to login.
    - On error: Returns error message for `useFormState`.
- **Screen:** Student Login
  - **Route:** `/student-login`
  - **Purpose:** Allow Students to log in using ID and PIN.
  - **Components:** Form (Student ID, PIN), Submit Button, Error Message Display.
  - **Mutation:** Server Action (`studentLoginAction(formData)`)
    - Validates with `StudentLoginInput` Zod schema.
    - Calls `api.post('/auth/student/login', validatedData)`.
    - On success: Saves token, updates `authStore`, redirects to student dashboard (`redirect('/student/dashboard')`).
    - On error: Returns error message for `useFormState`.
- **Screen:** Google Auth Callback (Implicit)
  - **Route:** `/auth/callback` (Handled by backend, redirects)
  - **Purpose:** Page the user lands on after Google OAuth. Client needs to handle the session creation triggered by the backend redirect. The `(auth)/layout.tsx` should detect the new session.
- **Screen:** Password Reset Request / Confirmation (If implemented)
  - **Route:** `/forgot-password`, `/reset-password`
  - **Purpose:** Handle password reset flow.
  - **Components:** Forms, Buttons.
  - **Mutation:** Server Actions calling relevant (currently missing) backend endpoints or `/auth/reset-password` if used differently.

---

### 4.2. Authenticated Area - Common (`app/(auth)/...`)

- **Screen:** User Profile
  - **Route:** `/profile`
  - **Purpose:** View and edit own profile details.
  - **Components:** Profile display section, Edit Form (Full Name, Avatar URL - potentially file upload), Save Button.
  - **Data Fetching:**
    - Server Component: Fetch user data using `api.get<ProfileDTO>('/profiles/me')`. Pass to client components.
    - Or Client Component: Fetch using `api.get` in `useEffect` or hook, update `authStore`.
  - **Mutation:** Server Action (`updateProfileAction(formData)`)
    - Validates with `ProfileUpdateRequest` Zod schema.
    - Calls `api.patch('/profiles/me', validatedData)`.
    - On success: Updates `authStore`, shows success message, potentially `revalidatePath('/profile')`.
    - On error: Returns error message.
- **Screen:** Settings / Subscription Management
  - **Route:** `/settings` (or similar)
  - **Purpose:** View current subscription, manage subscription via Stripe Portal.
  - **Components:** Display current plan details (from `authStore.user`), Button "Manage Subscription".
  - **Data Fetching:** User profile data from `authStore`. Plans fetched if needed: `api.get<SubscriptionPlan[]>('/subscriptions/plans')`.
  - **Mutation:** Server Action (`redirectToStripePortal()`)
    - Calls `api.post<{ url: string }>('/subscriptions/manage', {})`.
    - On success: Redirects user to the Stripe `url` using `redirect(url)`.
    - On error: Show error message.

---

### 4.3. Admin Area (`app/(auth)/admin/...`)

- **Screen:** Admin Dashboard
  - **Route:** `/admin/dashboard`
  - **Purpose:** Overview for Admins (e.g., student count, recent activity - specific stats TBD based on actual needs, maybe uses Analytics endpoints if Admin = SuperAdmin).
  - **Components:** Stat Cards, Tables, Charts (if needed).
  - **Data Fetching:** Server Component fetches data from relevant endpoints (e.g., `GET /profiles/admin/students` for count, potentially `/analytics/*` if SuperAdmin).
- **Screen:** Manage Students (List)
  - **Route:** `/admin/students`
  - **Purpose:** View, search, filter list of managed students. Link to create new student.
  - **Components:** Student Table (Name, Email, Status?, Actions - View, Edit, Reset PIN, Delete), Add Student Button, Search/Filter controls.
  - **Data Fetching:** Server Component fetches `api.get<ProfileDTO[]>('/profiles/admin/students')`. Pagination/filtering might require client-side fetching or Server Component search param handling.
- **Screen:** View Student Details
  - **Route:** `/admin/students/{profileId}`
  - **Purpose:** View detailed profile and progress of a specific student.
  - **Components:** Profile details display, Progress summary table/list.
  - **Data Fetching:** Server Component fetches profile: `api.get<ProfileDTO>(\`/profiles/admin/students/\${profileId}\`)`and potentially progress:`api.get<StudentProgressSchema[]>(\`/admin/progress/student/\${studentId}\`)` (Note: requires mapping profileId to student's actual user ID if different).
- **Screen:** Create Student
  - **Route:** `/admin/students/create` (Likely a Modal on `/admin/students` page)
  - **Purpose:** Add a new student profile.
  - **Components:** Form (Full Name, PIN), Save Button, Cancel Button.
  - **Mutation:** Server Action (`createStudentAction(formData)`)
    - Validates with `CreateStudentInput` Zod schema.
    - Calls `api.post('/auth/admin/student', validatedData)`.
    - On success: Shows success message, closes modal, `revalidatePath('/admin/students')`.
    - On error: Returns error message.
- **Screen:** Edit Student
  - **Route:** `/admin/students/{profileId}/edit` (Likely a Modal)
  - **Purpose:** Edit student's details (Name, Avatar).
  - **Components:** Form (Full Name, Avatar URL), Save Button, Cancel Button.
  - **Data Fetching:** Needs initial student data (fetched on parent page or via `api.get(\`/profiles/admin/students/\${profileId}\`)`).
  - **Mutation:** Server Action (`updateStudentAction(profileId, formData)`)
    - Validates with `ProfileUpdateRequest` Zod schema.
    - Calls `api.patch(\`/profiles/admin/students/\${profileId}\`, validatedData)`.
    - On success: Updates UI, closes modal, `revalidatePath('/admin/students')`, `revalidatePath(\`/admin/students/\${profileId}\`)`.
    - On error: Returns error message.
- **Action:** Reset Student PIN
  - **Route:** (Triggered from `/admin/students` list, likely via a confirmation modal)
  - **Purpose:** Reset a student's login PIN.
  - **Components:** Confirmation Modal, New PIN Input (auto-generate or manual?), Confirm Button.
  - **Mutation:** Server Action (`resetStudentPinAction(studentId, formData)`)
    - Validates with `ResetStudentPinInput` Zod schema.
    - Calls `api.post('/auth/admin/student/reset-pin', validatedData)`.
    - On success: Shows success message (e.g., "New PIN is XXXX").
    - On error: Shows error message in modal.
- **Action:** Delete Student
  - **Route:** (Triggered from `/admin/students` list, via confirmation modal)
  - **Purpose:** Delete a student profile.
  - **Components:** Confirmation Dialog.
  - **Mutation:** Server Action (`deleteStudentAction(profileId)`)
    - Calls `api.delete(\`/profiles/admin/students/\${profileId}\`)`.
    - On success: Shows success message, `revalidatePath('/admin/students')`.
    - On error: Shows error message.
- **Screen:** Manage Reading Modules (Admin View)
  - **Route:** `/admin/modules`
  - **Purpose:** View list of all modules (Curated + Own Custom). Filter/search. Link to create.
  - **Components:** Module Table/Grid (Title, Level, Genre, Type, Status, Actions - View, Edit, Delete), Create Module Button, Filters.
  - **Data Fetching:** Server Component fetches own modules `api.get<ReadingModuleDTO[]>('/reading-modules/my-modules')` and potentially all curated `api.get<ReadingModuleDTO[]>('/reading-modules/active')` (or a dedicated admin endpoint if exists). Combine/display based on role.
- **Screen:** Create Custom Module
  - **Route:** `/admin/modules/create`
  - **Purpose:** Create a new custom reading module.
  - **Components:** Form (Title, Level, Genre, Description, Image URL, Active Toggle, Structured Content Input - complex component needed here, maybe rich text editor or paragraph list), Save Button.
  - **Mutation:** Server Action (`createModuleAction(formData)`)
    - Validates with `CreateModuleInput` Zod schema.
    - Calls `api.post('/reading-modules', validatedData)`.
    - On success: Redirects to `/admin/modules`, shows success message.
    - On error: Returns error message.
- **Screen:** Edit Module
  - **Route:** `/admin/modules/{moduleId}/edit`
  - **Purpose:** Edit an existing custom module (or any if SuperAdmin). Also manage associated vocabulary.
  - **Components:** Same form as Create, pre-filled with module data. **Additional section/modal for managing vocabulary entries (List, Add, Edit, Delete buttons).**
  - **Data Fetching:** Server Component fetches `api.get<ReadingModuleDTO>(\`/reading-modules/\${moduleId}\`)`**and`api.get<VocabularyEntryDTO[]>(\`/reading-modules/\${moduleId}/vocabulary\`)`\*\*.
  - **Mutation (Module):** Server Action (`updateModuleAction(moduleId, formData)`)
    - Validates with `UpdateModuleInput` Zod schema.
    - Calls `api.patch(\`/reading-modules/\${moduleId}\`, validatedData)`(or`/curated/{id}` if SuperAdmin editing curated).
    - On success: Redirects to `/admin/modules`, shows success message, `revalidatePath(\'/admin/modules\')`, `revalidatePath(\`/admin/modules/\${moduleId}/edit\`)`.\
    - On error: Returns error message.
  - **Mutation (Vocabulary - Add):** Server Action (`addVocabularyAction(moduleId, formData)`)
    - Validates with `VocabularyBodySchema` Zod schema.
    - Calls `api.post(\`/reading-modules/\${moduleId}/vocabulary\`, validatedData)`.\
    - On success: Updates vocabulary list in UI, `revalidatePath(\`/admin/modules/\${moduleId}/edit\`)`.\
    - On error: Returns error message (e.g., in modal).\
  - **Mutation (Vocabulary - Update):** Server Action (`updateVocabularyAction(vocabularyId, formData)`)
    - Validates with `UpdateVocabularyBodySchema` Zod schema.
    - Calls `api.put(\`/vocabulary/\${vocabularyId}\`, validatedData)`.\
    - On success: Updates vocabulary list in UI, `revalidatePath(\`/admin/modules/\${moduleId}/edit\`)`.\
    - On error: Returns error message.\
  - **Mutation (Vocabulary - Delete):** Server Action (`deleteVocabularyAction(vocabularyId)`)
    - Calls `api.delete(\`/vocabulary/\${vocabularyId}\`)`.\
    - On success: Updates vocabulary list in UI, `revalidatePath(\`/admin/modules/\${moduleId}/edit\`)`.\
    - On error: Returns error message.
- **Action:** Delete Module
  - **Route:** (Triggered from `/admin/modules` list, via confirmation modal)
  - **Purpose:** Delete a custom module (or any if SuperAdmin).
  - **Components:** Confirmation Dialog.
  - **Mutation:** Server Action (`deleteModuleAction(moduleId)`)
    - Calls `api.delete(\`/reading-modules/\${moduleId}\`)`(or`/curated/{id}` if SuperAdmin).
    - On success: Shows success message, `revalidatePath('/admin/modules')`.
    - On error: Shows error message.
- **Screen:** View Module Progress (Admin View)
  - **Route:** `/admin/progress/module/{moduleId}`
  - **Purpose:** See all student progress for a specific module.
  - **Components:** Table listing students, progress status (completed, score, last active), link to individual student progress detail.
  - **Data Fetching:** Server Component fetches `api.get<StudentProgressSchema[]>(\`/progress/admin/module/\${moduleId}\`)`.

---

### 4.4. Student Area (`app/(auth)/student/...`)

- **Screen:** Student Dashboard
  - **Route:** `/student/dashboard`
  - **Purpose:** Overview for students: assigned/in-progress modules, recently completed, maybe stats.
  - **Components:** Module lists/cards ("In Progress", "Start New", "Completed"), maybe basic stats.
  - **Data Fetching:** Server Component fetches active modules `api.get<ReadingModuleDTO[]>('/reading-modules/active')` and student's own progress `api.get<StudentProgressSchema[]>('/progress/my-progress')`. Data is then correlated client-side or in the component to display relevant module lists.
- **Screen:** Module Reading Interface
  - **Route:** `/student/modules/{moduleId}`
  - **Purpose:** Read module content paragraph by paragraph, submit summaries.
  - **Components:** Content display area (shows current paragraph), Navigation (Next/Previous Paragraph), Summary Input Textarea (for current paragraph), Cumulative Summary Display (read-only), Submit Summary Button, Progress Indicator (e.g., Paragraph X of Y). **Vocabulary display area/tooltip/modal for current paragraph.**
  - **Data Fetching:**
    - Initial module data (title, total paragraphs): `api.get<ReadingModuleDTO>(\`/reading-modules/\${moduleId}\`)`.
    - Current paragraph text: `api.get<Paragraph>(\`/reading-modules/\${moduleId}/paragraph/\${currentParagraphIndex}\`)`. Fetched client-side on navigation.
    - **Vocabulary for current paragraph:** `api.get<VocabularyEntryDTO[]>(\`/reading-modules/\${moduleId}/paragraphs/\${currentParagraphIndex}/vocabulary\`)`. Fetched client-side on navigation.
    - Existing progress/submissions for resuming: `api.get<StudentProgressDetailsDTOSchema>(\`/progress/details/\${moduleId}\`)`.
  - **State:** Local state for `currentParagraphIndex`, current paragraph `text`, `paragraphSummary` input, `cumulativeSummary`, **`currentParagraphVocabulary`**.
  - **Mutation (Start):** Implicitly call `api.post('/progress/start', { moduleId })` via a Server Action the _first_ time a student interacts (e.g., submits first summary or maybe on page load if no progress exists).
  - **Mutation (Submit Summary):** Server Action (`submitSummaryAction(formData)`)
    - Takes `moduleId`, `paragraphIndex`, `paragraphSummary`, `cumulativeSummary`.
    - Validates with `SubmitSummaryInput` Zod schema.
    - Calls `api.post('/progress/submit-summary', validatedData)`.
    - On success: Updates local state (`currentParagraphIndex`, clears inputs), potentially fetches next paragraph, shows success message. If module complete, update UI accordingly. `revalidatePath(\`/student/modules/\${moduleId}/details\`)`, `revalidatePath('/student/progress')`.
    - On error: Displays error message.
- **Screen:** View My Progress (List)
  - **Route:** `/student/progress`
  - **Purpose:** See list of all modules started/completed by the student.
  - **Components:** Table/List of modules (Title, Status - Completed/In Progress, Score, Last Active), Link to module or progress details.
  - **Data Fetching:** Server Component fetches `api.get<StudentProgressSchema[]>('/progress/my-progress')`. May need to correlate with module titles fetched via `api.get('/reading-modules/active')` or similar.
- **Screen:** View My Progress (Module Detail)
  - **Route:** `/student/modules/{moduleId}/details`
  - **Purpose:** See detailed progress for one specific module, including submitted summaries and feedback.
  - **Components:** Progress overview (Score, Status, Time), List/Accordion of submitted paragraph summaries, Teacher Feedback display section.
  - **Data Fetching:** Server Component fetches `api.get<StudentProgressDetailsDTOSchema>(\`/progress/details/\${moduleId}\`)`.

---

### 4.5. SuperAdmin Area (`app/(auth)/superadmin/...`)

- **(Screens mirror Admin where applicable, plus additional ones)**
- **Screen:** Curated Module Management
  - **Route:** `/superadmin/curated-modules` (or similar)
  - **Purpose:** Create, View, Edit, Delete Curated modules.
  - **Components:** Similar to Admin Module Management, but actions use `/reading-modules/curated` endpoints.
  - **Mutations:** Server Actions calling `POST /reading-modules/curated`, `PATCH /reading-modules/curated/{id}`, `DELETE /reading-modules/curated/{id}`.
- **Screen:** Analytics Dashboard
  - **Route:** `/superadmin/analytics`
  - **Purpose:** View platform-wide analytics.
  - **Components:** Charts, Stat cards.
  - **Data Fetching:** Server Component calls `GET /analytics/dashboard`, `/analytics/modules/popular`, `/analytics/subscriptions`.
- **(Other Analytics Screens)**: Implement routes and components for `/analytics/students/{studentId}` etc. as needed.

---

## 5. Reusable Components (`src/components/...`)

Identify and build common components:

- `layout/Header`, `layout/Sidebar`, `layout/Footer`
- `ui/Button`, `ui/Input`, `ui/Textarea`, `ui/Card`, `ui/Modal`, `ui/Table`, `ui/Spinner`, `ui/Alert`, `ui/Select`, `ui/Checkbox`, `ui/Avatar` (Leverage NextUI/HeroUI heavily here)
- `features/AuthForm` (configurable for Login/Signup)
- `features/ModuleCard`, `features/ModuleList`, `features/ModuleForm`
- `features/ProgressTable`, `features/ParagraphDisplay`, `features/SummaryInput`
- `features/VocabularyList`, `features/VocabularyForm`, `features/VocabularyDisplay` (New)
- `layout/AuthGuard` (Component or logic within `(auth)/layout.tsx` to handle auth checks)
- `layout/RoleGuard` (Component or logic within layouts to check user roles for specific sections)
- `ui/SubmitButton` (Client Component using `useFormStatus` from `react-dom` to show loading/disabled states during Server Action form submissions)

## 6. Testing Strategy

- **Unit/Integration:** Jest + React Testing Library. Test individual components, hooks, utility functions, and potentially Server Actions (mocking API calls). Configure Jest to handle path aliases (`moduleNameMapper`).
- **E2E:** Cypress. Test critical user flows (login, signup, creating module, submitting summary, admin actions). Configure Cypress base URL and potentially use `start-server-and-test`.

## 7. Deployment

- **Platform:** Vercel (recommended for Next.js).
- **Build:** `npm run build`. Ensure no TypeScript errors (unless `ignoreBuildErrors` is _dangerously_ enabled).
- **Environment Variables:** Configure production `NEXT_PUBLIC_API_BASE_URL` and any other necessary variables on the deployment platform.

## 8. Next Steps & Considerations

- **Detailed Error Handling:** Implement user-friendly error messages for specific API errors (e.g., validation failures, 401, 403, 404).
- **Loading States:** Implement loading indicators (spinners, skeletons) for data fetching and mutations.
- **Optimistic UI:** For mutations like submitting summaries, consider optimistic updates using `useOptimistic` hook with Server Actions for a smoother UX.
- **Accessibility (a11y):** Ensure semantic HTML, keyboard navigation, ARIA attributes, and color contrast compliance.
- **Internationalization (i18n):** Plan for multi-language support if needed.
- **Real-time Updates (Optional):** Consider WebSockets or polling if real-time updates are required (e.g., live progress tracking for admins).

This guide provides a solid foundation. Each screen implementation will involve detailed component design, state wiring, and precise API integration following the consistent patterns outlined, especially using the `apiClient` wrapper and Server Actions for mutations. Remember to always refer back to the `NoteEarly-swagger-2.json` as the source of truth for API details.
