'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscriptionPlansQuery } from '@/hooks/api/admin/subscriptions/useSubscriptionPlansQuery';
import { useCreateCheckoutSessionMutation } from '@/hooks/api/admin/subscriptions/useCreateCheckoutSessionMutation';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { SubscriptionPlan } from '@/types/api'; // Assuming SubscriptionPlan type exists

// Helper function to calculate savings
function calculateSavings(monthlyPlan: SubscriptionPlan, yearlyPlan: SubscriptionPlan) {
  const monthlyPrice = parseFloat(monthlyPlan.price || '0');
  const yearlyPrice = parseFloat(yearlyPlan.price || '0');

  if (isNaN(monthlyPrice) || isNaN(yearlyPrice) || monthlyPrice <= 0 || yearlyPrice <= 0) {
    return null; // Cannot calculate savings if prices are invalid or zero
  }

  const totalMonthlyCost = monthlyPrice * 12;
  const savings = totalMonthlyCost - yearlyPrice;

  if (savings <= 0) {
    return null; // No savings
  }

  const percentage = Math.round((savings / totalMonthlyCost) * 100);

  return {
    yearlyPrice: yearlyPrice.toFixed(0), // Format yearly price as whole number string
    savings: savings.toFixed(0), // Format savings as whole number string
    percentage,
  };
}

interface PlanFeatureProps {
  children: React.ReactNode;
  included?: boolean;
}

const PlanFeature: React.FC<PlanFeatureProps> = ({ children, included = true }) => (
  <li className={cn(
    "flex items-center text-sm",
    !included && "text-muted-foreground line-through"
  )}>
    <CheckCircle2 className={cn(
        "mr-2 h-4 w-4 flex-shrink-0",
        included ? "text-green-500" : "text-muted-foreground"
    )} />
    <span>{children}</span>
  </li>
);

interface UpgradePlanDisplayProps {
  currentPlan?: 'free' | 'home' | 'pro';
  className?: string;
}

// Define a structure to hold grouped plans
type GroupedPlans = {
  free: SubscriptionPlan | null;
  home: { monthly: SubscriptionPlan | null; yearly: SubscriptionPlan | null };
  pro: { monthly: SubscriptionPlan | null; yearly: SubscriptionPlan | null };
};

// Define state type for selected intervals
type SelectedIntervals = {
    home: 'monthly' | 'yearly';
    pro: 'monthly' | 'yearly';
};

export const UpgradePlanDisplay: React.FC<UpgradePlanDisplayProps> = ({ currentPlan, className }) => {
  const { data: plans, isLoading, error } = useSubscriptionPlansQuery();
  const checkoutMutation = useCreateCheckoutSessionMutation();

  // State to track selected interval for paid plans
  const [selectedIntervals, setSelectedIntervals] = useState<SelectedIntervals>({ 
      home: 'monthly', 
      pro: 'monthly' 
  });

  // --- Loading State --- 
  if (isLoading) {
    return (
      <div className={cn("grid gap-6 md:grid-cols-3", className)}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader>
              <Skeleton className="h-6 w-1/2 mb-2" />
              <Skeleton className="h-8 w-3/4" />
               <Skeleton className="h-4 w-1/2 mt-1" /> {/* Placeholder for yearly price */}
            </CardHeader>
            <CardContent className="flex-grow space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  // --- Error State --- 
  if (error) {
    return (
        <Alert variant="destructive" className={className}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Plans</AlertTitle>
            <AlertDescription>
                Could not load subscription plan details. Please try again later. ({error.message})
            </AlertDescription>
      </Alert>
    )
  }

  // --- No Data State --- 
  if (!plans || plans.length === 0) {
    return <p className={className}>No subscription plans available.</p>;
  }

  // --- Process and Group Plans --- 
  const groupedPlans: GroupedPlans = {
    free: null,
    home: { monthly: null, yearly: null },
    pro: { monthly: null, yearly: null },
  };

  plans.forEach(plan => {
    if (!plan.tier) return; // Skip plans without a tier

    switch (plan.tier) {
      case 'free':
        groupedPlans.free = plan;
        break;
      case 'home':
        if (plan.interval === 'month') groupedPlans.home.monthly = plan;
        if (plan.interval === 'year') groupedPlans.home.yearly = plan;
        break;
      case 'pro':
        if (plan.interval === 'month') groupedPlans.pro.monthly = plan;
        if (plan.interval === 'year') groupedPlans.pro.yearly = plan;
        break;
    }
  });

  const tiersToRender: Array<keyof GroupedPlans> = ['free', 'home', 'pro'];

  // --- Render Cards --- 
  return (
    <div className={cn("grid gap-6 md:grid-cols-3", className)}>
      {tiersToRender.map((tier) => {
        let planToDisplay: SubscriptionPlan | null = null;
        let yearlyPlan: SubscriptionPlan | null = null;
        let savingsInfo: ReturnType<typeof calculateSavings> | null = null;
        let tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
        let priceDisplay = '$0';
        let intervalDisplay = 'forever';
        let isCurrent = false;

        if (tier === 'free' && groupedPlans.free) {
          planToDisplay = groupedPlans.free;
          tierName = planToDisplay.name || tierName;
          isCurrent = currentPlan === 'free';
        } else if (tier === 'home') {
          planToDisplay = groupedPlans.home.monthly;
          yearlyPlan = groupedPlans.home.yearly;
          if (!planToDisplay) return null;
          tierName = planToDisplay.name || tierName;
          priceDisplay = `$${planToDisplay.price || '-'}`;
          intervalDisplay = `/ ${planToDisplay.interval || 'month'}`;
          if (yearlyPlan) {
            savingsInfo = calculateSavings(planToDisplay, yearlyPlan);
          }
          isCurrent = currentPlan === 'home';
        } else if (tier === 'pro') {
          planToDisplay = groupedPlans.pro.monthly;
          yearlyPlan = groupedPlans.pro.yearly;
          if (!planToDisplay) return null;
          tierName = planToDisplay.name || tierName;
          priceDisplay = `$${planToDisplay.price || '-'}`;
          intervalDisplay = `/ ${planToDisplay.interval || 'month'}`;
          if (yearlyPlan) {
            savingsInfo = calculateSavings(planToDisplay, yearlyPlan);
          }
          isCurrent = currentPlan === 'pro';
        }

        if (!planToDisplay && tier !== 'free') return null;
        if (tier === 'free' && !groupedPlans.free) return null;

        const currentDisplayPlan = (tier === 'free') 
            ? groupedPlans.free 
            : (selectedIntervals[tier as 'home' | 'pro'] === 'yearly' ? yearlyPlan : planToDisplay);
        
        const features = [
            { text: `Access Curated Modules (${(currentDisplayPlan ?? planToDisplay)?.moduleLimit ?? '?'})`, included: true },
            { text: `Up to ${(currentDisplayPlan ?? planToDisplay)?.studentLimit ?? '?'} Students`, included: true },
            { text: `Custom Modules (${(currentDisplayPlan ?? planToDisplay)?.customModuleLimit ?? '0'} allowed)`, included: ((currentDisplayPlan ?? planToDisplay)?.customModuleLimit ?? 0) > 0 },
            { text: 'Advanced Analytics', included: tier === 'pro' }, 
        ];
        
        const handleIntervalChange = (value: string) => {
            if ((tier === 'home' || tier === 'pro') && (value === 'monthly' || value === 'yearly')) {
                setSelectedIntervals(prev => ({ ...prev, [tier]: value }));
            }
        };

        const handleGetPlanClick = () => {
            let selectedPlanId: string | undefined;
            if (tier === 'free') {
                selectedPlanId = groupedPlans.free?.id;
            } else if (tier === 'home' || tier === 'pro') {
                const interval = selectedIntervals[tier];
                selectedPlanId = interval === 'monthly' 
                    ? groupedPlans[tier].monthly?.id 
                    : groupedPlans[tier].yearly?.id;
            }

            if (selectedPlanId && tier !== 'free' && !isCurrent) { 
                checkoutMutation.mutate({ planId: selectedPlanId });
            }
        };

        const targetPlanId = tier === 'free' 
            ? groupedPlans.free?.id 
            : (selectedIntervals[tier as 'home' | 'pro'] === 'monthly' ? planToDisplay?.id : yearlyPlan?.id);
        
        const isLoadingThisPlan = checkoutMutation.isPending && checkoutMutation.variables?.planId === targetPlanId;

        return (
          <Card key={tier} className={cn(
              "flex flex-col",
              isCurrent && "border-primary ring-2 ring-primary"
          )}>
            <CardHeader>
              <CardTitle>{tierName}</CardTitle>
              <CardDescription className="flex flex-col items-start space-y-1">
                 {/* Monthly Price */}
                 <div className="flex items-baseline">
                    <span className="text-2xl font-bold mr-1">{priceDisplay}</span>
                    <span className="text-sm text-muted-foreground">{intervalDisplay}</span>
                 </div>
                 {/* Optional Yearly Price & Savings */}
                 {savingsInfo && (
                   <span className="text-xs text-muted-foreground">
                       or ${savingsInfo.yearlyPrice} / year (Save {savingsInfo.percentage}%)
                    </span>
                 )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                {(tier === 'home' || tier === 'pro') && yearlyPlan && (
                    <Tabs 
                        defaultValue="monthly" 
                        className="w-full" 
                        value={selectedIntervals[tier]} 
                        onValueChange={handleIntervalChange}
                    >
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="monthly">Monthly</TabsTrigger>
                            <TabsTrigger value="yearly" disabled={!yearlyPlan}>Yearly</TabsTrigger>
                        </TabsList>
                    </Tabs>
                )}
              <ul className="space-y-2 mt-4">
                {features.map((feature, index) => (
                  <PlanFeature key={index} included={feature.included}>
                    {feature.text}
                  </PlanFeature>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
                <Button
                    onClick={handleGetPlanClick}
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || tier === 'free' || isLoadingThisPlan}
                >
                    {isCurrent ? 'Current Plan' : 
                     isLoadingThisPlan ? (
                         <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting...</>
                     ) : (
                         `Get ${tierName}` 
                     )}
                </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}; 