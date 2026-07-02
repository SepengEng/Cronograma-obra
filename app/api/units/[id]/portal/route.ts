import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

async function isAdmin(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === "admin";
}

// Garante que a unidade tem um token de portal e o retorna (admin)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const unit = await prisma.unit.findUnique({ where: { id }, select: { portalToken: true } });
  if (!unit) return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });

  let token = unit.portalToken;
  if (!token) {
    token = randomUUID();
    await prisma.unit.update({ where: { id }, data: { portalToken: token } });
  }
  return NextResponse.json({ token });
}
