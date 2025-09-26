import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { analyzeImage } from "@/lib/ai-analysis";

export async function POST(request: NextRequest) {
  try {
    console.log("AI analysis API route called");

    // Parse request body
    const { imageId, imageUrl } = await request.json();

    if (!imageId || !imageUrl) {
      return NextResponse.json(
        { error: "Missing imageId or imageUrl" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Get current user to verify ownership
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Verify the image belongs to the current user
    const { data: imageRecord, error: imageError } = await supabase
      .from("images")
      .select("id, user_id, original_name")
      .eq("id", imageId)
      .eq("user_id", user.id)
      .single();

    if (imageError || !imageRecord) {
      return NextResponse.json(
        { error: "Image not found or access denied" },
        { status: 404 }
      );
    }

    // Update status to processing
    await supabase
      .from("images")
      .update({ processing_status: "processing" })
      .eq("id", imageId);

    console.log(`Starting AI analysis for image: ${imageRecord.original_name}`);

    // Perform AI analysis
    const analysisResult = await analyzeImage(imageUrl);

    if (analysisResult.success) {
      // Update database with AI analysis results
      const { error: updateError } = await supabase
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

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      console.log(
        `AI analysis completed for image: ${imageRecord.original_name}`
      );

      return NextResponse.json({
        success: true,
        result: analysisResult,
        message: "AI analysis completed successfully",
      });
    } else {
      // Update database with error status
      await supabase
        .from("images")
        .update({
          processing_status: "failed",
          ai_analysis_error: analysisResult.error || "AI analysis failed",
        })
        .eq("id", imageId);

      console.error(
        `AI analysis failed for image: ${imageRecord.original_name}`,
        analysisResult.error
      );

      return NextResponse.json({
        success: false,
        error: analysisResult.error || "AI analysis failed",
      });
    }
  } catch (error) {
    console.error("AI analysis API error:", error);

    // If we have the imageId, update the status to failed
    const { imageId } = await request.json().catch(() => ({}));
    if (imageId) {
      const supabase = getSupabaseServerClient();
      await supabase
        .from("images")
        .update({
          processing_status: "failed",
          ai_analysis_error:
            error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", imageId)
        .catch(console.error);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to check analysis status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json(
        { error: "Missing imageId parameter" },
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
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Get image analysis status
    const { data: imageRecord, error: imageError } = await supabase
      .from("images")
      .select(
        "processing_status, ai_analysis_error, analyzed_at, tags, description, dominant_colors"
      )
      .eq("id", imageId)
      .eq("user_id", user.id)
      .single();

    if (imageError || !imageRecord) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: imageRecord.processing_status,
      error: imageRecord.ai_analysis_error,
      analyzedAt: imageRecord.analyzed_at,
      result:
        imageRecord.processing_status === "completed"
          ? {
              tags: imageRecord.tags,
              description: imageRecord.description,
              dominantColors: imageRecord.dominant_colors,
            }
          : null,
    });
  } catch (error) {
    console.error("Analysis status check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
