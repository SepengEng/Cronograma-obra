import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function isAdmin(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === "admin";
}

// Baixa/visualiza o arquivo (id cuid não-adivinhável)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await prisma.contratoFile.findUnique({ where: { id } });
  if (!f) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return new Response(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.mime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(f.name)}"`,
      "Content-Length": String(f.size),
      "Cache-Control": "private, max-age=3600",
    },
  });
}

// Remove o arquivo
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.contratoFile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
