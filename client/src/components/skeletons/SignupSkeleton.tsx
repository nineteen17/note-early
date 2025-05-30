import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { getMobileAuthMargins, getAuthCardClasses } from '@/lib/utils';

export function SignupSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed logo position from top */}
      <div className="pt-12 pb-6 flex justify-center">
        <Skeleton className="h-12 w-32" /> {/* Logo skeleton */}
      </div>
      
      {/* Flexible content area with mobile margins */}
      <div className={`flex-1 flex items-start justify-center pb-8 ${getMobileAuthMargins()}`}>
        <Card className={getAuthCardClasses()}>
          <CardHeader className="text-center space-y-1 pb-4">
            <Skeleton className="h-8 w-48 mx-auto" /> {/* Title */}
            <Skeleton className="h-4 w-64 mx-auto" /> {/* Description */}
          </CardHeader>
          
          <CardContent className="space-y-5 px-6 sm:px-8">
            {/* Full Name field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" /> {/* Label */}
              <Skeleton className="h-11 w-full" /> {/* Input */}
            </div>

            {/* Email field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" /> {/* Label */}
              <Skeleton className="h-11 w-full" /> {/* Input */}
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" /> {/* Label */}
              <Skeleton className="h-11 w-full" /> {/* Input */}
            </div>

            {/* Create account button */}
            <Skeleton className="h-12 w-full" />

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Skeleton className="h-px w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <Skeleton className="h-4 w-32" />
              </div>
            </div>

            {/* Google sign up button */}
            <Skeleton className="h-12 w-full" />
          </CardContent>

          <CardFooter className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4 text-center text-sm px-6 sm:px-8">
            <Skeleton className="h-4 w-48" /> {/* Footer link 1 */}
            <Skeleton className="h-4 w-32" /> {/* Footer link 2 */}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 