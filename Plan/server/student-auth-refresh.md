# Refined Plan: Student Authentication with Refresh Tokens

This plan outlines the steps to implement a secure authentication flow for student users using custom JSON Web Tokens (JWTs) with an HttpOnly refresh token mechanism, mimicking the pattern used for admin/Supabase authentication.

---

## I. Backend (`server/src/`)

1.  **Environment Variables (`.env` & `src/config/env.ts`)**
    *   **Define in `.env`:**
        *   `JWT_SECRET`: (Ensure exists, strong secret for signing student **access** tokens).
        *   `JWT_EXPIRES_IN`: (Ensure exists, e.g., `'15m'` for 15 minutes, for student **access** token expiry).
        *   `JWT_REFRESH_SECRET`: (Add, separate strong secret for signing student **refresh** tokens).
        *   `JWT_REFRESH_TOKEN_EXPIRY_SECONDS`: (Add, e.g., `604800` for 7 days, for student **refresh** token expiry).
    *   **Validate/Parse in `src/config/env.ts` (Zod schema):** Ensure these variables are loaded and validated correctly (using the corrected schema).

2.  **JWT Utilities (`src/utils/jwt.ts`)**
    *   **Update Token Generation Functionality:**
        *   *Goal:* Generate *both* access and refresh JWTs for students.
        *   *Approach:* Modify the **existing `generateStudentToken` function** or create a new wrapper function (e.g., `generateStudentAuthTokens`).
        *   *Access Token Generation (Reuse Existing):*
            *   The existing `generateStudentToken` logic will be used/called.
            *   Payload: `{ id: profile.id, role: profile.role, adminId: profile.adminId }`.
            *   Secret: `env.JWT_SECRET`.
            *   Expiry: `env.JWT_EXPIRES_IN`.
        *   *Refresh Token Generation (Add New):*
            *   Implement logic using `jsonwebtoken.sign()`.
            *   Payload: `{ id: profile.id, type: 'student_refresh' }`.
            *   Secret: `env.JWT_REFRESH_SECRET`.
            *   Expiry: Parsed `env.JWT_REFRESH_TOKEN_EXPIRY_SECONDS`.
        *   *Return:* The function should return `{ accessToken, refreshToken }`.
    *   **`verifyStudentRefreshToken(token: string): { id: string, type: string }` (New Function):**
        *   *Purpose:* Verify signature and expiry of a student refresh token.
        *   *Implementation:* Use `jsonwebtoken.verify()`. Secret: `env.JWT_REFRESH_SECRET`.
        *   *Error Handling:* Throw `AppError(401)` on failure.
        *   *Return:* Verified payload object.

3.  **Auth Service (`src/modules/auth/services/auth.service.ts`)**
    *   **`loginStudent` (Modify):**
        *   *Signature:* `async loginStudent(...) : Promise<{ profile: Profile, accessToken: string, refreshToken: string }>`
        *   *Logic:* Fetch profile, verify PIN, call updated token generation function, return `{ profile, accessToken, refreshToken }`.
    *   **`refreshStudentToken` (New Method):**
        *   *Signature:* `async refreshStudentToken(...) : Promise<{ newAccessToken: string }>`
        *   *Logic:* Verify refresh token, fetch current profile, generate *only* a new access token (using existing logic with `env.JWT_SECRET` and `env.JWT_EXPIRES_IN`), return `{ newAccessToken }`.

4.  **Auth Controller (`src/modules/auth/controllers/auth.controller.ts`)**
    *   *(Ensure methods use `try...catch` and `next(error)`)*
    *   **`loginStudent` (Modify):**
        *   Get `{ profile, accessToken, refreshToken }` from service.
        *   Set `student_refresh_token` HttpOnly cookie (using `refreshToken` and `env.JWT_REFRESH_TOKEN_EXPIRY_SECONDS`).
        *   Send `{ accessToken, profile }` in response body.
    *   **`refreshStudentToken` (New Method):**
        *   Get `refreshToken` from cookie.
        *   Call `AuthService.refreshStudentToken`.
        *   Send `{ status: 'success', data: { accessToken: newAccessToken } }` response.
    *   **`logoutStudent` (New Method):**
        *   Clear `student_refresh_token` cookie.
        *   Send success response.

5.  **Auth Routes (`src/modules/auth/routes/auth.routes.ts`)**
    *   Add `POST /auth/student/refresh` -> `AuthController.refreshStudentToken`.
    *   Add `POST /auth/student/logout` -> `AuthController.logoutStudent`.

6.  **Authentication Middleware (`src/middleware/auth.middleware.ts`)**
    *   **`authenticateUser` (Refactor Recommended):**
        *   Logic as described previously (check Bearer header -> try student JWT verify -> fallback to Supabase admin verify).

---

## II. Frontend (`client/src/`)

1.  **API Client (`src/lib/apiClient.ts`)**
    *   **Response Interceptor (Modify 401 Handler):** Implement conditional logic based on `useAuthStore` role to call `/auth/student/refresh` or `/auth/refresh`.
    *   **Non-Standard Endpoints:** Add `/auth/student/login` to `NON_STANDARD_ENDPOINTS`.
2.  **Auth Store (`src/store/authStore.ts`)**
3.  **Login Component (`src/features/public/student-login/index.tsx`)**
4.  **Logout Trigger (e.g., Navbar)**
5.  **Authenticated Components**

---

## III. Testing Considerations

*   **Token Expiry:** Access token expiry triggers refresh; refresh token expiry forces logout.
*   **Cookie Handling:** Verify `student_refresh_token` attributes (HttpOnly, Secure, etc.) and clearing on logout.
*   **Middleware:** Test protected routes for students and admins with correct Bearer tokens.
*   **Concurrent Requests:** Verify 401 queueing during refresh.
*   **Error Handling:** Test invalid PINs, invalid refresh tokens, user-not-found scenarios.