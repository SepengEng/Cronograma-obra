export type UnitStatus =
  | "sem_vistoria"
  | "agendada"
  | "concluida"
  | "pendencia"
  | "indisponivel";

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
  sem_vistoria: "#374151",
  agendada:     "#18ABDA",
  concluida:    "#22C55E",
  pendencia:    "#F59E0B",
  indisponivel: "#EF4444",
};

export const STATUS_LABEL: Record<UnitStatus, string> = {
  sem_vistoria: "Sem vistoria",
  agendada:     "Agendada",
  concluida:    "Concluída",
  pendencia:    "Pendência",
  indisponivel: "Indisponível",
};

export const STATUS_EMOJI: Record<UnitStatus, string> = {
  sem_vistoria: "⬜",
  agendada:     "🔵",
  concluida:    "✅",
  pendencia:    "⚠️",
  indisponivel: "🚫",
};

export const ALL_STATUSES: UnitStatus[] = [
  "sem_vistoria",
  "agendada",
  "concluida",
  "pendencia",
  "indisponivel",
];
