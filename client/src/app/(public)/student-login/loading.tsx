import { StudentLoginSkeleton } from '@/components/skeletons/StudentLoginSkeleton';

// This loading UI will be shown specifically for the /login route
// while its server components are loading, overriding the layout's loading.tsx.
export default function Loading() {
  console.log("RENDERING: (public)/student-login/loading.tsx - StudentLoginSkeleton");
  return <StudentLoginSkeleton />;
} 