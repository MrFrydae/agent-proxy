import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { refreshSingleAccount } from "@/lib/quota/poller";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  try {
    await refreshSingleAccount(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to refresh quota";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
