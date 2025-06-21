'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfileQuery } from '@/hooks/api/profile/useProfileQuery';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuthStore } from '@/store/authStore'; 
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


export default function AdminLayout({ 
  children
}: { 
  children: React.ReactNode 
}) {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { 
    data: profile, 
    isLoading: isProfileLoading, 
    isError: isProfileError, 
    error: profileError 
  } = useProfileQuery();

  useEffect(() => {
    if (!isProfileLoading && profile && profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN') {
      console.error(`AdminLayout: Incorrect role (${profile?.role}). Redirecting.`);
      clearAuth();
      router.push('/login');
    }
  }, [profile, isProfileLoading, clearAuth, router]);


  if (isProfileLoading) {

    return (
      <div className="flex flex-col min-h-screen bg-background">

        <header className="sticky top-0 z-50 flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 bg-primary">
           <Skeleton className="h-6 w-32" /> 
           <div className="ml-auto flex items-center gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
           </div>
        </header>

        <div className="flex flex-1">

          <aside className="fixed top-[60px] bottom-0 hidden w-64 flex-col border-r bg-muted/40 sm:flex">

             <nav className="flex-1 overflow-auto py-4 space-y-1">
               <Skeleton className="h-10 mx-4 rounded-lg" />
               <Skeleton className="h-10 mx-4 rounded-lg" />
               <Skeleton className="h-10 mx-4 rounded-lg" />
             </nav>
          </aside>

          <main className="flex-1 p-4 sm:px-6 sm:py-6 sm:ml-64">
             <Skeleton className="h-96 w-full" />
          </main>
        </div>
      </div>
    );
  }

 
  if (isProfileError) {
    console.error("AdminLayout: Profile query failed.", profileError);
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Alert variant="destructive" className="max-w-lg">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Admin Data</AlertTitle>
                <AlertDescription>
                    Could not load required user profile information. Please try logging in again.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
    return null;
  }
  

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
       <Header profile={profile} />
       <div className="flex flex-1">
          <Sidebar userRole={profile.role} />
          <main className="flex-1 overflow-y-auto sm:ml-64">
             {children}
          </main>
       </div>
    </div>
  );
} 