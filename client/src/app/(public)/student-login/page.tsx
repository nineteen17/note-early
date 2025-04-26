import type { Metadata } from 'next';
import { StudentLoginFeature } from '@/features/public/student-login';

export const metadata: Metadata = {
  title: 'Student Login',
};

export default function StudentLoginPage() {
  console.log("RENDERING: (public)/student-login/page.tsx");
  return <StudentLoginFeature />;
} 