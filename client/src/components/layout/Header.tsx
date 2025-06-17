import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { UserNav } from './UserNav';
import { ThemeToggle } from './ThemeToggle';
import { HelpToggleIcon } from '@/components/ui/help-toggle';
import { SidebarNav } from './SidebarNav';
import { NoteEarlyLogo } from '@/components/NoteEarlyLogo';
import type { ProfileDTO } from '@/types/api';

interface HeaderProps {
  profile?: ProfileDTO | null;
}

export function Header({ profile }: HeaderProps) {
  // Determine the correct home route based on user role
  const getHomeRoute = () => {
    if (!profile) return '/';
    switch (profile.role) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return '/admin/home';
      case 'STUDENT':
        return '/student/home';
      default:
        return '/';
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-primary/95 dark:bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-primary/98 supports-[backdrop-filter]:dark:bg-primary/80 px-4 text-primary-foreground lg:h-[60px] lg:px-6">
      
      {/* Mobile Nav Toggle - Only on small screens */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden hover:bg-primary/80"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0"> {/* Mobile Drawer */}
           {/* Accessibility additions */}
           <SheetHeader className="sr-only"> {/* Hide header visually */}
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>
                 Select a page to navigate to using the links below.
              </SheetDescription>
           </SheetHeader>
           
           {/* Render SidebarNav directly */}
           <SidebarNav userRole={profile?.role} isMobile={true} />
        </SheetContent>
      </Sheet>

      {/* Desktop Logo Wrapper - Hidden on mobile */}
      <div className="hidden items-center md:flex md:mr-auto"> {/* Hide below md */} 
          <Link href={getHomeRoute()} className="flex items-center gap-2 font-semibold">
             <NoteEarlyLogo />
          </Link>
      </div>
       
       {/* Right side items */}
       <div className="ml-auto flex items-center gap-2"> 
          <HelpToggleIcon />
          <ThemeToggle />
          <UserNav profile={profile || null} />
       </div>
    </header>
  );
} 