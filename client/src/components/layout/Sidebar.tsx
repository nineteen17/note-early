'use client'; // Sidebar might need client-side logic for active links eventually

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils'; // For conditional class names
import { Button } from '@/components/ui/button';
import { Home, Users, BookOpen, Settings, BarChart3, GraduationCap, LayoutGrid, BookText, ChevronDown, ChevronRight } from 'lucide-react'; // Icons
import { ProfileRole } from '@/types/api'; // Import role type
import { NoteEarlyLogo } from '@/components/NoteEarlyLogo';

interface SidebarProps {
  userRole?: ProfileRole; // Role from ProfileDTO
  isMobile?: boolean;
}

// Define a type for the navigation item structure
interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
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
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  // Add more admin links here
];

// Updated student nav items
const baseStudentNavItems: NavItem[] = [
  { href: '/student/home', label: 'Home', icon: Home },
  { href: '/student/modules', label: 'Browse Modules', icon: LayoutGrid },
  { href: '/student/progress', label: 'My Progress', icon: GraduationCap },
  { href: '/student/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/student/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ userRole, isMobile = false }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  let navItems: NavItem[] = [];

  switch (userRole) {
    case 'ADMIN':
      navItems = baseAdminNavItems;
      break;
    case 'STUDENT':
      navItems = baseStudentNavItems;
      break;
    case 'SUPER_ADMIN':
      navItems = [
        ...baseAdminNavItems, 
        { href: '/superadmin/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/superadmin/curated-modules', label: 'Curated Modules', icon: BookOpen },
      ];
      break;
    default:
      navItems = [];
  }

  const isRouteActive = (href: string, hasChildren: boolean = false) => {
    // For parent items with children, don't highlight them
    if (hasChildren) {
      return false;
    }
    
    // Handle nested routes for both student and admin paths
    if (href === '/student/modules' && pathname.startsWith('/student/modules')) {
      return true;
    }
    if (href === '/student/progress' && pathname.startsWith('/student/progress')) {
      return true;
    }
    if (href === '/student/settings' && pathname.startsWith('/student/settings')) {
      return true;
    }
    // Admin nested routes
    if (href === '/admin/home' && pathname.startsWith('/admin/home')) {
      return true;
    }
    if (href === '/admin/students' && pathname.startsWith('/admin/students')) {
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
    // Super admin nested routes
    if (href === '/superadmin/analytics' && pathname.startsWith('/superadmin/analytics')) {
      return true;
    }
    if (href === '/superadmin/curated-modules' && pathname.startsWith('/superadmin/curated-modules')) {
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
    const hasChildren = item.children && item.children.length > 0;
    const isActive = isRouteActive(item.href, hasChildren);
    const isExpanded = expandedItems.includes(item.href);

    return (
      <div key={item.href} className={cn(level > 0 && "pl-4")}>
        {hasChildren ? (
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start",
              "hover:bg-accent/10 hover:text-accent"
            )}
            onClick={() => toggleExpand(item.href)}
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
            {isExpanded ? (
              <ChevronDown className="ml-auto h-4 w-4" />
            ) : (
              <ChevronRight className="ml-auto h-4 w-4" />
            )}
          </Button>
        ) : (
          <Button
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
        )}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={cn(
      "fixed top-[60px] bottom-0 flex-col border-r bg-muted/40",
      isMobile ? "w-full" : "hidden w-64 md:flex"
    )}>
      {isMobile && (
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/student/home" className="flex items-center gap-2 font-semibold text-foreground">
            <NoteEarlyLogo />
          </Link>
        </div>
      )}
      <nav className="flex flex-col flex-1 space-y-1 overflow-auto p-4">
        {navItems.map(item => renderNavItem(item))}
      </nav>
    </aside>
  );
}