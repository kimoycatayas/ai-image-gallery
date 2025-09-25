import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    redirect("/sign-in");
  }
  return <>{children}</>;
}
