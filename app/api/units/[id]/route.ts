import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function isAdmin(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === "admin";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const { status, notes, responsavel, pendencias } = await req.json();
  const unit = await prisma.unit.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(responsavel !== undefined && { responsavel: responsavel || null }),
      ...(pendencias !== undefined && { pendencias }),
    },
  });
  return NextResponse.json(unit);
}
