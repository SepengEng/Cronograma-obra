export type UnitStatus =
  | "disponivel"     // verde       — pronta pra vistoria
  | "agendada"       // laranja     — vistoria marcada (1ª vez)
  | "ja_vistoriado"  // azul        — já passou pela vistoria
  | "revistoria"     // ciano       — agendada pela 2ª vez ou mais
  | "concluida"      // roxo        — processo totalmente encerrado
  | "pendencia"      // amarelo     — vistoriada mas tem pendências
  | "indisponivel";  // vermelho    — sem acesso

export type Unit = {
  id: string;
  number: string;
  floor: number;
  position: number;
  tower: string;
  status: UnitStatus;
  notes: string | null;
};

export const STATUS_COLOR: Record<UnitStatus, string> = {
  disponivel:    "#22C55E",  // verde vivo
  agendada:      "#92400E",  // marrom
  ja_vistoriado: "#2563EB",  // azul sólido
  revistoria:    "#06B6D4",  // ciano (claramente diferente do azul)
  concluida:     "#7C3AED",  // roxo
  pendencia:     "#EAB308",  // amarelo (bem diferente do laranja)
  indisponivel:  "#EF4444",  // vermelho
};

export const STATUS_LABEL: Record<UnitStatus, string> = {
  disponivel:    "Disponível",
  agendada:      "Agendada",
  ja_vistoriado: "Já vistoriado",
  revistoria:    "Revistoria",
  concluida:     "Concluída",
  pendencia:     "Pendência",
  indisponivel:  "Indisponível",
};

export const STATUS_EMOJI: Record<UnitStatus, string> = {
  disponivel:    "🟢",
  agendada:      "🟠",
  ja_vistoriado: "🔵",
  revistoria:    "🔄",
  concluida:     "🟣",
  pendencia:     "⚠️",
  indisponivel:  "🚫",
};

export const ALL_STATUSES: UnitStatus[] = [
  "disponivel",
  "agendada",
  "ja_vistoriado",
  "revistoria",
  "concluida",
  "pendencia",
  "indisponivel",
];
