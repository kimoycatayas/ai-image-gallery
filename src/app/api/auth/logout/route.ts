import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();

  const response = NextResponse.json({ ok: true });

  // Clear auth cookies
  response.cookies.set("sb-access-token", "", {
    expires: new Date(0),
    path: "/",
  });
  response.cookies.set("sb-refresh-token", "", {
    expires: new Date(0),
    path: "/",
  });

  return response;
}
