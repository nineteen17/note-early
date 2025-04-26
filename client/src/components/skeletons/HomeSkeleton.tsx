import { Skeleton } from "@/components/ui/skeleton";

export function HomeSkeleton() {

  console.log("HomeSkeleton has rendered");
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-50 border-b">
        <div className="container flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-28" /> {/* Logo */}
          <div className="hidden md:flex items-center space-x-6">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center space-x-2">
             <Skeleton className="h-8 w-16" /> {/* Login */}
             <Skeleton className="h-8 w-20" /> {/* Register */}
             <Skeleton className="h-8 w-8 rounded-full" /> {/* Theme Toggle */}
          </div>
        </div>
      </header>

      {/* Hero Section Skeleton */}
      <section className="w-full py-16 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-6">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <div className="flex justify-center items-center mt-10 md:mt-0">
            <Skeleton className="h-64 w-64 md:h-80 md:w-80 lg:h-96 lg:w-96 rounded-full" /> {/* Illustration Placeholder */}
          </div>
        </div>
      </section>

      {/* Feature Section Skeleton */}
      <section className="w-full py-16 md:py-24 lg:py-32 bg-muted">
        <div className="container px-4 md:px-6">
          <Skeleton className="h-10 w-1/3 mx-auto mb-12 lg:mb-16" /> {/* Section Title */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <Skeleton className="h-64 w-full rounded-lg" /> {/* Feature Card */}
            <Skeleton className="h-64 w-full rounded-lg" /> {/* Feature Card */}
            <Skeleton className="h-64 w-full rounded-lg" /> {/* Feature Card */}
          </div>
        </div>
      </section>

       {/* Footer Skeleton */}
       <footer className="bg-muted border-t py-12 lg:py-16">
          <div className="container px-4 md:px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
           <div className="container px-4 md:px-6 mt-8 border-t pt-6">
              <Skeleton className="h-4 w-1/2 mx-auto" />
          </div>
      </footer>
    </div>
  );
} 