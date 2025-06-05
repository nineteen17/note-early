'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, Users, BookOpen, Settings, BarChart3, GraduationCap, BookText } from 'lucide-react';
import { ProfileRole } from '@/types/api';
import { NoteEarlyLogo } from '@/components/NoteEarlyLogo';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  userRole?: ProfileRole;
  isMobile?: boolean; // To adjust behavior/styling if needed in mobile sheet
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Define role-specific base items
const baseAdminNavItems: NavItem[] = [
  { href: '/admin/home', label: 'Home', icon: Home },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/modules', label: 'Modules', icon: BookOpen },
];
const baseStudentNavItems: NavItem[] = [
  { href: '/student/home', label: 'Home', icon: Home },
  { href: '/student/modules', label: 'Browse Modules', icon: BookOpen },
  { href: '/student/progress', label: 'My Progress', icon: GraduationCap },
  { href: '/student/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/student/settings', label: 'Settings', icon: Settings },
];

export function SidebarNav({ userRole, isMobile = false }: SidebarNavProps) {
  const pathname = usePathname();
  let navItems: NavItem[] = [];

  switch (userRole) {
    case 'ADMIN':
      navItems = [
        ...baseAdminNavItems,
        { href: '/admin/settings', label: 'Settings', icon: Settings },
      ];
      break;
    case 'STUDENT':
      navItems = [
        ...baseStudentNavItems,
      ];
      break;
    case 'SUPER_ADMIN':
      navItems = [
        ...baseAdminNavItems,
        { href: '/superadmin/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/superadmin/curated-modules', label: 'Curated Modules', icon: BookOpen },
        { href: '/admin/settings', label: 'Settings', icon: Settings },
      ];
      break;
    default:
      navItems = [];
  }

  const isRouteActive = (href: string) => {
    // Handle nested routes
    if (href === '/student/modules' && pathname.startsWith('/student/modules')) {
      return true;
    }
    if (href === '/student/progress' && pathname.startsWith('/student/progress')) {
      return true;
    }
    if (href === '/student/settings' && pathname.startsWith('/student/settings')) {
      return true;
    }
    if (href === '/admin/modules' && pathname.startsWith('/admin/modules')) {
      return true;
    }
    if (href === '/admin/settings' && pathname.startsWith('/admin/settings')) {
      return true;
    }
    // Exact match for other routes
    return pathname === href;
  };

  return (
    <div className={`flex flex-col flex-1 overflow-auto ${isMobile ? '' : ''}`}>
      {isMobile && (
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/student/home" className="flex items-center gap-2 font-semibold text-foreground">
            <NoteEarlyLogo />
          </Link>
        </div>
      )}

      <nav className={`flex-1 space-y-1 ${isMobile ? 'p-4' : 'p-4'}`}>
        {navItems.map((item) => {
          const isActive = isRouteActive(item.href);
          return (
            <Button
              key={item.href}
              asChild
              variant={isActive ? 'default' : 'ghost'}
              className={cn(
                "w-full justify-start",
                isActive 
                  ? "bg-accent text-accent-foreground hover:bg-accent/90" 
                  : "hover:bg-accent/10 hover:text-accent"
              )}
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </nav>
    </div>
  );
} 