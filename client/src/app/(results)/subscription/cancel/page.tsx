'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { XCircle } from 'lucide-react'; // Icon for cancellation/warning

export default function SubscriptionCancelPage() {
  const router = useRouter();

  const handleGoToDashboard = () => {
    // Navigate back to the main dashboard or settings page
    router.push('/admin/settings/subscription'); // Or potentially back to the upgrade plan page
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="items-center text-center">
          <XCircle className="h-12 w-12 text-orange-500 mb-4" /> {/* Using orange for cancelled state */}
          <CardTitle className="text-2xl font-bold">Checkout Cancelled</CardTitle>
          <CardDescription>Your subscription process was cancelled.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            You have not been charged. You can initiate the subscription process again anytime.
          </p>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleGoToDashboard}>
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 