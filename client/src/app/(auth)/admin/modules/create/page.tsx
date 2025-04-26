import { AdminCreateModule } from '@/features/admin/create-module';
import React from 'react';

// This page component simply renders the feature component.
// It can remain a Server Component unless it needs client-side hooks itself.
export default function CreateModulePage() {
  return (
    <div className="container mx-auto py-8">
      {/* Optional: Add a page title or breadcrumbs here if needed */}
      {/* <h1 className="text-2xl font-bold mb-6">Create New Module</h1> */}
      <AdminCreateModule />
    </div>
  );
} 