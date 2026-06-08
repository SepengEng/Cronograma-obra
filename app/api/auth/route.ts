import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { secret } = await req.json();
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
