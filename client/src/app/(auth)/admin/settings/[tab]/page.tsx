'use client';

import React, { use } from 'react';
import { notFound } from 'next/navigation';

import { SubscriptionFeature } from '@/features/admin/settings/subscription';
import { SecurityFeature } from '@/features/admin/settings/security';


const validTabs = ["subscription", "security"];


const tabComponents: { [key: string]: React.ComponentType } = {
  subscription: SubscriptionFeature,
  security: SecurityFeature,
};

export default function SettingsTabPage({ params }: { params: Promise<{ tab: string }> }) {

  const { tab } = use(params);


  if (!validTabs.includes(tab)) {
    notFound();
  }

  const TabComponent = tabComponents[tab];

  if (!TabComponent) {

    notFound();
  }

  return (
    <div> 
      <TabComponent />
    </div>
  );
} 