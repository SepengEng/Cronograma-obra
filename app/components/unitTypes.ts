export type UnitStatus =
  | "disponivel"    // verde   — pronta pra vistoria
  | "agendada"      // marrom  — vistoria marcada
  | "revistoria"    // ciano   — 2ª vistoria agendada
  | "concluida"     // roxo    — processo encerrado
  | "pendencia"     // amarelo — tem pendências
  | "indisponivel"; // vermelho — sem acesso

export type PendenciaItem = {
  id: string;
  text: string;
  done: boolean;
};

export type PosObraItem = {
  id: string;
  titulo: string;
  descricao: string;
  status: "aberto" | "em_andamento" | "atendido" | "aceito";
  resposta: string;
  aceito: boolean;
  createdAt: string;
  origem?: "admin" | "portal";   // quem abriu o pedido
  assinaturaImg?: string;        // assinatura da aceitação (dataURL)
  assinaturaData?: string;       // quando foi aceito/assinado
};

export type EntregaChaves = {
  docs: PendenciaItem[];
  dataEntrega: string;
  assinaturaNome: string;
  assinaturaData: string;
  assinaturaImg: string; // dataURL do canvas
};

export type Unit = {
  id: string;
  number: string;
  floor: number;
  position: number;
  tower: string;
  status: UnitStatus;
  notes: string | null;
  responsavel: string | null;
  pendencias: string | null; // JSON: PendenciaItem[]

  // Proprietário
  email: string | null;
  telefone: string | null;
  cpf: string | null;

  // Financiamento
  situacao: string | null;
  valorPago: number | null;
  saldoDevedor: number | null;

  // Contrato
  contratoUrl: string | null;
  contratoNotes: string | null;

  // Checklists detalhados (JSON: PendenciaItem[])
  previstoria: string | null;
  vistoriaCheck: string | null;

  // Entrega de chaves (JSON: EntregaChaves)
  entregaChaves: string | null;

  // Pós-obra (JSON: PosObraItem[])
  posObra: string | null;

  // Portal do proprietário (token do link único)
  portalToken: string | null;
};

export type UnitPatch = Partial<{
  status: UnitStatus;
  notes: string;
  responsavel: string;
  pendencias: string;
  email: string;
  telefone: string;
  cpf: string;
  situacao: string;
  valorPago: number | string;
  saldoDevedor: number | string;
  contratoUrl: string;
  contratoNotes: string;
  previstoria: string;
  vistoriaCheck: string;
  entregaChaves: string;
  posObra: string;
}>;

export const STATUS_COLOR: Record<UnitStatus, string> = {
  disponivel:   "#22C55E",  // verde
  agendada:     "#92400E",  // marrom
  revistoria:   "#06B6D4",  // ciano
  concluida:    "#7C3AED",  // roxo
  pendencia:    "#EAB308",  // amarelo
  indisponivel: "#EF4444",  // vermelho
};

export const STATUS_LABEL: Record<UnitStatus, string> = {
  disponivel:   "Disponível",
  agendada:     "Agendada",
  revistoria:   "Revistoria",
  concluida:    "Concluída",
  pendencia:    "Pendência",
  indisponivel: "Indisponível",
};

export const STATUS_EMOJI: Record<UnitStatus, string> = {
  disponivel:   "🟢",
  agendada:     "🟤",
  revistoria:   "🔄",
  concluida:    "🟣",
  pendencia:    "⚠️",
  indisponivel: "🚫",
};

export const ALL_STATUSES: UnitStatus[] = [
  "disponivel",
  "agendada",
  "revistoria",
  "concluida",
  "pendencia",
  "indisponivel",
];
