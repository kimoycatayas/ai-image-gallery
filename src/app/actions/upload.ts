"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function uploadImage(formData: FormData) {
  const file = formData.get("file") as File;
  const caption = formData.get("caption") as string;

  if (!file) {
    redirect("/upload?error=" + encodeURIComponent("No file selected"));
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    redirect("/upload?error=" + encodeURIComponent("File must be an image"));
  }

  // Validate file size (50MB limit)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    redirect(
      "/upload?error=" + encodeURIComponent("File size must be less than 50MB")
    );
  }

  const supabase = getSupabaseServerClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/sign-in");
  }

  // Generate unique filename
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2)}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;

  try {
    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, file);

    if (uploadError) {
      redirect("/upload?error=" + encodeURIComponent(uploadError.message));
    }

    // Insert record into database
    const { error: dbError } = await supabase.from("images").insert({
      user_id: user.id,
      filename: fileName,
      original_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: filePath,
      caption: caption || null,
    });

    if (dbError) {
      // If database insert fails, clean up the uploaded file
      await supabase.storage.from("images").remove([filePath]);
      redirect("/upload?error=" + encodeURIComponent(dbError.message));
    }

    // Revalidate the dashboard to show the new image
    revalidatePath("/dashboard");
    redirect(
      "/dashboard?success=" + encodeURIComponent("Image uploaded successfully!")
    );
  } catch (error) {
    redirect(
      "/upload?error=" + encodeURIComponent("Upload failed. Please try again.")
    );
  }
}
