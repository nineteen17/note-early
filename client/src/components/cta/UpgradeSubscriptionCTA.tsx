import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';

interface UpgradeSubscriptionCTAProps {
  featureName?: string; // Optional: Customize the locked feature name
  message?: string;     // Optional: Override the default message
  buttonText?: string;  // Optional: Override the button text
  className?: string;   // Optional: Allow passing additional classes
}

export const UpgradeSubscriptionCTA: React.FC<UpgradeSubscriptionCTAProps> = ({
  featureName = 'this feature',
  message = `Accessing ${featureName} requires a Home or Pro subscription.`,
  buttonText = 'Upgrade Subscription',
  className,
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <Alert variant="default">
        {/* Using Lock icon within the AlertTitle for consistency */}
        <Lock className="h-4 w-4" /> 
        <AlertTitle>Feature Locked</AlertTitle>
        <AlertDescription>
          {message}
        </AlertDescription>
      </Alert>
      <Button asChild variant="default">
        <Link href="/settings">{buttonText}</Link>
      </Button>
    </div>
  );
}; 