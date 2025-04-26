import { SignupForm } from '@/features/public/signup';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Admin Account', 
};

export default function SignupPage() {
  return <SignupForm />;
} 