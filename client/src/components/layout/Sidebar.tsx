'use client'; // Sidebar might need client-side logic for active links eventually

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils'; // For conditional class names
import { Button } from '@/components/ui/button';
import { Home, Users, BookOpen, Settings, BarChart3, GraduationCap } from 'lucide-react'; // Icons
import { ProfileRole } from '@/types/api'; // Import role type

interface SidebarProps {
  userRole?: ProfileRole; // Role from ProfileDTO
}

// Define a type for the navigation item structure
interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType; // Lucide icons are components
}

// Define role-specific base items
const baseAdminNavItems: NavItem[] = [
  { href: '/admin/home', label: 'Home', icon: Home },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/modules', label: 'Modules', icon: BookOpen },
  // Add more admin links here
];

const baseStudentNavItems: NavItem[] = [
  { href: '/student/home', label: 'Home', icon: Home },
  { href: '/student/progress', label: 'My Progress', icon: GraduationCap },
  // Add more student links here
];

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  let navItems: NavItem[] = []; // Initialize empty

  switch (userRole) {
    case 'ADMIN':
      navItems = [
        ...baseAdminNavItems,
        // Single Settings link is correct
        { href: '/admin/settings/profile', label: 'Settings', icon: Settings }, 
      ];
      break;
    case 'STUDENT':
      navItems = [
        ...baseStudentNavItems,
        // No settings link for students for now
      ];
      break;
    case 'SUPER_ADMIN':
      navItems = [
        ...baseAdminNavItems, // Start with admin links
        { href: '/superadmin/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/superadmin/curated-modules', label: 'Curated Modules', icon: BookOpen },
        // Single Settings link is correct
        { href: '/admin/settings/profile', label: 'Settings', icon: Settings }, 
      ];
      break;
    default:
      navItems = []; // No items if role is unknown
  }

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-muted/40">
      <nav className="flex flex-col flex-1 space-y-1 overflow-auto p-4">
        {navItems.map((item) => {
          // Updated isActive check to handle the base /admin/settings path and sub-paths
          const isActive = pathname.startsWith('/admin/settings') && item.href.startsWith('/admin/settings') 
              || pathname === item.href;
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
        {/* Removed Sign Out button - should be handled in UserNav */}
      </nav>
    </aside>
  );
} 