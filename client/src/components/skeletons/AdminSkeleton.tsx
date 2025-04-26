import { Skeleton } from "@/components/ui/skeleton";

export function AdminSkeleton() {

  console.log("AdminSkeleton has rendered");
  return (
    <div className="flex h-screen w-full">
      {/* Sidebar Skeleton */}
      <div className="hidden w-64 flex-col border-r bg-muted/40 p-4 md:flex">
        <Skeleton className="mb-4 h-8 w-32" /> {/* Logo/Title Placeholder */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-5/6" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="mt-auto">
           <Skeleton className="h-10 w-full" /> {/* User/Logout Placeholder */}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex flex-1 flex-col">
        {/* Header Skeleton */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Skeleton className="h-8 w-8 rounded-full sm:hidden" /> {/* Mobile Menu Toggle */}
          <Skeleton className="h-6 w-48 flex-1" /> {/* Breadcrumbs or Title */}
          <Skeleton className="h-8 w-8 rounded-full" /> {/* User Avatar/Dropdown */}
        </header>

        {/* Page Content Skeleton */}
        <main className="flex-1 space-y-4 p-4 pt-6 md:p-6">
          <Skeleton className="h-8 w-1/3" /> {/* Page Title */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24 w-full" /> {/* Stat Card */}
            <Skeleton className="h-24 w-full" /> {/* Stat Card */}
            <Skeleton className="h-24 w-full" /> {/* Stat Card */}
            <Skeleton className="h-24 w-full" /> {/* Stat Card */}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
             <Skeleton className="col-span-4 h-64 w-full" /> {/* Main Chart/Table */}
             <Skeleton className="col-span-3 h-64 w-full" /> {/* Side Panel/List */}
          </div>
        </main>
      </div>
    </div>
  );
} 