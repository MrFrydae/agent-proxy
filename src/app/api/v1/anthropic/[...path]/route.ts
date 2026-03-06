import { proxyRequest } from "@/lib/proxy/handler";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const upstreamPath = "/" + path.join("/");
  return proxyRequest("anthropic", upstreamPath, req);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const upstreamPath = "/" + path.join("/");
  return proxyRequest("anthropic", upstreamPath, req);
}
