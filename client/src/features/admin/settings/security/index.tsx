import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { passwordResetSchema, type PasswordResetInput } from '@/lib/schemas/profile';
import { useResetPasswordMutation } from '@/hooks/api/profile/useResetPasswordMutation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { CardContent } from "@/components/ui/card";

// Renamed component
export function SecurityTab() {
    const resetPasswordMutation = useResetPasswordMutation();
    const { 
        register, 
        handleSubmit, 
        reset, 
        formState: { errors, isSubmitting, isDirty }
    } = useForm<PasswordResetInput>({
        resolver: zodResolver(passwordResetSchema),
    });

    const onSubmit = (data: PasswordResetInput) => {
        resetPasswordMutation.mutate(data, {
            onSuccess: () => {
                reset(); // Clear form on success
            },
        });
    };

    return (
        <CardContent className="pt-6"> {/* Wrap in CardContent for consistent padding */}
             <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md"> {/* Added max width */}
                <div className="grid gap-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                        id="currentPassword"
                        type="password"
                        {...register("currentPassword")} 
                        className={errors.currentPassword ? "border-destructive" : ""}
                        required
                    />
                    {errors.currentPassword && (
                        <p className="text-sm text-destructive mt-1">{errors.currentPassword.message}</p>
                    )}
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                        id="newPassword"
                        type="password"
                        {...register("newPassword")} 
                        className={errors.newPassword ? "border-destructive" : ""}
                        required
                    />
                    {errors.newPassword && (
                        <p className="text-sm text-destructive mt-1">{errors.newPassword.message}</p>
                    )}
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                    <Input
                        id="confirmNewPassword"
                        type="password"
                        {...register("confirmNewPassword")} 
                        className={errors.confirmNewPassword ? "border-destructive" : ""}
                        required
                    />
                    {errors.confirmNewPassword && (
                        <p className="text-sm text-destructive mt-1">{errors.confirmNewPassword.message}</p>
                    )}
                </div>
                <Button type="submit" disabled={isSubmitting || !isDirty}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
                </Button>
            </form>
        </CardContent>
    );
} 