'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentActivity } from '@/hooks/api/admin/useRecentActivity';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, BookOpen } from 'lucide-react';

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'new_student':
      return <Users className="h-3 w-3" />;
    case 'module_completion':
      return <CheckCircle className="h-3 w-3" />;
    case 'student_progress':
      return <BookOpen className="h-3 w-3" />;
    default:
      return <BookOpen className="h-3 w-3" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'new_student':
      return 'bg-blue-500 hover:bg-blue-600';
    case 'module_completion':
      return 'bg-green-500 hover:bg-green-600';
    case 'student_progress':
      return 'bg-orange-500 hover:bg-orange-600';
    default:
      return 'bg-gray-500 hover:bg-gray-600';
  }
};

export function RecentActivity() {
  const { data: activities, isLoading, error } = useRecentActivity();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest student progress and module updates.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-destructive text-sm">Error loading recent activity</p>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 border-b border-border last:border-0 pb-3 last:pb-0">
                <Badge variant="secondary" className={`${getActivityColor(activity.type)} text-white flex items-center gap-1 px-2 py-1`}>
                  {getActivityIcon(activity.type)}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic">No recent activity found</p>
        )}
      </CardContent>
    </Card>
  );
} 