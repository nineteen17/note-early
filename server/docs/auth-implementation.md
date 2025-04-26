# Authentication Implementation

## Overview

This document outlines the authentication implementation for NoteEarly, which includes:

1. Email/password authentication for admin users
2. Google OAuth authentication for admin users
3. PIN-based authentication for student users
4. Automatic admin profile creation via database triggers

## Auth Endpoints

### Admin Authentication

#### Email/Password Signup

- **Endpoint**: `POST /auth/admin/signup`
- **Description**: Creates a new admin account with email/password
- **Request Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "secure-password",
    "fullName": "Admin User"
  }
  ```
- **Response**: Returns user ID and access token

#### Email/Password Login

- **Endpoint**: `POST /auth/admin/login`
- **Description**: Authenticates an admin with email/password
- **Request Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "secure-password"
  }
  ```
- **Response**: Returns user ID and access token

#### Google OAuth Authentication

- **Endpoint**: `GET /auth/google/login`
- **Description**: Initiates Google OAuth sign-in flow
- **Query Parameters**:
  - `redirectUrl` (optional): URL to redirect after authentication
- **Response**: Returns URL to redirect user to Google sign-in

- **Callback Endpoint**: `GET /auth/google/callback`
- **Description**: Handles the Google OAuth callback
- **Query Parameters**:
  - `code`: Authorization code from Google
- **Response**: Redirects to frontend with authentication tokens

### Student Authentication

#### Student Creation (Admin only)

- **Endpoint**: `POST /auth/student`
- **Description**: Creates a new student profile (requires admin authentication)
- **Request Body**:
  ```json
  {
    "fullName": "Student Name",
    "pin": "1234"
  }
  ```
- **Response**: Returns student profile details

#### Student Login

- **Endpoint**: `POST /auth/student/login`
- **Description**: Authenticates a student with ID and PIN
- **Request Body**:
  ```json
  {
    "studentId": "student-uuid",
    "pin": "1234"
  }
  ```
- **Response**: Sets HTTP-only cookie with token and returns student profile

### Shared Endpoints

#### Logout

- **Endpoint**: `POST /auth/logout`
- **Description**: Logs out the current user (works for both admin and student)
- **Response**: Clears auth cookies and returns success message

## Automatic Admin Profile Creation

When a new user signs up (via email or Google OAuth), a database trigger automatically:

1. Checks if the email matches admin criteria (`@noteearly.com` or `admin@example.com`)
2. Creates a profile in the `profiles` table with `role='ADMIN'`
3. Sets profile attributes including full name (extracted from email or metadata)

### Implementation Notes

- The trigger is defined in the `0004_auto_admin_profile_creation.sql` migration
- The function uses `SECURITY DEFINER` to ensure it has appropriate permissions
- If trigger fails, the auth service will create the profile manually

## Security Considerations

1. Student authentication uses HTTP-only cookies to prevent token theft
2. Admin passwords are hashed by Supabase Auth
3. Student PINs are hashed with bcrypt before storage
4. Admin endpoints are protected by middleware (`authenticateAdmin`)
5. Cross-site request forgery (CSRF) protection via Supabase and cookie settings
