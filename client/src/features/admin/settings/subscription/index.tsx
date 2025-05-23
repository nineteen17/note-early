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
import { AlertCircle, Loader2, CheckCircle } from "lucide-react";
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
export function SubscriptionTab() { 
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
            <CardContent className="pt-6 space-y-6">
                {/* Skeleton for Current Plan Card */}
                <Card>
                    <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-5 w-1/2" />
                    </CardContent>
                    <CardFooter><Skeleton className="h-10 w-44" /></CardFooter>
                </Card>
                <Separator />
                {/* Skeleton for Available Plans */}
                 <div>
                    <Skeleton className="h-6 w-1/4 mb-4" />
                    <div className="space-y-4">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                </div>
            </CardContent>
        );
    }

    if (isError) {
        return (
            <CardContent className="pt-6">
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Data</AlertTitle>
                    <AlertDescription>
                        {error?.message || "Could not load subscription or plan details."}
                    </AlertDescription>
                </Alert>
            </CardContent>
        );
    }

    return (
        <CardContent className="pt-6 space-y-6"> 
             {/* --- Refactored Current Subscription Card --- */}    
            <Card>
                <CardHeader>
                    <CardTitle>Current Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Plan</span>
                        <span>{currentPlanDisplayName}</span>
                    </div>
                    <Separator className="my-2" />
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status</span>
                        <span className="capitalize font-medium">{currentStatus || 'N/A'}</span>
                    </div>
                    {formattedRenewalDate && (
                         <div className="flex justify-between items-center">
                             <span className="text-muted-foreground">{currentStatus === 'active' || currentStatus === 'trialing' ? 'Renews' : 'Expires'}</span>
                             <span>{formattedRenewalDate}</span>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    {currentSubscription?.stripeCustomerId ? (
                        <Button 
                            onClick={handleManageSubscription}
                            disabled={manageSubMutation.isPending}
                            variant="outline"
                        >
                            {manageSubMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {manageSubMutation.isPending ? 'Loading Portal...' : 'Manage Billing in Portal'}
                        </Button>
                    ) : (
                        currentPlanTier !== 'free' && <p className="text-sm text-muted-foreground">Billing management unavailable.</p>
                    )}
                </CardFooter>
            </Card>

             <Separator />

             {/* --- NEW: Usage Limits Card --- */} 
             {(currentPlanTier && currentPlanTier !== 'free') && (
                <Card>
                    <CardHeader>
                        <CardTitle>Current Usage</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">{currentPlan?.interval === 'year' ? 'Yearly' : 'Monthly'} Custom Modules</span>
                            <span>{customModulesCreated} / {customModuleLimit}</span>
                        </div>
                        {formattedRenewalDate && (
                             <div className="text-sm text-muted-foreground text-right">
                                Resets on {formattedRenewalDate}
                            </div>
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Managed Students</span>
                            <span>{currentStudentCount} / {studentLimit}</span>
                        </div>
                    </CardContent>
                </Card>
             )}

             {/* --- Refactored Available Plans Section (Grouped by Tier) --- */} 
             <div>
                 <h3 className="text-lg font-medium mb-4">Change Plan</h3>
                 {Object.keys(groupedPlans).length === 0 && !isLoadingPlans && <p>No upgrade plans available.</p>} 
                 <div className="space-y-6">
                     {Object.entries(groupedPlans).map(([tier, tierPlans]) => {
                        // Determine a display name for the tier group
                        const tierDisplayName = tierPlans[0]?.name.replace(/ (Monthly|Yearly)$/i, '') || tier.charAt(0).toUpperCase() + tier.slice(1);
                        const isCurrentTierGroup = tier === currentPlanTier;

                         return (
                            <Card key={tier} className={isCurrentTierGroup ? 'border-2 border-primary shadow-md' : 'border'}>
                                <CardHeader>
                                    {/* Use a more general name for the group */}
                                    <CardTitle>{tierDisplayName} Options</CardTitle> 
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {tierPlans.map((plan: SubscriptionPlan) => {
                                        const isCurrentSpecificPlan = isCurrentTierGroup && plan.tier === currentPlanTier; // Basic check, needs planId for accuracy
                                        const isSelectingPlan = createCheckoutSessionMutation.isPending && createCheckoutSessionMutation.variables?.planId === plan.id;
                                        
                                        return (
                                            // Inner card or div for each interval option
                                            <div key={plan.id} className={`flex items-center justify-between p-4 rounded-md ${isCurrentSpecificPlan ? 'bg-muted' : 'border'}`}>
                                                <div>
                                                    <p className="font-medium">{plan.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        ${plan.price} / {plan.interval}
                                                    </p>
                                                    {/* Optionally add limits here too if needed */}
                                                    {/* <p className="text-xs text-muted-foreground">{plan.studentLimit} students, {plan.moduleLimit} modules</p> */}
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
                                                            variant="default" // Changed variant
                                                        >
                                                            {isSelectingPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                            {isSelectingPlan ? 'Redirecting...' : 'Select Plan'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                                {/* Maybe add CardFooter if there are tier-level actions */}
                            </Card>
                         );
                     })}
                 </div>
             </div>
        </CardContent>
    );
} 