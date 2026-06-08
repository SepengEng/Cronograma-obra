import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  // Apenas admin pode criar usuários
  const callerId = req.headers.get("x-user-id");
  if (callerId) {
    const caller = await prisma.user.findUnique({ where: { id: callerId } });
    if (caller?.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  } else {
    // Permite primeiro cadastro sem auth (bootstrap)
    const count = await prisma.user.count();
    if (count > 0) {
      return NextResponse.json({ error: "Cadastro disponível apenas via admin" }, { status: 401 });
    }
  }

  const { name, password, role } = await req.json();
  if (!name?.trim() || !password) {
    return NextResponse.json({ error: "Nome e senha obrigatórios" }, { status: 400 });
  }
  if (password.length < 4) {
    return NextResponse.json({ error: "Senha deve ter ao menos 4 caracteres" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { name: name.trim() } });
  if (exists) {
    return NextResponse.json({ error: "Esse nome já está em uso" }, { status: 409 });
  }

  const count = await prisma.user.count();
  const finalRole = count === 0 ? "admin" : (role || "obra");
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name: name.trim(), password: hashed, role: finalRole },
  });

  return NextResponse.json({ id: user.id, name: user.name, role: user.role }, { status: 201 });
}
