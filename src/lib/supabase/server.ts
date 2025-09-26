import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async get(name: string) {
        return (await cookies()).get(name)?.value;
      },
      async set(name: string, value: string, options: Record<string, unknown>) {
        try {
          (await cookies()).set({ name, value, ...options });
        } catch {
          // noop: readonly cookies in some contexts (e.g., middleware) will throw
        }
      },
      async remove(name: string, options: Record<string, unknown>) {
        try {
          (await cookies()).set({ name, value: "", ...options, maxAge: 0 });
        } catch {
          // noop
        }
      },
    },
  });
}
