export type AreaKey = "apto" | "hall" | "escada" | "areaTec1" | "areaTec2";

export const AREAS: { key: AreaKey; label: string }[] = [
  { key: "apto",     label: "Apartamento" },
  { key: "hall",     label: "Hall / Corredor" },
  { key: "escada",   label: "Escada" },
  { key: "areaTec1", label: "Área Técnica 1" },
  { key: "areaTec2", label: "Área Técnica 2" },
];

export type ItemStatus = "AP" | "P" | "PR" | "NE" | null;

export type ChecklistItem = { key: string; label: string };
export type ChecklistCategory = { key: string; label: string; items: ChecklistItem[] };

/* ────────────────────────────────────────────────────────────────
   Lista de Verificação — Habite-se (LVS Habite-se)
   Fonte única: todas as vistorias usam este checklist.
   ──────────────────────────────────────────────────────────────── */
export const CHECKLIST: ChecklistCategory[] = [
  {
    key: "hidro",
    label: "Hidrossanitário",
    items: [
      { key: "h1", label: "Sifão instalado nas pias (cozinha e banheiro)" },
      { key: "h2", label: "Rabicho ligado nas pias (cozinha e banheiro)" },
      { key: "h3", label: "Plug em pontos de água sem ferragem (varanda, cozinha e banheiro)" },
      { key: "h4", label: "Ralo linear com acabamento finalizado (varanda)" },
      { key: "h5", label: "Ralos com grelha instalada (banheiro e cozinha)" },
    ],
  },
  {
    key: "loucas",
    label: "Louças, ferragens e bancadas",
    items: [
      { key: "l1", label: "Bancada instalada na cozinha, inclusive rodapé" },
      { key: "l2", label: "Bancada instalada no banheiro, inclusive rodapé" },
      { key: "l3", label: "Rejunte/vedação em bancadas (banheiro e cozinha)" },
      { key: "l4", label: "Cuba de louça — instalação e vedação (banheiro)" },
      { key: "l5", label: "Cuba de inox — instalação e vedação (cozinha)" },
      { key: "l6", label: "Bacia sanitária (fixação, vedação e acabamento)" },
      { key: "l7", label: "Torneira de pias (cozinha e banheiro)" },
      { key: "l8", label: "Acabamentos de registros (banheiro e cozinha)" },
    ],
  },
  {
    key: "eletrica",
    label: "Elétrica",
    items: [
      { key: "e1", label: "Fiação 'espera' em forro de apts. para instalação de luminária" },
      { key: "e2", label: "Cigarra de apartamentos" },
      { key: "e3", label: "Identificação de disjuntores no quadro de luz" },
      { key: "e4", label: "Espelhos dos interruptores" },
      { key: "e5", label: "Espelhos nas tomadas" },
    ],
  },
  {
    key: "revestimento",
    label: "Revestimento cerâmico",
    items: [
      { key: "r1", label: "Revestimento em piso" },
      { key: "r2", label: "Revestimento em pastilha (varandas e áreas técnicas)" },
      { key: "r3", label: "Revestimento em parede (varanda e banheiro)" },
      { key: "r4", label: "Rejunte de parede (cozinha e banheiro)" },
      { key: "r5", label: "Rejunte em piso" },
      { key: "r6", label: "Rodapés (onde houver parede com pintura)" },
      { key: "r7", label: "Soleiras, incluindo rejunte" },
    ],
  },
  {
    key: "esquadrias",
    label: "Portas e esquadrias",
    items: [
      { key: "eq1",  label: "Portas de madeira (instalação, maçaneta e fechadura)" },
      { key: "eq2",  label: "Porta corta-fogo (instalação, maçaneta e fechadura)" },
      { key: "eq3",  label: "Portas — testar abertura e fechamento das folhas" },
      { key: "eq4",  label: "Esquadrias — alumínio + vidro" },
      { key: "eq5",  label: "Esquadrias — conferir fixação" },
      { key: "eq6",  label: "Esquadrias — conferir vedações verticais e horizontais" },
      { key: "eq7",  label: "Conferir vidros (fixação, integridade, risco)" },
      { key: "eq8",  label: "Chapim — assentamento e rejunte sob guarda-corpo" },
      { key: "eq9",  label: "Guarda-corpo — alumínio + vidro" },
      { key: "eq10", label: "Guarda-corpo — conferir fixação" },
    ],
  },
  {
    key: "pintura",
    label: "Pintura",
    items: [
      { key: "p1", label: "Pintura de paredes" },
      { key: "p2", label: "Pintura de forro" },
      { key: "p3", label: "Aberturas no forro" },
      { key: "p4", label: "Aberturas nas paredes" },
      { key: "p5", label: "Pintura em cantos, quinas, encontros com portas e esquadrias" },
      { key: "p6", label: "Verniz em forro de varandas" },
      { key: "p7", label: "Respingos em piso, rodapés, portas e esquadrias" },
    ],
  },
];

// Compat: manter o nome antigo apontando para o checklist único
export const CHECKLIST_HABITESE = CHECKLIST;

export type AreaChecklist = Record<string, { status: ItemStatus; obs: string }>;
export type FullChecklist = Record<AreaKey, AreaChecklist>;

export function emptyChecklist(categories: ChecklistCategory[]): AreaChecklist {
  const result: AreaChecklist = {};
  for (const cat of categories) {
    for (const item of cat.items) {
      result[item.key] = { status: null, obs: "" };
    }
  }
  return result;
}

export function emptyFullChecklist(): FullChecklist {
  const area = emptyChecklist(CHECKLIST);
  return {
    apto:     { ...area },
    hall:     { ...area },
    escada:   { ...area },
    areaTec1: { ...area },
    areaTec2: { ...area },
  };
}

export function countArea(area: AreaChecklist): { done: number; total: number } {
  const vals = Object.values(area);
  return { done: vals.filter((v) => v.status !== null).length, total: vals.length };
}
