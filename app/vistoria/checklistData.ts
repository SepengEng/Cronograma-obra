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

export const CHECKLIST_COMPLETA: ChecklistCategory[] = [
  {
    key: "hidro",
    label: "Hidro sanitário",
    items: [
      { key: "h1",  label: "Profundidade do ponto hidráulico no revestimento" },
      { key: "h2",  label: "Pontos de água com pressão adequada" },
      { key: "h3",  label: "Caimentos da água até o ralo (box e varanda)" },
      { key: "h4",  label: "Acabamento e funcionamento do ralo linear" },
      { key: "h5",  label: "Ralos (posição, nivelamento e acabamento)" },
      { key: "h6",  label: "Vedação do sifão" },
      { key: "h7",  label: "Vedação das torneiras" },
      { key: "h8",  label: "Vedação do rabicho (vedante e teflon)" },
      { key: "h9",  label: "Testar funcionamento dos registros dos ambientes" },
      { key: "h10", label: "Cubas de louça (fixação, vedação e acabamento)" },
    ],
  },
  {
    key: "loucas",
    label: "Louças, ferragens e bancadas",
    items: [
      { key: "l1", label: "Cubas de inox (fixação, vedação e acabamento)" },
      { key: "l2", label: "Bacia sanitária (fixação, vedação e acabamento)" },
      { key: "l3", label: "Suporte da caixa acoplada em parede" },
      { key: "l4", label: "Metais hidrossanitários — torneiras, registros, ducha (fixação, vedação e acabamento)" },
      { key: "l5", label: "Acabamento de registros" },
      { key: "l6", label: "Nivelamento das bancadas e rodapé" },
      { key: "l7", label: "Fixação das bancadas e rodapé com PU" },
    ],
  },
  {
    key: "eletrica",
    label: "Elétrica",
    items: [
      { key: "e1", label: "Lacre do quadro de luz" },
      { key: "e2", label: "Passagem no forro dos fios para fiação de iluminação" },
      { key: "e3", label: "Teste elétrico nas tomadas e interruptores" },
      { key: "e4", label: "Testar cigarra" },
      { key: "e5", label: "Identificação no quadro de luz" },
      { key: "e6", label: "Espelhos dos interruptores" },
      { key: "e7", label: "Espelhos nas tomadas" },
      { key: "e8", label: "Limpeza de espelhos das tomadas e interruptores" },
    ],
  },
  {
    key: "revestimento",
    label: "Revestimento",
    items: [
      { key: "r1",  label: "Conferir nivelamento do piso" },
      { key: "r2",  label: "Verificar regularidade das juntas do piso" },
      { key: "r3",  label: "Rejunte da parede (cozinha e sanitário)" },
      { key: "r4",  label: "Conferir a instalação de rodapés de cerâmica e rejunte" },
      { key: "r5",  label: "Conferir a instalação e integridade de rodapés de madeira" },
      { key: "r6",  label: "Peças quebradas, trincadas, ocas ou manchadas" },
      { key: "r7",  label: "Conferir rejuntamento e vedação da soleira (sanitário e porta principal)" },
      { key: "r8",  label: "Limpeza e vedação das seteiras" },
      { key: "r9",  label: "Rejuntamento da bacia sanitária" },
      { key: "r10", label: "Limpeza final dos revestimentos" },
    ],
  },
  {
    key: "esquadrias",
    label: "Esquadrias",
    items: [
      { key: "eq1",  label: "Verificar prumo" },
      { key: "eq2",  label: "Vedação das esquadrias com a parede e o piso" },
      { key: "eq3",  label: "Testar abertura e fechamento das folhas" },
      { key: "eq4",  label: "Verificar funcionamento de trilhos e dobradiças" },
      { key: "eq5",  label: "Filete de mármore bege bahia no trilho da esquadria" },
      { key: "eq6",  label: "Conferir maçanetas e fechaduras em funcionamento" },
      { key: "eq7",  label: "Teste de estanqueidade das esquadrias" },
      { key: "eq8",  label: "Conferir vidros (fixação, integridade, risco)" },
      { key: "eq9",  label: "Verificar arranhões, amassados ou danos na estrutura da esquadria" },
      { key: "eq10", label: "Verificar o acabamento do alizar superior da porta principal" },
      { key: "eq11", label: "Verificar a presença de alizares" },
      { key: "eq12", label: "Plástico filme nas maçanetas das portas de madeira" },
      { key: "eq13", label: "Verificar chapim (brilho, alinhamento, nivelamento)" },
      { key: "eq14", label: "Guarda-corpo com vidro instalado" },
      { key: "eq15", label: "Porta e alizar das portas em madeira" },
      { key: "eq16", label: "Porta e alizar de alumínio da área técnica" },
      { key: "eq17", label: "Limpeza das esquadrias" },
    ],
  },
  {
    key: "pintura",
    label: "Pintura",
    items: [
      { key: "p1", label: "Verificação de barriga" },
      { key: "p2", label: "Verificar o acabamento da pintura" },
      { key: "p3", label: "Verificar trincas no forro" },
      { key: "p4", label: "Integridade do forro" },
      { key: "p5", label: "Verificar pintura em cantos, quinas e encontros com esquadrias" },
      { key: "p6", label: "Verificar nivelamento do forro" },
      { key: "p7", label: "Verificar aderência da pintura (descascamento ou empolamento)" },
      { key: "p8", label: "Limpeza de respingos de tinta em piso, rodapés e esquadrias" },
    ],
  },
];

export const CHECKLIST_HABITESE: ChecklistCategory[] = [
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
      { key: "eq1", label: "Portas de madeira (instalação, maçaneta e fechadura)" },
      { key: "eq2", label: "Porta corta-fogo (instalação, maçaneta e fechadura)" },
      { key: "eq3", label: "Portas — testar abertura e fechamento das folhas" },
      { key: "eq4", label: "Esquadrias — alumínio + vidro" },
      { key: "eq5", label: "Esquadrias — conferir fixação" },
      { key: "eq6", label: "Esquadrias — conferir vedações verticais e horizontais" },
      { key: "eq7", label: "Conferir vidros (fixação, integridade, risco)" },
      { key: "eq8", label: "Chapim — assentamento e rejunte sob guarda-corpo" },
      { key: "eq9", label: "Guarda-corpo — alumínio + vidro" },
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

export function emptyFullChecklist(tipo: "completa" | "habitese"): FullChecklist {
  const cats = tipo === "completa" ? CHECKLIST_COMPLETA : CHECKLIST_HABITESE;
  const area = emptyChecklist(cats);
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
