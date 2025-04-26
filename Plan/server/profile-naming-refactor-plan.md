# Profile Naming Refactor Plan

## Overview

Refactor the codebase to use consistent naming conventions, changing from "User" to "Profile" throughout the backend services, routes, and documentation.

## Motivation

The current codebase mixes terminology between "User" and "Profile", causing confusion. This refactor will establish "Profile" as the standard term for user data within our application, while reserving "User" for Supabase authentication-specific contexts.

## Implementation Steps

### 1. File Renaming

- Rename `UserService.ts` → `ProfileService.ts`
- Rename `UserController.ts` → `ProfileController.ts`
- Rename `UserRoutes.ts` → `ProfileRoutes.ts`
- Rename `UserSchema.ts` → `ProfileSchema.ts`

### 2. Class and Interface Renaming

- Rename `UserService` class → `ProfileService`
- Rename `UserController` class → `ProfileController`
- Rename all interfaces that start with `User` to start with `Profile`
  - `UserDTO` → `ProfileDTO`
  - `UserCreateRequest` → `ProfileCreateRequest`
  - `UserUpdateRequest` → `ProfileUpdateRequest`

### 3. Route Path Updates

- Change all route paths from `/users` to `/profiles`
- Update path parameters:
  - `:userId` → `:profileId`
  - `/users/:userId` → `/profiles/:profileId`
  - `/users/:userId/someResource` → `/profiles/:profileId/someResource`

### 4. Method Renaming

- `getUserById` → `getProfileById`
- `createUser` → `createProfile`
- `updateUser` → `updateProfile`
- `deleteUser` → `deleteProfile`
- `getUsersByAdminId` → `getProfilesByAdminId` (maintain relationship description)
- `getAllStudents` → Keep as is (describes role, not entity)

### 5. Variable Renaming

- Rename all variables following the pattern:
  - `user` → `profile`
  - `users` → `profiles`
  - `userId` → `profileId`

### 6. Swagger Documentation Updates

- Update all Swagger/OpenAPI documentation to reflect new entity names
- Update example request/response bodies
- Update endpoint descriptions

### 7. Import Updates

- Update all import statements globally that reference renamed files
- Fix any broken imports after renaming

### 8. Database References

- No changes needed to the actual database schema (`profiles` table)
- Update all references to this table in the code (mostly handled by previous steps)

### 9. Testing

- Update test file names to match new naming convention
- Update test descriptions and variable names within tests
- Run all tests to verify functionality is maintained

### 10. Code Reviews

- Conduct thorough code reviews to ensure no references are missed
- Verify that functionality remains unchanged

## Potential Issues

- Third-party integrations that expect specific endpoint URLs
- Cached API references in the frontend
- Documentation that references old terminology

## Rollout Plan

1. Implement changes in a feature branch
2. Run comprehensive tests
3. Deploy to staging environment
4. Test frontend compatibility
5. Schedule production deployment during low-traffic period
6. Monitor for regression issues after deployment
