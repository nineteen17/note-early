import { AdminHome } from '@/features/admin/home';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard', // Or 'Admin Home'
};

export default function AdminHomePage() {
  // This page is protected by the (auth)/layout.tsx
  // The AdminHome component is a client component that fetches its own data
  return  <AdminHome />
} 