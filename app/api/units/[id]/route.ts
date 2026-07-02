import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function isAdmin(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === "admin";
}

// Campos de texto que aceitam null quando vazios
const TEXT_FIELDS = [
  "status", "notes", "responsavel", "pendencias",
  "email", "telefone", "cpf",
  "situacao",
  "contratoUrl", "contratoNotes",
  "previstoria", "vistoriaCheck",
  "entregaChaves", "posObra",
] as const;

// Campos numéricos
const NUMBER_FIELDS = ["valorPago", "saldoDevedor"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};

  for (const f of TEXT_FIELDS) {
    if (body[f] !== undefined) {
      // status nunca deve virar null; os demais viram null quando vazios
      data[f] = f === "status" ? body[f] : (body[f] || null);
    }
  }
  for (const f of NUMBER_FIELDS) {
    if (body[f] !== undefined) {
      const n = body[f] === "" || body[f] === null ? null : Number(body[f]);
      data[f] = n === null || Number.isNaN(n) ? null : n;
    }
  }

  const unit = await prisma.unit.update({ where: { id }, data });
  return NextResponse.json(unit);
}
