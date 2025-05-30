import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Simple redirect for /student to /student/home
  if (pathname === '/student') {
    return NextResponse.redirect(new URL('/student/home', request.url));
  }
  
  // For any other route that doesn't exist, let Next.js handle it normally
  // The 404 page will redirect to / which will then use auth-based routing
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/student',
    // Add other specific redirects here if needed
  ],
}; 