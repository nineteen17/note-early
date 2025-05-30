'use client'; // Sidebar might need client-side logic for active links eventually

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils'; // For conditional class names
import { Button } from '@/components/ui/button';
import { Home, Users, BookOpen, Settings, BarChart3, GraduationCap, LayoutGrid } from 'lucide-react'; // Icons
import { ProfileRole } from '@/types/api'; // Import role type

interface SidebarProps {
  userRole?: ProfileRole; // Role from ProfileDTO
}

// Define a type for the navigation item structure
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
  // Add more admin links here
];

// Updated student nav items
const baseStudentNavItems: NavItem[] = [
  { href: '/student/home', label: 'Home', icon: Home },
  { href: '/student/modules', label: 'Browse Modules', icon: LayoutGrid },
  { href: '/student/progress', label: 'My Progress', icon: GraduationCap },
  { href: '/student/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  let navItems: NavItem[] = [];

  switch (userRole) {
    case 'ADMIN':
      navItems = [
        ...baseAdminNavItems,
        { href: '/admin/settings/profile', label: 'Settings', icon: Settings }, 
      ];
      break;
    case 'STUDENT':
      navItems = baseStudentNavItems;
      break;
    case 'SUPER_ADMIN':
      navItems = [
        ...baseAdminNavItems, 
        { href: '/superadmin/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/superadmin/curated-modules', label: 'Curated Modules', icon: BookOpen },
        { href: '/admin/settings/profile', label: 'Settings', icon: Settings }, 
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
    <aside className="fixed top-[60px] bottom-0 hidden w-64 flex-col border-r bg-muted/40 md:flex">
      <nav className="flex flex-col flex-1 space-y-1 overflow-auto p-4">
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
    </aside>
  );
} 