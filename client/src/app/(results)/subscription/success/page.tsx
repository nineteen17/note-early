'use client';

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react'; // Or any suitable success icon

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  // Optional: Could add logic here to verify the session ID with the backend
  // using a useEffect and an API call/query hook, but for now, just display success.

  const handleGoToDashboard = () => {
    // Assuming the dashboard route is determined by role elsewhere, 
    // or redirecting to a generic '/dashboard' that handles role-based redirect.
    // For simplicity, let's use /admin/home for now.
    router.push('/admin/home'); 
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="items-center text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          <CardTitle className="text-2xl font-bold">Subscription Successful!</CardTitle>
          <CardDescription>Your subscription has been activated.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            Thank you for subscribing. Your account has been upgraded.
          </p>
          {sessionId && (
            <p className="text-xs text-muted-foreground break-all">
              Session ID: {sessionId}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleGoToDashboard}>
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 