import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function isAdmin(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === "admin";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const { date, visitor, type, notes, status } = await req.json();
  const visit = await prisma.visit.update({
    where: { id },
    data: {
      ...(date && { date: new Date(date) }),
      ...(visitor && { visitor }),
      ...(type && { type }),
      ...(status && { status }),
      notes: notes ?? undefined,
    },
  });
  return NextResponse.json(visit);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.visit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
