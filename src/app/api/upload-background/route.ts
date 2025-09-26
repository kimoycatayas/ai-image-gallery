import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { generateThumbnail, fileToBuffer } from "@/lib/image-processing";
import { analyzeImage } from "@/lib/ai-analysis";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const caption = formData.get("caption") as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    const uploadJobs = [];

    // Create upload jobs for each file
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { success: false, error: `File "${file.name}" must be an image` },
          { status: 400 }
        );
      }

      // Validate file size (10MB limit for Vercel)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return NextResponse.json(
          {
            success: false,
            error: `File "${file.name}" size must be less than 10MB`,
          },
          { status: 400 }
        );
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const baseFileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}`;
      const originalFileName = `${baseFileName}.${fileExt}`;
      const thumbnailFileName = `${baseFileName}_thumb.jpg`;

      const originalFilePath = `${user.id}/${originalFileName}`;
      const thumbnailFilePath = `${user.id}/thumbnails/${thumbnailFileName}`;

      // Create initial database record with 'uploading' status
      const { data: imageRecord, error: dbError } = await supabase
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
          processing_status: "uploading", // New status for background uploads
          upload_progress: 0,
        })
        .select()
        .single();

      if (dbError || !imageRecord) {
        console.error("Failed to create image record:", dbError);
        continue; // Skip this file and continue with others
      }

      uploadJobs.push({
        imageId: imageRecord.id,
        file: file,
        originalFilePath,
        thumbnailFilePath,
        originalFileName,
      });

      // Start background upload process for this file
      processUploadInBackground(
        imageRecord.id,
        file,
        originalFilePath,
        thumbnailFilePath,
        user.id
      );
    }

    return NextResponse.json({
      success: true,
      message: `Started background upload for ${uploadJobs.length} file(s)`,
      jobIds: uploadJobs.map((job) => job.imageId),
    });
  } catch (error) {
    console.error("Background upload error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Background upload processing function
async function processUploadInBackground(
  imageId: string,
  file: File,
  originalFilePath: string,
  thumbnailFilePath: string,
  userId: string
) {
  const supabase = getSupabaseServerClient();

  try {
    // Update status to 'processing'
    await supabase
      .from("images")
      .update({
        processing_status: "processing",
        upload_progress: 10,
      })
      .eq("id", imageId);

    // Convert file to buffer for processing
    const fileBuffer = await fileToBuffer(file);

    // Update progress
    await supabase
      .from("images")
      .update({ upload_progress: 30 })
      .eq("id", imageId);

    // Generate thumbnail
    console.log("Generating thumbnail for:", file.name);
    const thumbnailBuffer = await generateThumbnail(fileBuffer);

    // Update progress
    await supabase
      .from("images")
      .update({ upload_progress: 50 })
      .eq("id", imageId);

    // Upload original file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(originalFilePath, file);

    if (uploadError) {
      throw new Error(`Failed to upload original: ${uploadError.message}`);
    }

    // Update progress
    await supabase
      .from("images")
      .update({ upload_progress: 70 })
      .eq("id", imageId);

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
        `Failed to upload thumbnail: ${thumbnailUploadError.message}`
      );
    }

    // Update status to 'pending' for AI analysis
    await supabase
      .from("images")
      .update({
        processing_status: "pending",
        upload_progress: 90,
      })
      .eq("id", imageId);

    console.log("Upload completed for:", file.name);

    // Trigger AI analysis
    await processAIAnalysisInBackground(imageId, originalFilePath, userId);
  } catch (error) {
    console.error("Background upload failed:", error);

    // Update status to failed and clean up
    await supabase
      .from("images")
      .update({
        processing_status: "failed",
        ai_analysis_error: `Upload failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        upload_progress: 0,
      })
      .eq("id", imageId);

    // Clean up any uploaded files
    try {
      await supabase.storage
        .from("images")
        .remove([originalFilePath, thumbnailFilePath]);
    } catch (cleanupError) {
      console.error("Cleanup failed:", cleanupError);
    }
  }
}

// Background AI analysis processing function
async function processAIAnalysisInBackground(
  imageId: string,
  originalFilePath: string,
  _userId: string
) {
  const supabase = getSupabaseServerClient();

  try {
    // Update status to AI processing
    await supabase
      .from("images")
      .update({
        processing_status: "ai_processing",
        upload_progress: 95,
      })
      .eq("id", imageId);

    // Get signed URL for AI analysis
    const { data: signedUrlData } = await supabase.storage
      .from("images")
      .createSignedUrl(originalFilePath, 3600); // 1 hour expiry

    if (!signedUrlData?.signedUrl) {
      throw new Error("Failed to create signed URL for AI analysis");
    }

    console.log("Starting AI analysis for image:", imageId);

    // Call AI analysis function directly (no HTTP request needed)
    const analysisResult = await analyzeImage(signedUrlData.signedUrl);

    if (analysisResult.success) {
      // Update database with completion and AI results
      await supabase
        .from("images")
        .update({
          processing_status: "completed",
          upload_progress: 100,
          tags: analysisResult.tags,
          description: analysisResult.description,
          dominant_colors: analysisResult.dominantColors,
          ai_analysis_error: null,
          analyzed_at: new Date().toISOString(),
        })
        .eq("id", imageId);

      console.log("AI analysis completed for image:", imageId);
    } else {
      throw new Error(analysisResult.error || "AI analysis failed");
    }
  } catch (error) {
    console.error("AI analysis failed:", error);

    // Update status to failed
    await supabase
      .from("images")
      .update({
        processing_status: "failed",
        ai_analysis_error: `AI analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        upload_progress: 100, // Keep at 100% since upload succeeded
      })
      .eq("id", imageId);
  }
}
