import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-lg">
        <h1 className="text-4xl font-semibold mb-3">404</h1>
        <p className="text-foreground/80 mb-6">
          The page you’re looking for doesn’t exist or was moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-foreground text-background px-4 py-2 font-medium hover:opacity-90 transition"
          >
            Go to dashboard
          </Link>
          <Link href="/" className="text-sm underline hover:no-underline">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
