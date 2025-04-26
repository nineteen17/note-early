# Users Module Implementation

## Overview

This document outlines the implementation of the Users module, which separates user profile management functionality from authentication concerns. This separation adheres to proper separation of concerns and modular API design.

## Module Structure

The Users module follows a standard architecture with the following components:

```
server/src/modules/
├── users/             # User profile management
│   ├── controllers/   # HTTP request handlers
│   ├── routes/        # API route definitions
│   ├── services/      # Business logic
│   └── __tests__/     # Tests for the module
```

## API Endpoints

The following API endpoints are implemented in the Users module:

- `GET /api/v1/users/students` - Get all student profiles (admin only)
- `GET /api/v1/users/admin/:adminId/users` - Get all users managed by a specific admin (admin only)
- `GET /api/v1/users/:userId` - Get a specific user by ID (authenticated users)
- `PUT /api/v1/users/:userId` - Update a user profile (authenticated users)
- `DELETE /api/v1/users/:userId` - Delete a user (admin only)

## Implementation Details

### UserService

The `UserService` class implements the core business logic for user profile management:

- `getUsersByAdminId(adminId)`: Retrieves all users managed by a specific admin
- `getUserById(userId)`: Retrieves a single user by their ID
- `updateUser(userId, updates)`: Updates a user profile with allowed fields only
- `deleteUser(userId, adminId)`: Deletes a user profile (with admin permission check)
- `getAllStudents()`: Retrieves all student profiles in the system

### UserController

The `UserController` class handles HTTP requests and delegates to the `UserService`:

- Implements all the necessary endpoints
- Provides proper error handling using next(error) pattern
- Maps service responses to appropriate HTTP responses

### Routes

The routes configuration connects the controller methods to the API endpoints and applies the appropriate authentication middleware.

## Testing

The module is comprehensively tested using Vitest. The tests cover:

- Successful operations
- Error cases
- Edge cases

The tests use the same mocking pattern established for authentication services, ensuring consistent test coverage across the application.

## Benefits of the Separation

1. **Single Responsibility Principle**: Each module has a clear, focused responsibility
2. **Improved Code Organization**: Easier to locate and modify related code
3. **Better Testing Isolation**: Tests can focus on specific functionality
4. **Clearer API Boundaries**: Clear separation between authentication and user management

## Next Steps

1. Continue to develop additional user-related functionality as needed
2. Consider implementing pagination for endpoints that return multiple users
3. Add additional validation for update operations
4. Implement more sophisticated access control to ensure users can only modify their own profiles
