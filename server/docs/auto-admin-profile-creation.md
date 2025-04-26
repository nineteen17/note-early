# Automatic Admin Profile Creation

## Overview

This feature implements an automated system for creating admin profiles when new users with admin privileges sign up through Supabase Authentication.

## How it Works

When a new user is created in the Supabase `auth.users` table, a database trigger (`create_admin_profile_on_signup`) automatically checks if the user's email matches admin criteria:

- Email domain ends with `@noteearly.com`
- Email is exactly `admin@example.com`

If the criteria match, the trigger fires a function (`handle_new_admin_user`) that automatically:

1. Creates a new profile in the `profiles` table
2. Sets the profile's role to "ADMIN"
3. Uses the user's Supabase ID as the profile ID
4. Copies email information
5. Sets full_name from either:
   - User's metadata (first_name and last_name fields)
   - Or extracts from email address (e.g., john.doe@noteearly.com → "John Doe")

## Implementation Details

The implementation consists of:

1. A PostgreSQL function `handle_new_admin_user()`
2. A PostgreSQL trigger `create_admin_profile_on_signup`

Both components were added through Drizzle migration `0004_auto_admin_profile_creation`.

### Security Considerations

- The function uses `SECURITY DEFINER` to ensure it runs with appropriate privileges
- Only specific email patterns trigger admin profile creation

## Testing

To test this feature:

1. Create a new user through Supabase Auth with an admin email (e.g., test@noteearly.com)
2. Verify a profile was automatically created with role="ADMIN"
3. Create a user with non-admin email (e.g., student@example.com)
4. Verify no profile was created

## Troubleshooting

If admin profiles are not being created automatically:

1. Check Supabase logs for trigger errors
2. Verify the trigger is active using: `SELECT * FROM pg_trigger WHERE tgname='create_admin_profile_on_signup';`
3. Test the function manually with:
   ```sql
   SELECT handle_new_admin_user();
   ```

## Manual Profile Creation (Fallback)

If automatic creation fails, profiles can still be created manually through the API endpoint:

```
POST /profiles
{
  "id": "supabase-auth-user-id",
  "email": "admin@example.com",
  "role": "ADMIN",
  "full_name": "Admin User"
}
```

## Overview

This feature implements an automated system for creating admin profiles when new users with admin privileges sign up through Supabase Authentication.

## How it Works

When a new user is created in the Supabase `auth.users` table, a database trigger (`create_admin_profile_on_signup`) automatically checks if the user's email matches admin criteria:

- Email domain ends with `@noteearly.com`
- Email is exactly `admin@example.com`

If the criteria match, the trigger fires a function (`handle_new_admin_user`) that automatically:

1. Creates a new profile in the `profiles` table
2. Sets the profile's role to "ADMIN"
3. Uses the user's Supabase ID as the profile ID
4. Copies email information
5. Sets full_name from either:
   - User's metadata (first_name and last_name fields)
   - Or extracts from email address (e.g., john.doe@noteearly.com → "John Doe")

## Implementation Details

The implementation consists of:

1. A PostgreSQL function `handle_new_admin_user()`
2. A PostgreSQL trigger `create_admin_profile_on_signup`

Both components were added through Drizzle migration `0004_auto_admin_profile_creation`.

### Security Considerations

- The function uses `SECURITY DEFINER` to ensure it runs with appropriate privileges
- Only specific email patterns trigger admin profile creation

## Testing

To test this feature:

1. Create a new user through Supabase Auth with an admin email (e.g., test@noteearly.com)
2. Verify a profile was automatically created with role="ADMIN"
3. Create a user with non-admin email (e.g., student@example.com)
4. Verify no profile was created

## Troubleshooting

If admin profiles are not being created automatically:

1. Check Supabase logs for trigger errors
2. Verify the trigger is active using: `SELECT * FROM pg_trigger WHERE tgname='create_admin_profile_on_signup';`
3. Test the function manually with:
   ```sql
   SELECT handle_new_admin_user();
   ```

## Manual Profile Creation (Fallback)

If automatic creation fails, profiles can still be created manually through the API endpoint:

```
POST /profiles
{
  "id": "supabase-auth-user-id",
  "email": "admin@example.com",
  "role": "ADMIN",
  "full_name": "Admin User"
}
```
