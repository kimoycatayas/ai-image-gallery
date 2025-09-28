/**
 * Environment validation utilities for Supabase configuration
 */

export interface EnvironmentStatus {
  isValid: boolean;
  issues: string[];
  supabaseUrl?: string;
  hasAnonKey: boolean;
}

/**
 * Validates Supabase environment configuration
 */
export function validateSupabaseEnvironment(): EnvironmentStatus {
  const issues: string[] = [];
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl) {
    issues.push("NEXT_PUBLIC_SUPABASE_URL is missing");
  } else if (!supabaseUrl.includes('supabase.co')) {
    issues.push("NEXT_PUBLIC_SUPABASE_URL does not appear to be a valid Supabase URL");
  }
  
  if (!anonKey) {
    issues.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    supabaseUrl,
    hasAnonKey: !!anonKey,
  };
}

/**
 * Logs environment status for debugging
 */
export function logEnvironmentStatus(): void {
  const status = validateSupabaseEnvironment();
  
  if (status.isValid) {
    console.log("✅ Supabase environment configuration is valid");
    console.log(`   URL: ${status.supabaseUrl?.substring(0, 30)}...`);
  } else {
    console.error("❌ Supabase environment configuration issues:");
    status.issues.forEach(issue => console.error(`   - ${issue}`));
  }
}

/**
 * Creates a diagnostic report for signed URL issues
 */
export function createSignedUrlDiagnostic(url: string | null | undefined): {
  url: string | null;
  isValid: boolean;
  issues: string[];
  hasToken: boolean;
  hostname?: string;
} {
  const issues: string[] = [];
  
  if (!url) {
    issues.push("URL is null or undefined");
    return {
      url: null,
      isValid: false,
      issues,
      hasToken: false,
    };
  }
  
  let hostname: string | undefined;
  let hasToken = false;
  
  try {
    const urlObj = new URL(url);
    hostname = urlObj.hostname;
    hasToken = urlObj.searchParams.has('token');
    
    if (!hostname.includes('supabase.co')) {
      issues.push("URL does not appear to be from Supabase");
    }
    
    if (!hasToken) {
      issues.push("URL is missing required token parameter");
    }
    
    if (!url.includes('/storage/v1/object/sign/')) {
      issues.push("URL does not appear to be a signed URL");
    }
    
  } catch {
    issues.push("URL is malformed");
  }
  
  return {
    url,
    isValid: issues.length === 0,
    issues,
    hasToken,
    hostname,
  };
}