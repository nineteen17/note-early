'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useProfileQuery } from '@/hooks/api/profile/useProfileQuery';

/**
 * Layout for public-facing pages (login, signup, etc.)
 * Redirects authenticated users to their appropriate dashboard based on role.
 * Provides appropriate layout structure for different public content types.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoadingAuth = useAuthStore((state) => state.isLoading);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Fetch profile to determine role for redirection
  const { 
    data: profile, 
    isLoading: isProfileLoading, 
  } = useProfileQuery(); 

  useEffect(() => {
    // Early redirect check - as soon as we know user is authenticated
    if (isAuthenticated && !isLoadingAuth && !isProfileLoading && profile && !isRedirecting) {
      setIsRedirecting(true);
      
      // Determine the correct default route based on user role
      let targetRoute = '/student/home'; // Default to student for faster redirect
      switch (profile.role) {
        case 'ADMIN':
        case 'SUPER_ADMIN':
          targetRoute = '/admin/home';
          break;
        case 'STUDENT':
          targetRoute = '/student/home';
          break;
        default:
          targetRoute = '/login';
          break;
      }
      
      // Use replace for immediate redirect without history
      router.replace(targetRoute);
    }
  }, [isAuthenticated, isLoadingAuth, isProfileLoading, profile, router, isRedirecting]);

  // Show minimal loading state while checking authentication or redirecting
  if (isLoadingAuth || (isAuthenticated && isProfileLoading) || isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only render children if user is not authenticated
  if (!isAuthenticated) {
    // Check if this is the home page or other full-width pages
    const isHomePage = pathname === '/';
    const isAuthPage = pathname.includes('/login') || pathname.includes('/signup') || pathname.includes('/student-login');
    
    if (isHomePage || !isAuthPage) {
      // Full-width layout for home page and other non-auth pages
      return (
        <div className="min-h-screen bg-background">
          {children}
        </div>
      );
    } else {
      // Centered narrow layout for auth forms
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            {children}
          </div>
        </div>
      );
    }
  }

  // Fallback loading state
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>
  );
} 