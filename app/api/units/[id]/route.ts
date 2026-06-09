import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Qualquer usuário autenticado pode alterar status de unidades
async function isLoggedIn(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return !!user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isLoggedIn(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const { status, notes } = await req.json();
  const unit = await prisma.unit.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(notes !== undefined && { notes: notes || null }),
    },
  });
  return NextResponse.json(unit);
}
