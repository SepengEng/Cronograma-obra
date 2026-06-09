export type UnitStatus =
  | "disponivel"     // verde  — pronta pra vistoria (era sem_vistoria)
  | "agendada"       // laranja — vistoria marcada
  | "ja_vistoriado"  // azul   — já passou pela vistoria
  | "concluida"      // roxo   — processo totalmente encerrado
  | "pendencia"      // âmbar  — vistoriada mas tem pendências
  | "indisponivel";  // vermelho — sem acesso

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
  disponivel:    "#22C55E",  // verde
  agendada:      "#F97316",  // laranja
  ja_vistoriado: "#18ABDA",  // azul SBE
  concluida:     "#7C3AED",  // roxo
  pendencia:     "#F59E0B",  // âmbar (inalterado)
  indisponivel:  "#EF4444",  // vermelho (inalterado)
};

export const STATUS_LABEL: Record<UnitStatus, string> = {
  disponivel:    "Disponível",
  agendada:      "Agendada",
  ja_vistoriado: "Já vistoriado",
  concluida:     "Concluída",
  pendencia:     "Pendência",
  indisponivel:  "Indisponível",
};

export const STATUS_EMOJI: Record<UnitStatus, string> = {
  disponivel:    "🟢",
  agendada:      "🟠",
  ja_vistoriado: "🔵",
  concluida:     "🟣",
  pendencia:     "⚠️",
  indisponivel:  "🚫",
};

export const ALL_STATUSES: UnitStatus[] = [
  "disponivel",
  "agendada",
  "ja_vistoriado",
  "concluida",
  "pendencia",
  "indisponivel",
];
