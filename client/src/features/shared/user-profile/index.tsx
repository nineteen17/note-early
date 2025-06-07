'use client';

import React, { useState, useEffect } from 'react';
import { useProfileQuery } from '@/hooks/api/profile/useProfileQuery';
import { useUpdateProfileMutation } from '@/hooks/api/profile/useUpdateProfileMutation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileUpdateSchema, type ProfileUpdateInput } from '@/lib/schemas/profile';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, User, Mail, Edit2, Save, X, Calendar, BookOpen, Clock, Info, Hash, Copy, Users } from "lucide-react";
import { format } from 'date-fns';
import type { UserRole } from '@/types/api';
import { useCopyToClipboard } from '@/hooks/useCopyToClipBoard'; // 
import { toast } from 'sonner';

export function UserProfile() {
    const [isEditing, setIsEditing] = useState(false);
    const profileQuery = useProfileQuery();
    const updateProfileMutation = useUpdateProfileMutation();
    const { copyToClipboard, copied, error } = useCopyToClipboard();

    const { 
        register, 
        handleSubmit, 
        reset, 
        formState: { errors, isSubmitting, isDirty }
    } = useForm<ProfileUpdateInput>({
        resolver: zodResolver(profileUpdateSchema),
        defaultValues: {
            fullName: profileQuery.data?.fullName || '',
            avatarUrl: profileQuery.data?.avatarUrl || '',
        },
    });

    useEffect(() => {
        if (profileQuery.data) {
            reset({
                fullName: profileQuery.data.fullName || '',
                avatarUrl: profileQuery.data.avatarUrl || '',
            });
        }
    }, [profileQuery.data, reset]);

    const onSubmit = (data: ProfileUpdateInput) => {
        updateProfileMutation.mutate(data, {
            onSuccess: () => {
                setIsEditing(false);
            },
        });
    };

    const handleCopy = async (text: string) => {
        const success = await copyToClipboard(text);
        if (success) {
            toast.success('Copied to clipboard');
        } else {
            toast.error('Failed to copy');
        }
    };

    if (profileQuery.isLoading) {
        return (
            <Card className="h-full border-none shadow-lg">
                <CardContent className="p-6 sm:p-8 space-y-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <Skeleton className="h-24 w-24 rounded-full mx-auto sm:mx-0" />
                        <div className="flex-1 space-y-4 text-center sm:text-left">
                            <Skeleton className="h-6 w-64 mx-auto sm:mx-0" />
                            <Skeleton className="h-4 w-48 mx-auto sm:mx-0" />
                            <Skeleton className="h-4 w-32 mx-auto sm:mx-0" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (profileQuery.isError) {
        return (
            <Alert variant="destructive" className="m-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Profile</AlertTitle>
                <AlertDescription>
                    {profileQuery.error?.message || "Could not load your profile data."}
                </AlertDescription>
            </Alert>
        );
    }

    const profile = profileQuery.data;
    const fallbackInitial = profile?.fullName?.charAt(0)?.toUpperCase() || 'U';
    const isStudent = profile?.role === 'STUDENT';
    console.log("profile", profile);
    return (
        <Card className="h-full border-none shadow-lg">
            <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
                <CardContent className="flex-1 p-6 sm:p-8">
                    <div className="space-y-8">
                        {/* Student Notice */}
                        {isStudent && (
                            <Alert className="bg-primary/50 border-primary/20">
                                <Info className="h-5 w-5 text-primary" />
                                <AlertTitle className="text-accent font-semibold">Student Profile</AlertTitle>
                                <AlertDescription className="text-muted-foreground mt-1">
                                    Your profile information is managed by your administrator. Please contact them if you need to make any changes.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Main Profile Section */}
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
                            {/* Avatar Section */}
                            <div className="flex-shrink-0">
                                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-2 border-primary/10">
                                    <AvatarImage 
                                        src={profile?.avatarUrl ?? undefined} 
                                        alt={profile?.fullName ?? 'User avatar'} 
                                        className="object-cover"
                                    />
                                    <AvatarFallback className="text-xl font-semibold">
                                        {fallbackInitial}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            
                            {/* Main Info Section */}
                            <div className="flex-1 text-center sm:text-left space-y-4 min-w-0">
                                <div className="space-y-2">
                                    <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
                                        {profile?.fullName || 'User Name'}
                                    </h2>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="bg-muted/50 rounded-xl p-6 border">
                            <h3 className="text-lg font-semibold mb-4 text-center sm:text-left">
                                Account Details
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {isStudent ? (
                                    <>
                                        <div className="flex items-center gap-3 p-4 bg-card">
                                            <div className="p-2 bg-muted rounded-lg">
                                                <Hash className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Student ID</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold truncate">{profile?.profileId}</p>
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleCopy(profile?.profileId ?? '');
                                                        }}
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        {profile?.age && (
                                            <div className="flex items-center gap-3 p-4 bg-card">
                                                <div className="p-2 bg-muted rounded-lg">
                                                    <Calendar className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Age</p>
                                                    <p className="font-semibold">{profile.age} years</p>
                                                </div>
                                            </div>
                                        )}
                                        {profile?.readingLevel && (
                                            <div className="flex items-center gap-3 p-4 bg-card">
                                                <div className="p-2 bg-muted rounded-lg">
                                                    <BookOpen className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Reading Level</p>
                                                    <p className="font-semibold">{profile.readingLevel}</p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 p-4 bg-card">
                                            <div className="p-2 bg-muted rounded-lg">
                                                <Mail className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold truncate">{profile?.email || 'Not set'}</p>
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleCopy(profile?.email ?? '');
                                                        }}
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        {profile?.subscriptionPlan && (
                                            <div className="flex items-center gap-3 p-4 bg-card">
                                                <div className="p-2 bg-muted rounded-lg">
                                                    <BookOpen className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Subscription</p>
                                                    <p className="font-semibold capitalize">{profile.subscriptionPlan}</p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                                {profile?.createdAt && (
                                    <div className="flex items-center gap-3 p-4 bg-card">
                                        <div className="p-2 bg-muted rounded-lg">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Member Since</p>
                                            <p className="font-semibold">{format(new Date(profile.createdAt), 'MMM d, yyyy')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>

                {/* Action Buttons */}
                <CardFooter className="bg-muted/30 border-t px-6 sm:px-8 py-4">
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:ml-auto">
                        {!isStudent && (
                            <Button 
                                type="button" 
                                onClick={() => setIsEditing(true)}
                                className="gap-2 w-full sm:w-auto"
                            >
                                <Edit2 className="h-4 w-4" />
                                Edit Profile
                            </Button>
                        )}
                    </div>
                </CardFooter>
            </form>

            {/* Edit Dialog */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <DialogHeader>
                            <DialogTitle>Edit Profile</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-sm font-medium">
                                    Full Name *
                                </Label>
                                <Input
                                    id="fullName"
                                    {...register("fullName")}
                                    className={errors.fullName ? "border-destructive focus:ring-destructive" : ""}
                                    placeholder="Enter your full name"
                                />
                                {errors.fullName && (
                                    <p className="text-sm text-destructive flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {errors.fullName.message}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="avatarUrl" className="text-sm font-medium">
                                    Avatar URL
                                </Label>
                                <Input
                                    id="avatarUrl"
                                    type="url"
                                    {...register("avatarUrl")}
                                    className={errors.avatarUrl ? "border-destructive focus:ring-destructive" : ""}
                                    placeholder="https://example.com/avatar.jpg"
                                />
                                {errors.avatarUrl && (
                                    <p className="text-sm text-destructive flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {errors.avatarUrl.message}
                                    </p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => { setIsEditing(false); reset(); }} 
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={isSubmitting || !isDirty}
                            >
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}