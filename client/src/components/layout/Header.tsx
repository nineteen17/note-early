import React from 'react';
import Link from 'next/link'; // Added Link import
import { ThemeToggle } from './ThemeToggle';
import { UserNav } from './UserNav'; // Import UserNav
import type { ProfileDTO } from "@/types/api"; // <<< Import ProfileDTO type
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger, 
  SheetHeader,    // <-- Add import
  SheetTitle,     // <-- Add import
  SheetDescription // <-- Add import
} from "@/components/ui/sheet"; // Import Sheet components
import { Button } from "@/components/ui/button"; // Import Button
import { Menu, BookText } from "lucide-react"; // Import Menu icon and maybe logo icon
import { SidebarNav } from './SidebarNav'; 

// <<< Define props interface >>>
interface HeaderProps {
  profile: ProfileDTO | null;
  isProfileLoading?: boolean;
}

export function Header({ profile }: HeaderProps) { // <<< Use props
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-primary px-4 text-primary-foreground lg:h-[60px] lg:px-6">
      
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
          <Link href="/admin/home" className="flex items-center gap-2 font-semibold">
             <BookText className="h-6 w-6" /> 
             {/* Text always visible when container is */}
             <span>NoteEarly</span> 
          </Link>
      </div>
       
       {/* Right side items */}
       <div className="ml-auto flex items-center gap-4"> 
          <ThemeToggle />
          <UserNav profile={profile} />
       </div>
    </header>
  );
} 