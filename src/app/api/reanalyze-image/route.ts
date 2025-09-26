import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { analyzeImage } from "@/lib/ai-analysis";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();

  try {
    const { imageId } = await request.json();

    if (!imageId) {
      return NextResponse.json(
        { error: "Image ID is required" },
        { status: 400 }
      );
    }

    console.log(`Starting re-analysis for image ID: ${imageId}`);

    // Get the image record to find the storage path
    const { data: imageRecord, error: fetchError } = await supabase
      .from("images")
      .select("id, storage_path, original_name")
      .eq("id", imageId)
      .single();

    if (fetchError || !imageRecord) {
      console.error(`Image not found: ${imageId}`, fetchError);
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Get signed URL for the image
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("images")
      .createSignedUrl(imageRecord.storage_path, 3600); // 1 hour expiry

    if (urlError || !signedUrlData?.signedUrl) {
      console.error(
        `Failed to create signed URL for image ${imageId}:`,
        urlError
      );
      return NextResponse.json(
        { error: "Failed to access image file" },
        { status: 500 }
      );
    }

    // Update status to 'processing'
    const { error: statusUpdateError } = await supabase
      .from("images")
      .update({
        processing_status: "processing",
        ai_analysis_error: null, // Clear any previous error
      })
      .eq("id", imageId);

    if (statusUpdateError) {
      console.error(
        `Failed to update status to processing for image ${imageId}:`,
        statusUpdateError
      );
      return NextResponse.json(
        { error: "Failed to update image status" },
        { status: 500 }
      );
    }

    // Revalidate dashboard to show "processing" status immediately
    revalidatePath("/dashboard");
    revalidatePath("/");

    // Perform AI analysis
    console.log(`Running AI analysis for image: ${imageRecord.original_name}`);
    const analysisResult = await analyzeImage(signedUrlData.signedUrl);

    if (analysisResult.success) {
      // Update database with AI analysis results
      const { error: dbUpdateError } = await supabase
        .from("images")
        .update({
          tags: analysisResult.tags,
          description: analysisResult.description,
          dominant_colors: analysisResult.dominantColors,
          processing_status: "completed",
          ai_analysis_error: null,
          analyzed_at: new Date().toISOString(),
        })
        .eq("id", imageId);

      if (dbUpdateError) {
        console.error(
          `Error updating database for image ${imageId}:`,
          dbUpdateError
        );

        // Set status to failed if DB update fails
        await supabase
          .from("images")
          .update({
            processing_status: "failed",
            ai_analysis_error: `Database update failed: ${dbUpdateError.message}`,
          })
          .eq("id", imageId);

        return NextResponse.json(
          { error: "Failed to save AI analysis results" },
          { status: 500 }
        );
      }

      console.log(
        `Re-analysis completed successfully for image ID: ${imageId}`
      );

      // Revalidate dashboard to show updated results
      revalidatePath("/dashboard");
      revalidatePath("/");

      return NextResponse.json({
        status: "success",
        imageId,
        message: "Image re-analyzed successfully",
        results: {
          tags: analysisResult.tags,
          description: analysisResult.description,
          dominantColors: analysisResult.dominantColors,
        },
      });
    } else {
      // Update database with error status
      const { error: errorUpdateError } = await supabase
        .from("images")
        .update({
          processing_status: "failed",
          ai_analysis_error: analysisResult.error || "AI re-analysis failed",
        })
        .eq("id", imageId);

      if (errorUpdateError) {
        console.error(
          `Failed to update error status for image ${imageId}:`,
          errorUpdateError
        );
      }

      console.error(
        `Re-analysis failed for image ID: ${imageId}`,
        analysisResult.error
      );

      // Revalidate dashboard to show failed status
      revalidatePath("/dashboard");
      revalidatePath("/");

      return NextResponse.json(
        {
          error: "AI re-analysis failed",
          details: analysisResult.error,
          imageId,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Re-analysis API route error:", error);

    // Attempt to update status to 'failed' if an error occurs
    const { imageId } = await request.json().catch(() => ({ imageId: null }));
    if (imageId) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await supabase
        .from("images")
        .update({
          processing_status: "failed",
          ai_analysis_error: `Re-analysis error: ${errorMessage}`,
        })
        .eq("id", imageId)
        .catch((dbError) =>
          console.error(
            `Failed to update image ${imageId} status to failed:`,
            dbError
          )
        );

      // Revalidate dashboard to show failed status
      revalidatePath("/dashboard");
      revalidatePath("/");
    }

    return NextResponse.json(
      {
        error: "Re-analysis failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
