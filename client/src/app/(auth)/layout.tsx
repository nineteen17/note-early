'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Toaster } from '@/components/ui/sonner';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoadingAuth = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      console.log("AuthenticatedLayout: Not authenticated, redirecting to login.");
      router.push('/login');
    }
  }, [isLoadingAuth, isAuthenticated, router]);

  // if (isLoadingAuth) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <>Auth layout loading.................</>
  //     </div>
  //   );
  // }

  if (isAuthenticated) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  return null; 
} 