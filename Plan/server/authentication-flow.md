# Authentication Flow in NoteEarly

This document outlines the complete authentication flow for both Admins and Students in the NoteEarly application.

## Admin Authentication Flow

### Admin Creation

1. **Signup with Supabase**

   - Admin signs up via Supabase Auth (email/password or Google OAuth)
   - `POST /auth/sign-up-admin` endpoint is used
   - Email and password are sent to Supabase
   - A Supabase User is created

2. **Database Trigger & Profile Creation**

   - A database trigger automatically creates an Admin profile
   - The profile is linked to the Supabase User ID
   - Role is set to "admin"

3. **Result**
   - Admin now exists in both Supabase Auth and our database

### Admin Login

1. **Authentication with Supabase**

   - Admin logs in via `POST /auth/admin/login`
   - Credentials are verified by Supabase Auth
   - Supabase issues a JWT token

2. **Token Storage & Session**

   - JWT is stored in an HttpOnly cookie
   - Token contains user ID and role information

3. **Accessing Protected Routes**
   - For general admin routes: `authenticateAdmin` middleware checks:
     - Valid JWT token in cookie
     - User has admin role
   - For sensitive operations: `requireAdminMode` provides an additional security layer:
     - Admin must unlock admin mode with password via `POST /auth/admin/unlock`
     - Sensitive operations (student creation, deletion, etc.) require this additional verification

### Admin Mode

1. **Unlocking Admin Mode**

   - Admin provides password to `POST /auth/admin/unlock`
   - Password is verified against Supabase Auth
   - On success, admin session is marked as "admin mode active"

2. **Using Admin Mode**
   - Sensitive routes are protected by `requireAdminMode` middleware
   - This middleware checks for the admin mode session flag
   - Admin mode automatically expires after a period of inactivity

## Student Authentication Flow

### Student Creation (by Admin)

1. **Student Registration by Admin**

   - Only authenticated Admins in admin mode can create students
   - Admin sends `POST /auth/student` with student details
   - `authenticateAdmin` and `requireAdminMode` middleware verify the admin's permissions

2. **Student Account Creation**

   - System generates a unique student ID
   - System generates a PIN (or uses admin-provided PIN)
   - Student profile is created in database
   - No Supabase Auth account is created for students

3. **Result**
   - Student exists only in our application database
   - Student is given ID and PIN for authentication

### Student Login

1. **Authentication with Custom Logic**

   - Student logs in via `POST /auth/student/login` with ID and PIN
   - System validates ID and PIN against database
   - Custom JWT token is generated with `generateStudentToken` utility

2. **Token Storage & Session**

   - JWT is stored in an HttpOnly cookie
   - Token contains student ID and role information ("student")

3. **Accessing Protected Routes**
   - For student routes: `authenticateStudent` middleware checks:
     - Valid JWT token in cookie
     - User has student role
   - Students have access to their own resources only

## Key Takeaways

### For Admins

- Admins are managed through Supabase Auth
- Additional security layer with admin mode for sensitive operations
- Full access to application features based on role permissions

### For Students

- Students are created by admins, cannot self-register
- Simple ID/PIN authentication (no email/password)
- Limited access to application features
- Custom JWT implementation separate from Supabase

### Security Considerations

- HttpOnly cookies prevent client-side JavaScript from accessing tokens
- JWT verification ensures request authenticity
- Role-based middleware prevents unauthorized access
- Admin mode provides additional protection for sensitive operations
