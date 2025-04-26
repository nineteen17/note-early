# Plan: Implement Hybrid Authentication (Refresh Token Cookie)

## 1. Goal

Transition from the current authentication method (sending both access and refresh tokens in the response body) to a more secure hybrid approach:

- **Access Token:** Returned in the JSON response body upon login/refresh, handled by the client (e.g., stored in memory). Sent via `Authorization: Bearer` header.
- **Refresh Token:** Set as a secure, `HttpOnly` cookie by the server upon login. Used by a dedicated backend refresh endpoint.

This enhances security by protecting the long-lived refresh token from XSS attacks.

## 2. Current State

- **Login:** `/auth/login` and `/auth/student/login` endpoints return both `access_token` and `refresh_token` in the JSON response body.
- **Client:** Assumed to store both tokens (likely in `localStorage` or `sessionStorage`) and send the `access_token` in the `Authorization: Bearer` header. Client is likely responsible for initiating token refresh.
- **Middleware:** `authenticateUser`/`authenticateAdmin` reads the `Authorization` header, extracts the Bearer token (access token), and validates it using `supabase.auth.getUser(token)`.
- **Refresh:** No dedicated server-side refresh endpoint exists. Refresh logic is assumed to be handled client-side.
- **Security:** Potential XSS vulnerability if the client stores tokens in `localStorage`, exposing both access and refresh tokens.

## 3. Implementation Steps

### 3.1. Prerequisites & Setup

- **Verify `cookie-parser`:** Ensure the `cookie-parser` middleware is installed and used in `server/src/app.ts`. (Already confirmed from `package.json` and previous checks).
- **(Optional but Recommended) Cookie Secret:** Consider adding a `COOKIE_SECRET` to your `.env` file and configuring `cookie-parser` to use it if you plan to sign cookies in the future, although it's not strictly necessary for just storing the refresh token value itself.

### 3.2. Modify Login Endpoints

**Files:**

- `server/src/modules/auth/controllers/auth.controller.ts`
- `server/src/modules/auth/services/auth.service.ts` (potentially, depends on return values)

**Changes:**

1.  **`AuthController.signInAdmin` & `AuthController.signInStudent`:**
    - After successfully obtaining the `session` object (containing `access_token` and `refresh_token`) from `AuthService`:
    - Keep sending the `access_token` (and other necessary user data like `userId`, `email`) in the JSON response body:
      ```javascript
      // Example inside controller method
      return res.status(200).json({
        status: "success",
        message: "Login successful",
        data: {
          token: session.access_token, // Access token in body
          userId: session.user.id,
          email: session.user.email,
          // ... other relevant user/profile data
        },
      });
      ```
    - Extract the `refresh_token` from the `session` object.
    - Set the `refresh_token` as an `HttpOnly` cookie in the response _before_ sending the JSON response.
      ```javascript
      // Example inside controller method, before res.json()
      if (session.refresh_token) {
        res.cookie("refresh-token", session.refresh_token, {
          httpOnly: true, // Essential for security
          secure: env.NODE_ENV === "production", // Send only over HTTPS in production
          path: "/", // Available for all paths
          sameSite: "lax", // Good default for CSRF protection
          maxAge: 1000 * 60 * 60 * 24 * 30, // Example: 30 days (match Supabase settings if possible)
        });
      } else {
        // Log a warning if refresh token is unexpectedly missing
        logger.warn("Refresh token missing from Supabase session on login");
      }
      ```

### 3.3. Create Refresh Endpoint (`/auth/refresh`)

**Files:**

- `server/src/modules/auth/routes/auth.routes.ts`
- `server/src/modules/auth/controllers/auth.controller.ts`
- `server/src/modules/auth/services/auth.service.ts`

**Changes:**

1.  **Route (`auth.routes.ts`):**

    - Define a new POST route: `authRouter.post('/refresh', authController.refreshToken);`
    - This route should _not_ use `authenticateUser` middleware initially. It might need CSRF protection middleware later.

2.  **Controller (`AuthController`):**

    - Create a new async method `refreshToken(req: Request, res: Response, next: NextFunction)`.
    - **Logic:**
      - Read the refresh token from the request cookies: `const refreshToken = req.cookies['refresh-token'];`
      - If `!refreshToken`, return `401` or `403` error (`AppError('Refresh token missing', 401)`).
      - Call a new service method: `const newSessionData = await this.authService.refreshSession(refreshToken);`
      - Send back the new `access_token`:
        ```javascript
        return res.status(200).json({
          status: "success",
          message: "Token refreshed",
          data: {
            token: newSessionData.accessToken, // Only send the new access token
            // Do NOT send the new refresh token here
          },
        });
        ```
      - Handle potential errors from the service (e.g., invalid refresh token) and pass them to `next()` or return appropriate error responses.
      - **Important:** If the `newSessionData` includes a `newRefreshToken` (due to Supabase rotation), set it in the cookie _before_ sending the response:
        ```javascript
        if (newSessionData.newRefreshToken) {
          res.cookie("refresh-token", newSessionData.newRefreshToken, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            path: "/",
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24 * 30, // Example
          });
        }
        ```

3.  **Service (`AuthService`):**

    - Create a new async method `refreshSession(refreshToken: string): Promise<{ accessToken: string; newRefreshToken?: string }>`
    - **Logic:**

      - Use the Supabase client library to refresh the session. The exact method might vary slightly, but often involves setting the session context first if you only have the refresh token string:

      ```typescript
      const { data, error } = await this.supabase.auth.setSession({
        access_token: "", // Provide an empty or expired access token
        refresh_token: refreshToken,
      });

      if (error) {
        // This usually means the refresh token was invalid or expired
        logger.error("Supabase session refresh failed", {
          error: error.message,
        });
        throw new AppError("Invalid or expired refresh token", 401); // Or 403
      }

      // Check if refresh actually occurred and session is present
      if (!data || !data.session) {
        logger.error(
          "Supabase setSession succeeded but no session data returned during refresh"
        );
        throw new AppError("Failed to refresh session", 500);
      }

      // It's good practice to verify the user exists after refresh
      const { data: userData, error: userError } =
        await this.supabase.auth.getUser();
      if (userError || !userData?.user) {
        logger.error("Failed to retrieve user after session refresh", {
          error: userError?.message,
        });
        throw new AppError("Failed to verify refreshed session", 500);
      }

      // Return the necessary data
      // Note: Supabase might automatically handle refresh token rotation.
      // Check if data.session.refresh_token differs from the input refreshToken.
      const newRefreshToken =
        data.session.refresh_token &&
        data.session.refresh_token !== refreshToken
          ? data.session.refresh_token
          : undefined;

      return {
        accessToken: data.session.access_token,
        newRefreshToken: newRefreshToken,
      };
      ```

      - Handle errors from Supabase appropriately (e.g., invalid token -> 401/403, other errors -> 500).

### 3.4. Modify Logout Endpoint

**Files:**

- `server/src/modules/auth/controllers/auth.controller.ts`

**Changes:**

1.  **`AuthController.logout`:**
    - In addition to calling the service (which calls `supabase.auth.signOut()`), explicitly clear the `refresh-token` cookie _before_ sending the success response:
      ```javascript
      // Example inside controller method
      res.clearCookie("refresh-token", {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
      });
      // ... existing logout logic ...
      return res
        .status(200)
        .json({ status: "success", message: "Logout successful" });
      ```

### 3.5. Authentication Middleware

**Files:**

- `server/src/middleware/auth.middleware.ts`

**Changes:**

- **No changes needed** for `authenticateUser`/`authenticateAdmin` in the _hybrid_ model. They should continue to read the `access_token` from the `Authorization: Bearer` header.

### 3.6. Security Considerations

- **CSRF Protection:** This is **critical**. Because the `refresh-token` cookie is sent automatically by browsers, the `/auth/refresh` endpoint is vulnerable to CSRF. Implement CSRF protection (e.g., using `csurf` middleware or double-submit cookie pattern) specifically for this endpoint, and generally for all state-changing endpoints (POST/PUT/PATCH/DELETE).
- **HTTPS:** Ensure the `Secure` flag is set on cookies in production environments to prevent interception over insecure connections.
- **CORS:** Ensure your CORS configuration (`Access-Control-Allow-Credentials`) is set correctly if your frontend is on a different origin, as cookies require credentials to be allowed.

### 3.7. Client-Side Implementation (Summary - For Frontend Dev)

- **Login:** Store the `access_token` from the response body (ideally in memory). Ignore the `refresh-token` cookie (browser handles it).
- **Requests:** Attach the stored `access_token` to the `Authorization: Bearer` header for all API calls.
- **Error Handling (401):** If an API call fails with a 401 status:
  1.  Call the backend `POST /auth/refresh` endpoint (it will automatically send the `refresh-token` cookie).
  2.  If `/refresh` succeeds:
      - Receive the new `access_token` from the response body.
      - Update the stored `access_token`.
      - Retry the original API request that failed.
  3.  If `/refresh` fails (e.g., 401/403): The refresh token is invalid/expired. Redirect the user to the login page.
- **Logout:** Clear the stored `access_token`. Call the backend `POST /auth/logout` endpoint (which clears the cookie).

## 4. Checklist

- [ ] Verify `cookie-parser` is installed and used.
- [ ] (Optional) Add `COOKIE_SECRET` to `.env`.
- [ ] Modify `AuthController.signInAdmin` to set `refresh-token` cookie.
- [ ] Modify `AuthController.signInStudent` to set `refresh-token` cookie.
- [ ] Add `POST /auth/refresh` route in `auth.routes.ts`.
- [ ] Add `refreshToken` method to `AuthController`.
- [ ] Add `refreshSession` method to `AuthService` with Supabase refresh logic.
- [ ] Implement logic in `AuthController.refreshToken` to read cookie, call service, return new access token, and set new refresh token cookie if rotated.
- [ ] Modify `AuthController.logout` to clear `refresh-token` cookie.
- [ ] Implement CSRF protection (at least for `/auth/refresh`, ideally for all state-changing routes).
- [ ] Verify `Secure` and `SameSite` cookie attributes are correctly set.
- [ ] Verify CORS `Access-Control-Allow-Credentials` if needed.
- [ ] **(Manual/External)** Update client-side application to handle the new flow (store access token, call refresh endpoint on 401).
- [ ] Test Login (Admin) - Check cookies and response body.
- [ ] Test Login (Student) - Check cookies and response body.
- [ ] Test Refresh Endpoint - Simulate expired access token, call refresh, verify new access token, verify cookie update (if rotated).
- [ ] Test Refresh Endpoint (Invalid/Expired Refresh Token) - Verify 401/403 response.
- [ ] Test Logout - Verify cookie is cleared.
- [ ] Test authenticated routes still work with `Authorization: Bearer` header using refreshed access token.
