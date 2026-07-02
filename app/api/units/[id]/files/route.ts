import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_SIZE = 4 * 1024 * 1024; // 4 MB (limite prático do Vercel)

async function isAdmin(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === "admin";
}

// Lista os arquivos (só metadados, sem os bytes)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const files = await prisma.contratoFile.findMany({
    where: { unitId: id },
    select: { id: true, name: true, mime: true, size: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(files);
}

// Faz upload de um arquivo
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande (máximo 4 MB)" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const rec = await prisma.contratoFile.create({
    data: {
      unitId: id,
      name: file.name || "arquivo",
      mime: file.type || "application/octet-stream",
      size: file.size,
      data: buf,
    },
    select: { id: true, name: true, mime: true, size: true, createdAt: true },
  });
  return NextResponse.json(rec, { status: 201 });
}
