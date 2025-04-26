# Auto Admin Profile Creation Plan

## Overview

Implement an automated system that creates a profile entry with role="ADMIN" whenever a new admin user is created in Supabase authentication.

## Motivation

Currently, after admin users are created in Supabase authentication, a manual step is required to create corresponding entries in the profiles table. This automation will eliminate this manual step, reducing potential for errors and streamlining the admin onboarding process.

## Implementation Approach

We will implement a Supabase database trigger that automatically inserts a new profile entry when a user with a specific condition (matching admin emails) is created in the auth.users table.

## Technical Implementation

### 1. Create Database Function

Create a PostgreSQL function that will handle the creation of admin profiles:

```sql
CREATE OR REPLACE FUNCTION handle_new_admin_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the new user's email matches admin pattern or domain
  IF NEW.email LIKE '%@noteearly.com' OR
     NEW.email = 'admin@example.com' THEN

    -- Insert a new profile with ADMIN role
    INSERT INTO public.profiles (
      id,
      email,
      first_name,
      last_name,
      role,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      -- Extract first name from email if not provided
      COALESCE(NEW.raw_user_meta_data->>'first_name',
              split_part(split_part(NEW.email, '@', 1), '.', 1)),
      -- Extract last name from email if not provided
      COALESCE(NEW.raw_user_meta_data->>'last_name',
              split_part(split_part(NEW.email, '@', 1), '.', 2)),
      'ADMIN',
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Create Database Trigger

Create a trigger that executes the function after a new user is inserted:

```sql
CREATE OR REPLACE TRIGGER create_admin_profile_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_admin_user();
```

### 3. Test Cases

Test the following scenarios:

1. Create a user with email matching admin pattern (e.g., test@noteearly.com)

   - Verify profile is automatically created with role="ADMIN"
   - Verify first_name and last_name are extracted or set correctly

2. Create a user with non-admin email (e.g., student@example.com)

   - Verify no profile is automatically created

3. Create a user with admin email and raw_user_meta_data containing names
   - Verify profile uses the provided names rather than extracting from email

### 4. Backend Code Updates

No backend changes are required as this trigger operates at the database level. However, we should:

1. Document the trigger and its function in the codebase
2. Update admin creation documentation to remove manual profile creation steps
3. Add new database migrations to deploy these changes

### 5. Migration Script

Create a Drizzle migration that adds the function and trigger:

```typescript
// in new migration file
export async function up(db: PostgresJsDatabase) {
  await db.execute(`
    CREATE OR REPLACE FUNCTION handle_new_admin_user()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.email LIKE '%@noteearly.com' OR 
         NEW.email = 'admin@example.com' THEN
        INSERT INTO public.profiles (
          id, email, first_name, last_name, role, created_at, updated_at
        ) VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(split_part(NEW.email, '@', 1), '.', 1)),
          COALESCE(NEW.raw_user_meta_data->>'last_name', split_part(split_part(NEW.email, '@', 1), '.', 2)),
          'ADMIN',
          NOW(),
          NOW()
        );
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE TRIGGER create_admin_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_admin_user();
  `);
}

export async function down(db: PostgresJsDatabase) {
  await db.execute(`
    DROP TRIGGER IF EXISTS create_admin_profile_on_signup ON auth.users;
    DROP FUNCTION IF EXISTS handle_new_admin_user();
  `);
}
```

## Security Considerations

- The function uses `SECURITY DEFINER` to ensure it runs with the privileges of the owner
- Only specific email domains/addresses will trigger profile creation
- No sensitive information is exposed in the process

## Deployment Plan

1. Create and test the migration in a development environment
2. Deploy to staging and verify the trigger works correctly
3. Add the trigger to the production deployment plan
4. After deployment, test by creating a new admin user
5. Monitor logs for any errors related to the trigger

## Rollback Plan

If issues are encountered:

1. Execute the "down" migration to remove the trigger and function
2. Revert to manual admin profile creation process
3. Investigate and fix any issues before retrying
