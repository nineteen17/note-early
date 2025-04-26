'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, Users, BookOpen, Settings, BarChart3, GraduationCap, BookText } from 'lucide-react';
import { ProfileRole } from '@/types/api';

interface SidebarNavProps {
  userRole?: ProfileRole;
  isMobile?: boolean; // To adjust behavior/styling if needed in mobile sheet
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

// Define role-specific base items
const baseAdminNavItems: NavItem[] = [
  { href: '/admin/home', label: 'Home', icon: Home },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/modules', label: 'Modules', icon: BookOpen },
];
const baseStudentNavItems: NavItem[] = [
  { href: '/student/home', label: 'Home', icon: Home },
  { href: '/student/progress', label: 'My Progress', icon: GraduationCap },
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

  return (
    <div className={`flex flex-col flex-1 overflow-auto ${isMobile ? '' : ''}`}>
      {isMobile && (
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/admin/home" className="flex items-center gap-2 font-semibold text-foreground">
            <BookText className="h-6 w-6" />
            <span>NoteEarly</span>
          </Link>
        </div>
      )}

      <nav className={`flex-1 space-y-1 ${isMobile ? 'p-4' : 'p-4'}`}>
        {navItems.map((item) => {
          const isActive = item.href === '/admin/settings'
              ? pathname.startsWith('/admin/settings')
              : pathname === item.href;
          return (
            <Button
              key={item.href}
              asChild
              variant={isActive ? 'secondary' : 'ghost'}
              className="w-full justify-start"
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          );
        })}

        <div className={`mt-auto ${isMobile ? '' : ''}`}>
          <Button variant="outline" className="w-full justify-start">
            Sign Out
          </Button>
        </div>
      </nav>
    </div>
  );
} 