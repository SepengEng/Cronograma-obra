import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePosObra } from "@/lib/posObra";

// Proprietário aceita um pedido atendido, assinando pelo portal
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const unit = await prisma.unit.findUnique({
    where: { portalToken: token },
    select: { id: true, posObra: true },
  });
  if (!unit) return NextResponse.json({ error: "Link inválido" }, { status: 404 });

  const { requestId, assinaturaImg } = await req.json();
  const items = parsePosObra(unit.posObra);
  const idx = items.findIndex((i) => i.id === requestId);
  if (idx < 0) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

  items[idx] = {
    ...items[idx],
    status: "aceito",
    aceito: true,
    assinaturaImg: typeof assinaturaImg === "string" && assinaturaImg ? assinaturaImg : (items[idx].assinaturaImg ?? ""),
    assinaturaData: new Date().toISOString(),
  };
  await prisma.unit.update({ where: { id: unit.id }, data: { posObra: JSON.stringify(items) } });
  return NextResponse.json(items[idx]);
}
