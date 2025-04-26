// Placeholder: Layout for student features
import React from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar'; // Assuming shared Sidebar for students too
import type { RoleLayoutProps } from '../layout'; // Import props definition from root auth layout

// Student specific layout
export default function StudentLayoutContent({ 
  children, 
  profile, 
}: RoleLayoutProps) { // <<< Accept props

  return (
    // Structure matching the Admin layout for consistency
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Sidebar /> {/* <<< Use Sidebar */} 
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        {/* <<< Render Header, passing props down */} 
        <Header profile={profile} /> 
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
          {/* Render the specific page content */}
          {children}
        </main>
      </div>
      {/* Toaster is likely rendered in the root-most layout */}
    </div>
  );
} 