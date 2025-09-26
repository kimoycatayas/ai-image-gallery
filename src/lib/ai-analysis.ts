import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AIAnalysisResult {
  tags: string[];
  description: string;
  dominantColors: string[];
  success: boolean;
  error?: string;
}

/**
 * Analyze an image using OpenAI GPT-4 Vision
 * @param imageUrl - Public URL of the image to analyze
 * @returns Promise<AIAnalysisResult>
 */
export async function analyzeImage(
  imageUrl: string
): Promise<AIAnalysisResult> {
  try {
    console.log("Starting AI analysis for image:", imageUrl);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and return a JSON object with the following structure:
              {
                "tags": ["tag1", "tag2", ...],
                "description": "A single descriptive sentence about the image",
                "dominantColors": ["#hex1", "#hex2", "#hex3"]
              }

              Requirements:
              - tags: 5-10 relevant keywords describing the image content, objects, scene, mood, style
              - description: One clear, descriptive sentence about what's in the image
              - dominantColors: The 3 most prominent colors in the image as hex values

              Return only valid JSON, no additional text.`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "low", // Use low detail for cost optimization
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500, // Limit tokens for cost control
      temperature: 0.3, // Lower temperature for more consistent results
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    // Parse the JSON response
    const analysisResult = JSON.parse(content);

    // Validate the response structure
    if (
      !analysisResult.tags ||
      !Array.isArray(analysisResult.tags) ||
      !analysisResult.description ||
      !analysisResult.dominantColors ||
      !Array.isArray(analysisResult.dominantColors)
    ) {
      throw new Error("Invalid response structure from OpenAI");
    }

    // Clean and validate tags (ensure they're strings and reasonable length)
    const cleanTags = analysisResult.tags
      .filter((tag: any) => typeof tag === "string" && tag.length > 0)
      .slice(0, 10); // Limit to 10 tags max

    // Validate dominant colors (should be hex format)
    const cleanColors = analysisResult.dominantColors
      .filter(
        (color: any) =>
          typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color)
      )
      .slice(0, 3); // Limit to 3 colors max

    const result: AIAnalysisResult = {
      tags: cleanTags,
      description: String(analysisResult.description).slice(0, 500), // Limit description length
      dominantColors: cleanColors,
      success: true,
    };

    console.log("AI analysis completed successfully:", result);
    return result;
  } catch (error) {
    console.error("AI analysis failed:", error);

    return {
      tags: [],
      description: "",
      dominantColors: [],
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Validate that we can connect to OpenAI
 * @returns Promise<boolean>
 */
export async function validateOpenAIConnection(): Promise<boolean> {
  try {
    const response = await openai.models.list();
    return response.data.length > 0;
  } catch (error) {
    console.error("OpenAI connection validation failed:", error);
    return false;
  }
}

/**
 * Get estimated cost for image analysis
 * @param imageCount - Number of images to analyze
 * @returns Estimated cost in USD
 */
export function getEstimatedCost(imageCount: number): number {
  // Rough estimate: ~$0.015 per image analysis
  return imageCount * 0.015;
}
