'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock, PlusCircle, Info, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import { ReadingModuleDTO } from "@/types/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from '@/components/ui/separator';

import { UpgradePlanDisplay } from '@/components/cta/UpgradePlanDisplay';
import { useCurrentSubscriptionQuery } from '@/hooks/api/admin/subscriptions/useCurrentSubscriptionQuery';
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
  const router = useRouter();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { 
    data: currentSubscriptionData, 
    isLoading: isLoadingSubscription, 
    isError: isErrorSubscription, 
    error: subscriptionError 
  } = useCurrentSubscriptionQuery();
  
  // Fetch custom modules data needed for free tier limit check
  const { 
    data: myModules, 
    isLoading: isLoadingMyModules, 
    /* error: errorMyModules // Handle error display elsewhere if needed */ 
  } = useMyModulesQuery();

  // Combine loading states
  const isLoading = isLoadingSubscription || isLoadingMyModules;

  // Extract plan/subscription data
  const currentPlan = currentSubscriptionData?.plan;
  const currentSubscription = currentSubscriptionData?.subscription;
  const userPlanTier = currentPlan?.tier ?? 'free'; // Default to 'free' if plan is missing
  const customModuleLimit = currentPlan?.customModuleLimit ?? 0;
  const isActivePaidSub = (userPlanTier === 'home' || userPlanTier === 'pro') && (currentSubscription?.status === 'active' || currentSubscription?.status === 'trialing');

  // --- Determine if user CAN create modules (based on plan config) ---
  const canPotentiallyCreate = userPlanTier !== 'free' || customModuleLimit > 0;

  // --- Determine if user is CURRENTLY at their limit --- 
  let isLimitReached = false;
  let currentModuleCount = 0;
  if (isLoading) {
    // Can't determine limit while loading
    isLimitReached = true; 
  } else if (userPlanTier === 'free') {
    // Free tier: Check total modules created against plan limit
    currentModuleCount = myModules?.length ?? 0;
    isLimitReached = currentModuleCount >= customModuleLimit;
  } else if (isActivePaidSub) {
    // Active Paid tier: Check monthly counter against plan limit
    currentModuleCount = currentSubscription?.customModulesCreatedThisPeriod ?? 0;
    isLimitReached = currentModuleCount >= customModuleLimit;
  } else {
    // Inactive paid subscription or error state
    isLimitReached = true; // Treat as limit reached if sub inactive/error
  }

  // --- Determine if the "Create" button and "My Modules" tab should be ACTIVE ---
  // User must have potential to create AND not be loading AND (be paid OR be free under limit)
  const showCreateFeatures = canPotentiallyCreate && !isLoading && (isActivePaidSub || userPlanTier === 'free');

  const handleCreateClick = () => {
    if (userPlanTier === 'free' && isLimitReached) {
      setShowUpgradeModal(true);
    } else if (!isLimitReached) {
      router.push('/admin/modules/create');
    }
  };

  const [activeTab, setActiveTab] = useState("public");

  // Skeleton Loading State
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4" /> 
        <Skeleton className="h-64 w-full" /> 
      </div>
    );
  }

  // Error State (prioritize subscription error)
  if (isErrorSubscription) {
    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Subscription</AlertTitle>
            <AlertDescription>
                {subscriptionError?.message || "Could not load your subscription details."}
            </AlertDescription>
        </Alert>
    );
  }
  
  // --- Render Component ---
  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Reading Modules</h1>
            {/* Show button if user *can* potentially create and meets conditions */} 
            {showCreateFeatures && (
                <Button onClick={handleCreateClick} disabled={isLoading || (isLimitReached && userPlanTier !== 'free')}> 
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Module
                </Button>
            )}
        </div>

        {/* Display Custom Module Usage - Show if user can potentially create */} 
        {canPotentiallyCreate && (
          <p className="text-sm text-muted-foreground font-medium mb-4">
            {userPlanTier === 'free' 
              ? `Total custom modules created: ${currentModuleCount} / ${customModuleLimit}` 
              : `${currentPlan?.interval === 'month' ? 'Monthly' : 'Yearly'} custom modules created: ${currentModuleCount} / ${customModuleLimit}`}
            {isLimitReached ? ' (Limit Reached)' : ''}
          </p>
        )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="public">Public</TabsTrigger>
           {/* Enable tab if user can potentially create and meets conditions */}
          <TabsTrigger value="custom" disabled={!showCreateFeatures} className="relative">
             My Modules 
             {!showCreateFeatures && <Lock className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />} 
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="public" className="mt-4">
          <PublicModulesList />
        </TabsContent>

        <TabsContent value="custom" className="mt-4">
          {/* Show content if user can potentially create and meets conditions */} 
          {showCreateFeatures ? (
            <CustomModulesList />
          ) : (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Lock className="mr-2 h-5 w-5" /> 
                        {userPlanTier === 'free' ? 'Feature Not Available' : 'Upgrade Required'} 
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {userPlanTier === 'free' 
                      ? <p>Creating custom modules requires a paid subscription.</p>
                      : <UpgradePlanDisplay currentPlan={userPlanTier} />
                    }
                </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="all" className="mt-4">
            <AllModulesList />
        </TabsContent>
      </Tabs>
    </div>

    {/* Upgrade Modal */}
    <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upgrade Required</DialogTitle>
          <DialogDescription>
            You have reached the custom module limit for the free plan.
          </DialogDescription>
        </DialogHeader>
        <UpgradePlanDisplay currentPlan={'free'} />
        <DialogFooter>
           <DialogClose asChild>
             <Button variant="outline">Close</Button>
           </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
} 