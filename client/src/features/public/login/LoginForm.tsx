'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useLoginAdminMutation } from '@/hooks/api/auth';
import { adminLoginSchema } from '@/lib/schemas/auth';
import { ApiError } from '@/lib/apiClient';
import { toast } from 'sonner';

// Import UI components from ShadCN
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react'; // For loading spinner

// Define the form data type based on the Zod schema
type LoginFormData = z.infer<typeof adminLoginSchema>;

export function LoginForm() {
    const router = useRouter(); // Keep router if needed for other links, but not for redirect
    const setToken = useAuthStore((s) => s.setToken);

    // Setup React Hook Form
    const { 
        register, 
        handleSubmit, 
        formState: { errors: formErrors }, // Get RHF validation errors
        setError: setFormError // Function to set manual errors
    } = useForm<LoginFormData>({
        resolver: zodResolver(adminLoginSchema),
    });

    // Setup the mutation hook
    const { 
        mutate: loginMutate,
        isPending, 
        error: mutationError // Get error state from mutation
    } = useLoginAdminMutation({
        onSuccess: (data) => {
            // Data here is LoginAdminResponse { accessToken, userId?, email? }
            console.log('LoginForm: Login mutation successful, setting token.');
            toast.success('Login successful!'); // Success notification
            setToken(data.accessToken); // Update Zustand store
            // REDIRECT REMOVED - Let the PublicLayout handle redirection based on state change
            // router.push('/admin/home'); 
        },
        onError: (error: ApiError) => {
            console.error('Login mutation error:', error);
            // Use the error message from the API error
            const message = error.message || 'Login failed. Please try again.';
            toast.error(message); // Error notification
            // Set a general form error using RHF's setError
            setFormError('root.serverError', { 
                type: String(error.status || 500), // Use status code if available
                message: message
            });
        },
    });

    // Handle form submission
    const onSubmit = (data: LoginFormData) => {
        console.log("Form submitted with data:", data);
        loginMutate(data); // Call the mutation function with validated data
    };

    // Extract the root server error for display
    const serverError = formErrors.root?.serverError?.message;

    return (
        <Card className="w-full max-w-sm"> {/* Constrain width */}
            <CardHeader className="space-y-1 text-center"> {/* Centered header */}
                <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
                <CardDescription>
                    Enter your email and password to access the dashboard.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="grid gap-4">
                    {/* Display general server/mutation errors */}
                    {serverError && (
                        <Alert variant="destructive">
                            <AlertTitle>Login Failed</AlertTitle>
                            <AlertDescription>{serverError}</AlertDescription>
                        </Alert>
                    )}
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
                            {...register("email")} // Register input with RHF
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
                            aria-invalid={formErrors.password ? "true" : "false"}
                            aria-describedby="password-rhf-error"
                            disabled={isPending}
                            {...register("password")} // Register input with RHF
                        />
                        {formErrors.password && (
                            <p id="password-rhf-error" role="alert" className="text-sm font-medium text-destructive">
                                {formErrors.password.message}
                            </p>
                        )}
                    </div>
                    {/* Submit Button */}
                    <Button className="w-full" type="submit" disabled={isPending}>
                        {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging in...</> : 'Login'}
                    </Button>
                </CardContent>
            </form>
            {/* Optional Footer for links */}
            <CardFooter className="flex flex-col gap-2 text-center text-sm">
                <p>
                    Don't have an account?{" "}
                    <Link href="/signup" className="underline">
                        Sign up
                    </Link>
                </p>
                <p>
                    Are you a student?{" "}
                    <Link href="/student-login" className="underline">
                        Login here
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
} 