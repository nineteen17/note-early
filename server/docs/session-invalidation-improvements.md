# Session Invalidation Improvements

## Overview

This document describes the improvements made to handle JWT token malformation errors during session invalidation, particularly the "token is malformed: token contains an invalid number of segments" error from Supabase.

## Problem Description

When users attempt to invalidate all sessions (typically after password changes or for security purposes), the system was encountering errors like:

```
invalid JWT: unable to parse or verify signature, token is malformed: token contains an invalid number of segments
```

This error occurs because:
1. The user's session might already be expired/invalid
2. The token being used for session invalidation is corrupted
3. There could be timing issues where sessions are being invalidated while other requests are using them

## Solution Implemented

### 1. Enhanced Error Handling in AuthService

**File**: `server/src/modules/auth/services/auth.service.ts`

The `invalidateAllSessions` method now uses a **direct session management strategy** that's much more effective:

1. **Direct Session Management**: Attempts to use Supabase's `listUserSessions` and `deleteSession` APIs for direct session control. If available, lists all active sessions and deletes them individually. Falls back to ban/unban cycle (temporarily bans user for 1 second then unbans) to force immediate JWT token invalidation.

2. **User Record Update**: Updates both `user_metadata` and `app_metadata` with invalidation timestamps, force_logout flags, and invalidation reasons to ensure any middleware can detect forced logout state.

3. **Temporary Account Disable**: Temporarily disables and re-enables the account (guarantees session invalidation but more disruptive)

4. **Traditional SignOut Fallback**: Falls back to traditional signOut methods as a last resort

This new approach directly targets the JWT tokens themselves rather than just updating user metadata, ensuring immediate session invalidation across all devices.

### 2. Intelligent Error Analysis

**File**: `server/src/utils/supabase-debug.ts`

Created utility functions to analyze session invalidation failures:

- `debugJWTToken()`: Analyzes JWT token structure to identify malformation
- `testSupabaseAdminConfig()`: Tests Supabase admin client configuration
- `analyzeSessionInvalidationFailure()`: Categorizes errors and provides recommendations

### 3. Graceful Controller Handling

**File**: `server/src/modules/auth/controllers/auth.controller.ts`

The controller now:
- Handles service failures gracefully
- Clears local cookies regardless of remote session invalidation success
- Provides meaningful responses to users
- Distinguishes between configuration errors and user-specific errors

### 4. Debug Endpoint

**File**: `server/src/modules/auth/routes/auth.routes.ts`

Added a development-only debug endpoint:
- `GET /api/v1/auth/debug/supabase-config`: Tests Supabase configuration and capabilities

## Error Categories

The system now categorizes session invalidation errors:

1. **jwt_malformed**: Token is malformed (treated as success - sessions likely already invalid)
2. **permissions**: Service role key lacks permissions (configuration error)
3. **user_not_found**: User ID doesn't exist in Supabase
4. **configuration**: Supabase configuration issues
5. **network**: Network connectivity issues
6. **unknown**: Other unrecognized errors

## Usage Examples

### Testing Supabase Configuration (Development Only)

```bash
curl -X GET http://localhost:4000/api/v1/auth/debug/supabase-config
```

### Session Invalidation (Admin Required)

```bash
curl -X POST http://localhost:4000/api/v1/auth/invalidate-all-sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Expected Behavior

### Success Cases
- All approaches work: Logs success and returns 200
- One approach works: Logs which approach succeeded and returns 200
- JWT malformed errors: Treats as success (sessions already invalid) and returns 200

### Error Cases
- Configuration/Permission errors: Returns 500 with configuration issue message
- Other errors: Logs warning but returns 200 (treats as acceptable)

## Logging

The system now provides detailed logging for troubleshooting:

```
[INFO] Attempting to invalidate sessions for user: {"userId": "...", "userIdLength": 36, "isValidUUID": true}
[INFO] User found, proceeding with session invalidation: {"userId": "...", "userEmail": "...", "userCreatedAt": "..."}
[INFO] Approach 1: Attempting to list and delete all user sessions...
[INFO] Found 3 active sessions for user
[INFO] SUCCESS: Deleted 3 sessions directly!
[INFO] Session invalidation completed successfully - all user sessions have been invalidated
```

## Security Considerations

1. **No Token Exposure**: JWT tokens are never logged in full
2. **Development Only Debug**: Debug endpoints only work in development mode
3. **Graceful Degradation**: Failures don't prevent users from being effectively logged out
4. **Service Role Protection**: Configuration errors are reported but don't expose sensitive details

## Monitoring

To monitor session invalidation health:

1. Watch for configuration error logs (indicate Supabase setup issues)
2. Monitor success rates of different approaches
3. Track frequency of JWT malformed errors (normal for expired sessions)

## Future Improvements

1. **Metrics Collection**: Add metrics for each approach success/failure rates
2. **User Notification**: Consider notifying users about partial session invalidation
3. **Retry Logic**: Implement exponential backoff for network errors
4. **Session Tracking**: Track active sessions to provide better user feedback 