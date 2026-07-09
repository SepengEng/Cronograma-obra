"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AREAS, CHECKLIST,
  type AreaKey, type ItemStatus, type FullChecklist, type ChecklistCategory,
  emptyFullChecklist, countArea,
} from "../checklistData";

type Session = { id: string; name: string; role: string };

type VistoriaData = {
  id: string;
  unitId: string;
  tipo: string;
  status: string;
  responsavel: string | null;
  supervisor: string | null;
  pavimento: string | null;
  checklist: string | null;
  observacoes: string | null;
  iniciadoPor: string | null;
  finalizadoPor: string | null;
  iniciadoEm: string;
  finalizadoEm: string | null;
  unit: { number: string; floor: number; tower: string };
};

const STATUS_STYLES: Record<string, string> = {
  AP: "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]",
  P:  "bg-[#fef9c3] text-[#854d0e] border-[#fde68a]",
  PR: "bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]",
  NE: "bg-[#fee2e2] text-[#991b1b] border-[#fecaca]",
};

function fmtDT(s: string) {
  return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function VistoriaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [vistoria, setVistoria] = useState<VistoriaData | null>(null);
  const [checklist, setChecklist] = useState<FullChecklist | null>(null);
  const [activeArea, setActiveArea] = useState<AreaKey>("apto");
  const [activeCat, setActiveCat] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("session");
    if (!raw) { router.replace("/"); return; }
    setSession(JSON.parse(raw));
  }, [router]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/vistorias/${id}`)
      .then((r) => r.json())
      .then((data: VistoriaData) => {
        setVistoria(data);
        setObservacoes(data.observacoes ?? "");
        setResponsavel(data.responsavel ?? "");
        setSupervisor(data.supervisor ?? "");
        if (data.tipo === "area_comum") setActiveArea("hall");
        const empty = emptyFullChecklist();
        if (data.checklist) {
          try {
            const saved = JSON.parse(data.checklist) as FullChecklist;
            // merge with empty to ensure all keys exist
            for (const areaKey of Object.keys(empty) as AreaKey[]) {
              for (const cat of CHECKLIST) {
                for (const item of cat.items) {
                  if (!empty[areaKey][item.key]) empty[areaKey][item.key] = { status: null, obs: "" };
                  if (saved[areaKey]?.[item.key]) empty[areaKey][item.key] = saved[areaKey][item.key];
                }
              }
            }
          } catch { /* use empty */ }
        }
        setChecklist(empty);
        setActiveCat(CHECKLIST[0].key);
      });
  }, [id]);

  const cats: ChecklistCategory[] = CHECKLIST;
  const isFinished = vistoria?.status === "finalizada";
  const canEdit = !isFinished && !!session;

  const autosave = useCallback((next: FullChecklist, obs?: string, resp?: string, sup?: string) => {
    if (!session || !canEdit) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await fetch(`/api/vistorias/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": session.id },
        body: JSON.stringify({
          checklist: JSON.stringify(next),
          observacoes: obs ?? observacoes,
          responsavel: resp ?? responsavel,
          supervisor: sup ?? supervisor,
        }),
      });
      setSaving(false);
    }, 800);
  }, [session, id, canEdit, observacoes, responsavel, supervisor]);

  const setItemStatus = (itemKey: string, status: ItemStatus) => {
    if (!checklist || !canEdit) return;
    const next: FullChecklist = {
      ...checklist,
      [activeArea]: {
        ...checklist[activeArea],
        [itemKey]: { ...checklist[activeArea][itemKey], status: checklist[activeArea][itemKey].status === status ? null : status },
      },
    };
    setChecklist(next);
    autosave(next);
  };

  const setItemObs = (itemKey: string, obs: string) => {
    if (!checklist || !canEdit) return;
    const next: FullChecklist = {
      ...checklist,
      [activeArea]: { ...checklist[activeArea], [itemKey]: { ...checklist[activeArea][itemKey], obs } },
    };
    setChecklist(next);
    autosave(next);
  };

  const handleFinalize = async () => {
    if (!session || !checklist) return;
    setFinalizing(true);
    const res = await fetch(`/api/vistorias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-id": session.id },
      body: JSON.stringify({ checklist: JSON.stringify(checklist), observacoes, responsavel, supervisor, finalizar: true }),
    });
    const updated = await res.json();
    setVistoria(updated);
    setFinalizing(false);
  };

  const handleHeaderField = (field: "responsavel" | "supervisor", val: string) => {
    if (field === "responsavel") { setResponsavel(val); autosave(checklist!, observacoes, val, supervisor); }
    else { setSupervisor(val); autosave(checklist!, observacoes, responsavel, val); }
  };

  const totalAll = checklist ? AREAS.reduce((acc, a) => { const c = countArea(checklist[a.key]); return { done: acc.done + c.done, total: acc.total + c.total }; }, { done: 0, total: 0 }) : { done: 0, total: 0 };
  const pct = totalAll.total ? Math.round((totalAll.done / totalAll.total) * 100) : 0;

  if (!vistoria || !checklist) {
    return (
      <div className="min-h-screen bg-[#0B1929] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2AB9B0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentCat = cats.find((c) => c.key === activeCat) ?? cats[0];
  const areaChecklist = checklist[activeArea];

  return (
    <div className="min-h-screen bg-[#0B1929] text-white flex flex-col" style={{ fontFamily: "var(--font-sans, sans-serif)" }}>

      {/* Topbar */}
      <div className="bg-[#0F1E2E] border-b border-white/5 px-5 py-3 flex items-center gap-4 flex-shrink-0">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-white transition-colors text-sm">← Voltar</button>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex-1">
          <span className="text-xs text-gray-500">Vistoria &nbsp;·&nbsp; </span>
          <span className="text-sm font-semibold">
            {vistoria.tipo === "area_comum" ? vistoria.unit.number : `AP ${vistoria.unit.number} · ${vistoria.unit.floor}º andar`}
          </span>
          <span className="text-xs text-gray-500 ml-2">· LVS Habite-se</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/vistoria/${id}/relatorio`)}
            className="px-3 py-1.5 rounded-xl border border-white/10 text-gray-300 text-xs font-semibold hover:bg-white/5 hover:text-white transition-colors"
          >
            📄 Relatório
          </button>
          {isFinished ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Finalizada</span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              {saving ? "Salvando…" : "Rascunho"}
            </span>
          )}
          {!isFinished && (
            <button
              onClick={handleFinalize}
              disabled={finalizing}
              className="px-4 py-1.5 rounded-xl bg-[#2AB9B0] text-white text-xs font-bold hover:bg-[#239b93] transition-colors disabled:opacity-50"
            >
              {finalizing ? "Salvando…" : "Salvar vistoria"}
            </button>
          )}
        </div>
      </div>

      {/* Header form */}
      <div className="bg-[#0F1E2E] border-b border-white/5 px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
        {[
          { label: "Data", value: new Date(vistoria.iniciadoEm).toLocaleDateString("pt-BR"), readonly: true },
          { label: "Responsável pela vistoria", value: responsavel, field: "responsavel" as const },
          { label: "Visto / Supervisor", value: supervisor, field: "supervisor" as const },
          { label: "Pavimento", value: `${vistoria.unit.floor}º andar`, readonly: true },
        ].map((f) => (
          <div key={f.label} className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{f.label}</span>
            {f.readonly ? (
              <span className="text-sm font-medium text-[#2AB9B0] bg-[#0A1521] px-2 py-1.5 rounded-lg border border-white/5">{f.value}</span>
            ) : (
              <input
                disabled={isFinished}
                value={f.value}
                onChange={(e) => handleHeaderField(f.field!, e.target.value)}
                placeholder="—"
                className="text-sm bg-[#0A1521] border border-white/5 rounded-lg px-2 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2AB9B0] disabled:opacity-50"
              />
            )}
          </div>
        ))}
      </div>

      {/* Identification bar */}
      <div className="bg-[#2AB9B0]/10 border-b border-[#2AB9B0]/20 px-5 py-2 flex flex-wrap gap-4 text-xs flex-shrink-0">
        <span className="text-gray-400">Iniciado por <span className="text-[#2AB9B0] font-medium">{vistoria.iniciadoPor ?? "—"}</span></span>
        <span className="text-white/10">·</span>
        <span className="text-gray-400">Início <span className="text-white/70 font-medium">{fmtDT(vistoria.iniciadoEm)}</span></span>
        <span className="text-white/10">·</span>
        <span className="text-gray-400">Finalizado por <span className="font-medium" style={{ color: vistoria.finalizadoPor ? "#2AB9B0" : "#4b5563" }}>{vistoria.finalizadoPor ?? "—"}</span></span>
        <span className="text-white/10">·</span>
        <span className="text-gray-400">Fim <span className="font-medium" style={{ color: vistoria.finalizadoEm ? "rgba(255,255,255,.7)" : "#4b5563" }}>{vistoria.finalizadoEm ? fmtDT(vistoria.finalizadoEm) : "—"}</span></span>
      </div>

      {/* Area tabs */}
      <div className="bg-[#0A1521] border-b border-white/5 px-5 flex gap-1 flex-shrink-0 overflow-x-auto">
        {AREAS.filter((a) => vistoria?.tipo === "area_comum" ? a.key !== "apto" : a.key === "apto").map((area) => {
          const { done, total } = countArea(checklist[area.key]);
          const allDone = total > 0 && done === total;
          return (
            <button
              key={area.key}
              onClick={() => setActiveArea(area.key)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2
                ${activeArea === area.key
                  ? "border-[#2AB9B0] text-[#2AB9B0]"
                  : "border-transparent text-gray-500 hover:text-gray-300"}`}
            >
              {area.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium
                ${allDone ? "bg-emerald-500/15 text-emerald-400" : done > 0 ? "bg-yellow-500/15 text-yellow-400" : "bg-white/5 text-gray-600"}`}>
                {done}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Category sidebar */}
        <div className="w-48 flex-shrink-0 border-r border-white/5 bg-[#0A1521] flex flex-col overflow-y-auto">
          <div className="px-4 py-2.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Categorias</div>
          {cats.map((cat) => {
            const items = cat.items;
            const done = items.filter((i) => areaChecklist[i.key]?.status !== null).length;
            const allDone = done === items.length;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCat(cat.key)}
                className={`flex items-center justify-between px-4 py-2 text-xs text-left border-l-2 transition-all
                  ${activeCat === cat.key
                    ? "border-[#2AB9B0] bg-[#2AB9B0]/10 text-[#2AB9B0] font-semibold"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]"}`}
              >
                <span className="leading-tight">{cat.label}</span>
                <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded-full flex-shrink-0
                  ${allDone ? "bg-emerald-500/15 text-emerald-400" : done > 0 ? "bg-yellow-500/15 text-yellow-400" : "bg-white/5 text-gray-600"}`}>
                  {done}/{items.length}
                </span>
              </button>
            );
          })}

          {/* Total progress */}
          <div className="mt-auto px-4 py-3 border-t border-white/5">
            <div className="text-[10px] text-gray-600 mb-1.5">Progresso total</div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
              <div className="h-full rounded-full bg-[#2AB9B0] transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-[10px] text-gray-600">{totalAll.done} de {totalAll.total} itens ({pct}%)</div>
          </div>
        </div>

        {/* Checklist table */}
        <div className="flex-1 overflow-y-auto">
          {/* Column header */}
          <div className="grid bg-[#0D1B2A] border-b border-white/5 sticky top-0 z-10" style={{ gridTemplateColumns: "1fr 220px 280px" }}>
            <div className="px-5 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">{currentCat.label}</div>
            <div className="border-l border-white/5 grid grid-cols-4 text-center">
              {["AP", "P", "PR", "NE"].map((s) => (
                <div key={s} className="py-2.5 text-[10px] font-bold" style={{ color: s === "AP" ? "#166534" : s === "P" ? "#854d0e" : s === "PR" ? "#1e40af" : "#991b1b" }}>{s}</div>
              ))}
            </div>
            <div className="border-l border-white/5 px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Observação</div>
          </div>

          {currentCat.items.map((item, idx) => {
            const cell = areaChecklist[item.key] ?? { status: null, obs: "" };
            return (
              <div
                key={item.key}
                className={`grid border-b border-white/[0.04] transition-colors ${idx % 2 === 1 ? "bg-white/[0.01]" : ""}`}
                style={{ gridTemplateColumns: "1fr 220px 280px" }}
              >
                <div className="px-5 py-3 text-xs text-gray-200 flex items-center leading-relaxed">{item.label}</div>
                <div className="border-l border-white/5 grid grid-cols-4">
                  {(["AP", "P", "PR", "NE"] as ItemStatus[]).map((s) => (
                    <button
                      key={s}
                      disabled={!canEdit}
                      onClick={() => setItemStatus(item.key, s)}
                      className={`flex items-center justify-center py-3 text-[11px] font-bold border-r border-white/[0.04] last:border-0 transition-all
                        ${cell.status === s
                          ? STATUS_STYLES[s!]
                          : "text-gray-600 hover:bg-white/[0.04] hover:text-gray-400"}
                        ${!canEdit ? "cursor-default" : "cursor-pointer"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="border-l border-white/5 flex items-center px-3">
                  <input
                    disabled={!canEdit}
                    value={cell.obs}
                    onChange={(e) => setItemObs(item.key, e.target.value)}
                    placeholder="Observação…"
                    className="w-full bg-transparent text-xs text-white placeholder-gray-700 focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>
            );
          })}

          {/* Category observations */}
          <div className="px-5 py-4 border-t border-white/5 bg-[#0A1521]">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Observações gerais da vistoria</div>
            <textarea
              disabled={!canEdit}
              value={observacoes}
              onChange={(e) => { setObservacoes(e.target.value); autosave(checklist, e.target.value); }}
              rows={2}
              placeholder="Anotações livres sobre esta vistoria…"
              className="w-full bg-[#0F1E2E] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2AB9B0] resize-none disabled:opacity-40"
            />
          </div>
        </div>
      </div>

      {/* Footer legend */}
      <div className="bg-[#0A1521] border-t border-white/5 px-5 py-2 flex items-center gap-6 text-[11px] flex-shrink-0">
        <span className="text-gray-600">Legenda:</span>
        {[["AP","Aprovado","#166534","#dcfce7"],["P","Pendente","#854d0e","#fef9c3"],["PR","Pendente resolvido","#1e40af","#dbeafe"],["NE","Não executado","#991b1b","#fee2e2"]].map(([k,v,c,bg]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: bg, color: c }}>{k}</span>
            <span className="text-gray-500">{v}</span>
          </span>
        ))}
        <span className="ml-auto text-gray-600">Área: <span className="text-gray-400 font-medium">{AREAS.find((a) => a.key === activeArea)?.label}</span></span>
      </div>
    </div>
  );
}
