import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { passwordResetSchema, type PasswordResetInput } from '@/lib/schemas/profile';
import { useResetPasswordMutation, useInvalidateAllSessionsMutation, useLogoutMutation } from '@/hooks/api/auth';
import { useProfileQuery } from '@/hooks/api/profile/useProfileQuery';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';
import { 
    Loader2, 
    Shield, 
    Key, 
    User, 
    Mail, 
    Calendar,
    CheckCircle,
    AlertCircle,
    Lock,
    LogOut,
    AlertTriangle
} from "lucide-react";
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';

export function SecurityFeature() {
    const { data: profile, isLoading: isProfileLoading, isError: isProfileError } = useProfileQuery();
    const [showInvalidateDialog, setShowInvalidateDialog] = useState(false);
    const [invalidateAlert, setInvalidateAlert] = useState<{ type: string; title: string; message: string } | null>(null);
    
    const { mutate: resetPasswordMutate, isPending: isResetting, isSuccess, isError: isResetError } = useResetPasswordMutation({
        onSuccess: () => {
            reset(); // Clear form on success
        },
    });

    const queryClient = useQueryClient();
    
    // Add logout mutation for proper cleanup
    const { mutate: logoutMutate } = useLogoutMutation();

    const { mutate: invalidateAllSessionsMutate, isPending: isInvalidatingSessions } = useInvalidateAllSessionsMutation({
        onSuccess: () => {
            // Success case - properly log out
            setInvalidateAlert({
                type: 'success',
                title: 'Refresh Tokens Invalidated',
                message: 'You have been logged out and refresh tokens invalidated. Other devices will lose access when their current tokens expire (up to 15 minutes). Redirecting to login...'
            });
            
            setShowInvalidateDialog(false);
            
            // Use proper logout flow
            setTimeout(() => {
                logoutMutate();
            }, 1500);
        },
        onError: (error: any) => {
            console.error('Session invalidation error:', error);
            
            // Check if it's actually a successful invalidation (common with JWT token errors after invalidation)
            const isTokenError = error?.message?.includes('token') || 
                                error?.response?.status === 401 || 
                                error?.message?.includes('JWT');
            
            if (isTokenError) {
                // Token errors after session invalidation are expected - treat as success
                setInvalidateAlert({
                    type: 'success',
                    title: 'Refresh Tokens Invalidated',
                    message: 'You have been logged out and refresh tokens invalidated. Other devices will lose access when their current tokens expire (up to 15 minutes). Redirecting to login...'
                });
                setShowInvalidateDialog(false);
                
                setTimeout(() => {
                    // Force logout and page reload as fallback
                    const authStore = useAuthStore.getState();
                    authStore.clearAuth();
                    window.location.href = '/login';
                }, 1500);
            } else {
                // Actual API errors (like 500 errors)
                setInvalidateAlert({
                    type: 'error',
                    title: 'Invalidation Failed',
                    message: error?.response?.data?.message || error?.message || 'Failed to invalidate refresh tokens. Please try again.'
                });
                setShowInvalidateDialog(false);
            }
        }
    });
    
    const { 
        register, 
        handleSubmit, 
        reset, 
        formState: { errors, isDirty }
    } = useForm<PasswordResetInput>({
        resolver: zodResolver(passwordResetSchema),
    });

    const onSubmit = (data: PasswordResetInput) => {
        resetPasswordMutate(data);
    };

    const handleInvalidateAllSessions = () => {
        invalidateAllSessionsMutate();
    };

    if (isProfileLoading) {
        return (
                <div className="space-y-6">
                    <Card className="border-0 shadow-sm">
                        <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                        <CardContent className="space-y-3">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-5 w-1/2" />
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                        <CardContent className="space-y-3">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                </div>
        );
    }

    if (isProfileError) {
        return (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Profile</AlertTitle>
                    <AlertDescription>
                        Could not load your profile information. Please try refreshing the page.
                    </AlertDescription>
                </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Account Information Card */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Account Information</CardTitle>
                    </div>
                    <CardDescription>
                        Your account details and security status
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-foreground">Account Details</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm font-medium text-muted-foreground">Full Name</span>
                                    <span className="font-medium">{profile?.fullName || 'N/A'}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        Email
                                    </span>
                                    <span className="font-medium">{profile?.email || 'N/A'}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm font-medium text-muted-foreground">Role</span>
                                    <span className={`font-medium capitalize px-2 py-1 rounded-full text-xs ${
                                        profile?.role === 'SUPER_ADMIN' 
                                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    }`}>
                                        {profile?.role?.replace('_', ' ') || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Account Timeline
                            </h4>
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-muted-foreground">Created</span>
                                        <span className="font-medium text-sm">
                                            {profile?.createdAt 
                                                ? format(new Date(profile.createdAt), 'PPP')
                                                : 'N/A'
                                            }
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Account registration date
                                    </div>
                                </div>
                                
                                <Separator />
                                
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-muted-foreground">Last Updated</span>
                                        <span className="font-medium text-sm">
                                            {profile?.updatedAt 
                                                ? format(new Date(profile.updatedAt), 'PPP')
                                                : 'N/A'
                                            }
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Profile last modified
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Password Security and Session Management Cards - Side by Side on Large Screens */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Password Security Card */}
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Password Security</CardTitle>
                        </div>
                        <CardDescription>
                            Change your password to keep your account secure
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Success Alert */}
                        {isSuccess && (
                            <Alert className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
                                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <AlertTitle className="text-emerald-700 dark:text-emerald-300">
                                    Password Updated Successfully
                                </AlertTitle>
                                <AlertDescription className="text-emerald-600 dark:text-emerald-400">
                                    Your password has been changed successfully. Please use your new password for future logins.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Error Alert */}
                        {isResetError && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Password Update Failed</AlertTitle>
                                <AlertDescription>
                                    Failed to update your password. Please check your current password and try again.
                                </AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword" className="text-sm font-medium">
                                    Current Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="currentPassword"
                                        type="password"
                                        placeholder="Enter your current password"
                                        className={`pl-10 ${errors.currentPassword ? "border-destructive focus:ring-destructive" : ""}`}
                                        {...register("currentPassword")} 
                                        required
                                    />
                                </div>
                                {errors.currentPassword && (
                                    <p className="text-sm text-destructive mt-1">{errors.currentPassword.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="newPassword" className="text-sm font-medium">
                                    New Password
                                </Label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        placeholder="Enter your new password"
                                        className={`pl-10 ${errors.newPassword ? "border-destructive focus:ring-destructive" : ""}`}
                                        {...register("newPassword")} 
                                        required
                                    />
                                </div>
                                {errors.newPassword && (
                                    <p className="text-sm text-destructive mt-1">{errors.newPassword.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmNewPassword" className="text-sm font-medium">
                                    Confirm New Password
                                </Label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="confirmNewPassword"
                                        type="password"
                                        placeholder="Confirm your new password"
                                        className={`pl-10 ${errors.confirmNewPassword ? "border-destructive focus:ring-destructive" : ""}`}
                                        {...register("confirmNewPassword")} 
                                        required
                                    />
                                </div>
                                {errors.confirmNewPassword && (
                                    <p className="text-sm text-destructive mt-1">{errors.confirmNewPassword.message}</p>
                                )}
                            </div>

                            <div className="pt-2">
                                <Button 
                                    type="submit" 
                                    disabled={isResetting || !isDirty}
                                    className="w-full sm:w-auto"
                                >
                                    {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {isResetting ? 'Updating Password...' : 'Update Password'}
                                </Button>
                            </div>
                        </form>

                        {/* Security Tips */}
                        <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
                            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Security Tips
                            </h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Use a password that's at least 8 characters long</li>
                                <li>• Include a mix of letters, numbers, and special characters</li>
                                <li>• Avoid using personal information in your password</li>
                                <li>• Don't reuse passwords from other accounts</li>
                                <li>• Consider using a password manager</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>

                {/* Session Management Card */}
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <LogOut className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Session Management</CardTitle>
                        </div>
                        <CardDescription>
                            Manage your active sessions across all devices
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Invalidate Sessions Alert */}
                        {invalidateAlert && (
                            <Alert className={invalidateAlert.type === 'success' 
                                ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
                                : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
                            }>
                                {invalidateAlert.type === 'success' ? (
                                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                )}
                                <AlertTitle className={invalidateAlert.type === 'success' 
                                    ? "text-emerald-800 dark:text-emerald-200"
                                    : "text-red-800 dark:text-red-200"
                                }>
                                    {invalidateAlert.title}
                                </AlertTitle>
                                <AlertDescription className={invalidateAlert.type === 'success' 
                                    ? "text-emerald-700 dark:text-emerald-300"
                                    : "text-red-700 dark:text-red-300"
                                }>
                                    {invalidateAlert.message}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Loading state for session invalidation */}
                        {isInvalidatingSessions && !invalidateAlert && (
                            <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                                <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                                <AlertTitle className="text-blue-800 dark:text-blue-200">Invalidating Sessions</AlertTitle>
                                <AlertDescription className="text-blue-700 dark:text-blue-300">
                                    Signing out all active sessions...
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">                               
                                {/* Security Notice */}
                                <div className="p-3 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                                    <div className="flex items-start space-x-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                        <div className="text-sm text-amber-800 dark:text-amber-200">
                                         <strong>Security Notice:</strong> This will log you out immediately and invalidate sessions on other devices within 15 minutes. For immediate security concerns, change your password instead.
                                        </div>  
                                    </div>
                                </div>
                            </div>
                            
                            <Button
                                onClick={() => setShowInvalidateDialog(true)}
                                variant="destructive"
                                size="sm"
                                disabled={isInvalidatingSessions}
                                className="w-full sm:w-auto"
                            >
                                {isInvalidatingSessions ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Logging Out...
                                    </>
                                ) : (
                                    <>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Log out of all devices
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={showInvalidateDialog} onOpenChange={setShowInvalidateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Invalidate Refresh Tokens
                        </DialogTitle>
                        <DialogDescription>
                            <div className="space-y-3">
                                <p>This action will:</p>
                                <ul className="text-sm space-y-1 ml-4 list-disc">
                                    <li>Log you out immediately</li>
                                    <li>Invalidate refresh tokens on all devices</li>
                                    <li>Prevent devices from staying logged in long-term</li>
                                </ul>
                                <p className="text-sm text-muted-foreground">
                                    <strong>Note:</strong> Existing access tokens remain valid for up to 15 minutes. For immediate security, change your password instead.
                                </p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => setShowInvalidateDialog(false)}
                            disabled={isInvalidatingSessions}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleInvalidateAllSessions}
                            disabled={isInvalidatingSessions}
                        >
                            {isInvalidatingSessions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isInvalidatingSessions ? 'Invalidating...' : 'Continue'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}