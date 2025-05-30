import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { getMobileAuthMargins, getAuthCardClasses } from '@/lib/utils';

export function LoginSkeleton() {
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
          </CardHeader>
          
          <CardContent className="space-y-4 px-6 sm:px-8">
            {/* Email field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" /> {/* Label */}
              <Skeleton className="h-11 w-full" /> {/* Input */}
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" /> {/* Label */}
                <Skeleton className="h-4 w-28" /> {/* Forgot password link */}
              </div>
              <Skeleton className="h-11 w-full" /> {/* Input */}
            </div>

            {/* Remember me checkbox */}
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4 rounded" /> {/* Checkbox */}
              <Skeleton className="h-4 w-24" /> {/* Label */}
            </div>

            {/* Sign in button */}
            <Skeleton className="h-11 w-full" />

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Skeleton className="h-px w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <Skeleton className="h-4 w-32 bg-background px-2" />
              </div>
            </div>

            {/* Google sign in button */}
            <Skeleton className="h-11 w-full" />
          </CardContent>

          <CardFooter className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4 text-center text-sm px-6 sm:px-8">
            <Skeleton className="h-4 w-40" /> {/* Footer link 1 */}
            <Skeleton className="h-4 w-32" /> {/* Footer link 2 */}
            <Skeleton className="h-4 w-28" /> {/* Footer link 3 */}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 