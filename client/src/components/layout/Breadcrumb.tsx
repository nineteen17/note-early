import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex flex-wrap items-center gap-1 text-xs md:text-sm text-muted-foreground", className)}>
      <Link href="/student/home" className="hover:text-foreground transition-colors">
        <Home className="h-3 w-3 md:h-4 md:w-4" />
      </Link>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          <ChevronRight className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
          {item.href ? (
            <Link 
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
} 