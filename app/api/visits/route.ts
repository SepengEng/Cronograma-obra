import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function isAdmin(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === "admin";
}

export async function GET() {
  const visits = await prisma.visit.findMany({
    orderBy: { date: "asc" },
    include: { unit: { select: { number: true } } },
  });
  return NextResponse.json(visits);
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { date, visitor, type, notes, unitId } = await req.json();
  if (!date || !visitor || !type) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }
  const visit = await prisma.visit.create({
    data: {
      date: new Date(date),
      visitor,
      type,
      notes: notes || null,
      unitId: unitId || null,
    },
    include: { unit: { select: { number: true } } },
  });

  // Se vinculou uma unidade, marcar como agendada
  if (unitId) {
    await prisma.unit.update({
      where: { id: unitId },
      data: { status: "agendada" },
    });
  }

  return NextResponse.json(visit, { status: 201 });
}
