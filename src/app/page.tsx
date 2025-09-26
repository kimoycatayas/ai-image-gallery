import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;

  if (params?.success) {
    // Redirect to dashboard with success message
    redirect(`/dashboard?success=${encodeURIComponent(params.success)}`);
  }

  redirect("/dashboard");
}
