'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, Users, BookOpen, Settings, BarChart3, GraduationCap, BookText, ChevronDown, ChevronRight } from 'lucide-react';
import { ProfileRole } from '@/types/api';
import { NoteEarlyLogo } from '@/components/NoteEarlyLogo';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  userRole?: ProfileRole;
  isMobile?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

// Define role-specific base items
const baseAdminNavItems: NavItem[] = [
  { href: '/admin/home', label: 'Home', icon: Home },
  { href: '/admin/students', label: 'Students', icon: Users },
  { 
    href: '/admin/modules', 
    label: 'Modules', 
    icon: BookOpen,
    children: [
      { href: '/admin/modules', label: 'View Modules', icon: BookOpen },
      { href: '/admin/modules/create', label: 'Create Module', icon: BookText },
    ]
  },
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
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

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
    if (href === '/admin/modules' && pathname.startsWith('/admin/modules') && !pathname.includes('/create')) {
      return true;
    }
    if (href === '/admin/modules/create' && pathname.includes('/create')) {
      return true;
    }
    if (href === '/admin/settings' && pathname.startsWith('/admin/settings')) {
      return true;
    }
    // Exact match for other routes
    return pathname === href;
  };

  const toggleExpand = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const isActive = isRouteActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.href);

    return (
      <div key={item.href}>
        <Button
          asChild={!hasChildren}
          variant={isActive ? 'default' : 'ghost'}
          className={cn(
            "w-full justify-start",
            isActive 
              ? "bg-accent text-accent-foreground hover:bg-accent/90" 
              : "hover:bg-accent/10 hover:text-accent"
          )}
          onClick={hasChildren ? () => toggleExpand(item.href) : undefined}
        >
          {hasChildren ? (
            <div className="flex items-center w-full">
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
              {isExpanded ? (
                <ChevronDown className="ml-auto h-4 w-4" />
              ) : (
                <ChevronRight className="ml-auto h-4 w-4" />
              )}
            </div>
          ) : (
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Link>
          )}
        </Button>
        {hasChildren && isExpanded && (
          <div className="mt-1 pl-4">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
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
        {navItems.map(item => renderNavItem(item))}
      </nav>
    </div>
  );
} 