"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function uploadSingleImage(file: File, caption?: string) {
  try {
    console.log("Single upload started for:", file.name);

    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new Error(`File "${file.name}" must be an image`);
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error(`File "${file.name}" size must be less than 50MB`);
    }

    const supabase = getSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(
        `Failed to upload "${file.name}": ${uploadError.message}`
      );
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
      // Clean up uploaded file if database insert fails
      await supabase.storage.from("images").remove([filePath]);
      throw new Error(
        `Failed to save "${file.name}" to database: ${dbError.message}`
      );
    }

    console.log("Single upload successful for:", file.name);
    return { success: true, filename: file.name };
  } catch (error) {
    console.error("Single upload error:", error);
    throw error;
  }
}

export async function uploadImage(formData: FormData) {
  try {
    console.log("Upload action started");

    const files = formData.getAll("files") as File[];
    const caption = formData.get("caption") as string;

    console.log("Files:", files.length, "files selected");

    if (!files || files.length === 0) {
      console.log("No files provided");
      redirect("/upload?error=" + encodeURIComponent("No files selected"));
    }

    // Validate all files
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        console.log("Invalid file type:", file.type);
        redirect(
          "/upload?error=" +
            encodeURIComponent(`File "${file.name}" must be an image`)
        );
      }

      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        console.log("File too large:", file.size);
        redirect(
          "/upload?error=" +
            encodeURIComponent(
              `File "${file.name}" size must be less than 50MB`
            )
        );
      }
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

    const uploadResults = [];
    const uploadedPaths = [];

    // Process each file
    for (const file of files) {
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
          // Clean up any previously uploaded files
          if (uploadedPaths.length > 0) {
            await supabase.storage.from("images").remove(uploadedPaths);
          }
          redirect(
            "/upload?error=" +
              encodeURIComponent(
                `Failed to upload "${file.name}": ${uploadError.message}`
              )
          );
        }

        uploadedPaths.push(filePath);
        console.log("Storage upload successful for:", file.name);

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
          // Clean up all uploaded files if database insert fails
          await supabase.storage.from("images").remove(uploadedPaths);
          redirect(
            "/upload?error=" +
              encodeURIComponent(
                `Failed to save "${file.name}" to database: ${dbError.message}`
              )
          );
        }

        uploadResults.push({ filename: file.name, success: true });
        console.log("Database insert successful for:", file.name);
      } catch (fileError) {
        console.log("File upload error:", fileError);
        // Clean up any previously uploaded files
        if (uploadedPaths.length > 0) {
          await supabase.storage.from("images").remove(uploadedPaths);
        }
        redirect(
          "/upload?error=" +
            encodeURIComponent(
              `Failed to upload "${file.name}". Please try again.`
            )
        );
      }
    }

    console.log("All uploads successful!");

    // Revalidate pages to show the new images
    revalidatePath("/dashboard");
    revalidatePath("/");
    redirect(
      "/?success=" +
        encodeURIComponent(
          `${files.length} image${
            files.length > 1 ? "s" : ""
          } uploaded successfully!`
        )
    );
  } catch (error) {
    console.log("Outer catch error:", error);
    redirect(
      "/upload?error=" + encodeURIComponent("Upload failed. Please try again.")
    );
  }
}
