import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { secret } = await req.json();
  if (!secret) return NextResponse.json({ error: "Senha obrigatória" }, { status: 401 });

  if (secret === process.env.ADMIN_SECRET) {
    return NextResponse.json({ role: "admin" });
  }
  if (secret === process.env.OBRA_SECRET) {
    return NextResponse.json({ role: "obra" });
  }
  return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
}
