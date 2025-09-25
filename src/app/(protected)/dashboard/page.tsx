import Link from "next/link";
import Image from "next/image";

const demoImages = [
  { id: 1, src: "/next.svg", title: "Next Logo" },
  { id: 2, src: "/vercel.svg", title: "Vercel" },
  { id: 3, src: "/globe.svg", title: "Globe" },
  { id: 4, src: "/window.svg", title: "Window" },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen p-6">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Your gallery</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/upload"
            className="rounded-lg bg-foreground text-background px-4 py-2 font-medium hover:opacity-90 transition"
          >
            Upload image
          </Link>
        </div>
      </header>

      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {demoImages.map((img) => (
            <div
              key={img.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-background/60">
                <Image
                  src={img.src}
                  alt={img.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                  className="object-contain p-6 dark:invert"
                />
              </div>
              <div className="mt-3 text-sm text-foreground/80">{img.title}</div>
            </div>
          ))}
        </div>
        {demoImages.length === 0 && (
          <div className="text-center text-foreground/70 py-16">
            No images yet.{" "}
            <Link href="/upload" className="underline">
              Upload one
            </Link>
            .
          </div>
        )}
      </section>
    </main>
  );
}
