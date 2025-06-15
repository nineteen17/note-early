'use client';

import React from 'react';
import { ModulesFeature } from '@/features/admin/modules-tabs';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

export default function ModulesPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Reading Modules" 
        description="View and manage your reading modules"
      />
      <ModulesFeature />
    </PageContainer>
  );
} 