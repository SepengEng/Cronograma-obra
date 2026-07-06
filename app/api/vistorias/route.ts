import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function isAdmin(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === "admin";
}

export async function GET(req: NextRequest) {
  const unitId = req.nextUrl.searchParams.get("unitId");
  const where = unitId ? { unitId } : {};
  const vistorias = await prisma.vistoria.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { unit: { select: { number: true, floor: true, tower: true } } },
  });
  return NextResponse.json(vistorias);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { unitId, tipo = "completa", responsavel, pavimento } = await req.json();
  if (!unitId) return NextResponse.json({ error: "unitId obrigatório" }, { status: 400 });

  const vistoria = await prisma.vistoria.create({
    data: {
      unitId,
      tipo,
      responsavel: responsavel ?? user.name,
      pavimento,
      iniciadoPor: user.name,
      iniciadoEm: new Date(),
    },
    include: { unit: { select: { number: true, floor: true, tower: true } } },
  });
  return NextResponse.json(vistoria, { status: 201 });
}
