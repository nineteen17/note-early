import React, { Suspense } from 'react';
import ModulesFeature from '@/features/student/modules';
import { StudentSkeleton } from '@/components/skeletons/StudentSkeleton';

function ModulesPageContent() {
  return <ModulesFeature />;
}

export default function BrowseModulesPage() {
  return (
    <Suspense fallback={<StudentSkeleton />}>
      <ModulesPageContent />
    </Suspense>
  );
} 