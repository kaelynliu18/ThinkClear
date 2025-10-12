import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/'
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: request.url });
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
