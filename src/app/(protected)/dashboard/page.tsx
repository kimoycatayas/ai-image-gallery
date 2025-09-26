import Link from "next/link";
import Image from "next/image";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface ImageRecord {
  id: string;
  filename: string;
  original_name: string;
  caption: string | null;
  storage_path: string;
  created_at: string;
  signedUrl?: string | null;
}

async function getUserImages(): Promise<ImageRecord[]> {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: images, error } = await supabase
    .from("images")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching images:", error);
    return [];
  }

  // Generate signed URLs for each image
  const imagesWithUrls = await Promise.all(
    (images || []).map(async (img) => {
      const { data } = await supabase.storage
        .from("images")
        .createSignedUrl(img.storage_path, 3600); // 1 hour expiry

      return {
        ...img,
        signedUrl: data?.signedUrl || null,
      };
    })
  );

  return imagesWithUrls;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
  const images = await getUserImages();

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

      {params?.success && (
        <div className="mb-6 rounded-md border border-green-500/40 bg-green-500/10 text-sm px-3 py-2">
          {params.success}
        </div>
      )}

      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-background/60">
                {img.signedUrl ? (
                  <Image
                    src={img.signedUrl}
                    alt={img.caption || img.original_name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-foreground/50">
                    Failed to load image
                  </div>
                )}
              </div>
              <div className="mt-3">
                <div className="text-sm text-foreground/80 font-medium truncate">
                  {img.original_name}
                </div>
                {img.caption && (
                  <div className="text-xs text-foreground/60 mt-1 line-clamp-2">
                    {img.caption}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {images.length === 0 && (
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
