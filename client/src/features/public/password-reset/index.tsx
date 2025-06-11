'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForgotPasswordMutation, useUpdatePasswordMutation } from '@/hooks/api/auth';
import { forgotPasswordSchema, updatePasswordSchema } from '@/lib/schemas/auth';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Mail, Lock, CheckCircle } from 'lucide-react';
import { NoteEarlyLogoLarge } from '@/components/NoteEarlyLogo';
import { getMobileAuthMargins, getAuthCardClasses } from '@/lib/utils';

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

type PasswordResetState = 'request-email' | 'email-sent' | 'reset-password' | 'success';

export function PasswordResetFeature() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check both URL search params and hash fragments for Supabase callback parameters
  const [urlParams, setUrlParams] = React.useState<{
    accessToken: string | null;
    refreshToken: string | null;
    type: string | null;
  }>({ accessToken: null, refreshToken: null, type: null });

  // Effect to parse URL parameters including hash fragments
  React.useEffect(() => {
    // Function to parse parameters from hash or search params
    const parseUrlParams = () => {
      let accessToken = searchParams.get('access_token');
      let refreshToken = searchParams.get('refresh_token');
      let type = searchParams.get('type');

      // If not found in search params, check hash fragments (Supabase often uses hash)
      if (!accessToken && typeof window !== 'undefined') {
        const hash = window.location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
          type = hashParams.get('type');
        }
      }

      console.log('URL Parameters detected:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });

      setUrlParams({ accessToken, refreshToken, type });
    };

    parseUrlParams();
  }, [searchParams]);
  
  // Determine initial state based on URL parameters
  const getInitialState = (): PasswordResetState => {
    if (urlParams.type === 'recovery' && urlParams.accessToken) {
      console.log('Detected password reset callback - showing reset form');
      return 'reset-password';
    }
    return 'request-email';
  };

  const [currentState, setCurrentState] = React.useState<PasswordResetState>(getInitialState);
  const [userEmail, setUserEmail] = React.useState<string>('');

  // Update state when URL params change
  React.useEffect(() => {
    const newState = getInitialState();
    if (newState !== currentState) {
      console.log(`State change: ${currentState} -> ${newState}`);
      setCurrentState(newState);
    }
  }, [urlParams]);

  // Email request form
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailFormErrors },
    setError: setEmailFormError,
    getValues: getEmailValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  // Password update form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordFormErrors },
    setError: setPasswordFormError,
    reset: resetPasswordForm,
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
  });

  const { mutate: forgotPasswordMutate, isPending: isSendingEmail } = useForgotPasswordMutation({
    onSuccess: () => {
      toast.success('Password Reset Email Sent!', {
        description: 'Check your inbox for reset instructions.'
      });
      setUserEmail(getEmailValues('email'));
      setCurrentState('email-sent');
    },
    onError: (error: Error) => {
      const message = error.message || 'Failed to send password reset email.';
      
      toast.error('Email Send Failed', { 
        description: message 
      });
      
      setEmailFormError('root.serverError', {
        type: 'server',
        message: message
      });
    },
  });

  const { mutate: updatePasswordMutate, isPending: isUpdatingPassword } = useUpdatePasswordMutation({
    onSuccess: () => {
      toast.success('Password Updated!', {
        description: 'You can now sign in with your new password.'
      });
      setCurrentState('success');
      resetPasswordForm();
    },
    onError: (error: Error) => {
      const message = error.message || 'Failed to update password.';
      
      toast.error('Password Update Failed', { 
        description: message 
      });
      
      setPasswordFormError('root.serverError', {
        type: 'server',
        message: message
      });
    },
  });

  const onSubmitEmail = (data: ForgotPasswordFormData) => {
    console.log('Submitting forgot password request for:', data.email);
    forgotPasswordMutate(data);
  };

  const onSubmitPassword = (data: UpdatePasswordFormData) => {
    if (!urlParams.accessToken) {
      toast.error('Invalid Reset Link', {
        description: 'Please use the link from your email.'
      });
      return;
    }
    
    console.log('Submitting password update with token');
    // Store the access token in localStorage temporarily for the API call
    localStorage.setItem('reset_token', urlParams.accessToken);
    updatePasswordMutate(data);
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  const handleTryAgainEmail = () => {
    setCurrentState('request-email');
  };

  // Effect to handle token cleanup
  React.useEffect(() => {
    if (currentState === 'success') {
      localStorage.removeItem('reset_token');
    }
  }, [currentState]);

  // Debug information (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Password Reset Debug:', {
      currentState,
      urlParams,
      hasAccessToken: !!urlParams.accessToken,
      type: urlParams.type
    });
  }

  // Render different states
  switch (currentState) {
    case 'email-sent':
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
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl sm:text-2xl font-bold">Check Your Email</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  We've sent password reset instructions to your email address.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 px-4 sm:px-6 lg:px-8">
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    If an account with <strong>{userEmail}</strong> exists, you'll receive a password reset link shortly.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Didn't receive the email? Check your spam folder or try again.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4 text-left">
                    <h4 className="font-medium text-sm mb-2">What happens next?</h4>
                    <ol className="text-xs text-muted-foreground space-y-1">
                      <li>1. Check your email inbox for a reset link</li>
                      <li>2. Click the link in the email</li>
                      <li>3. Set your new password</li>
                      <li>4. Sign in with your new password</li>
                    </ol>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row gap-3 px-4 sm:px-6 lg:px-8">
                <Button
                  onClick={handleBackToLogin}
                  variant="accent"
                  className="w-full sm:flex-1 h-11"
                >
                  Back to Sign In
                </Button>
                <Button
                  onClick={handleTryAgainEmail}
                  variant="outline"
                  className="w-full sm:flex-1 h-11"
                >
                  Try Different Email
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      );

    case 'reset-password':
      const passwordServerError = passwordFormErrors.root?.serverError?.message;
      
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
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-xl sm:text-2xl font-bold">Set New Password</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Choose a strong password for your account.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmitPassword(onSubmitPassword)}>
                <CardContent className="space-y-4 px-4 sm:px-6 lg:px-8">
                  {passwordServerError && (
                    <Alert variant="destructive">
                      <AlertTitle className="text-sm sm:text-base">Password Update Failed</AlertTitle>
                      <AlertDescription className="text-xs sm:text-sm">
                        {passwordServerError}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter your new password"
                      required
                      aria-invalid={passwordFormErrors.newPassword ? "true" : "false"}
                      disabled={isUpdatingPassword}
                      className={`h-11 ${passwordFormErrors.newPassword ? 'border-destructive focus:border-destructive' : ''}`}
                      {...registerPassword("newPassword")}
                    />
                    {passwordFormErrors.newPassword && (
                      <p role="alert" className="text-sm font-medium text-destructive">
                        {passwordFormErrors.newPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                    <Input
                      id="confirmNewPassword"
                      type="password"
                      placeholder="Confirm your new password"
                      required
                      aria-invalid={passwordFormErrors.confirmNewPassword ? "true" : "false"}
                      disabled={isUpdatingPassword}
                      className={`h-11 ${passwordFormErrors.confirmNewPassword ? 'border-destructive focus:border-destructive' : ''}`}
                      {...registerPassword("confirmNewPassword")}
                    />
                    {passwordFormErrors.confirmNewPassword && (
                      <p role="alert" className="text-sm font-medium text-destructive">
                        {passwordFormErrors.confirmNewPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Password requirements:</p>
                    <ul className="space-y-0.5">
                      <li>• At least 8 characters long</li>
                      <li>• Include both uppercase and lowercase letters</li>
                      <li>• Include at least one number</li>
                    </ul>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 px-4 sm:px-6 lg:px-8">
                  <Button
                    type="submit"
                    disabled={isUpdatingPassword}
                    variant="accent"
                    className="w-full h-11"
                  >
                    {isUpdatingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleBackToLogin}
                    variant="ghost"
                    className="w-full h-11"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      );

    case 'success':
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
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-xl sm:text-2xl font-bold">Password Updated!</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Your password has been successfully updated.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 px-4 sm:px-6 lg:px-8">
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    You can now sign in to your account using your new password.
                  </p>
                  <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      🎉 <strong>All set!</strong> Your account is now secured with your new password.
                    </p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-center px-4 sm:px-6 lg:px-8">
                <Button
                  onClick={handleBackToLogin}
                  variant="accent"
                  className="w-full sm:w-auto h-11 px-8"
                >
                  Continue to Sign In
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      );

    default: // 'request-email'
      const emailServerError = emailFormErrors.root?.serverError?.message;

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
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl sm:text-2xl font-bold">Forgot Password?</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Enter your email address and we'll send you a link to reset your password.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmitEmail(onSubmitEmail)}>
                <CardContent className="space-y-4 px-4 sm:px-6 lg:px-8">
                  {emailServerError && (
                    <Alert variant="destructive">
                      <AlertTitle className="text-sm sm:text-base">Request Failed</AlertTitle>
                      <AlertDescription className="text-xs sm:text-sm">
                        {emailServerError}
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
                      aria-invalid={emailFormErrors.email ? "true" : "false"}
                      disabled={isSendingEmail}
                      className={`h-11 ${emailFormErrors.email ? 'border-destructive focus:border-destructive' : ''}`}
                      {...registerEmail("email")}
                    />
                    {emailFormErrors.email && (
                      <p role="alert" className="text-sm font-medium text-destructive">
                        {emailFormErrors.email.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      We'll send password reset instructions to this email address.
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 px-4 sm:px-6 lg:px-8">
                  <Button
                    type="submit"
                    disabled={isSendingEmail}
                    variant="accent"
                    className="w-full h-11"
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending Email...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleBackToLogin}
                    variant="ghost"
                    className="w-full h-11"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      );
  }
}

