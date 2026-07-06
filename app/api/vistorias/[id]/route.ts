import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getUser(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const vistoria = await prisma.vistoria.findUnique({
    where: { id },
    include: { unit: { select: { number: true, floor: true, tower: true } } },
  });
  if (!vistoria) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  return NextResponse.json(vistoria);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.responsavel !== undefined) data.responsavel = body.responsavel;
  if (body.supervisor !== undefined) data.supervisor = body.supervisor;
  if (body.pavimento !== undefined) data.pavimento = body.pavimento;
  if (body.checklist !== undefined) data.checklist = body.checklist;
  if (body.observacoes !== undefined) data.observacoes = body.observacoes;
  if (body.tipo !== undefined) data.tipo = body.tipo;

  if (body.finalizar) {
    data.status = "finalizada";
    data.finalizadoPor = user.name;
    data.finalizadoEm = new Date();
  }

  const vistoria = await prisma.vistoria.update({
    where: { id },
    data,
    include: { unit: { select: { number: true, floor: true, tower: true } } },
  });
  return NextResponse.json(vistoria);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(req);
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.vistoria.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
