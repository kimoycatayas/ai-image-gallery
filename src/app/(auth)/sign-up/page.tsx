import Link from "next/link";
import { signUpWithPassword } from "@/app/actions/auth";

export default function SignUpPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 shadow-lg backdrop-blur">
        <h1 className="text-2xl font-semibold mb-2">Create your account</h1>
        <p className="text-sm text-foreground/70 mb-6">
          Join AI Image Gallery in seconds
        </p>
        {searchParams?.error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 text-sm px-3 py-2">
            {searchParams.error}
          </div>
        )}
        <form className="space-y-4" action={signUpWithPassword}>
          <div>
            <label className="block text-sm mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border border-white/15 bg-background/60 px-3 py-2 outline-none focus:ring-2 focus:ring-foreground/30"
            />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-white/15 bg-background/60 px-3 py-2 outline-none focus:ring-2 focus:ring-foreground/30"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-foreground text-background py-2.5 font-medium hover:opacity-90 transition"
          >
            Create account
          </button>
        </form>
        <p className="text-sm text-foreground/70 mt-6">
          Already have an account?{" "}
          <Link className="underline hover:no-underline" href="/sign-in">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
