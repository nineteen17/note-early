import React from 'react';
import { useProfileQuery } from '@/hooks/api/profile/useProfileQuery';
import { useManageSubscriptionMutation } from '@/hooks/api/profile/useManageSubscriptionMutation';
import { useSubscriptionPlansQuery } from '@/hooks/api/admin/subscriptions/useSubscriptionPlansQuery';
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
    const { data: profile, isLoading: isLoadingProfile, isError: isErrorProfile, error: errorProfile } = useProfileQuery(); // Get profile data for status
    const manageSubMutation = useManageSubscriptionMutation();
    const { data: plans, isLoading: isLoadingPlans, isError: isErrorPlans, error: errorPlans } = useSubscriptionPlansQuery();
    const createCheckoutSessionMutation = useCreateCheckoutSessionMutation();

    // --- DEBUG: Log profile data --- 
    console.log('Profile Data:', profile);

    const handleManageSubscription = () => {
        manageSubMutation.mutate(); // No arguments needed
    };

    const handleSelectPlan = (planId: string) => {
        createCheckoutSessionMutation.mutate({ planId });
    };

    const isLoading = isLoadingProfile || isLoadingPlans;

    // --- Group plans after fetching --- 
    const groupedPlans = groupPlansByTier(plans);

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

    if (isErrorProfile || isErrorPlans) {
        const errorToShow = errorProfile || errorPlans;
        return (
            <CardContent className="pt-6">
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Data</AlertTitle>
                    <AlertDescription>
                        {errorToShow?.message || "Could not load subscription or plan details."}
                    </AlertDescription>
                </Alert>
            </CardContent>
        );
    }

    // --- Current Subscription Details --- //
    const currentStatus = profile?.subscriptionStatus;
    const currentPlanTier = profile?.subscriptionPlan;
    const renewalDate = profile?.subscriptionRenewalDate;
    const formattedRenewalDate = renewalDate 
        ? new Date(renewalDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) 
        : null;
    // Find the specific active plan object if possible (might need planId on profile DTO for accuracy)
    // For now, fallback to tier name capitalization
    const currentPlanDisplayName = plans?.find(p => p.tier === currentPlanTier)?.name || 
                                 (currentPlanTier ? currentPlanTier.charAt(0).toUpperCase() + currentPlanTier.slice(1) : 'Free');

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
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status</span>
                        <span className="capitalize font-medium">{currentStatus || 'N/A'}</span>
                    </div>
                    {formattedRenewalDate && (
                         <div className="flex justify-between items-center">
                             <span className="text-muted-foreground">Renews/Expires</span>
                             <span>{formattedRenewalDate}</span>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    {profile?.stripeCustomerId ? (
                        <Button 
                            onClick={handleManageSubscription}
                            disabled={manageSubMutation.isPending}
                            variant="outline"
                        >
                            {manageSubMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {manageSubMutation.isPending ? 'Loading Portal...' : 'Manage Billing in Portal'}
                        </Button>
                    ) : (
                        <p className="text-sm text-muted-foreground">Billing is managed externally or not applicable.</p> // Optional message if no button
                    )}
                </CardFooter>
            </Card>

             <Separator />

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