import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { WelcomeHeader } from './WelcomeHeader';
import { DashboardStats } from './DashboardStats';
import { RecentActivity } from './RecentActivity';
import { QuickLinks } from './QuickLinks';

export function AdminHome() {
  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <WelcomeHeader />
        </div>

        {/* Stat Cards Grid */}
        <DashboardStats />

        {/* Content Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <RecentActivity />
          <QuickLinks />
        </div>
      </div>
    </PageContainer>
  );
} 