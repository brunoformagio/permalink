import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Define public routes that don't require whitelist
  const publicRoutes = [
    '/',
    '/api',
    '/_next',
    '/favicon.ico',
    '/banner.png',
    '/permalink-logo-symbol.svg',
    '/team',
    '/globals.css'
  ];
  
  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route) || pathname === route
  );
  
  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // For protected routes, we'll redirect to landing page with a query parameter
  // The actual whitelist check will be done client-side since we need wallet connection
  const url = request.nextUrl.clone();
  
  // If accessing a protected route, redirect to landing page with return URL
  if (pathname !== '/') {
    url.pathname = '/';
    url.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 