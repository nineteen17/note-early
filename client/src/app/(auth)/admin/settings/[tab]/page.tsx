'use client';

import React, { use } from 'react';
import { notFound } from 'next/navigation';

// Import components for each tab
import { SubscriptionTab } from '@/features/admin/settings/subscription';
import { SecurityTab } from '@/features/admin/settings/security';
import { UserProfile } from '@/features/shared/user-profile'; 
import { StudentSettingsTab } from '@/features/admin/settings/students'; 
import { PreferencesSettingsTab } from '@/features/admin/settings/preferences';

// Define valid tabs
const validTabs = ["profile", "subscription", "students", "security", "preferences"];

// Map tab values to components
const tabComponents: { [key: string]: React.ComponentType } = {
  profile: UserProfile,
  subscription: SubscriptionTab, // Use the renamed/moved component
  students: StudentSettingsTab,
  security: SecurityTab,       // Use the renamed/moved component
  preferences: PreferencesSettingsTab,
};

export default function SettingsTabPage({ params }: { params: Promise<{ tab: string }> }) {
  // Unwrap the params Promise using React.use()
  const { tab } = use(params);

  // Validate the tab parameter
  if (!validTabs.includes(tab)) {
    notFound(); // Show 404 if tab is invalid
  }

  const TabComponent = tabComponents[tab];

  if (!TabComponent) {
    // This case should ideally not be hit if validTabs is correct,
    // but adding for safety.
    notFound();
  }

  // Apply spacing classes similar to how TabsContent was used before, if desired
  // const className = tab === 'profile' || tab === 'students' ? "space-y-4" : "";

  return (
    // Simple div wrapper, layout is handled elsewhere
    <div> 
      <TabComponent />
    </div>
  );
} 