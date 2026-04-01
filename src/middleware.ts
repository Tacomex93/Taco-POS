import { NextRequest, NextResponse } from 'next/server';

// Middleware mínimo — solo deja pasar todo.
// La autenticación se maneja en el cliente via localStorage en cada página.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
