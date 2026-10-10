import { NextResponse } from 'next/server';

export function problemResponse(status: number, title: string, detail: string) {
  return NextResponse.json(
    { type: 'about:blank', title, status, detail },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}
