'use client';

import React, { use } from 'react';
import { notFound } from 'next/navigation';

// Import components for each tab
import { SubscriptionFeature } from '@/features/admin/settings/subscription';
import { SecurityFeature } from '@/features/admin/settings/security';

// Define valid tabs
const validTabs = ["subscription", "security"];

// Map tab values to components
const tabComponents: { [key: string]: React.ComponentType } = {
  subscription: SubscriptionFeature,
  security: SecurityFeature,
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

  return (
    <div> 
      <TabComponent />
    </div>
  );
} 