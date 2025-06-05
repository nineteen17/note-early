'use client';

import { UserProfile } from '@/features/shared/user-profile';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

export default function StudentProfileFeature() {
  return <>
    <PageContainer>
        <PageHeader title="Student Profile" description="Manage your profile information" />
        <UserProfile />
    </PageContainer>
  </>;
}