'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { EmailVerificationPending } from '@/components/auth/EmailVerificationPending';
import { useResendVerificationMutation } from '@/hooks/api/auth';
import { toast } from 'sonner';
import { ApiError } from '@/lib/apiClient';

export default function EmailVerificationPage() {
  const [email, setEmail] = useState<string>('');
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get email from URL params or localStorage
    const emailParam = searchParams.get('email');
    const storedEmail = localStorage.getItem('signup_email');
    
    if (emailParam) {
      setEmail(emailParam);
    } else if (storedEmail) {
      setEmail(storedEmail);
    }
  }, [searchParams]);

  // Setup the resend verification mutation
  const { mutate: resendVerificationMutate } = useResendVerificationMutation({
    onSuccess: () => {
      toast.success('Verification email sent!', {
        description: 'Please check your inbox and spam folder.'
      });
    },
    onError: (error: ApiError) => {
      console.error('Resend verification error:', error);
      toast.error('Failed to resend verification email', {
        description: 'Please try again in a few moments.'
      });
    }
  });

  const handleResendVerification = async () => {
    if (email) {
      resendVerificationMutate(email);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Email Required</h1>
          <p className="text-muted-foreground">
            No email address found. Please return to signup.
          </p>
        </div>
      </div>
    );
  }

  return (
    <EmailVerificationPending 
      email={email}
      onResendVerification={handleResendVerification}
    />
  );
}
