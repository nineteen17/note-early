import { LoginFeature } from '@/features/public/login';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Login', 
};

export default function LoginPage() {
  return <LoginFeature />
} 