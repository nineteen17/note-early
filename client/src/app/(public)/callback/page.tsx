'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');
        const code = urlParams.get('code');
        
        // Check if this is an email verification callback
        if (type === 'signup' || code) {
          setStatus('success');
          setMessage('Email verified successfully! You can now sign in to your account.');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login?verified=true');
          }, 3000);
        } else {
          setStatus('error');
          setMessage('Invalid verification link. Please try signing up again.');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred during verification.');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {status === 'loading' && (
              <>
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Verifying Email
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                Email Verified
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                Verification Failed
              </>
            )}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your email...'}
            {status === 'success' && 'Your email has been successfully verified.'}
            {status === 'error' && 'There was an issue verifying your email.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            {message}
          </p>
          
          {status === 'success' && (
            <p className="text-sm text-muted-foreground">
              Redirecting to login page in 3 seconds...
            </p>
          )}
          
          {status === 'error' && (
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/login">
                  Go to Login
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/signup">
                  Try Signing Up Again
                </Link>
              </Button>
            </div>
          )}
          
          {status === 'success' && (
            <Button asChild className="w-full">
              <Link href="/login">
                Sign In Now
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 