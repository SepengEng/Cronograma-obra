"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Unit, UnitStatus, UnitPatch, PendenciaItem } from "./unitTypes";
import { STATUS_COLOR, STATUS_LABEL, STATUS_EMOJI, ALL_STATUSES, floorName, isSpecialLevel, isCommonArea } from "./unitTypes";
import ApartmentModal from "./ApartmentModal";

const Building3D = dynamic(() => import("./Building3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0A1521]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#2AB9B0] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Carregando prédio 3D…</p>
      </div>
    </div>
  ),
});

/* ── Status picker popover (portal – avoid overflow clipping) ──── */
function StatusPopover({
  unit,
  anchorRect,
  isAdmin,
  saving,
  onSelect,
  onClose,
}: {
  unit: Unit;
  anchorRect: DOMRect;
  isAdmin: boolean;
  saving: boolean;
  onSelect: (s: UnitStatus) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  // Posiciona abaixo do botão, com clamp horizontal e flip vertical p/ caber na tela
  const W = 224, H = 340;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  let left = anchorRect.left + anchorRect.width / 2;
  left = Math.min(Math.max(left, W / 2 + 8), vw - W / 2 - 8);
  const below = anchorRect.bottom + 6;
  const top = below + H > vh ? Math.max(8, anchorRect.top - H - 6) : below;

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top, left, transform: "translateX(-50%)", zIndex: 9999, width: W }}
      className="bg-[#0D1B2A] border border-white/10 rounded-2xl shadow-2xl p-1.5"
    >
      <div className="px-3 py-2 mb-1 border-b border-white/5">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Unidade {unit.number}</p>
        {unit.responsavel && <p className="text-xs text-gray-400 truncate">{unit.responsavel}</p>}
      </div>
      {ALL_STATUSES.map((s) => {
        const cur = unit.status === s;
        const c = STATUS_COLOR[s];
        return (
          <button
            key={s}
            disabled={!isAdmin || saving}
            onClick={() => { onSelect(s); onClose(); }}
            className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left
              ${cur ? "" : "hover:bg-white/5"} ${saving ? "opacity-50 cursor-wait" : ""}`}
            style={cur ? { backgroundColor: c + "22" } : {}}
          >
            <span className="text-base leading-none w-5 text-center flex-shrink-0">{STATUS_EMOJI[s]}</span>
            <span className="flex-1" style={{ color: cur ? c : "#cbd5e1" }}>{STATUS_LABEL[s]}</span>
            {cur && <span className="text-sm flex-shrink-0" style={{ color: c }}>✓</span>}
          </button>
        );
      })}
    </div>,
    document.body
  );
}

/* ── Controle de status (pílula + popover) ─────────────────────── */
function StatusControl({
  unit, isAdmin, onUpdate,
}: {
  unit: Unit;
  isAdmin: boolean;
  onUpdate: (id: string, status: UnitStatus) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const color = STATUS_COLOR[unit.status];

  const openMenu = () => {
    if (!isAdmin) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (r) { setRect(r); setOpen(true); }
  };
  const select = async (s: UnitStatus) => {
    setSaving(true);
    await onUpdate(unit.id, s);
    setSaving(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={openMenu}
        disabled={saving}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all whitespace-nowrap flex-shrink-0
          ${isAdmin ? "hover:brightness-125 cursor-pointer" : "cursor-default"} ${saving ? "opacity-60" : ""}`}
        style={{ backgroundColor: color + "22", borderColor: color + "55", color }}
      >
        <span className="text-[10px] leading-none">{STATUS_EMOJI[unit.status]}</span>
        {STATUS_LABEL[unit.status]}
        {isAdmin && <span className="opacity-50">▾</span>}
      </button>
      {open && rect && (
        <StatusPopover
          unit={unit}
          anchorRect={rect}
          isAdmin={isAdmin}
          saving={saving}
          onSelect={select}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/* ── Vistoria badge ─────────────────────────────────────────────── */
type VistoriaSub = {
  status?: string;
  dataRecebimento?: string;
  termoItens?: Record<string, { status: string | null; obs: string }>;
};

// Deriva pendências (itens "Não Aceito") de uma sub-vistoria
function naoAceitosDe(sub: VistoriaSub | undefined): string[] {
  if (!sub?.termoItens) return [];
  return Object.entries(sub.termoItens)
    .filter(([, v]) => v?.status === "nao_aceito")
    .map(([item, v]) => (v.obs?.trim() ? `${item} — ${v.obs.trim()}` : item));
}

function parseVistoriaCheck(raw: string | null): { subs: VistoriaSub[] } | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    // novo formato { apto, areaComum }
    if (p.apto || p.areaComum) return { subs: [p.apto, p.areaComum].filter(Boolean) as VistoriaSub[] };
    // formato antigo (flat)
    return { subs: [p as VistoriaSub] };
  } catch { return null; }
}

function VistoriaBadge({ raw, onClick }: { raw: string | null; onClick: () => void }) {
  const parsed = parseVistoriaCheck(raw);
  const subs = parsed?.subs ?? [];

  const comPend  = subs.find((s) => s.status === "recebido_com_pendencias");
  const recebido = subs.find((s) => s.status === "recebido_sem_pendencias");

  // Nenhum documento recebido → pendente
  if (!comPend && !recebido) {
    return (
      <button onClick={onClick} className="flex items-center gap-1.5 w-full group/v">
        <div className="w-1.5 h-1.5 rounded-full bg-white/10 flex-shrink-0" />
        <span className="text-[10px] text-gray-600 group-hover/v:text-gray-400 transition-colors truncate">Doc. vistoria pendente</span>
      </button>
    );
  }

  // Recebido, sem pendências apontadas em nenhuma sub
  if (!comPend && recebido) {
    return (
      <button onClick={onClick} className="flex items-center gap-1.5 w-full group/v">
        <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] flex-shrink-0" />
        <span className="text-[10px] text-[#22C55E] font-medium truncate">Doc. recebido</span>
        {recebido.dataRecebimento && <span className="text-[10px] text-gray-600 ml-auto flex-shrink-0">{new Date(recebido.dataRecebimento + "T00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>}
      </button>
    );
  }

  // Com pendências — deriva dos "Não Aceito" de todas as subs
  const pends = subs.flatMap((s) => naoAceitosDe(s));
  return (
    <button onClick={onClick} className="flex flex-col gap-1 w-full text-left group/v">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#EF4444]" />
        <span className="text-[10px] font-medium flex-1 truncate text-[#EF4444]">
          {pends.length > 0
            ? `${pends.length} pendência${pends.length !== 1 ? "s" : ""} na vistoria`
            : "Recebido com pendências"}
        </span>
      </div>
      {pends.length > 0 && (
        <ul className="flex flex-col gap-0.5 pl-3">
          {pends.slice(0, 4).map((p, i) => (
            <li key={i} className="text-[10px] text-gray-400 truncate leading-tight">• {p}</li>
          ))}
          {pends.length > 4 && <li className="text-[10px] text-gray-600">+{pends.length - 4} mais…</li>}
        </ul>
      )}
    </button>
  );
}

/* ── Card de unidade (número + dono + status) ──────────────────── */
function UnitCard({
  unit,
  isAdmin,
  onUpdateUnit,
  onOpenFicha,
  onCreateVistoria,
  vistoriaId,
  onOpenVistoria,
}: {
  unit: Unit;
  isAdmin: boolean;
  onUpdateUnit: (id: string, status: UnitStatus, notes?: string, extras?: { responsavel?: string; pendencias?: string }) => Promise<void>;
  onOpenFicha: (id: string) => void;
  onCreateVistoria?: (unitId: string, tipo: "habitese" | "area_comum") => Promise<void>;
  vistoriaId?: string;
  onOpenVistoria?: (vistoriaId: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const color = STATUS_COLOR[unit.status];
  const special = isSpecialLevel(unit.floor);
  const common = isCommonArea(unit);
  const vistoriaTipo: "habitese" | "area_comum" = special || common ? "area_comum" : "habitese";

  const handleCreate = async () => {
    setCreating(true);
    await onCreateVistoria?.(unit.id, vistoriaTipo);
    setCreating(false);
  };

  return (
    <div
      className="bg-[#0F1E2E] border border-white/5 rounded-xl p-3 flex flex-col gap-2 hover:border-white/15 transition-all"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      {/* Linha 1: número + status */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => onOpenFicha(unit.id)}
          className="flex items-center gap-1.5 group/f min-w-0"
          title="Abrir ficha completa"
        >
          <span className="text-lg font-black text-white group-hover/f:text-[#2AB9B0] transition-colors">{unit.number}</span>
          <span className="opacity-0 group-hover/f:opacity-100 text-[10px] text-[#2AB9B0] transition-opacity">📁</span>
        </button>
        <StatusControl unit={unit} isAdmin={isAdmin} onUpdate={onUpdateUnit} />
      </div>

      {/* Linha 2: proprietário (só apartamentos) */}
      {!special && !common && (
        <button onClick={() => onOpenFicha(unit.id)} className="text-left min-w-0" title={unit.responsavel ?? undefined}>
          <span className={`text-xs truncate block ${unit.responsavel ? "text-gray-300 hover:text-white" : "text-gray-600"} transition-colors`}>
            {unit.responsavel ? `👤 ${unit.responsavel}` : (isAdmin ? "+ proprietário" : "—")}
          </span>
        </button>
      )}

      {/* Linha 3: vistoria */}
      <div className="pt-1.5 border-t border-white/[0.04]">
        <VistoriaBadge raw={unit.vistoriaCheck} onClick={() => onOpenFicha(unit.id)} />
      </div>

      {/* Linha 4: botão de vistoria — se já existe, abre a existente */}
      {vistoriaId && onOpenVistoria ? (
        <button
          onClick={() => onOpenVistoria(vistoriaId)}
          className="w-full py-1 rounded-lg border border-[#2AB9B0]/40 bg-[#2AB9B0]/10 text-[#2AB9B0] text-[10px] font-semibold hover:bg-[#2AB9B0]/20 transition-all"
        >
          📋 Ver vistoria
        </button>
      ) : onCreateVistoria ? (
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full py-1 rounded-lg border border-[#2AB9B0]/20 text-[#2AB9B0] text-[10px] font-semibold hover:bg-[#2AB9B0]/10 transition-all disabled:opacity-50"
        >
          {creating ? "Criando…" : special || common ? "✓ Pré-vistoria" : "✓ Nova vistoria"}
        </button>
      ) : null}
    </div>
  );
}

/* ── Table view ─────────────────────────────────────────────────── */
function GridView({
  units,
  isAdmin,
  onUpdateUnit,
  onOpenFicha,
  onCreateVistoria,
  vistoriaByUnit = {},
  onOpenVistoria,
}: {
  units: Unit[];
  isAdmin: boolean;
  onUpdateUnit: (id: string, status: UnitStatus, notes?: string, extras?: { responsavel?: string; pendencias?: string }) => Promise<void>;
  onOpenFicha: (id: string) => void;
  onCreateVistoria?: (unitId: string, tipo: "habitese" | "area_comum") => Promise<void>;
  vistoriaByUnit?: Record<string, string>;
  onOpenVistoria?: (vistoriaId: string) => void;
}) {
  const [filterStatus, setFilterStatus] = useState<UnitStatus | "all">("all");
  const [search, setSearch] = useState("");

  // conta só apartamentos (posições 1-6) para os filtros
  const aptsOnly = units.filter((u) => !isSpecialLevel(u.floor) && !isCommonArea(u));

  const filtered = units
    .filter((u) => filterStatus === "all" || u.status === filterStatus)
    .filter((u) => !search || u.number.toLowerCase().includes(search.toLowerCase()) || (u.responsavel ?? "").toLowerCase().includes(search.toLowerCase()));

  const floors = Array.from(new Set(filtered.map((u) => u.floor))).sort((a, b) => b - a);
  const unitsOf = (f: number) => filtered.filter((u) => u.floor === f).sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar unidade ou proprietário…"
          className="bg-[#0F1E2E] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2AB9B0] w-52"
        />
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all
            ${filterStatus === "all" ? "bg-white/10 border-white/20 text-white" : "border-white/10 text-gray-500 hover:text-gray-300"}`}
        >
          Todas ({aptsOnly.length})
        </button>
        {ALL_STATUSES.map((s) => {
          const count = aptsOnly.filter((u) => u.status === s).length;
          if (count === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s === filterStatus ? "all" : s)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all
                ${filterStatus === s ? "text-white border-white/20" : "border-white/10 text-gray-500 hover:text-gray-300"}`}
              style={filterStatus === s ? { backgroundColor: STATUS_COLOR[s] + "33", borderColor: STATUS_COLOR[s] + "66" } : {}}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[s] }} />
              {STATUS_LABEL[s]} ({count})
            </button>
          );
        })}
      </div>

      {/* Andares */}
      {floors.length === 0 && (
        <p className="text-center text-xs text-gray-600 py-8">Nenhuma unidade encontrada</p>
      )}
      {floors.map((floor) => {
        const special = isSpecialLevel(floor);
        return (
          <div key={floor} className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h3 className={`text-sm font-bold whitespace-nowrap ${special ? "text-gray-400" : "text-[#2AB9B0]"}`}>{floorName(floor)}</h3>
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[10px] text-gray-600 whitespace-nowrap">{unitsOf(floor).length} un.</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {unitsOf(floor).map((unit) => (
                <UnitCard key={unit.id} unit={unit} isAdmin={isAdmin} onUpdateUnit={onUpdateUnit} onOpenFicha={onOpenFicha} onCreateVistoria={onCreateVistoria} vistoriaId={vistoriaByUnit[unit.id]} onOpenVistoria={onOpenVistoria} />
              ))}
            </div>
          </div>
        );
      })}

      {isAdmin && (
        <p className="text-[11px] text-gray-600 text-center">
          Clique no número para abrir a ficha · Clique no status para alterar
        </p>
      )}
    </div>
  );
}

function parsePendencias(raw: string | null): PendenciaItem[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

/* ── Checklist de Pendências ───────────────────────────────────── */
function PendenciasPanel({
  unit,
  isAdmin,
  onSave,
}: {
  unit: Unit;
  isAdmin: boolean;
  onSave: (items: PendenciaItem[]) => Promise<void>;
}) {
  const [items, setItems] = useState<PendenciaItem[]>(() => parsePendencias(unit.pendencias));
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync when unit changes externally
  useEffect(() => {
    setItems(parsePendencias(unit.pendencias));
  }, [unit.pendencias]);

  const save = async (next: PendenciaItem[]) => {
    setSaving(true);
    await onSave(next);
    setSaving(false);
  };

  const toggle = (id: string) => {
    const next = items.map((it) => it.id === id ? { ...it, done: !it.done } : it);
    setItems(next);
    save(next);
  };

  const remove = (id: string) => {
    const next = items.filter((it) => it.id !== id);
    setItems(next);
    save(next);
  };

  const add = () => {
    const text = newText.trim();
    if (!text) return;
    const next = [...items, { id: crypto.randomUUID(), text, done: false }];
    setItems(next);
    setNewText("");
    save(next);
  };

  const done = items.filter((i) => i.done).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pendências</p>
        {items.length > 0 && (
          <span className="text-[10px] text-gray-500">{done}/{items.length}</span>
        )}
      </div>

      {items.length === 0 && (
        <p className="text-[11px] text-gray-600 italic">Nenhuma pendência registrada</p>
      )}

      {items.map((it) => (
        <div key={it.id} className="flex items-start gap-2 group">
          <button
            onClick={() => isAdmin && toggle(it.id)}
            className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-all
              ${it.done
                ? "bg-[#2AB9B0] border-[#2AB9B0] text-white"
                : "border-white/20 hover:border-[#2AB9B0]/60"}
              ${!isAdmin ? "cursor-default" : "cursor-pointer"}
            `}
          >
            {it.done && <span className="text-[9px] font-bold">✓</span>}
          </button>
          <span className={`text-xs flex-1 leading-tight pt-0.5 ${it.done ? "line-through text-gray-600" : "text-gray-300"}`}>
            {it.text}
          </span>
          {isAdmin && (
            <button
              onClick={() => remove(it.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-[10px] transition-all flex-shrink-0 mt-0.5"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {isAdmin && (
        <div className="flex gap-1.5 mt-1">
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Nova pendência…"
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2AB9B0] min-w-0"
          />
          <button
            onClick={add}
            disabled={saving || !newText.trim()}
            className="px-2 py-1 rounded-lg bg-[#2AB9B0] text-white text-[11px] font-bold disabled:opacity-40 flex-shrink-0"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main BuildingView ─────────────────────────────────────────── */
export default function BuildingView({
  units,
  isAdmin,
  sessionId,
  onUpdateUnit,
  onPatch,
  onCreateVistoria,
  vistoriaByUnit = {},
  onOpenVistoria,
}: {
  units: Unit[];
  isAdmin: boolean;
  sessionId: string;
  onUpdateUnit: (id: string, status: UnitStatus, notes?: string, extras?: { responsavel?: string; pendencias?: string }) => Promise<void>;
  onPatch: (id: string, patch: UnitPatch) => Promise<void>;
  onCreateVistoria?: (unitId: string, tipo: "habitese" | "area_comum") => Promise<void>;
  vistoriaByUnit?: Record<string, string>;
  onOpenVistoria?: (vistoriaId: string) => void;
}) {
  const [viewMode, setViewMode] = useState<"3d" | "grid">("3d");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [fichaUnitId, setFichaUnitId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [editResponsavel, setEditResponsavel] = useState("");
  const [showResponsavel, setShowResponsavel] = useState(false);

  // Keep selectedUnit in sync with latest units data
  const syncedSelected = selectedUnit
    ? (units.find((u) => u.id === selectedUnit.id) ?? null)
    : null;

  const handleSelect = (u: Unit | null) => {
    setSelectedUnit(u);
    setEditNotes(u?.notes ?? "");
    setEditResponsavel(u?.responsavel ?? "");
    setShowNotes(false);
    setShowResponsavel(false);
  };

  const handleStatusChange = async (status: UnitStatus) => {
    if (!syncedSelected || !isAdmin) return;
    setSaving(true);
    await onUpdateUnit(syncedSelected.id, status);
    setSaving(false);
  };

  const handleSaveNotes = async () => {
    if (!syncedSelected || !isAdmin) return;
    setSaving(true);
    await onUpdateUnit(syncedSelected.id, syncedSelected.status, editNotes);
    setSaving(false);
    setShowNotes(false);
  };

  const handleSaveResponsavel = async () => {
    if (!syncedSelected || !isAdmin) return;
    setSaving(true);
    await onUpdateUnit(syncedSelected.id, syncedSelected.status, undefined, { responsavel: editResponsavel });
    setSaving(false);
    setShowResponsavel(false);
  };

  const handleSavePendencias = async (items: PendenciaItem[]) => {
    if (!syncedSelected) return;
    await onUpdateUnit(syncedSelected.id, syncedSelected.status, undefined, {
      pendencias: JSON.stringify(items),
    });
  };

  // Stats per status
  const counts = ALL_STATUSES.reduce<Record<UnitStatus, number>>(
    (acc, s) => ({ ...acc, [s]: units.filter((u) => u.status === s).length }),
    {} as Record<UnitStatus, number>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar + view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 flex-1">
          {ALL_STATUSES.map((s) => (
            <div
              key={s}
              className="flex items-center gap-2 bg-[#0F1E2E] border border-white/5 rounded-xl px-3 py-2"
            >
              <div
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: STATUS_COLOR[s] }}
              />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 leading-tight truncate">{STATUS_LABEL[s]}</p>
                <p className="text-sm font-bold text-white leading-tight">{counts[s]}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toggle */}
        <div className="flex gap-1 bg-[#0F1E2E] border border-white/5 rounded-xl p-1 self-start sm:self-auto flex-shrink-0">
          <button
            onClick={() => setViewMode("3d")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "3d"
                ? "bg-[#2AB9B0] text-white shadow"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            🏢 3D
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "grid"
                ? "bg-[#2AB9B0] text-white shadow"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            ⊞ Grade
          </button>
        </div>
      </div>

      {/* ── Grid view ── */}
      {viewMode === "grid" && (
        <GridView units={units} isAdmin={isAdmin} onUpdateUnit={onUpdateUnit} onOpenFicha={setFichaUnitId} onCreateVistoria={onCreateVistoria} vistoriaByUnit={vistoriaByUnit} onOpenVistoria={onOpenVistoria} />
      )}

      {/* ── Ficha completa do apartamento ── */}
      {fichaUnitId && (() => {
        const fu = units.find((u) => u.id === fichaUnitId);
        return fu ? (
          <ApartmentModal unit={fu} isAdmin={isAdmin} sessionId={sessionId} onPatch={onPatch} onClose={() => setFichaUnitId(null)} />
        ) : null;
      })()}

      {/* ── 3D view ── */}
      {viewMode === "3d" && (
        <div className="flex gap-3 items-stretch">
          {/* 3D Canvas */}
          <div
            className="flex-1 rounded-2xl overflow-hidden border border-white/5 shadow-xl"
            style={{ height: 520 }}
          >
            <Building3D
              units={units}
              selectedId={syncedSelected?.id ?? null}
              onSelect={handleSelect}
            />
          </div>

          {/* Side panel */}
          <div className="w-56 flex-shrink-0 flex flex-col gap-3">
            {syncedSelected ? (
              <>
                {/* Unit header */}
                <div className="bg-[#0F1E2E] border border-white/5 rounded-2xl p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    {isSpecialLevel(syncedSelected.floor) ? "Nível" : isCommonArea(syncedSelected) ? "Área Comum" : "Unidade"}
                  </p>
                  <p className="text-2xl font-black text-white leading-tight">{syncedSelected.number}</p>
                  {syncedSelected.responsavel && (
                    <p className="text-xs text-gray-300 mt-0.5 truncate">👤 {syncedSelected.responsavel}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">{syncedSelected.tower}</p>
                  {!isSpecialLevel(syncedSelected.floor) && !isCommonArea(syncedSelected) && (
                    <p className="text-xs text-gray-500">
                      {floorName(syncedSelected.floor)} · Posição {syncedSelected.position}
                    </p>
                  )}
                  {isCommonArea(syncedSelected) && (
                    <p className="text-xs text-gray-500">{floorName(syncedSelected.floor)} · hall, escada, área técnica</p>
                  )}
                  <button
                    onClick={() => setFichaUnitId(syncedSelected.id)}
                    className="mt-3 w-full py-2 rounded-xl bg-[#2AB9B0] hover:bg-[#1EA59D] text-white text-xs font-bold transition-all"
                  >
                    📁 Ver ficha completa
                  </button>
                </div>

                {/* Pendências checklist */}
                <div className={`bg-[#0F1E2E] rounded-2xl p-4 transition-all ${
                  syncedSelected.status === "pendencia"
                    ? "border border-[#EAB308]/40 shadow-[0_0_12px_#EAB30820]"
                    : "border border-white/5"
                }`}>
                  {syncedSelected.status === "pendencia" && (
                    <p className="text-[10px] font-bold text-[#EAB308] uppercase tracking-wider mb-2">
                      ⚠️ Itens a resolver
                    </p>
                  )}
                  <PendenciasPanel
                    unit={syncedSelected}
                    isAdmin={isAdmin}
                    onSave={handleSavePendencias}
                  />
                </div>

                {/* Status selector */}
                <div className="bg-[#0F1E2E] border border-white/5 rounded-2xl p-4 flex-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Status
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {ALL_STATUSES.map((s) => (
                      <button
                        key={s}
                        disabled={!isAdmin || saving}
                        onClick={() => handleStatusChange(s)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left
                          ${
                            syncedSelected.status === s
                              ? "border-white/20 bg-white/10 text-white"
                              : isAdmin
                              ? "border-white/5 text-gray-400 hover:border-white/15 hover:bg-white/5 hover:text-white"
                              : "border-white/5 text-gray-600 cursor-default"
                          }
                          ${saving ? "opacity-50 cursor-wait" : ""}`}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: STATUS_COLOR[s] }}
                        />
                        <span className="flex-1">{STATUS_LABEL[s]}</span>
                        {syncedSelected.status === s && (
                          <span className="text-[#2AB9B0]">✓</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Notes toggle */}
                  {isAdmin && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      {showNotes ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            rows={3}
                            placeholder="Observações…"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2AB9B0] text-xs resize-none"
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setShowNotes(false)}
                              className="flex-1 py-1.5 rounded-lg border border-white/10 text-gray-400 text-xs"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleSaveNotes}
                              disabled={saving}
                              className="flex-1 py-1.5 rounded-lg bg-[#2AB9B0] text-white text-xs font-bold disabled:opacity-50"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowNotes(true)}
                          className="w-full text-xs text-gray-500 hover:text-gray-300 text-left transition-colors"
                        >
                          {syncedSelected.notes
                            ? `📝 ${syncedSelected.notes.slice(0, 40)}${syncedSelected.notes.length > 40 ? "…" : ""}`
                            : "+ Adicionar observação"}
                        </button>
                      )}
                    </div>
                  )}
                  {!isAdmin && syncedSelected.notes && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-xs text-gray-500">{syncedSelected.notes}</p>
                    </div>
                  )}

                  {/* Responsável */}
                  <div className="mt-3 pt-3 border-t border-white/5">
                    {isAdmin && showResponsavel ? (
                      <div className="flex flex-col gap-2">
                        <input
                          value={editResponsavel}
                          onChange={(e) => setEditResponsavel(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveResponsavel()}
                          placeholder="Nome do responsável…"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2AB9B0] text-xs"
                        />
                        <div className="flex gap-1.5">
                          <button onClick={() => setShowResponsavel(false)} className="flex-1 py-1.5 rounded-lg border border-white/10 text-gray-400 text-xs">Cancelar</button>
                          <button onClick={handleSaveResponsavel} disabled={saving} className="flex-1 py-1.5 rounded-lg bg-[#2AB9B0] text-white text-xs font-bold disabled:opacity-50">Salvar</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { if (isAdmin) { setEditResponsavel(syncedSelected.responsavel ?? ""); setShowResponsavel(true); } }}
                        className={`w-full text-xs text-left transition-colors ${isAdmin ? "text-gray-500 hover:text-gray-300" : "text-gray-500 cursor-default"}`}
                      >
                        {syncedSelected.responsavel
                          ? `👤 ${syncedSelected.responsavel}`
                          : isAdmin ? "+ Adicionar responsável" : ""}
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div
                className="bg-[#0F1E2E] border border-white/5 rounded-2xl flex-1 flex flex-col items-center justify-center text-center p-5"
                style={{ height: 520 }}
              >
                <p className="text-3xl mb-3 opacity-60">🏢</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Clique em uma unidade no prédio para ver detalhes
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Arraste para girar · Scroll para zoom
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 items-center bg-[#0F1E2E] border border-white/5 rounded-2xl px-5 py-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Legenda</p>
        {ALL_STATUSES.map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATUS_COLOR[s] }} />
            <span className="text-xs text-gray-400">{STATUS_LABEL[s]}</span>
          </div>
        ))}
        <p className="text-xs text-gray-600 ml-auto">Torre Única · 16 andares · 96 unidades</p>
      </div>
    </div>
  );
}
