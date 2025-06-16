'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  isLoading?: boolean;
  description?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  isLoading,
  description,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-1/2" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && !isLoading && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {isLoading && <Skeleton className="h-4 w-3/4 mt-1" />} 
      </CardContent>
    </Card>
  );
} 