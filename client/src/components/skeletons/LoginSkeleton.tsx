import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

export function LoginSkeleton() {
  return (
    <Card className="w-full max-w-md mx-auto animate-pulse">
      <CardHeader className="text-center space-y-2 pt-6">
        <Skeleton className="h-7 w-3/5 mx-auto" />
        <Skeleton className="h-4 w-4/5 mx-auto" />
      </CardHeader>
      <CardContent className="space-y-6 pb-6">
        <div className="space-y-6">
          <div className="grid w-full grid-cols-2 gap-2 bg-muted p-1 rounded-md">
            <Skeleton className="h-9 rounded-sm" />
            <Skeleton className="h-9 rounded-sm" />
          </div>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-2/5" />
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <Skeleton className="h-px w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <Skeleton className="h-4 w-1/4 bg-background px-2" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="mt-4 text-center">
          <Skeleton className="h-4 w-3/5 mx-auto" />
        </div>
      </CardContent>
    </Card>
  );
} 