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

// Define form data type
type SignupFormData = z.infer<typeof adminSignupSchema>;

export function SignupForm() {
    const router = useRouter();

    // Setup React Hook Form
    const {
        register,
        handleSubmit,
        formState: { errors: formErrors },
        setError: setFormError,
        reset, // Function to reset form fields
    } = useForm<SignupFormData>({
        resolver: zodResolver(adminSignupSchema),
    });

    // Setup the mutation hook
    const { 
        mutate: signupMutate,
        isPending,
        // error: mutationError // We handle errors via onError callback
    } = useSignupAdminMutation({
        onSuccess: (data) => {
            // data might contain { message: "..." } or be empty
            console.log('Signup mutation successful:', data);
            toast.success("Account Created", { 
                description: data?.message || "You can now log in."
            });
            reset(); // Clear the form on success
            // Optionally redirect to login after a delay or directly
            // router.push('/login'); 
        },
        onError: (error: ApiError) => {
            console.error('Signup mutation error:', error);
            const message = error.message || 'Signup failed. Please try again.';
            toast.error("Signup Failed", { description: message });
            // Set a general form error for display within the form
            setFormError('root.serverError', {
                type: String(error.status || 500),
                message: message,
            });
        },
    });

    // Handle form submission
    const onSubmit = (data: SignupFormData) => {
        console.log("Signup form submitted:", data);
        signupMutate(data); // Trigger the mutation
    };

    // Extract server error for display
    const serverError = formErrors.root?.serverError?.message;

    return (
        <Card className="w-full max-w-sm">
            <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold">Create Admin Account</CardTitle>
                <CardDescription>
                    Enter your details below to register.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="grid gap-4">
                    {/* Display general server/mutation errors */}
                    {serverError && (
                        <Alert variant="destructive">
                            <AlertTitle>Signup Failed</AlertTitle>
                            <AlertDescription>{serverError}</AlertDescription>
                        </Alert>
                    )}
                    {/* Full Name Input */}
                    <div className="grid gap-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input 
                            id="fullName" 
                            required 
                            aria-invalid={formErrors.fullName ? "true" : "false"}
                            aria-describedby="fullName-rhf-error"
                            disabled={isPending}
                            {...register("fullName")} 
                        />
                        {formErrors.fullName && (
                            <p id="fullName-rhf-error" role="alert" className="text-sm font-medium text-destructive">
                                {formErrors.fullName.message}
                            </p>
                        )}
                    </div>
                    {/* Email Input */}
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            placeholder="admin@example.com" 
                            required 
                            aria-invalid={formErrors.email ? "true" : "false"}
                            aria-describedby="email-rhf-error"
                            disabled={isPending}
                            {...register("email")} 
                        />
                         {formErrors.email && (
                            <p id="email-rhf-error" role="alert" className="text-sm font-medium text-destructive">
                                {formErrors.email.message}
                            </p>
                        )}
                    </div>
                    {/* Password Input */}
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input 
                            id="password" 
                            type="password" 
                            required 
                            minLength={8} 
                            aria-invalid={formErrors.password ? "true" : "false"}
                            aria-describedby="password-rhf-error"
                            disabled={isPending}
                            {...register("password")} 
                        />
                         {formErrors.password && (
                            <p id="password-rhf-error" role="alert" className="text-sm font-medium text-destructive">
                                {formErrors.password.message}
                            </p>
                         )}
                    </div>
                    {/* Submit Button */}
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</> : 'Create Account'}
                    </Button>
                </CardContent>
            </form>
            <CardFooter className="text-center text-sm">
                <p>
                    Already have an account?{" "}
                    <Link href="/login" className="underline">
                        Login
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
} 