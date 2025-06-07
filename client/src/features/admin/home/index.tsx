'use client';

import React from 'react';
import { useProfileQuery } from '@/hooks/api/profile/useProfileQuery';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, BookOpen, Users, CheckSquare } from 'lucide-react'; // Icons for cards
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
// Placeholder Stat Card component
const StatCard = ({
  title,
  value,
  icon: Icon,
  isLoading,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  isLoading?: boolean;
  description?: string;
}) => (
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

export function AdminHome() {
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useProfileQuery();
  
  // TODO: Fetch actual stats data when hooks/APIs are ready
  const isLoadingStats = false; // Placeholder
  const totalStudents = '-'; // Placeholder
  const activeModules = '-'; // Placeholder
  const pendingSummaries = '-'; // Placeholder

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          {isProfileLoading ? (
            <Skeleton className="h-8 w-1/3" />
          ) : profileError ? (
            <span className="text-xl font-semibold text-destructive">Error loading profile</span>
          ) : (
            <h1 className="text-2xl font-semibold">
              Welcome back, {profile?.fullName || 'Admin'}!
            </h1>
          )}
        </div>

        {/* Stat Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard 
            title="Total Students" 
            value={totalStudents} 
            icon={Users} 
            isLoading={isLoadingStats} 
            description="Number of active students"
          />
          <StatCard 
            title="Active Modules" 
            value={activeModules} 
            icon={BookOpen} 
            isLoading={isLoadingStats} 
            description="Curated & custom modules available"
          />
          <StatCard 
            title="Pending Summaries" 
            value={pendingSummaries} 
            icon={CheckSquare} 
            isLoading={isLoadingStats} 
            description="Summaries awaiting review"
          />
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest student progress and module updates.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground italic">Recent activity feed coming soon...</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
              <CardDescription>Navigate to key sections.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button variant="outline" asChild><Link href="/admin/students">Manage Students</Link></Button>
              <Button variant="outline" asChild><Link href="/admin/modules">Manage Modules</Link></Button>
              <Button variant="outline" asChild><Link href="/settings">Account Settings</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
} 