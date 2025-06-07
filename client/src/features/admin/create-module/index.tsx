'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

import { UpgradePlanDisplay } from '@/components/cta/UpgradePlanDisplay';
import { useCurrentSubscriptionQuery } from '@/hooks/api/admin/subscriptions/useCurrentSubscriptionQuery';
import { useMyModulesQuery } from '@/hooks/api/admin/modules/useMyModulesQuery';
import { AdminCreateModule } from './AdminCreateModule';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

export function CreateModuleFeature() {
  const router = useRouter();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { 
    data: currentSubscriptionData, 
    isLoading: isLoadingSubscription, 
    isError: isErrorSubscription, 
    error: subscriptionError 
  } = useCurrentSubscriptionQuery();
  
  const { 
    data: myModules, 
    isLoading: isLoadingMyModules
  } = useMyModulesQuery();

  // Combine loading states
  const isLoading = isLoadingSubscription || isLoadingMyModules;

  // Extract plan/subscription data
  const currentPlan = currentSubscriptionData?.plan;
  const currentSubscription = currentSubscriptionData?.subscription;
  const userPlanTier = currentPlan?.tier ?? 'free';
  const customModuleLimit = currentPlan?.customModuleLimit ?? 0;
  const isActivePaidSub = (userPlanTier === 'home' || userPlanTier === 'pro') && 
    (currentSubscription?.status === 'active' || currentSubscription?.status === 'trialing');

  // Determine if user can create modules
  const canPotentiallyCreate = userPlanTier !== 'free' || customModuleLimit > 0;
  const currentModuleCount = myModules?.length ?? 0;
  const isLimitReached = currentModuleCount >= customModuleLimit;

  // Loading state
  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageContainer>
    );
  }

  // Error state
  if (isErrorSubscription) {
    return (
      <PageContainer>
        <PageHeader 
          title="Create Module" 
          description="Create a new reading module for your students"
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Subscription</AlertTitle>
          <AlertDescription>
            {subscriptionError?.message || "Could not load your subscription details."}
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  // Check if user has no access to create modules
  if (!canPotentiallyCreate) {
    return (
      <PageContainer>
        <PageHeader 
          title="Create Module" 
          description="Create a new reading module for your students"
        />
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="mr-2 h-5 w-5" />
              Feature Not Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>Creating custom modules requires a paid subscription.</p>
              <UpgradePlanDisplay currentPlan={userPlanTier} />
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  // Show module creation form with integrated subscription info
  return (
    <PageContainer>
      <PageHeader 
        title="Create Module" 
        description="Create a new reading module for your students"
      />
      <AdminCreateModule 
        currentModuleCount={currentModuleCount}
        customModuleLimit={customModuleLimit}
        userPlanTier={userPlanTier}
        currentPlan={currentPlan}
        isLimitReached={isLimitReached}
      />
    </PageContainer>
  );
}