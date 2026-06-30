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
};

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
