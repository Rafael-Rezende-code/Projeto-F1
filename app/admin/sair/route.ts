import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(request: NextRequest) {
  if (isSupabaseConfigured()) await (await createSessionClient()).auth.signOut();
  return NextResponse.redirect(new URL("/admin/entrar", request.url), { status: 303 });
}
