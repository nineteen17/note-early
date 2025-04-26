// Placeholder: Renders the AdminStudentDetail feature component
import { AdminStudentDetail } from '@/features/admin/student-detail'; // Assuming feature location

type AdminStudentDetailPageProps = {
  params: { profileId: string };
};

export default function AdminStudentDetailPage({ params }: AdminStudentDetailPageProps) {
  return <AdminStudentDetail profileId={params.profileId} />;
} 