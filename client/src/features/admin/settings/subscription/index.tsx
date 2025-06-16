import React from 'react';
import { useManageSubscriptionMutation } from '@/hooks/api/profile/useManageSubscriptionMutation';
import { useSubscriptionPlansQuery } from '@/hooks/api/admin/subscriptions/useSubscriptionPlansQuery';
import { useCurrentSubscriptionQuery } from '@/hooks/api/admin/subscriptions/useCurrentSubscriptionQuery';
import { useAdminStudentsQuery } from '@/hooks/api/admin/students/useAdminStudentsQuery';
import { useCreateCheckoutSessionMutation } from '@/hooks/api/admin/subscriptions/useCreateCheckoutSessionMutation';
import { SubscriptionPlan } from '@/types/api';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, CheckCircle, CreditCard, Users, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';

// --- Helper Function to Group Plans by Tier --- //
const groupPlansByTier = (plans: SubscriptionPlan[] | undefined): Record<string, SubscriptionPlan[]> => {
    if (!plans) return {};
    return plans.reduce((acc, plan) => {
        // Group only active, non-free plans
        if (plan.isActive && plan.tier !== 'free') { 
            const tierKey = plan.tier; // e.g., 'home', 'pro'
            if (!acc[tierKey]) {
                acc[tierKey] = [];
            }
            acc[tierKey].push(plan);
            // Sort by interval (e.g., month before year)
            acc[tierKey].sort((a, b) => a.interval.localeCompare(b.interval)); 
        }
        return acc;
    }, {} as Record<string, SubscriptionPlan[]>);
};

// Renamed function to reflect its role as a tab content
export function SubscriptionFeature() { 
    const { data: currentSubscriptionData, isLoading: isLoadingSubscription, isError: isErrorSubscription, error: errorSubscription } = useCurrentSubscriptionQuery();
    const { data: adminStudentsData, isLoading: isLoadingAdminStudents, isError: isErrorAdminStudents, error: errorAdminStudents } = useAdminStudentsQuery();
    const { data: plans, isLoading: isLoadingPlans, isError: isErrorPlans, error: errorPlans } = useSubscriptionPlansQuery();
    const manageSubMutation = useManageSubscriptionMutation();
    const createCheckoutSessionMutation = useCreateCheckoutSessionMutation();

    // --- DEBUG: Log data --- 
    console.log('Current Subscription Data:', currentSubscriptionData);
    console.log('Admin Students Data:', adminStudentsData);
    console.log('Plans Data:', plans);

    const handleManageSubscription = () => {
        manageSubMutation.mutate(); // No arguments needed
    };

    const handleSelectPlan = (planId: string) => {
        createCheckoutSessionMutation.mutate({ planId });
    };

    const isLoading = isLoadingSubscription || isLoadingAdminStudents || isLoadingPlans;
    const isError = isErrorSubscription || isErrorAdminStudents || isErrorPlans;
    const error = errorSubscription || errorAdminStudents || errorPlans;

    // --- Group plans after fetching --- 
    const groupedPlans = groupPlansByTier(plans);

    // --- Extract Data --- //
    // Get the plan and subscription objects from the query data
    const currentPlan = currentSubscriptionData?.plan;
    const currentSubscription = currentSubscriptionData?.subscription;

    // Current Subscription details
    // Access properties from the nested objects
    const currentStatus = currentSubscription?.status;
    const currentPlanTier = currentPlan?.tier;
    const renewalDate = currentSubscription?.currentPeriodEnd;
    const formattedRenewalDate = renewalDate 
        ? new Date(renewalDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) 
        : null;
    const currentPlanDisplayName = currentPlan?.name || 
                                 (currentPlanTier ? currentPlanTier.charAt(0).toUpperCase() + currentPlanTier.slice(1) : 'Free');

    // Usage Limits
    // Access properties from the nested objects
    const customModuleLimit = currentPlan?.customModuleLimit ?? 0;
    const customModulesCreated = currentSubscription?.customModulesCreatedThisPeriod ?? 0;
    const studentLimit = currentPlan?.studentLimit ?? 0;
    const currentStudentCount = adminStudentsData?.length ?? 0;

    if (isLoading) {
        return (
                <div className="space-y-6">
                    {/* Skeleton for Current Plan Card */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                        <CardContent className="space-y-3">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-5 w-1/2" />
                        </CardContent>
                        <CardFooter><Skeleton className="h-10 w-44" /></CardFooter>
                    </Card>
                    
                    {/* Skeleton for Available Plans */}
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-1/4" />
                        <div className="grid gap-4 md:grid-cols-2">
                            <Skeleton className="h-48 w-full" />
                            <Skeleton className="h-48 w-full" />
                        </div>
                    </div>
                </div>
        );
    }

    if (isError) {
        return (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Data</AlertTitle>
                    <AlertDescription>
                        {error?.message || "Could not load subscription or plan details."}
                    </AlertDescription>
                </Alert>
        );
    }

    return (

            <div className="space-y-6">
                {/* --- Current Subscription & Usage Combined Card --- */}    
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Current Subscription</CardTitle>
                        </div>
                        <CardDescription>
                            Your active subscription plan and usage details
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Subscription Details */}
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-foreground">Plan Details</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-sm font-medium text-muted-foreground">Plan</span>
                                        <span className="font-medium">{currentPlanDisplayName}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-sm font-medium text-muted-foreground">Status</span>
                                        <span className={`font-medium capitalize ${
                                            currentStatus === 'active' ? 'text-green-600 dark:text-green-400' : 
                                            currentStatus === 'trialing' ? 'text-blue-600 dark:text-blue-400' : 
                                            'text-gray-600 dark:text-gray-400'
                                        }`}>
                                            {currentStatus || 'N/A'}
                                        </span>
                                    </div>
                                    {formattedRenewalDate && (
                                        <>
                                            <Separator />
                                            <div className="flex justify-between items-center py-2">
                                                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {currentStatus === 'active' || currentStatus === 'trialing' ? 'Renews' : 'Expires'}
                                                </span>
                                                <span className="font-medium">{formattedRenewalDate}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Usage Details - Only show if not free plan */}
                            {(currentPlanTier && currentPlanTier !== 'free') && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Usage Tracking
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-muted-foreground">Custom Modules</span>
                                                <span className="font-mono text-sm font-medium">
                                                    {customModulesCreated} / {customModuleLimit}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {currentPlan?.interval === 'year' ? 'Yearly' : 'Monthly'} limit
                                                {formattedRenewalDate && ` • Resets ${formattedRenewalDate}`}
                                            </div>
                                        </div>
                                        
                                        <Separator />
                                        
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-muted-foreground">Students</span>
                                                <span className="font-mono text-sm font-medium">
                                                    {currentStudentCount} / {studentLimit}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Total managed students
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        {currentSubscription?.stripeCustomerId ? (
                            <Button 
                                onClick={handleManageSubscription}
                                disabled={manageSubMutation.isPending}
                                variant="outline"
                                size="default"
                            >
                                {manageSubMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {manageSubMutation.isPending ? 'Loading Portal...' : 'Manage Billing Portal'}
                            </Button>
                        ) : (
                            currentPlanTier !== 'free' && (
                                <p className="text-sm text-muted-foreground">Billing management unavailable.</p>
                            )
                        )}
                    </CardFooter>
                </Card>

                {/* --- Available Plans Section --- */} 
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold tracking-tight">Available Plans</h3>
                        {Object.keys(groupedPlans).length === 0 && !isLoadingPlans && (
                            <p className="text-sm text-muted-foreground">No upgrade plans available</p>
                        )}
                    </div>
                    
                    <div className="grid gap-6 lg:grid-cols-2">
                        {Object.entries(groupedPlans).map(([tier, tierPlans]) => {
                            // Determine a display name for the tier group
                            const tierDisplayName = tierPlans[0]?.name.replace(/ (Monthly|Yearly)$/i, '') || tier.charAt(0).toUpperCase() + tier.slice(1);
                            const isCurrentTierGroup = tier === currentPlanTier;

                            return (
                                <Card key={tier} className={`border-0 shadow-sm ${isCurrentTierGroup ? 'ring-2 ring-emerald-200 dark:ring-emerald-800 bg-emerald-50 dark:bg-emerald-950/30' : ''}`}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            {tierDisplayName}
                                            {isCurrentTierGroup && (
                                                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                    Current Tier
                                                </span>
                                            )}
                                        </CardTitle>
                                        <CardDescription>
                                            Choose your billing cycle
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {tierPlans.map((plan: SubscriptionPlan) => {
                                            const isCurrentSpecificPlan = isCurrentTierGroup && plan.tier === currentPlanTier;
                                            const isSelectingPlan = createCheckoutSessionMutation.isPending && createCheckoutSessionMutation.variables?.planId === plan.id;
                                            
                                            return (
                                                <div key={plan.id} className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                                                    isCurrentSpecificPlan 
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700' 
                                                        : 'bg-background hover:bg-muted/50 border-border'
                                                }`}>
                                                    <div className="space-y-1">
                                                        <p className="font-medium">{plan.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            ${plan.price} / {plan.interval}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        {isCurrentSpecificPlan ? (
                                                            <Button disabled variant="outline" size="sm">
                                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                                Current
                                                            </Button>
                                                        ) : (
                                                            <Button 
                                                                onClick={() => handleSelectPlan(plan.id)}
                                                                disabled={createCheckoutSessionMutation.isPending}
                                                                size="sm"
                                                                variant="default"
                                                            >
                                                                {isSelectingPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                                {isSelectingPlan ? 'Processing...' : 'Select Plan'}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>
    );
} 