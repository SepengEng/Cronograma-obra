import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Dados públicos da unidade para o portal do proprietário (o token é a credencial)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Link inválido" }, { status: 404 });

  const unit = await prisma.unit.findUnique({
    where: { portalToken: token },
    select: { number: true, tower: true, floor: true, responsavel: true, posObra: true },
  });
  if (!unit) return NextResponse.json({ error: "Link inválido" }, { status: 404 });

  return NextResponse.json({
    number: unit.number,
    tower: unit.tower,
    floor: unit.floor,
    responsavel: unit.responsavel,
    posObra: unit.posObra,
  });
}
