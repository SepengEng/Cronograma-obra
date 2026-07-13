"use client";

import type { Unit, PosObraItem, EntregaChaves, VistoriaSummary } from "./unitTypes";
import { isSpecialLevel, isCommonArea } from "./unitTypes";

/* ── Helpers de parsing (duck-typed, mesmo shape usado no modal) ─── */
type TermoItemStatus = "aceito" | "nao_aceito" | "nao_aplica" | null;
type VistoriaCheck = {
  status: "pendente" | "recebido_sem_pendencias" | "recebido_com_pendencias";
  termoItens?: Record<string, { status: TermoItemStatus; obs: string }>;
};
function parseVistoriaCheck(raw: string | null): VistoriaCheck | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as VistoriaCheck; } catch { return null; }
}
function parseEntrega(raw: string | null): EntregaChaves | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as EntregaChaves; } catch { return null; }
}
function parsePosObra(raw: string | null): PosObraItem[] {
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
}
function countPendentesChecklist(raw: string | null): number {
  if (!raw) return 0;
  try {
    const data = JSON.parse(raw) as Record<string, Record<string, { status: string | null }>>;
    let n = 0;
    for (const area of Object.values(data)) {
      for (const item of Object.values(area)) {
        if (item?.status === "P") n++;
      }
    }
    return n;
  } catch { return 0; }
}

/* ── Melhor vistoria por unidade (mesma heurística do cronograma) ── */
function bestVistoriaPerUnit(vistorias: VistoriaSummary[]): VistoriaSummary[] {
  const best: Record<string, { v: VistoriaSummary; score: number }> = {};
  for (const v of vistorias) {
    if (!v.unitId) continue;
    const score = (v.status === "finalizada" ? 2 : 0) + (v.checklist ? 1 : 0);
    const cur = best[v.unitId];
    if (!cur || score > cur.score) best[v.unitId] = { v, score };
  }
  return Object.values(best).map((b) => b.v);
}

/* ── UI primitives ──────────────────────────────────────────────── */
function StatCard({ label, value, color, sub }: { label: string; value: number | string; color: string; sub?: string }) {
  return (
    <div className="bg-[#0F1E2E] border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] text-gray-600">{sub}</p>}
    </div>
  );
}

function ProgressBar({ done, total, color = "#2AB9B0" }: { done: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="text-[11px] text-gray-600">{done} de {total} ({pct}%)</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0F1E2E] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs text-gray-400 flex-1">{label}</span>
      <span className="text-sm font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

export default function ProgressoView({ units, vistorias }: { units: Unit[]; vistorias: VistoriaSummary[] }) {
  const totalUnidades = units.length;

  // ── Vistorias (LVS Habite-se) ──
  const bestVistorias = bestVistoriaPerUnit(vistorias);
  const finalizadas = bestVistorias.filter((v) => v.status === "finalizada").length;
  const rascunhos = bestVistorias.filter((v) => v.status === "rascunho").length;
  const semVistoria = totalUnidades - bestVistorias.length;
  const pendentesChecklist = bestVistorias.reduce((acc, v) => acc + countPendentesChecklist(v.checklist), 0);

  // ── Termo de vistoria (recebimento do documento) ──
  let termoPendente = 0, termoSemPend = 0, termoComPend = 0, naoAceitosTotal = 0;
  for (const u of units) {
    const vc = parseVistoriaCheck(u.vistoriaCheck);
    if (!vc || vc.status === "pendente") { termoPendente++; continue; }
    if (vc.status === "recebido_sem_pendencias") { termoSemPend++; continue; }
    termoComPend++;
    naoAceitosTotal += Object.values(vc.termoItens ?? {}).filter((ti) => ti?.status === "nao_aceito").length;
  }

  // ── Entrega de chaves ──
  let entregaAssinada = 0, entregaPendente = 0;
  for (const u of units) {
    const e = parseEntrega(u.entregaChaves);
    if (e?.documentoAssinado) entregaAssinada++; else entregaPendente++;
  }

  // ── Pós-obra ──
  const posObraCounts: Record<PosObraItem["status"], number> = { aberto: 0, em_andamento: 0, atendido: 0, aceito: 0 };
  let posObraTotal = 0;
  for (const u of units) {
    for (const it of parsePosObra(u.posObra)) {
      posObraCounts[it.status]++;
      posObraTotal++;
    }
  }

  const apts = units.filter((u) => !isSpecialLevel(u.floor) && !isCommonArea(u)).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Resumo geral */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Unidades" value={totalUnidades} color="#2AB9B0" sub={`${apts} apartamentos`} />
        <StatCard label="Vistorias finalizadas" value={finalizadas} color="#22C55E" sub={`de ${totalUnidades}`} />
        <StatCard label="Pendências (checklist)" value={pendentesChecklist} color={pendentesChecklist > 0 ? "#EAB308" : "#22C55E"} />
        <StatCard label="Docs. assinados" value={entregaAssinada} color="#22C55E" sub={`de ${totalUnidades}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="🔍 Vistorias — LVS Habite-se">
          <ProgressBar done={finalizadas} total={totalUnidades} color="#22C55E" />
          <div className="flex flex-col gap-2">
            <Row label="Finalizadas" value={finalizadas} color="#22C55E" />
            <Row label="Em rascunho" value={rascunhos} color="#EAB308" />
            <Row label="Sem vistoria ainda" value={semVistoria} color="#6B7280" />
            <Row label="Itens pendentes (status P)" value={pendentesChecklist} color="#EF4444" />
          </div>
        </Section>

        <Section title="📄 Termo de vistoria (documento)">
          <ProgressBar done={termoSemPend + termoComPend} total={totalUnidades} color="#2AB9B0" />
          <div className="flex flex-col gap-2">
            <Row label="Pendente de entrega" value={termoPendente} color="#6B7280" />
            <Row label="Recebido sem pendências" value={termoSemPend} color="#22C55E" />
            <Row label="Recebido com pendências" value={termoComPend} color="#EAB308" />
            <Row label="Itens Não Aceito (total)" value={naoAceitosTotal} color="#EF4444" />
          </div>
        </Section>

        <Section title="🔑 Entrega de chaves">
          <ProgressBar done={entregaAssinada} total={totalUnidades} color="#22C55E" />
          <div className="flex flex-col gap-2">
            <Row label="Documento assinado" value={entregaAssinada} color="#22C55E" />
            <Row label="Pendente" value={entregaPendente} color="#6B7280" />
          </div>
        </Section>

        <Section title="🔧 Pós-obra">
          {posObraTotal > 0 ? (
            <>
              <ProgressBar done={posObraCounts.aceito} total={posObraTotal} color="#22C55E" />
              <div className="flex flex-col gap-2">
                <Row label="Aberto" value={posObraCounts.aberto} color="#F97316" />
                <Row label="Em andamento" value={posObraCounts.em_andamento} color="#EAB308" />
                <Row label="Atendido" value={posObraCounts.atendido} color="#06B6D4" />
                <Row label="Aceito" value={posObraCounts.aceito} color="#22C55E" />
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-600 italic">Nenhum pedido registrado ainda.</p>
          )}
        </Section>
      </div>
    </div>
  );
}
