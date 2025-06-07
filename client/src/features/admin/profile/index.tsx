'use client';

import { UserProfile } from '@/features/shared/user-profile';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

export default function AdminProfileFeature() {
  return <>
    <PageContainer>
        <PageHeader title="Admin Profile" description="Manage your profile information" />
        <UserProfile />
    </PageContainer>
  </>;
}