import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/socket")) {
    console.log("Socket.IO request intercepted")
    return NextResponse.next()
  }
}

