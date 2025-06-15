import { use } from 'react';
import { AdminEditModuleFeature } from '@/features/admin/edit-module';

type AdminEditModulePageProps = {
  params: Promise<{ moduleId: string }>;
};

export default function AdminEditModulePage({ params }: AdminEditModulePageProps) {
  const { moduleId } = use(params);
  return <AdminEditModuleFeature moduleId={moduleId} />;
} 