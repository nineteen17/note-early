'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useSignupAdminMutation } from '@/hooks/api/auth';
import { adminSignupSchema } from '@/lib/schemas/auth';
import { ApiError } from '@/lib/apiClient';
import { toast } from 'sonner';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react'; 
import { NoteEarlyLogoLarge } from '@/components/NoteEarlyLogo';
import { Checkbox } from "@/components/ui/checkbox";
import { getMobileAuthMargins, getAuthCardClasses } from '@/lib/utils';

// Define form data type
type SignupFormData = z.infer<typeof adminSignupSchema>;

// Updated SignupForm component
export function SignupForm() {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors: formErrors },
        setError: setFormError,
        reset,
        getValues,
    } = useForm<SignupFormData>({
        resolver: zodResolver(adminSignupSchema),
    });

    // Helper function to clean server error messages for user display
    const cleanErrorMessage = (message: string): string => {
        // Remove technical prefixes like "Authentication error:", "Validation error:", etc.
        const colonIndex = message.indexOf(':');
        if (colonIndex > 0) {
            const cleanedMessage = message.substring(colonIndex + 1).trim();
            // Only return the cleaned version if it's not empty
            return cleanedMessage.length > 0 ? cleanedMessage : message;
        }
        return message;
    };

    // Setup the mutation hook - let the hook handle redirect
    const { 
        mutate: signupMutate,
        isPending,
    } = useSignupAdminMutation({
        onSuccess: (data, variables) => {
            // Hook already handles redirect, just show appropriate message
            toast.success("Account Created", { 
                description: "Please check your email to verify your account."
            });
            reset();
            // Don't redirect here - let the hook handle it
        },
        onError: (error: ApiError) => {
            console.error('Signup mutation error:', error);
            
            // Check if it's a duplicate email error from our database trigger issue
            if (error.message?.includes('duplicate key') || error.message?.includes('already registered')) {
                setFormError('root.serverError', {
                    type: String(error.status || 409),
                    message: 'This email address is already registered. Please try logging in instead.',
                });
                return;
            }
            
            const rawMessage = error.message || 'Signup failed. Please try again.';
            const cleanMessage = cleanErrorMessage(rawMessage);
            toast.error("Signup Failed", { description: cleanMessage });
            
            setFormError('root.serverError', {
                type: String(error.status || 500),
                message: cleanMessage,
            });
        },
    });

    const onSubmit = (data: SignupFormData) => {
        console.log("Signup form submitted:", data);
        signupMutate(data);
    };

    const serverError = formErrors.root?.serverError?.message;

    return (
        <div className="min-h-screen flex flex-col w-full">
            <div className="pt-12 pb-6 flex justify-center">
                <Link href="/">
                    <NoteEarlyLogoLarge />
                </Link>
            </div>
            
            <div className={`flex-1 flex items-start justify-center pb-8 ${getMobileAuthMargins()}`}>
                <Card className={getAuthCardClasses()}>
                    <CardHeader className="text-center space-y-1 pb-4">
                        <CardTitle className="text-xl sm:text-2xl font-bold">Create Account</CardTitle>
                        {/* <CardDescription className="text-sm sm:text-base text-muted-foreground">
                            Get started with your NoteEarly admin account
                        </CardDescription> */}
                    </CardHeader>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <CardContent className="space-y-4 px-4 sm:px-6 sm:px-8">
                            {serverError && (
                                <Alert variant="destructive">
                                    <AlertTitle className="text-sm sm:text-base">Registration Failed</AlertTitle>
                                    <AlertDescription className="text-xs sm:text-sm">
                                        {serverError}
                                        {serverError.includes('already registered') && (
                                            <div className="mt-2">
                                                <Link href="/login" className="text-sm underline">
                                                    Go to login page
                                                </Link>
                                            </div>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Your existing form fields */}
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="Enter your full name"
                                    required
                                    aria-invalid={formErrors.fullName ? "true" : "false"}
                                    aria-describedby="fullName-rhf-error"
                                    disabled={isPending}
                                    className={`bg-input border-border h-11 ${formErrors.fullName ? 'border-destructive focus:border-destructive' : ''}`}
                                    {...register("fullName")}
                                />
                                {formErrors.fullName && (
                                    <p id="fullName-rhf-error" role="alert" className="text-sm font-medium text-destructive">
                                        {formErrors.fullName.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    required
                                    aria-invalid={formErrors.email ? "true" : "false"}
                                    aria-describedby="email-rhf-error"
                                    disabled={isPending}
                                    className={`bg-input border-border h-11 ${formErrors.email ? 'border-destructive focus:border-destructive' : ''}`}
                                    {...register("email")}
                                />
                                {formErrors.email && (
                                    <p id="email-rhf-error" role="alert" className="text-sm font-medium text-destructive">
                                        {formErrors.email.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Create a strong password"
                                    required
                                    aria-invalid={formErrors.password ? "true" : "false"}
                                    aria-describedby="password-rhf-error"
                                    disabled={isPending}
                                    className={`bg-input border-border h-11 ${formErrors.password ? 'border-destructive focus:border-destructive' : ''}`}
                                    {...register("password")}
                                />
                                {formErrors.password && (
                                    <p id="password-rhf-error" role="alert" className="text-sm font-medium text-destructive">
                                        {formErrors.password.message}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                variant="accent"
                                disabled={isPending}
                            >
                                {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</> : 'Create Admin Account'}
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        Or continue with
                                    </span>
                                </div>
                            </div>

                            <Button 
                                variant="outline" 
                                className="w-full border-border text-foreground hover:bg-muted hover:text-foreground/70 h-11" 
                                disabled
                            >
                                Google signup (coming soon)
                            </Button>
                        </CardContent>
                    </form>

                    <CardFooter className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4 text-center text-sm px-6 sm:px-8">
                        <p>
                            <span className="text-muted-foreground">Already have an account?{" "}</span>
                            <Link href="/login" className={`underline ${isPending ? 'pointer-events-none opacity-50' : ''}`}>
                                Sign in
                            </Link>
                        </p>
                        <p>
                            <span className="text-muted-foreground">Need help?{" "}</span>
                            <Link href="/support" className={`underline ${isPending ? 'pointer-events-none opacity-50' : ''}`}>
                                Contact Support
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}