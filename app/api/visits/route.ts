import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const visits = await prisma.visit.findMany({
    orderBy: { date: "asc" },
  });
  return NextResponse.json(visits);
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { date, visitor, type, notes } = body;

  if (!date || !visitor || !type) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  const visit = await prisma.visit.create({
    data: { date: new Date(date), visitor, type, notes: notes || null },
  });
  return NextResponse.json(visit, { status: 201 });
}
