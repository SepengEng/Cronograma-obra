import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePosObra } from "@/lib/posObra";
import { randomUUID } from "crypto";
import type { PosObraItem } from "@/app/components/unitTypes";

// Proprietário abre um novo pedido de revisão/manutenção pelo portal
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const unit = await prisma.unit.findUnique({
    where: { portalToken: token },
    select: { id: true, posObra: true },
  });
  if (!unit) return NextResponse.json({ error: "Link inválido" }, { status: 404 });

  const { titulo, descricao } = await req.json();
  if (!titulo || !String(titulo).trim()) {
    return NextResponse.json({ error: "Descreva o pedido" }, { status: 400 });
  }

  const items = parsePosObra(unit.posObra);
  const novo: PosObraItem = {
    id: randomUUID(),
    titulo: String(titulo).trim().slice(0, 120),
    descricao: String(descricao ?? "").trim().slice(0, 2000),
    status: "aberto",
    resposta: "",
    aceito: false,
    createdAt: new Date().toISOString(),
    origem: "portal",
  };
  items.push(novo);
  await prisma.unit.update({ where: { id: unit.id }, data: { posObra: JSON.stringify(items) } });
  return NextResponse.json(novo, { status: 201 });
}
