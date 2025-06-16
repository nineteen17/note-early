'use client';

import React from 'react';
import { useProfileQuery } from '@/hooks/api/profile/useProfileQuery';
import { useAdminStudentsQuery } from '@/hooks/api/admin/students/useAdminStudentsQuery';
import { usePendingReviews } from '@/hooks/api/admin/usePendingReviews';
import { StatCard } from './StatCard';
import { CreditCard, Users, CheckSquare } from 'lucide-react';

export function DashboardStats() {
  const { data: profile, isLoading: isProfileLoading } = useProfileQuery();
  const { data: students, isLoading: isStudentsLoading } = useAdminStudentsQuery();
  const { data: pendingCount, isLoading: isPendingLoading } = usePendingReviews();
  
  const totalStudents = students?.length ?? 0;
  const subscriptionStatus = profile?.subscriptionStatus === 'active' ? 'Active' : profile?.subscriptionStatus || 'Free';
  const subscriptionPlan = profile?.subscriptionPlan ? profile.subscriptionPlan.charAt(0).toUpperCase() + profile.subscriptionPlan.slice(1) : 'Free';
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatCard 
        title="Total Students" 
        value={totalStudents} 
        icon={Users} 
        isLoading={isStudentsLoading} 
        description="Students in your account"
      />
      <StatCard 
        title="Subscription Plan" 
        value={`${subscriptionPlan} (${subscriptionStatus})`} 
        icon={CreditCard} 
        isLoading={isProfileLoading} 
        description="Current subscription tier"
      />
      <StatCard 
        title="Pending Reviews" 
        value={pendingCount ?? 0} 
        icon={CheckSquare} 
        isLoading={isPendingLoading} 
        description="Completed modules awaiting review"
      />
    </div>
  );
} 