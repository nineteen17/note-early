'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, Clock, RefreshCw, ArrowLeft } from 'lucide-react';
import { NoteEarlyLogoLarge } from '@/components/NoteEarlyLogo';
import { getMobileAuthMargins, getAuthCardClasses } from '@/lib/utils';
import { toast } from 'sonner';

interface EmailVerificationPendingProps {
  email: string;
  onResendVerification?: () => Promise<void>;
  onBackToLogin?: () => void;
  showBackButton?: boolean;
}

const RESEND_COOLDOWN_MS = 60000; // 60 seconds

export function EmailVerificationPending({ 
  email, 
  onResendVerification,
  onBackToLogin,
  showBackButton = false
}: EmailVerificationPendingProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [lastResendTime, setLastResendTime] = useState<Date | null>(null);

  const getRemainingCooldownTime = useCallback((): number => {
    if (!lastResendTime) return 0;
    const elapsed = Date.now() - lastResendTime.getTime();
    return Math.max(0, Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000));
  }, [lastResendTime]);

  const [remainingTime, setRemainingTime] = useState(getRemainingCooldownTime());

  // Update remaining time every second
  React.useEffect(() => {
    if (remainingTime <= 0) return;

    const timer = setInterval(() => {
      const newRemainingTime = getRemainingCooldownTime();
      setRemainingTime(newRemainingTime);
      
      if (newRemainingTime <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingTime, getRemainingCooldownTime]);

  const handleResendVerification = async () => {
    if (!onResendVerification) return;
    
    // Check rate limiting
    if (remainingTime > 0) {
      toast.error(`Please wait ${remainingTime} seconds before resending`);
      return;
    }

    setIsResending(true);
    try {
      await onResendVerification();
      setResendCount(prev => prev + 1);
      setLastResendTime(new Date());
      setRemainingTime(RESEND_COOLDOWN_MS / 1000);
      
      toast.success('Verification email sent!', {
        description: 'Please check your inbox and spam folder.'
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      toast.error('Failed to resend verification email', {
        description: 'Please try again in a few moments.'
      });
    } finally {
      setIsResending(false);
    }
  };

  const getEmailProvider = useCallback((email: string) => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;
    
    if (domain.includes('gmail')) return { name: 'Gmail', url: 'https://gmail.com' };
    if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) {
      return { name: 'Outlook', url: 'https://outlook.com' };
    }
    if (domain.includes('yahoo')) return { name: 'Yahoo Mail', url: 'https://mail.yahoo.com' };
    if (domain.includes('icloud')) return { name: 'iCloud Mail', url: 'https://icloud.com/mail' };
    
    return null;
  }, []);

  const emailProvider = getEmailProvider(email);
  const isResendDisabled = isResending || remainingTime > 0;

  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Fixed logo position from top */}
      <div className="pt-12 pb-6 flex justify-center">
        <Link href="/">
          <NoteEarlyLogoLarge />
        </Link>
      </div>
      
      {/* Flexible content area with mobile margins */}
      <div className={`flex-1 flex items-start justify-center pb-8 ${getMobileAuthMargins()}`}>
        <Card className={getAuthCardClasses()}>
          <CardHeader className="text-center space-y-3 pb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              We&apos;ve sent a verification link to<br />
              <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 px-4 sm:px-6 sm:px-8">
            {showBackButton && onBackToLogin && (
              <Button 
                variant="ghost" 
                onClick={onBackToLogin}
                className="w-full justify-start"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            )}

            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>Next steps:</strong>
                <ol className="mt-2 space-y-1 text-sm">
                  <li>1. Check your inbox for our verification email</li>
                  <li>2. Click the verification link in the email</li>
                  <li>3. Return here to sign in to your account</li>
                </ol>
              </AlertDescription>
            </Alert>

            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                <strong>Didn&apos;t receive the email?</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Check your spam/junk folder</li>
                  <li>• Make sure {email} is correct</li>
                  <li>• The email may take a few minutes to arrive</li>
                </ul>
              </AlertDescription>
            </Alert>

            {emailProvider && (
              <Button 
                variant="outline" 
                className="w-full"
                asChild
              >
                <a 
                  href={emailProvider.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Open {emailProvider.name}
                </a>
              </Button>
            )}

            {onResendVerification && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={handleResendVerification}
                disabled={isResendDisabled}
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : remainingTime > 0 ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend in {remainingTime}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Verification Email
                    {resendCount > 0 && ` (${resendCount})`}
                  </>
                )}
              </Button>
            )}
          </CardContent>

          <CardFooter className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4 text-center text-sm px-6 sm:px-8">
            <p>
              <span className="text-muted-foreground">Email verified? </span>
              <Link href="/login" className="underline">
                Sign In
              </Link>
            </p>
            <p>
              <span className="text-muted-foreground">Need help? </span>
              <Link href="/support" className="underline">
                Contact Support
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}