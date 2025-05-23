'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Keep for footer links
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner'; // Use sonner like in admin login

// Internal Imports
import { studentLoginSchema, type StudentLoginInput } from '@/lib/schemas/auth'; 
import { useLoginStudentMutation } from '@/hooks/api/auth'; 
import { useAuthStore } from '@/store/authStore';
import { ApiError } from '@/lib/apiClient';

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export function StudentLoginFeature() {
    const router = useRouter(); // Keep for footer links
    const setProfile = useAuthStore((state) => state.setProfile);
    const setToken = useAuthStore((state) => state.setToken);

    const { 
        register, 
        handleSubmit, 
        control, 
        formState: { errors: formErrors }, // Rename to formErrors for clarity
        setError: setFormError, 
    } = useForm<StudentLoginInput>({
        resolver: zodResolver(studentLoginSchema),
        defaultValues: { 
            studentId: '',
            pin: '',
        }
    });

    const { 
        mutate: loginMutate, 
        isPending, 
    } = useLoginStudentMutation({
        onSuccess: (response) => {
            console.log("Student Login Successful:", response);
            toast.success(`Welcome back, ${response.profile.fullName || 'Student'}!`);
            // 1. Store auth state
            setProfile(response.profile);
            setToken(response.accessToken);
            // Redirect handled by layout observing auth state change
        },
        onError: (error: ApiError) => {
            console.error("Student Login Failed:", error);
            let errorMessage = "Login failed. Please check your ID and PIN.";
            if (error.status === 401) {
                errorMessage = "Invalid Student ID or PIN. Please try again.";
                // Set field errors
                setFormError("studentId", { type: "manual", message: " " }); // Empty message to highlight field
                setFormError("pin", { type: "manual", message: "Invalid ID or PIN" });
            } else if (error.status === 404) {
                errorMessage = "Student profile not found.";
                setFormError("studentId", { type: "manual", message: "Student ID not found" });
            } else if (error.message) {
                errorMessage = error.message; // Use specific API error message if available
            }
            
            toast.error(errorMessage);
            // Set a root error for display in the Alert component
            setFormError('root.serverError', {
                type: String(error.status || 500), 
                message: errorMessage 
            });
        }
    });

    const onSubmit: SubmitHandler<StudentLoginInput> = (data) => {
        console.log("Submitting student login:", data);
        // Clear previous root error before new submission
        setFormError('root.serverError', { message: '' }); 
        loginMutate(data);
    };

    // Extract the root server error for display
    const serverError = formErrors.root?.serverError?.message;

    return (
        <Card className="w-full max-w-sm">
            <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold">Student Login</CardTitle>
                <CardDescription>
                    Enter your Student ID and 4-digit PIN.
                </CardDescription>
            </CardHeader>
            {/* Use react-hook-form's handleSubmit */}
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="grid gap-4">
                     {/* Display general server/mutation errors */} 
                    {serverError && serverError !== '' && (
                        <Alert variant="destructive">
                            <AlertTitle>Login Failed</AlertTitle>
                            <AlertDescription>{serverError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Student ID Input */}
                    <div className="grid gap-2">
                        <Label htmlFor="studentId">Student ID</Label>
                        <Input 
                            id="studentId" 
                            placeholder="Enter your assigned ID" 
                            disabled={isPending}
                            aria-invalid={formErrors.studentId ? "true" : "false"}
                            aria-describedby="studentId-error"
                            {...register("studentId")} // Register with RHF
                        />
                        {formErrors.studentId && (
                            <p id="studentId-error" role="alert" className="text-sm text-red-600">
                                {formErrors.studentId.message}
                            </p>
                        )}
                    </div>
                    
                    {/* PIN Input - Using InputOTP with Controller */}
                    <div className="grid gap-2 items-center">
                        <Label htmlFor="pin">PIN</Label>
                        <div className="flex justify-center"> 
                             <Controller
                                name="pin"
                                control={control}
                                render={({ field }) => (
                                    <InputOTP 
                                        maxLength={4} 
                                        {...field} // Spread field props (onChange, onBlur, value, ref)
                                        id="pin"
                                        containerClassName="group flex items-center"
                                        aria-invalid={formErrors.pin ? "true" : "false"}
                                        aria-describedby="pin-error"
                                        disabled={isPending}
                                    >
                                        <InputOTPGroup className="gap-2">
                                            <InputOTPSlot index={0} className="rounded-md border" />
                                            <InputOTPSlot index={1} className="rounded-md border" />
                                            <InputOTPSlot index={2} className="rounded-md border" />
                                            <InputOTPSlot index={3} className="rounded-md border" />
                                        </InputOTPGroup>
                                    </InputOTP>
                                )}
                             />
                        </div>
                        {formErrors.pin && (
                            <p id="pin-error" role="alert" className="text-sm text-red-600 mt-1 text-center">
                                {formErrors.pin.message}
                            </p>
                        )}
                    </div>
                    
                    {/* Submit Button with loading state */} 
                    <Button 
                        type="submit" 
                        className="w-full"
                        disabled={isPending}
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                        Enter
                    </Button>

                </CardContent>
            </form>
            <CardFooter className="flex flex-col gap-2 pt-4 text-center text-sm">
                 {/* "Not a student?" link */}
                 <p>
                    <span className="text-muted-foreground">Not a student?{" "}</span>
                    <Link href="/login" className={`underline ${isPending ? 'pointer-events-none opacity-50' : ''}`}> {/* Disable link when pending */} 
                        Admin/Teacher Login
                    </Link>
                </p>
                 {/* "Need help?" link */}
                 <p className="pt-2">
                    <span className="text-muted-foreground">Need help?{" "}</span>
                    <Link href="/support" className={`underline ${isPending ? 'pointer-events-none opacity-50' : ''}`}> {/* Disable link when pending */}
                        Contact Support
                    </Link>
                 </p>
            </CardFooter>
        </Card>
    );
} 