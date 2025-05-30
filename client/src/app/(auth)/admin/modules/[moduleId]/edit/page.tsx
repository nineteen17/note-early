// Placeholder: Renders the AdminEditModule feature component
import { use } from 'react';
import { AdminEditModule } from '@/features/admin/edit-module';

type AdminEditModulePageProps = {
  params: Promise<{ moduleId: string }>;
};

export default function AdminEditModulePage({ params }: AdminEditModulePageProps) {
  const { moduleId } = use(params);
  return <AdminEditModule moduleId={moduleId} />;
} 