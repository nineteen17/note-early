'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock, PlusCircle, Info, AlertCircle } from 'lucide-react';

import { ReadingModuleDTO } from "@/types/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { UpgradePlanDisplay } from '@/components/cta/UpgradePlanDisplay';
import { useProfileQuery } from '@/hooks/api/profile/useProfileQuery';
import { useActiveModulesQuery } from '@/hooks/api/readingModules/useActiveModulesQuery';
import { useMyModulesQuery } from '@/hooks/api/admin/modules/useMyModulesQuery';
import { ModuleListDisplay } from './ModuleListDisplay';

const PublicModulesList = () => {
  const { data: modules, isLoading, error } = useActiveModulesQuery();
  // TODO: Add Filters/Sort controls here and pass filtered/sorted data
  return (
    <div>
      {/* Placeholder for Filters/Sort Controls */}
      <div className="mb-4 p-4 border rounded-md bg-muted/40">
        Filters & Sort Placeholder (Public)
      </div>
      <ModuleListDisplay modules={modules} isLoading={isLoading} error={error} />
    </div>
  );
};

const CustomModulesList = () => {
  const { data: modules, isLoading, error } = useMyModulesQuery();
  // TODO: Add Filters/Sort controls here and pass filtered/sorted data
  return (
    <div>
      {/* Placeholder for Filters/Sort Controls */}
      <div className="mb-4 p-4 border rounded-md bg-muted/40">
        Filters & Sort Placeholder (Custom)
      </div>
      <ModuleListDisplay modules={modules} isLoading={isLoading} error={error} />
    </div>
  );
};

const AllModulesList = () => {
    // Fetch both sets of data
    const { data: publicModules, isLoading: isLoadingPublic, error: errorPublic } = useActiveModulesQuery();
    const { data: customModules, isLoading: isLoadingCustom, error: errorCustom } = useMyModulesQuery();

    // Combine loading and error states (prioritize showing error)
    const isLoading = isLoadingPublic || isLoadingCustom;
    const error = errorPublic || errorCustom;

    // Combine modules only if both loaded successfully, ensuring type safety
    const combinedModules: ReadingModuleDTO[] | undefined = React.useMemo(() => {
        if (isLoading || error) {
            return undefined; // Return undefined if loading or error
        }
        // Create a Map explicitly typed
        const modulesMap = new Map<string, ReadingModuleDTO>();
        // Add public modules
        (publicModules || []).forEach(module => modulesMap.set(module.id, module));
        // Add custom modules (will overwrite public ones with the same ID if any)
        (customModules || []).forEach(module => modulesMap.set(module.id, module));
        // Convert map values back to an array
        return Array.from(modulesMap.values());
    }, [publicModules, customModules, isLoading, error]); // Dependencies for useMemo

    // TODO: Add Filters/Sort controls here and pass filtered/sorted data
    return (
        <div>
          {/* Placeholder for Filters/Sort Controls */}
          <div className="mb-4 p-4 border rounded-md bg-muted/40">
            Filters & Sort Placeholder (All)
          </div>
          {/* Pass the memoized and correctly typed array */}
          <ModuleListDisplay modules={combinedModules} isLoading={isLoading} error={error} />
        </div>
      );
  };

export function ModulesTabsFeature() {
  const { 
    data: profile, 
    isLoading: isLoadingProfile, 
    isError: isErrorProfile, 
    error: profileError 
  } = useProfileQuery();

  const userPlan = profile?.subscriptionPlan || 'free';
  const isActiveSub = profile?.subscriptionStatus === 'active';
  const canCreateCustom = (userPlan === 'home' || userPlan === 'pro') && isActiveSub;

  const [activeTab, setActiveTab] = useState("public");

  if (isLoadingProfile) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4" /> 
        <Skeleton className="h-64 w-full" /> 
      </div>
    );
  }

  if (isErrorProfile) {
    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Profile</AlertTitle>
            <AlertDescription>
                {profileError?.message || "Could not load user profile."}
            </AlertDescription>
        </Alert>
    );
  }

  const handleTabChange = (value: string) => {
    if (value === 'custom' && !canCreateCustom) {
        console.log('Custom modules tab locked due to plan.');
        return;
    } 
    setActiveTab(value);
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Reading Modules</h1>
            {canCreateCustom && (
                <Button asChild>
                    <Link href="/admin/modules/create">
                        <PlusCircle className="mr-2 h-4 w-4" /> Create New Module
                    </Link>
                </Button>
            )}
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="public">Public</TabsTrigger>
          <TabsTrigger value="custom" disabled={!canCreateCustom} className="relative">
             My Modules 
             {!canCreateCustom && <Lock className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />} 
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="public" className="mt-4">
          <PublicModulesList />
        </TabsContent>

        <TabsContent value="custom" className="mt-4">
          {canCreateCustom ? (
            <CustomModulesList />
          ) : (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Lock className="mr-2 h-5 w-5" /> Upgrade Required
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <UpgradePlanDisplay currentPlan={userPlan} />
                </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="all" className="mt-4">
            <AllModulesList />
        </TabsContent>
      </Tabs>
    </div>
  );
} 