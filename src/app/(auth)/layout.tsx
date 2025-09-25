import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
