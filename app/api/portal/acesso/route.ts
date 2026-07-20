import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

// Só dígitos — o CPF pode vir formatado (000.000.000-00) do cadastro ou do form
const soDigitos = (s: string) => (s ?? "").replace(/\D/g, "");

// Throttle simples em memória por IP, pra dificultar varredura de CPF/apartamento.
// (Best-effort: no serverless é por instância, mas já barra tentativa em massa.)
const tentativas = new Map<string, { count: number; resetEm: number }>();
const LIMITE = 10;
const JANELA_MS = 10 * 60 * 1000;

function excedeuLimite(ip: string): boolean {
  const agora = Date.now();
  const atual = tentativas.get(ip);
  if (!atual || atual.resetEm < agora) {
    tentativas.set(ip, { count: 1, resetEm: agora + JANELA_MS });
    return false;
  }
  if (atual.count >= LIMITE) return true;
  atual.count++;
  return false;
}

// POST — identifica o proprietário por CPF + apartamento e devolve o link do portal.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "desconhecido";
  if (excedeuLimite(ip)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 });
  }

  const { cpf, apartamento, nome, email } = await req.json().catch(() => ({}));
  const cpfLimpo = soDigitos(cpf);
  const apto = (apartamento ?? "").toString().trim();
  const emailLimpo = (email ?? "").trim().toLowerCase();

  if (!apto || (cpfLimpo.length !== 11 && !emailLimpo)) {
    return NextResponse.json(
      { error: "Informe o número do apartamento e o CPF (ou o e-mail cadastrado)." },
      { status: 400 },
    );
  }

  const unit = await prisma.unit.findUnique({
    where: { number: apto },
    select: { id: true, cpf: true, portalToken: true, responsavel: true, email: true },
  });

  // Mensagem genérica: não revela se o apartamento existe nem qual dado falhou
  const generico = { error: "Os dados não conferem com o nosso cadastro." };
  if (!unit) return NextResponse.json(generico, { status: 404 });

  // Confere por CPF (quando já cadastrado) OU pelo e-mail do cadastro.
  const cpfCadastrado = soDigitos(unit.cpf ?? "");
  const bateCpf = cpfCadastrado.length === 11 && cpfCadastrado === cpfLimpo;
  const bateEmail = !!unit.email && !!emailLimpo && unit.email.trim().toLowerCase() === emailLimpo;
  if (!bateCpf && !bateEmail) return NextResponse.json(generico, { status: 404 });

  // Garante o token do portal
  let token = unit.portalToken;
  if (!token) {
    token = randomUUID();
    await prisma.unit.update({ where: { id: unit.id }, data: { portalToken: token } });
  }

  // Aloca ao proprietário os dados que ainda faltam no cadastro.
  // O CPF só é gravado quando a identidade foi confirmada pelo e-mail — assim
  // ninguém "reivindica" um apartamento informando um CPF qualquer.
  const dados: { responsavel?: string; email?: string; cpf?: string } = {};
  if (!cpfCadastrado && bateEmail && cpfLimpo.length === 11) dados.cpf = cpf.trim();
  if (!unit.responsavel && nome?.trim()) dados.responsavel = nome.trim();
  if (!unit.email && bateCpf && emailLimpo) dados.email = email.trim();
  if (Object.keys(dados).length > 0) {
    await prisma.unit.update({ where: { id: unit.id }, data: dados });
  }

  return NextResponse.json({ token });
}
