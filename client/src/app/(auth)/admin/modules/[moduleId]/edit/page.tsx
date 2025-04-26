// Placeholder: Renders the AdminEditModule feature component
import { AdminEditModule } from '@/features/admin/edit-module';

type AdminEditModulePageProps = {
  params: { moduleId: string };
};

export default function AdminEditModulePage({ params }: AdminEditModulePageProps) {
  return <AdminEditModule moduleId={params.moduleId} />;
} 