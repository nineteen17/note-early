'use client';

import React, { useState, useEffect } from 'react';
import { useProfileQuery } from '@/hooks/api/profile/useProfileQuery';
import { useUpdateProfileMutation } from '@/hooks/api/profile/useUpdateProfileMutation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod'; // Import zodResolver
import { profileUpdateSchema, type ProfileUpdateInput } from '@/lib/schemas/profile';

// Import UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Assuming Avatar component exists
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Placeholder feature component - REMOVING THIS DUPLICATE
/*
export function UserProfile() {
  console.log('UserProfile feature rendered');
  return <div>User Profile Feature Placeholder</div>;
}
*/

export function UserProfile() {
    const [isEditing, setIsEditing] = useState(false);
    const profileQuery = useProfileQuery();
    const updateProfileMutation = useUpdateProfileMutation();

    const { 
        register, 
        handleSubmit, 
        reset, 
        formState: { errors, isSubmitting, isDirty } // Get form state
    } = useForm<ProfileUpdateInput>({
        resolver: zodResolver(profileUpdateSchema),
        defaultValues: { // Pre-populate form with fetched data
            fullName: profileQuery.data?.fullName || '',
            avatarUrl: profileQuery.data?.avatarUrl || '',
        },
    });

    // Reset form when profile data changes (e.g., after successful fetch or update)
    useEffect(() => {
        if (profileQuery.data) {
            reset({
                fullName: profileQuery.data.fullName || '',
                avatarUrl: profileQuery.data.avatarUrl || '',
            });
        }
    }, [profileQuery.data, reset]);

    const onSubmit = (data: ProfileUpdateInput) => {
        console.log("Submitting profile update:", data);
        // Only submit fields that have changed, or submit all if needed by backend
        // For simplicity, submitting all validated fields here
        updateProfileMutation.mutate(data, {
            onSuccess: () => {
                setIsEditing(false); // Exit editing mode on success
            },
            // onError is handled globally by the hook (toast)
        });
    };

    // --- Loading State --- 
    if (profileQuery.isLoading) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <Skeleton className="h-8 w-3/5" />
                    <Skeleton className="h-4 w-4/5 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-4 w-[250px]" />
                        </div>
                    </div>
                     <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }

    // --- Error State --- 
    if (profileQuery.isError) {
        return (
            <Alert variant="destructive" className="w-full">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Profile</AlertTitle>
                <AlertDescription>
                    {profileQuery.error?.message || "Could not load your profile data."}
                </AlertDescription>
            </Alert>
        );
    }

    // --- Success State (View/Edit) --- 
    const profile = profileQuery.data;
    const fallbackInitial = profile?.fullName?.charAt(0)?.toUpperCase() || 'U';

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>
                    View and update your personal information.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16">
                             {/* Display avatar or fallback */} 
                            <AvatarImage src={profile?.avatarUrl ?? undefined} alt={profile?.fullName ?? 'User avatar'} />
                            <AvatarFallback>{fallbackInitial}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="text-lg font-semibold">{profile?.fullName}</h3>
                            <p className="text-sm text-muted-foreground">{profile?.email}</p>
                        </div>
                    </div>

                    {/* Display Form in Edit Mode */} 
                    {isEditing ? (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    {...register("fullName")} 
                                    className={errors.fullName ? "border-destructive" : ""}
                                />
                                {errors.fullName && (
                                    <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="avatarUrl">Avatar URL</Label>
                                <Input
                                    id="avatarUrl"
                                    type="url"
                                    {...register("avatarUrl")} 
                                    className={errors.avatarUrl ? "border-destructive" : ""}
                                />
                                {errors.avatarUrl && (
                                    <p className="text-sm text-destructive mt-1">{errors.avatarUrl.message}</p>
                                )}
                            </div>
                        </>
                    ) : (
                        // Simple display mode could go here if needed, but editing form is primary focus
                        <div className="text-sm text-muted-foreground">
                           Role: {profile?.role}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    {isEditing ? (
                        <>
                            <Button type="button" variant="outline" onClick={() => { setIsEditing(false); reset(); }} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !isDirty} >
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </>
                    ) : (
                        <Button type="button" onClick={() => setIsEditing(true)}>
                            Edit Profile
                        </Button>
                    )}
                </CardFooter>
            </form>
        </Card>
    );
} 