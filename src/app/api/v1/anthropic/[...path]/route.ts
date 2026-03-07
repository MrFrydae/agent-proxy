import { proxyRequest } from "@/lib/proxy/handler";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await params;
  const upstreamPath = `/${path.join("/")}`;
  return proxyRequest("anthropic", upstreamPath, req);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await params;
  const upstreamPath = `/${path.join("/")}`;
  return proxyRequest("anthropic", upstreamPath, req);
}
