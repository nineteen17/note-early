'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useProfileQuery } from '@/hooks/api/profile/useProfileQuery'; // Import profile query hook

/**
 * Layout for public-facing pages (login, signup, etc.)
 * Redirects authenticated users to their appropriate dashboard based on role.
 * Provides a simple centered structure for public content.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoadingAuth = useAuthStore((state) => state.isLoading); 

  // Fetch profile to determine role for redirection
  const { 
    data: profile, 
    isLoading: isProfileLoading, 
    // We don't need to handle error here as the authenticated layout will handle it
  } = useProfileQuery(); 

  useEffect(() => {
    const isAuthCheckComplete = !isLoadingAuth;
    const isProfileCheckComplete = !isProfileLoading;

    // Only redirect if authentication and profile checks are done and user is authenticated
    if (isAuthCheckComplete && isProfileCheckComplete && isAuthenticated && profile) {
      console.log(`PublicLayout: User authenticated with role ${profile.role}, redirecting from public route...`);
      
      // Determine the correct default route based on user role
      let targetRoute = '/login'; // Default fallback
      switch (profile.role) {
        case 'ADMIN':
        case 'SUPER_ADMIN':
          targetRoute = '/admin/home';
          break;
        case 'STUDENT':
          targetRoute = '/student/home';
          break;
        default:
          console.warn(`PublicLayout: Unknown role ${profile.role}, redirecting to login.`);
          break; // Keep targetRoute as /login
      }
      router.push(targetRoute); 
    }
  }, [isAuthenticated, isLoadingAuth, isProfileLoading, profile, router]);

  // Show loader if either auth check or profile check is in progress, OR if user is authenticated (implying redirect is happening)
  const showLoader = isLoadingAuth || (isAuthenticated && isProfileLoading) || (isAuthenticated && profile);

  // if (showLoader) {
  //   return (
  //     <div className="flex min-h-screen items-center justify-center">
  //       <div>Loading session...</div> 
  //     </div>
  //   );
  // }

  // Only render children (login form) if auth state is loaded AND user is not authenticated
  if (!isLoadingAuth && !isAuthenticated) {
    return (
      <div className="">
        <div className="">
          {children}
        </div>
      </div>
    );
  }

  // Fallback if authenticated but profile somehow isn't loaded (should be covered by loader)
  return null;
} 