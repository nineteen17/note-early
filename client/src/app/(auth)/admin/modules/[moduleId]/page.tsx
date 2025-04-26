// Placeholder: Renders the AdminViewModuleProgress feature component
// Note: Feature component name might differ.
import { AdminViewModuleProgress } from '@/features/admin/view-module-progress'; // Assuming feature location

type AdminModuleProgressPageProps = {
  params: { moduleId: string };
};

export default function AdminModuleProgressPage({ params }: AdminModuleProgressPageProps) {
  return <AdminViewModuleProgress moduleId={params.moduleId} />;
} 