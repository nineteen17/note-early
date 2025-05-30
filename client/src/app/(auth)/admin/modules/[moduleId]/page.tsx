// Placeholder: Renders the AdminViewModuleProgress feature component
// Note: Feature component name might differ.
import { use } from 'react';
import { AdminViewModuleProgress } from '@/features/admin/view-module-progress'; // Assuming feature location

type AdminModuleProgressPageProps = {
  params: Promise<{ moduleId: string }>;
};

export default function AdminModuleProgressPage({ params }: AdminModuleProgressPageProps) {
  const { moduleId } = use(params);
  return <AdminViewModuleProgress moduleId={moduleId} />;
} 