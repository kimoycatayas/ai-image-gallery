import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  createSignedUrlDiagnostic,
  logEnvironmentStatus,
} from "@/lib/env-validation";

/**
 * Creates a signed URL with error handling and validation
 * Ensures the URL includes the required token parameter
 */
export async function createSignedUrlSafe(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    // Log environment status in development
    logEnvironmentStatus();

    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error(`Error creating signed URL for ${bucket}/${path}:`, {
        error,
        bucket,
        path,
        expiresIn,
      });
      return null;
    }

    const signedUrl = data?.signedUrl;

    if (!signedUrl) {
      console.error(
        `No signed URL returned from Supabase for ${bucket}/${path}`
      );
      return null;
    }

    // Comprehensive validation
    const diagnostic = createSignedUrlDiagnostic(signedUrl);

    if (!diagnostic.isValid) {
      console.error(`Invalid signed URL for ${bucket}/${path}:`, {
        url: signedUrl,
        issues: diagnostic.issues,
        hasToken: diagnostic.hasToken,
        hostname: diagnostic.hostname,
      });
      return null;
    }

    console.log(`✅ Created valid signed URL for ${bucket}/${path}`);

    return signedUrl;
  } catch (error) {
    console.error(
      `Exception creating signed URL for ${bucket}/${path}:`,
      error
    );
    return null;
  }
}

/**
 * Creates signed URLs for both original and thumbnail images
 * with proper fallback handling
 */
export async function createImageSignedUrls(
  storagePath: string,
  thumbnailPath?: string | null,
  expiresIn: number = 3600
): Promise<{
  signedUrl: string | null;
  thumbnailSignedUrl: string | null;
}> {
  const [originalUrl, thumbnailUrl] = await Promise.all([
    createSignedUrlSafe("images", storagePath, expiresIn),
    thumbnailPath
      ? createSignedUrlSafe("images", thumbnailPath, expiresIn)
      : Promise.resolve(null),
  ]);

  // If thumbnail fails, use original as fallback
  const fallbackThumbnailUrl = thumbnailUrl || originalUrl;

  return {
    signedUrl: originalUrl,
    thumbnailSignedUrl: fallbackThumbnailUrl,
  };
}

/**
 * Validates that a URL has the required token parameter
 */
export function validateSignedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.has("token");
  } catch {
    return false;
  }
}

/**
 * Debug function to log signed URL details
 */
export function debugSignedUrl(url: string, context: string = ""): void {
  try {
    const urlObj = new URL(url);
    console.log(`[DEBUG] Signed URL ${context}:`, {
      hasToken: urlObj.searchParams.has("token"),
      pathname: urlObj.pathname,
      tokenExists: !!urlObj.searchParams.get("token"),
      hostname: urlObj.hostname,
    });
  } catch (error) {
    console.error(`[DEBUG] Invalid URL ${context}:`, url, error);
  }
}
