import { LoginSkeleton } from '@/components/skeletons/LoginSkeleton';

// This loading UI will be shown specifically for the /login route
// while its server components are loading, overriding the layout's loading.tsx.
export default function Loading() {
  console.log("RENDERING: (public)/login/loading.tsx - LoginSkeleton");
  return <LoginSkeleton />;
} 