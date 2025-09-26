"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateThumbnail, fileToBuffer } from "@/lib/image-processing";
import { analyzeImage } from "@/lib/ai-analysis";

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
    const baseFileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}`;
    const originalFileName = `${baseFileName}.${fileExt}`;
    const thumbnailFileName = `${baseFileName}_thumb.jpg`; // Always JPEG for thumbnails

    const originalFilePath = `${user.id}/${originalFileName}`;
    const thumbnailFilePath = `${user.id}/thumbnails/${thumbnailFileName}`;

    // Convert file to buffer for processing
    const fileBuffer = await fileToBuffer(file);

    // Generate thumbnail
    console.log("Generating thumbnail for:", file.name);
    const thumbnailBuffer = await generateThumbnail(fileBuffer);

    // Upload original file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(originalFilePath, file);

    if (uploadError) {
      throw new Error(
        `Failed to upload "${file.name}": ${uploadError.message}`
      );
    }

    // Upload thumbnail to Supabase Storage
    const { error: thumbnailUploadError } = await supabase.storage
      .from("images")
      .upload(thumbnailFilePath, thumbnailBuffer, {
        contentType: "image/jpeg",
      });

    if (thumbnailUploadError) {
      // Clean up original file if thumbnail upload fails
      await supabase.storage.from("images").remove([originalFilePath]);
      throw new Error(
        `Failed to upload thumbnail for "${file.name}": ${thumbnailUploadError.message}`
      );
    }

    // Insert record into database
    const { data: insertedImage, error: dbError } = await supabase
      .from("images")
      .insert({
        user_id: user.id,
        filename: originalFileName,
        original_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: originalFilePath,
        thumbnail_url: thumbnailFilePath,
        caption: caption || null,
        processing_status: "pending", // Set initial AI processing status
      })
      .select()
      .single();

    if (dbError || !insertedImage) {
      // Clean up uploaded files if database insert fails
      await supabase.storage
        .from("images")
        .remove([originalFilePath, thumbnailFilePath]);
      throw new Error(
        `Failed to save "${file.name}" to database: ${dbError?.message}`
      );
    }

    console.log("Single upload successful for:", file.name);

    // Trigger AI analysis in the background (non-blocking)
    try {
      // Get signed URL for AI analysis
      const { data: signedUrlData } = await supabase.storage
        .from("images")
        .createSignedUrl(originalFilePath, 3600); // 1 hour expiry

      if (signedUrlData?.signedUrl) {
        console.log("Starting AI analysis for:", file.name);

        // Update status to processing
        await supabase
          .from("images")
          .update({ processing_status: "processing" })
          .eq("id", insertedImage.id);

        // Run AI analysis directly
        const analysisResult = await analyzeImage(signedUrlData.signedUrl);

        if (analysisResult.success) {
          // Update database with AI analysis results
          await supabase
            .from("images")
            .update({
              tags: analysisResult.tags,
              description: analysisResult.description,
              dominant_colors: analysisResult.dominantColors,
              processing_status: "completed",
              ai_analysis_error: null,
              analyzed_at: new Date().toISOString(),
            })
            .eq("id", insertedImage.id);

          console.log("AI analysis completed for:", file.name);
        } else {
          // Update database with error status
          await supabase
            .from("images")
            .update({
              processing_status: "failed",
              ai_analysis_error: analysisResult.error || "AI analysis failed",
            })
            .eq("id", insertedImage.id);

          console.error(
            "AI analysis failed for:",
            file.name,
            analysisResult.error
          );
        }
      }
    } catch (error) {
      console.error("Error in AI analysis:", error);
      // Update status to failed
      try {
        await supabase
          .from("images")
          .update({
            processing_status: "failed",
            ai_analysis_error:
              error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", insertedImage.id);
      } catch (updateError) {
        console.error("Failed to update error status:", updateError);
      }
    }

    return { success: true, filename: file.name, imageId: insertedImage.id };
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
