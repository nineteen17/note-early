'use client'; // Ensure this is a Client Component

import React from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import { useProfileQuery } from '@/hooks/api/profile/useProfileQuery'; // Import useProfileQuery
import { Header } from '@/components/layout/Header'; // Re-use Header, adjust if needed
import { Sidebar } from '@/components/layout/Sidebar'; // Re-use Sidebar, adjust if needed
import { useAuthStore } from '@/store/authStore'; // Import clearAuth
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react'; // For error icon
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // For error display

// This component fetches profile and renders the core Student dashboard layout
export default function StudentLayout({
  children
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth); // Get clearAuth for error handling
  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError
  } = useProfileQuery(); // <<< Fetch profile here

  // --- Loading State ---
  if (isProfileLoading) {
    // Skeleton reflects new structure: Header on top, Sidebar + Main below
    return (
      <div className="flex flex-col min-h-screen bg-background">
        {/* Header Skeleton */}
        <header className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
           <Skeleton className="h-6 w-32" /> {/* Logo */}
           <div className="ml-auto flex items-center gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
           </div>
        </header>
        {/* Container for Sidebar + Main Skeleton */}
        <div className="flex flex-1">
          {/* Sidebar Skeleton */}
          <aside className="hidden w-64 flex-col border-r bg-muted/40 sm:flex">
             {/* Simplified sidebar skeleton */}
             <nav className="flex-1 overflow-auto py-4 space-y-1">
               <Skeleton className="h-10 mx-4 rounded-lg" />
               <Skeleton className="h-10 mx-4 rounded-lg" />
               <Skeleton className="h-10 mx-4 rounded-lg" />
             </nav>
          </aside>
          {/* Page Content Skeleton */}
          <main className="flex-1 p-4 sm:px-6 sm:py-6">
             <Skeleton className="h-96 w-full" />
          </main>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (isProfileError) {
    console.error("StudentLayout: Profile query failed.", profileError);
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Alert variant="destructive" className="max-w-lg">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Student Data</AlertTitle>
                <AlertDescription>
                    Could not load required user profile information. Please try logging in again.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  // --- Role Check ---
  // Ensure the user is a STUDENT for this layout
  if (!profile || profile.role !== 'STUDENT') {
    console.error(`StudentLayout: Incorrect role (${profile?.role}). Redirecting.`);
    clearAuth();
    router.push('/student/login'); // Redirect to STUDENT login page
    return null;
  }

  // --- Render Actual Layout ---
  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
       {/* Pass profile to Header/Sidebar - they might need internal logic based on role */}
       <Header profile={profile} />
       <div className="flex flex-1">
          <Sidebar userRole={profile.role} />
          <main className="flex-1 overflow-y-auto">
             {children}
          </main>
       </div>
    </div>
  );
} 