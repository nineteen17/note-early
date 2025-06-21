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


  const segments = pathname.split('/').filter(Boolean);
  const activeTab = segments[segments.length - 1] || settingsTabs[0].value;

  const handleTabChange = (value: string) => {
    router.push(`/admin/settings/${value}`);
  };

  return (
    <PageContainer className="w-full space-y-6 p-12 md:p-8 pt-6">
      <PageHeader 
        title="Account Settings" 
        description="Manage your account settings and preferences"
      />


      <Tabs value={activeTab} className="w-full space-y-4">

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


        <div className="mt-0">
           {children}
        </div>

      </Tabs>
    </PageContainer>
  );
} 