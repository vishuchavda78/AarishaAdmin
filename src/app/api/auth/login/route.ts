import { NextRequest, NextResponse } from "next/server";
import { signJWT } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // 1. Validate input presence
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }
    
    // 2. Fetch configured credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      console.error("Admin credentials are not configured in environment variables.");
      return NextResponse.json(
        { error: "Server authentication error. Credentials missing." },
        { status: 500 }
      );
    }
    
    // 3. Verify credentials
    if (email.toLowerCase() === adminEmail.toLowerCase() && password === adminPassword) {
      // Create JWT session token (expires in 1 day)
      const token = await signJWT({ email: adminEmail }, 60 * 60 * 24);
      
      // Create a response and set the http-only cookie
      const response = NextResponse.json({ success: true, message: "Login successful" });
      
      response.cookies.set("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 1 day
        path: "/",
      });
      
      return response;
    }
    
    // Invalid credentials
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
    
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
