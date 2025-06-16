# Admin Home Feature

This feature implements the admin dashboard home page following Next.js best practices with server-side and client-side component separation.

## Architecture

The main `AdminHome` component is server-side rendered for better performance, while smaller interactive components are client-side for data fetching and interactivity.

## Components

### Server-Side Components
- `AdminHome` - Main layout component (server-side)

### Client-Side Components
- `WelcomeHeader` - Displays personalized welcome message
- `DashboardStats` - Shows admin dashboard statistics
- `StatCard` - Reusable stat display component
- `QuickLinks` - Navigation shortcuts
- `RecentActivity` - Activity feed display

## Hooks

### `usePendingReviews`
Calculates the number of completed modules awaiting teacher review by aggregating student progress data. Uses the exact same logic as the "Awaiting Marking" column in the students table.

**Logic:**
- Fetches progress data for all students
- Counts modules where `progress.completed && (!progress.score || !progress.teacherFeedback)`
- Returns the total count across all students

**Returns:**
- `data` - Count of modules completed by students that need teacher review/feedback (null while loading)
- `isLoading` - Loading state
- `error` - Error if any query fails

### `useRecentActivity`
Generates recent activity feed from real student and progress data instead of mock data.

**Logic:**
- Fetches student data and progress for all students
- Creates activity items for:
  - New students (last 7 days)
  - Module completions (last 3 days)
  - Module starts (last 2 days)
- Sorts by timestamp and limits to 8 most recent items

**Returns:**
- `data` - Array of recent activity items with proper timestamps
- `isLoading` - Loading state
- `error` - Error if any query fails

## API Endpoints Used

- `GET /profiles/admin/students` - List of admin's students
- `GET /profiles/me` - User profile information (for subscription data)
- `GET /progress/admin/student/{studentId}` - Student progress data (used for pending reviews calculation)

## Dependencies

- `@tanstack/react-query` - Data fetching and caching
- `date-fns` - Date formatting
- `lucide-react` - Icons
- Zustand auth store for authentication state

## Usage

```tsx
import { AdminHome } from '@/features/admin/home';

export default function AdminHomePage() {
  return <AdminHome />;
}
```

## Future Enhancements

1. Implement actual recent activity endpoint
2. Add more detailed statistics
3. Add interactive charts and graphs
4. Implement real-time updates via websockets
5. Add filtering and date range selection for activity 