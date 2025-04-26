// Placeholder: Renders the StudentModuleDetails feature component
import { StudentModuleDetails } from '@/features/student/module-details'; // Assuming feature location

type StudentModuleDetailsPageProps = {
  params: { moduleId: string };
};

export default function StudentModuleDetailsPage({ params }: StudentModuleDetailsPageProps) {
  return <StudentModuleDetails moduleId={params.moduleId} />;
} 