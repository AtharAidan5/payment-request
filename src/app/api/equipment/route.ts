// app/api/equipment/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // avoid static caching
export const revalidate = 0;

const RAW_BASE = process.env.API_BASE_URL ?? "";
const RAW_PATH = process.env.API_PATH ?? "";
const API_TOKEN = process.env.API_TOKEN ?? "";

// Normalize URL parts to avoid double slashes and missing slashes
const BASE = RAW_BASE.replace(/\/+$/, ""); // remove trailing slashes
const PATH = RAW_PATH ? (RAW_PATH.startsWith("/") ? RAW_PATH : `/${RAW_PATH}`) : "";
const API_URL = `${BASE}${PATH}`;

function requireConfig() {
  if (!BASE || !PATH || !API_TOKEN) {
    throw new Error(
      "Server configuration error: Missing API_BASE_URL, API_PATH, or API_TOKEN."
    );
  }
}

async function callUpstream(method: "GET" | "POST", body?: unknown) {
  requireConfig();

  const res = await fetch(API_URL, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      // Bearer token auth:
      Authorization: `Bearer ${API_TOKEN}`,
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
    console.error(`[equipment route] ${method} ${API_URL} → ${res.status} ${res.statusText}`);
    return NextResponse.json(
      {
        error: "Failed request to upstream service.",
        statusCode: res.status,
        details: data,
      },
      { status: res.status }
    );
  }

  return NextResponse.json(data, { status: method === "POST" ? 201 : 200 });
}

export async function GET(_req: NextRequest) {
  try {
    return await callUpstream("GET");
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return await callUpstream("POST", body);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}