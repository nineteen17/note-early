# Testing Auto Admin Profile Creation

## Test Procedure

Follow these steps to verify the automatic admin profile creation feature:

### Test Case 1: Admin User Creation

1. Create a new user via Supabase Auth with an email ending in `@noteearly.com`

   - You can use the Supabase dashboard or your app's signup flow
   - Example: `test.admin@noteearly.com`
   - Optional: Add `first_name` and `last_name` to the user metadata

2. After creating the user, verify in the database that:
   - A profile entry was automatically created in the profiles table
   - The profile has `role='ADMIN'`
   - The profile has the correct ID (matching Supabase auth user ID)
   - The `full_name` was either:
     - Taken from metadata if provided, or
     - Properly extracted from the email (e.g., 'Test Admin')

### Test Case 2: Non-Admin User

1. Create another user with a non-admin email

   - Example: `regular.user@example.com`

2. Verify that:
   - No profile was automatically created in the profiles table

### Test Case 3: Admin User with Metadata

1. Create a new admin user with user metadata

   - Email: `another.admin@noteearly.com`
   - Add metadata with:
     ```json
     {
       "first_name": "Custom",
       "last_name": "Name"
     }
     ```

2. Verify that:
   - A profile was created with `full_name` set to "Custom Name"
   - The metadata values were used instead of extracting from email

## SQL Verification Queries

Use these queries to verify the test outcomes:

```sql
-- Check if a profile was created for a specific email
SELECT * FROM profiles WHERE email = 'test.admin@noteearly.com';

-- Find profiles created in the last hour
SELECT * FROM profiles WHERE created_at > NOW() - INTERVAL '1 hour';

-- Count profiles by role
SELECT role, COUNT(*) FROM profiles GROUP BY role;
```

## Troubleshooting

If profiles aren't being created automatically:

1. Check Supabase logs for trigger errors
2. Verify the trigger function is working by running:
   ```sql
   SELECT pg_get_functiondef('handle_new_admin_user'::regproc);
   SELECT tgname, tgrelid::regclass, tgtype FROM pg_trigger WHERE tgname = 'create_admin_profile_on_signup';
   ```
3. Make sure the email domains in the function match what you're testing with

## Test Procedure

Follow these steps to verify the automatic admin profile creation feature:

### Test Case 1: Admin User Creation

1. Create a new user via Supabase Auth with an email ending in `@noteearly.com`

   - You can use the Supabase dashboard or your app's signup flow
   - Example: `test.admin@noteearly.com`
   - Optional: Add `first_name` and `last_name` to the user metadata

2. After creating the user, verify in the database that:
   - A profile entry was automatically created in the profiles table
   - The profile has `role='ADMIN'`
   - The profile has the correct ID (matching Supabase auth user ID)
   - The `full_name` was either:
     - Taken from metadata if provided, or
     - Properly extracted from the email (e.g., 'Test Admin')

### Test Case 2: Non-Admin User

1. Create another user with a non-admin email

   - Example: `regular.user@example.com`

2. Verify that:
   - No profile was automatically created in the profiles table

### Test Case 3: Admin User with Metadata

1. Create a new admin user with user metadata

   - Email: `another.admin@noteearly.com`
   - Add metadata with:
     ```json
     {
       "first_name": "Custom",
       "last_name": "Name"
     }
     ```

2. Verify that:
   - A profile was created with `full_name` set to "Custom Name"
   - The metadata values were used instead of extracting from email

## SQL Verification Queries

Use these queries to verify the test outcomes:

```sql
-- Check if a profile was created for a specific email
SELECT * FROM profiles WHERE email = 'test.admin@noteearly.com';

-- Find profiles created in the last hour
SELECT * FROM profiles WHERE created_at > NOW() - INTERVAL '1 hour';

-- Count profiles by role
SELECT role, COUNT(*) FROM profiles GROUP BY role;
```

## Troubleshooting

If profiles aren't being created automatically:

1. Check Supabase logs for trigger errors
2. Verify the trigger function is working by running:
   ```sql
   SELECT pg_get_functiondef('handle_new_admin_user'::regproc);
   SELECT tgname, tgrelid::regclass, tgtype FROM pg_trigger WHERE tgname = 'create_admin_profile_on_signup';
   ```
3. Make sure the email domains in the function match what you're testing with
