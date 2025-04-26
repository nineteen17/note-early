import React from 'react';
import Link from 'next/link';
import { ReadingModuleDTO } from '@/types/api'; // Assuming types are generated
import { ApiError } from '@/lib/apiClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react'; // For view details button

interface ModuleListDisplayProps {
  modules: ReadingModuleDTO[] | undefined;
  isLoading: boolean;
  error: ApiError | null;
  listTitle?: string; // Optional title if needed within the display
  className?: string;
}

export const ModuleListDisplay: React.FC<ModuleListDisplayProps> = ({
  modules,
  isLoading,
  error,
  listTitle,
  className,
}) => {
  if (isLoading) {
    return (
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-1" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="flex justify-end pt-2">
                 <Skeleton className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error Loading Modules</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!modules || modules.length === 0) {
    return <p>No modules found.</p>;
  }

  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
       {/* Optional Title */} 
       {listTitle && <h3 className="col-span-full text-xl font-semibold mb-2">{listTitle}</h3>}
      
       {modules.map((module) => (
        <Card key={module.id}>
          <CardHeader>
            <CardTitle className="text-lg">{module.title}</CardTitle>
            <CardDescription>
              Level {module.level} - {module.genre} ({module.language})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground line-clamp-2">
                {module.description || "No description provided."} 
            </p>
            <div className="flex items-center justify-between pt-2">
                <Badge variant={module.type === 'curated' ? 'default' : 'secondary'}>
                    {module.type === 'curated' ? 'Curated' : 'Custom'}
                </Badge>
                 {/* TODO: Link destination depends on role/module type */}
                 {/* For Admin view, might link to edit or progress page */}
                 <Button variant="outline" size="sm" asChild>
                    {/* Placeholder link, needs correct destination */}
                    <Link href={`/admin/modules/${module.id}/edit`} aria-label={`View details for ${module.title}`}>
                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                 </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}; 