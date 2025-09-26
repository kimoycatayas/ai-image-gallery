"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function uploadImage(formData: FormData) {
  try {
    console.log("Upload action started");

    const file = formData.get("file") as File;
    const caption = formData.get("caption") as string;

    console.log("File:", file?.name, "Size:", file?.size, "Type:", file?.type);

    if (!file) {
      console.log("No file provided");
      redirect("/upload?error=" + encodeURIComponent("No file selected"));
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      console.log("Invalid file type:", file.type);
      redirect("/upload?error=" + encodeURIComponent("File must be an image"));
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      console.log("File too large:", file.size);
      redirect(
        "/upload?error=" +
          encodeURIComponent("File size must be less than 50MB")
      );
    }

    // Check environment variables
    console.log(
      "Supabase URL:",
      process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Missing"
    );
    console.log(
      "Supabase Anon Key:",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Missing"
    );

    const supabase = getSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log("User:", user?.id, "Error:", userError?.message);

    if (userError || !user) {
      console.log("User not authenticated");
      redirect("/sign-in");
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    try {
      console.log("Uploading to storage:", filePath);

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file);

      if (uploadError) {
        console.log("Storage upload error:", uploadError.message);
        redirect("/upload?error=" + encodeURIComponent(uploadError.message));
      }

      console.log("Storage upload successful, inserting to database");

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
        console.log("Database insert error:", dbError.message);
        // If database insert fails, clean up the uploaded file
        await supabase.storage.from("images").remove([filePath]);
        redirect("/upload?error=" + encodeURIComponent(dbError.message));
      }

      console.log("Upload successful!");

      // Revalidate the dashboard to show the new image
      revalidatePath("/dashboard");
      redirect(
        "/dashboard?success=" +
          encodeURIComponent("Image uploaded successfully!")
      );
    } catch (error) {
      console.log("Upload error:", error);
      redirect(
        "/upload?error=" +
          encodeURIComponent("Upload failed. Please try again.")
      );
    }
  } catch (error) {
    console.log("Outer catch error:", error);
    redirect(
      "/upload?error=" + encodeURIComponent("Upload failed. Please try again.")
    );
  }
}
