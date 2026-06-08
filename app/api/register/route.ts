import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { name, password } = await req.json();

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

  // Primeiro cadastro vira admin automaticamente
  const count = await prisma.user.count();
  const role = count === 0 ? "admin" : "obra";

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name: name.trim(), password: hashed, role },
  });

  return NextResponse.json({ role: user.role, name: user.name, id: user.id }, { status: 201 });
}
