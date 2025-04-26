import { Skeleton } from "@/components/ui/skeleton";

export function StudentSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
      {/* Header Skeleton */}
      <header className="mb-8 flex items-center justify-between">
        <Skeleton className="h-8 w-32" /> {/* Logo or Title */}
        <Skeleton className="h-8 w-8 rounded-full" /> {/* User/Menu */}
      </header>

      {/* Main Content Area Skeleton */}
      <main className="space-y-6">
        <Skeleton className="h-10 w-3/4" /> {/* Module Title */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-32 w-full" /> {/* Image or Interactive Element */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>

        {/* Navigation/Action Buttons Skeleton */}
        <div className="flex justify-between pt-6">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </main>
    </div>
  );
} 