"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  // Hide navbar on auth pages
  if (pathname === "/sign-in" || pathname === "/sign-up") {
    return null;
  }

  async function handleConfirmLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setShowConfirm(false);
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <header className="border-b border-white/10 bg-white/5 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-semibold">
          AI Image Gallery
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/dashboard"
            className="hover:underline hover:underline-offset-4"
          >
            Dashboard
          </Link>
          <Link
            href="/upload"
            className="hover:underline hover:underline-offset-4"
          >
            Upload
          </Link>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="text-sm underline hover:no-underline"
          >
            Logout
          </button>
        </nav>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowConfirm(false)}
          />
          <div className="relative w-full max-w-sm rounded-xl border border-white/10 bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-2">Confirm logout</h2>
            <p className="text-sm text-foreground/70 mb-4">
              Are you sure you want to log out?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 rounded-md border border-white/15 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-3 py-1.5 rounded-md bg-foreground text-background hover:opacity-90"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
