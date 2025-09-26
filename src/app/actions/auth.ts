"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/dashboard");
}

export async function signUpWithPassword(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {},
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
