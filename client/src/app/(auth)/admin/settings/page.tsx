import { redirect } from 'next/navigation';

// This page component simply redirects to the default settings tab.
// It can remain a Server Component.
export default function SettingsRedirectPage() {
  // Redirect to the 'profile' tab by default
  redirect('/admin/settings/profile');
  
  // Return null or loading indicator if needed, but redirect should happen server-side
  return null; 
} 