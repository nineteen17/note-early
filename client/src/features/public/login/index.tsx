'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useLoginAdminMutation, useResendVerificationMutation } from '@/hooks/api/auth';
import { adminLoginSchema } from '@/lib/schemas/auth';
import { ApiError, api } from '@/lib/apiClient';
import type { ProfileDTO } from '@/types/api';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Mail } from 'lucide-react';
import { NoteEarlyLogoLarge } from '@/components/NoteEarlyLogo';
import { getMobileAuthMargins, getAuthCardClasses } from '@/lib/utils';
import { EmailVerificationPending } from '@/features/public/login/EmailVerificationPending';

type LoginFormData = z.infer<typeof adminLoginSchema>;

export function LoginFeature() {
  const setToken = useAuthStore((s) => s.setToken);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Check for verification success from URL params (no useEffect needed)
  const isEmailVerified = searchParams.get('verified') === 'true';

  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
    setError: setFormError,
    getValues,
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(adminLoginSchema),
  });

  const { mutate: resendVerificationMutate, isPending: isResending } = useResendVerificationMutation({
    onSuccess: () => {
      toast.success('Verification email sent!', {
        description: 'Please check your inbox and spam folder.'
      });
    },
    onError: (error: ApiError) => {
      toast.error('Failed to resend verification email', {
        description: error.message || 'Please try again in a few moments.'
      });
    }
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

  const { mutate: loginMutate, isPending: isLoggingIn } = useLoginAdminMutation({
    onSuccess: async (data) => {
      toast.success('Login successful!');
      setToken(data.accessToken);
      
      // Fetch and set profile after successful login
      try {
        const profileData = await api.get<ProfileDTO>('/profiles/me');
        setProfile(profileData);
      } catch (error) {
        console.error('Failed to fetch profile after login:', error);
        // Don't show error to user as login was successful
      }
    },
    onError: (error: ApiError) => {
      const rawMessage = error.message || 'Login failed. Please try again.';
      const cleanMessage = cleanErrorMessage(rawMessage);
      

      const isVerificationError = (
        rawMessage.toLowerCase().includes('verify') || 
        rawMessage.toLowerCase().includes('verification') ||
        rawMessage.toLowerCase().includes('unverified') ||
        rawMessage.toLowerCase().includes('not verified') ||
        rawMessage.toLowerCase().includes('email verification') ||
        (error.status === 403 && rawMessage.toLowerCase().includes('email'))
      );
      
      if (isVerificationError) {
        const email = getValues('email');
        setUnverifiedEmail(email);
        return;
      }
      

      toast.error('Login Failed', { description: cleanMessage });
      setFormError('root.serverError', {
        type: String(error.status || 500),
        message: cleanMessage
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    setUnverifiedEmail(null); // Reset verification state
    loginMutate(data);
  };

  const handleResendVerification = async () => {
    if (unverifiedEmail) {
      resendVerificationMutate(unverifiedEmail);
    }
  };

  const handleBackToLogin = () => {
    setUnverifiedEmail(null);
    reset(); // Clear form errors
  };

  // Show verification screen if email needs verification
  if (unverifiedEmail) {
    return (
      <EmailVerificationPending 
        email={unverifiedEmail}
        onResendVerification={handleResendVerification}
        onBackToLogin={handleBackToLogin}
        showBackButton={true}
      />
    );
  }

  const serverError = formErrors.root?.serverError?.message;
  console.log("serverError", serverError);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="pt-12 pb-6 flex justify-center">
        <Link href="/">
          <NoteEarlyLogoLarge />
        </Link>
      </div>
      
      <div className={`flex-1 flex items-start justify-center pb-8 ${getMobileAuthMargins()}`}>
        <Card className={getAuthCardClasses()}>
          <CardHeader className="text-center space-y-1 pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold">Admin Login</CardTitle>
          </CardHeader>

          {/* Show success message for verified email */}
          {isEmailVerified && (
            <div className="px-4 sm:px-6 sm:px-8 pb-4">
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
                <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>Email verified successfully!</strong> You can now sign in to your account.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 px-4 sm:px-6 sm:px-8">
              {serverError && (
                <Alert variant="destructive">
                  <AlertTitle className="text-sm sm:text-base">Login Failed</AlertTitle>
                  <AlertDescription className="text-xs sm:text-sm">
                    {serverError}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  aria-invalid={formErrors.email ? "true" : "false"}
                  disabled={isLoggingIn}
                  className={`h-11 ${formErrors.email ? 'border-destructive focus:border-destructive' : ''}`}
                  {...register("email")}
                />
                {formErrors.email && (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {formErrors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link 
                    href="/password-reset"
                    className={`text-sm hover:underline ${isLoggingIn ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  aria-invalid={formErrors.password ? "true" : "false"}
                  disabled={isLoggingIn}
                  className={`h-11 ${formErrors.password ? 'border-destructive focus:border-destructive' : ''}`}
                  {...register("password")}
                />
                {formErrors.password && (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {formErrors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-me"
                  disabled={isLoggingIn}
                />
                <Label
                  htmlFor="remember-me"
                  className={`text-sm font-normal text-muted-foreground ${isLoggingIn ? 'opacity-50' : ''}`}
                >
                  Remember me
                </Label>
              </div>

              <Button
                variant="accent"
                type="submit"
                className="w-full h-11"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full h-11" 
                disabled
              >
                Google sign-in (coming soon)
              </Button>
            </CardContent>
          </form>

          <CardFooter className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4 text-center text-sm px-6 sm:px-8">
            <p>
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/signup" className={`underline ${isLoggingIn ? 'pointer-events-none opacity-50' : ''}`}>
                Create an account
              </Link>
            </p>
            <p>
              <span className="text-muted-foreground">Are you a student? </span>
              <Link href="/student-login" className={`underline ${isLoggingIn ? 'pointer-events-none opacity-50' : ''}`}>
                Login here
              </Link>
            </p>
            <p>
              <span className="text-muted-foreground">Need help? </span>
              <Link href="/support" className={`underline ${isLoggingIn ? 'pointer-events-none opacity-50' : ''}`}>
                Contact Support
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}