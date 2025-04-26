// Placeholder: Renders the StudentModuleReading feature component
import { StudentModuleReading } from '@/features/student/module-reading'; // Assuming feature location

type StudentModuleReadingPageProps = {
  params: { moduleId: string };
};

export default function StudentModuleReadingPage({ params }: StudentModuleReadingPageProps) {
  return <StudentModuleReading moduleId={params.moduleId} />;
} 