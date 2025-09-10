// app/api/equipment/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NEXT_PUBLIC_HRIS_API_URL = process.env.NEXT_PUBLIC_HRIS_API_URL ?? "";
const NEXT_PUBLIC_HRIS_BARRIER_TOKEN = process.env.NEXT_PUBLIC_HRIS_BARRIER_TOKEN ?? "";

// POST API Configuration
const NEXT_PUBLIC_POST_API_URL = process.env.NEXT_PUBLIC_POST_API_URL ?? "";
const NEXT_PUBLIC_POST_BARRIER_TOKEN = process.env.NEXT_PUBLIC_POST_BARRIER_TOKEN ?? "";

function requireConfig() {
  console.log("Environment check:", {
    hasHrisBaseUrl: !!NEXT_PUBLIC_HRIS_API_URL,
    hasHrisToken: !!NEXT_PUBLIC_HRIS_BARRIER_TOKEN,
    hasPostBaseUrl: !!NEXT_PUBLIC_POST_API_URL,
    hasPostToken: !!NEXT_PUBLIC_POST_BARRIER_TOKEN,
    hrisBaseUrl: NEXT_PUBLIC_HRIS_API_URL || "undefined",
    postBaseUrl: NEXT_PUBLIC_POST_API_URL || "undefined",
    hrisTokenLength: NEXT_PUBLIC_HRIS_BARRIER_TOKEN?.length || 0,
    postTokenLength: NEXT_PUBLIC_POST_BARRIER_TOKEN?.length || 0,
  });
  
  if (!NEXT_PUBLIC_HRIS_API_URL || !NEXT_PUBLIC_HRIS_BARRIER_TOKEN) {
    console.error("HRIS Configuration check failed:", {
      hasBaseUrl: !!NEXT_PUBLIC_HRIS_API_URL,
      hasToken: !!NEXT_PUBLIC_HRIS_BARRIER_TOKEN,
      baseUrl: NEXT_PUBLIC_HRIS_API_URL || "undefined",
    });
    throw new Error(
      "Server configuration error: Missing NEXT_PUBLIC_HRIS_API_URL or NEXT_PUBLIC_HRIS_BARRIER_TOKEN environment variables."
    );
  }

  if (!NEXT_PUBLIC_POST_API_URL || !NEXT_PUBLIC_POST_BARRIER_TOKEN) {
    console.error("POST API Configuration check failed:", {
      hasBaseUrl: !!NEXT_PUBLIC_POST_API_URL,
      hasToken: !!NEXT_PUBLIC_POST_BARRIER_TOKEN,
      baseUrl: NEXT_PUBLIC_POST_API_URL || "undefined",
    });
    throw new Error(
      "Server configuration error: Missing NEXT_PUBLIC_POST_API_URL or NEXT_PUBLIC_POST_BARRIER_TOKEN environment variables."
    );
  }
}

// Normalize URL parts to avoid double slashes and missing slashes
const HRIS_BASE = NEXT_PUBLIC_HRIS_API_URL.replace(/\/+$/, ""); // remove trailing slashes
const HRIS_API_URL = `${HRIS_BASE}`;

const POST_BASE = NEXT_PUBLIC_POST_API_URL.replace(/\/+$/, ""); // remove trailing slashes
const POST_API_URL = `${POST_BASE}`;

async function callUpstream(method: "GET" | "POST", body?: unknown, apiType: "hris" | "post" = "hris") {
  requireConfig();

  const apiUrl = apiType === "hris" ? HRIS_API_URL : POST_API_URL;
  const token = apiType === "hris" ? NEXT_PUBLIC_HRIS_BARRIER_TOKEN : NEXT_PUBLIC_POST_BARRIER_TOKEN;

  console.log(`[equipment route] Making ${method} request to ${apiType.toUpperCase()} API: ${apiUrl}`);
  console.log(`[equipment route] Request headers:`, {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token.substring(0, 10)}...` // Only show first 10 chars
  });

  try {
    const res = await fetch(apiUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      // Bearer token auth:
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // Upstream might return plain text or HTML; surface it for debugging
    data = { rawResponse: text };
  }

  if (!res.ok) {
    // Log safe info only (never log the token)
    console.error(`[equipment route] ${method} ${apiUrl} → ${res.status} ${res.statusText}`);
    console.error(`[equipment route] Response headers:`, Object.fromEntries(res.headers.entries()));
    console.error(`[equipment route] Response body:`, data);
    console.error(`[equipment route] Request body sent:`, method === "POST" ? body : "N/A");
    
    // Special handling for 500 errors
    if (res.status === 500) {
      console.error(`[equipment route] UPSTREAM SERVER ERROR - This indicates the ${apiType.toUpperCase()} API server is having internal issues`);
      console.error(`[equipment route] Check if the ${apiType.toUpperCase()} API server is running and accessible`);
      console.error(`[equipment route] Verify the API endpoint URL is correct: ${apiUrl}`);
    }
    
    return NextResponse.json(
      {
        error: "Failed request to upstream service.",
        statusCode: res.status,
        statusText: res.statusText,
        details: data,
        upstreamError: res.status === 500 ? `The ${apiType.toUpperCase()} API server returned an internal server error. Please check if the service is running and accessible.` : undefined,
      },
      { status: res.status }
    );
  }

  console.log(`[equipment route] Success response:`, data);
  return NextResponse.json(data, { status: method === "POST" ? 201 : 200 });
  } catch (fetchError) {
    console.error(`[equipment route] Network/fetch error:`, fetchError);
    return NextResponse.json(
      {
        error: "Network error connecting to upstream service.",
        details: fetchError instanceof Error ? fetchError.message : "Unknown network error",
        upstreamError: `Unable to connect to the ${apiType.toUpperCase()} API server. Please check the URL and network connectivity.`,
      },
      { status: 502 }
    );
  }
}

export async function GET(_req: NextRequest) {
  try {
    console.log("[equipment route] GET request received - testing upstream service connectivity");
    return await callUpstream("GET", undefined, "hris");
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("[equipment route] GET error:", errorMessage);
    return NextResponse.json(
      { 
        error: errorMessage,
        message: "GET request failed - this can help test if the upstream service is accessible"
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("[equipment route] POST request received");
    const body = await req.json();
    console.log("[equipment route] Request body:", body);
    
    // Check if the request specifies which API to use (default to HRIS for backward compatibility)
    const url = new URL(req.url);
    const apiType = url.searchParams.get('api') === 'post' ? 'post' : 'hris';
    
    console.log(`[equipment route] Using ${apiType.toUpperCase()} API for POST request`);
    return await callUpstream("POST", body, apiType);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("[equipment route] POST error:", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}