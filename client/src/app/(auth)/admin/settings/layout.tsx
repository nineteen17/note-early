'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';

// Define tabs configuration - only subscription and security
const settingsTabs = [
  { value: "subscription", label: "Subscription" },
  { value: "security", label: "Security" },
];

export default function AdminSettingsLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Determine active tab from the last segment of the pathname
  const segments = pathname.split('/').filter(Boolean); // Filter out empty strings
  const activeTab = segments[segments.length - 1] || settingsTabs[0].value; // Default to first tab if no segment

  // Handler for mobile Select change
  const handleTabChange = (value: string) => {
    router.push(`/admin/settings/${value}`);
  };

  return (
    <PageContainer className="w-full space-y-6 p-12 md:p-8 pt-6">
      <PageHeader 
        title="Account Settings" 
        description="Manage your account settings and preferences"
      />

      {/* Use Tabs purely for visual grouping and value state based on URL */}
      <Tabs value={activeTab} className="w-full space-y-4">
        {/* Select dropdown for mobile - uses router.push */}
        <div className="block md:hidden">
          <Select value={activeTab} onValueChange={handleTabChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a setting" />
            </SelectTrigger>
            <SelectContent>
              {settingsTabs.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Standard TabsList for desktop - uses Link component */}
        <div className="hidden md:block">
          <TabsList className="flex w-full">
            {settingsTabs.map((tab) => (
              <Link key={tab.value} href={`/admin/settings/${tab.value}`} className="flex-1">
                <TabsTrigger value={tab.value} asChild className="w-full">
                  <span>{tab.label}</span> 
                </TabsTrigger>
              </Link>
            ))}
          </TabsList>
        </div>

        {/* Render the active tab's page content */}
        <div className="mt-0"> {/* Add some margin top */} 
           {children}
        </div>

      </Tabs>
    </PageContainer>
  );
} 