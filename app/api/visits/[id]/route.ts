import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { date, visitor, type, notes } = body;

  const visit = await prisma.visit.update({
    where: { id },
    data: {
      ...(date && { date: new Date(date) }),
      ...(visitor && { visitor }),
      ...(type && { type }),
      notes: notes ?? undefined,
    },
  });
  return NextResponse.json(visit);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.visit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
