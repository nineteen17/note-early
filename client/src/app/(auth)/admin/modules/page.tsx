import React from 'react';
import { ModulesTabsFeature } from '@/features/admin/modules-tabs'; // Adjust path if needed
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Reading Modules', 
};

// This page now renders the main tabbed interface feature
// It can likely remain a Server Component.
export default function AdminModulesPage() {
  return (
    <div className="container mx-auto py-8">
      <ModulesTabsFeature />
    </div>
  );
} 