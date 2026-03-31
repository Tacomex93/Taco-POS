import { NextRequest, NextResponse } from 'next/server';

// Rutas que NO requieren autenticación
const PUBLIC_PATHS = ['/login'];

// Rutas de API y assets que siempre pasan
const SKIP_PREFIXES = ['/api/', '/_next/', '/favicon.ico', '/public/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dejar pasar assets y API
  if (SKIP_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Dejar pasar rutas públicas
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // El middleware corre en el edge (sin acceso a localStorage).
  // Usamos una cookie que el login establece como señal de sesión.
  const session = request.cookies.get('pos_session');

  if (!session?.value) {
    const loginUrl = new URL('/login', request.url);
    // Guardar la ruta original para redirigir después del login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Aplica a todas las rutas excepto archivos estáticos
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
};
