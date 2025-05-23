'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLogoutMutation, useLogoutStudentMutation } from '@/hooks/api/auth';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { ApiError } from '@/lib/apiClient';
import type { ProfileDTO } from "@/types/api";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, Settings, User } from 'lucide-react'; // Icons

interface UserNavProps {
  profile: ProfileDTO | null;
}

export function UserNav({ profile }: UserNavProps) {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const userRole = profile?.role;

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  
  const adminLogoutMutation = useLogoutMutation({
      onError: (error: ApiError) => {
          console.error("Admin Logout failed:", error);
          toast.error("Admin Logout failed", { description: error.message || "Could not log out. Please try again." });
      }
  });
  
  const studentLogoutMutation = useLogoutStudentMutation({
      onError: (error: ApiError) => {
          console.error("Student Logout failed:", error);
          toast.error("Student Logout failed", { description: error.message || "Could not log out. Please try again." });
      }
  });

  const logoutMutation = isAdmin ? adminLogoutMutation : studentLogoutMutation;
  const isLogoutPending = logoutMutation.isPending;

  const handleLogout = () => {
    if (isLogoutPending) return;
    console.log(`Initiating ${isAdmin ? 'Admin' : 'Student'} logout...`);
    logoutMutation.mutate();
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (!profile) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }

  const displayName = profile.fullName ?? 'User';
  const displayEmail = profile.email;
  const avatarUrl = profile.avatarUrl ?? undefined;
  const fallbackInitials = getInitials(profile.fullName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{fallbackInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {displayEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
             <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
             </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
                 <Settings className="mr-2 h-4 w-4" />
                 <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          {/* Add other links like Billing/Subscription if needed */}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={isLogoutPending}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
           {isLogoutPending && <span className="ml-auto text-xs">...</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 