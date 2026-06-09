import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function isAdmin(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === "admin";
}

// Mapeia status da visita → status da unidade
function visitToUnitStatus(visitStatus: string): string | null {
  if (visitStatus === "concluida")            return "ja_vistoriado";
  if (visitStatus === "realizada_pendencias") return "pendencia";
  if (visitStatus === "nao_realizada")        return "pendencia";
  if (visitStatus === "pendente")             return "agendada";
  return null;
}

// Se a unidade já estava em revistoria, "desfazer" volta pra revistoria (não agendada)
async function resolveUnitStatus(visitStatus: string, unitId: string): Promise<string | null> {
  const base = visitToUnitStatus(visitStatus);
  if (base !== "agendada") return base;
  // se já tinha sido vistoriada antes, mantém revistoria no desfazer
  const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { status: true } });
  if (unit?.status === "revistoria") return "revistoria";
  return "agendada";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const { date, visitor, type, notes, status, unitId } = await req.json();

  const visit = await prisma.visit.update({
    where: { id },
    data: {
      ...(date     && { date: new Date(date) }),
      ...(visitor  && { visitor }),
      ...(type     && { type }),
      ...(status   && { status }),
      notes:  notes  ?? undefined,
      unitId: unitId !== undefined ? (unitId || null) : undefined,
    },
    include: { unit: { select: { number: true } } },
  });

  // Sincroniza status da unidade vinculada
  const linkedUnitId = unitId !== undefined ? (unitId || null) : visit.unitId;
  if (linkedUnitId && status) {
    const unitStatus = await resolveUnitStatus(status, linkedUnitId);
    if (unitStatus) {
      await prisma.unit.update({
        where: { id: linkedUnitId },
        data: { status: unitStatus },
      });
    }
  }

  // Se o unitId foi removido (desvinculado), não altera o status da unidade

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
