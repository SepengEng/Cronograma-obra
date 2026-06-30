"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Unit, UnitStatus, PendenciaItem } from "./unitTypes";
import { STATUS_COLOR, STATUS_LABEL, STATUS_EMOJI, ALL_STATUSES } from "./unitTypes";

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

  // Position below & centred on the button that opened this popover
  const top  = anchorRect.bottom + 6;
  const left = anchorRect.left + anchorRect.width / 2;

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top, left, transform: "translateX(-50%)", zIndex: 9999 }}
      className="bg-[#0D1B2A] border border-white/10 rounded-2xl shadow-2xl p-2 min-w-[168px]"
    >
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 pb-1.5">
        Unidade {unit.number}
      </p>
      {ALL_STATUSES.map((s) => (
        <button
          key={s}
          disabled={!isAdmin || saving}
          onClick={() => { onSelect(s); onClose(); }}
          className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-xl text-xs font-semibold transition-all text-left
            ${unit.status === s
              ? "bg-white/10 text-white"
              : "text-gray-400 hover:bg-white/5 hover:text-white"}
            ${saving ? "opacity-50 cursor-wait" : ""}
          `}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLOR[s] }} />
          <span className="flex-1">{STATUS_LABEL[s]}</span>
          {unit.status === s && <span className="text-[#2AB9B0] text-[10px]">✓</span>}
        </button>
      ))}
    </div>,
    document.body
  );
}

/* ── 2-D grid view ─────────────────────────────────────────────── */
function GridView({
  units,
  isAdmin,
  onUpdateUnit,
}: {
  units: Unit[];
  isAdmin: boolean;
  onUpdateUnit: (id: string, status: UnitStatus, notes?: string) => Promise<void>;
}) {
  // Store the open unit AND the DOMRect of the button that opened it
  const [openUnit, setOpenUnit] = useState<{ unit: Unit; rect: DOMRect } | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<UnitStatus | "all">("all");

  const floors = Array.from(new Set(units.map((u) => u.floor))).sort((a, b) => b - a); // 16→1
  const positions = Array.from(new Set(units.map((u) => u.position))).sort((a, b) => a - b);

  const unitMap = new Map(units.map((u) => [`${u.floor}-${u.position}`, u]));

  const filtered = filterStatus === "all" ? units : units.filter((u) => u.status === filterStatus);
  const filteredIds = new Set(filtered.map((u) => u.id));

  const handleSelect = async (unit: Unit, s: UnitStatus) => {
    if (!isAdmin) return;
    setSaving(true);
    await onUpdateUnit(unit.id, s);
    setSaving(false);
  };

  // Keep open unit in sync when units data refreshes after a save
  const syncedOpenUnit = openUnit
    ? { ...openUnit, unit: units.find((u) => u.id === openUnit.unit.id) ?? openUnit.unit }
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Status picker portal — rendered at body level, never clipped */}
      {syncedOpenUnit && isAdmin && (
        <StatusPopover
          unit={syncedOpenUnit.unit}
          anchorRect={syncedOpenUnit.rect}
          isAdmin={isAdmin}
          saving={saving}
          onSelect={(s) => handleSelect(syncedOpenUnit.unit, s)}
          onClose={() => setOpenUnit(null)}
        />
      )}

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all
            ${filterStatus === "all" ? "bg-white/10 border-white/20 text-white" : "border-white/10 text-gray-500 hover:text-gray-300"}`}
        >
          Todas ({units.length})
        </button>
        {ALL_STATUSES.map((s) => {
          const count = units.filter((u) => u.status === s).length;
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

      {/* Grid */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0A1521]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-10 px-3 py-2 text-[10px] font-bold text-gray-600 uppercase tracking-wider text-right border-b border-white/5">
                Andar
              </th>
              {positions.map((p) => (
                <th key={p} className="px-2 py-2 text-[10px] font-bold text-gray-600 uppercase tracking-wider text-center border-b border-white/5">
                  P{p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {floors.map((floor) => (
              <tr key={floor} className="border-b border-white/[0.04] last:border-0">
                <td className="px-3 py-1.5 text-xs font-bold text-[#2AB9B0] text-right w-10 whitespace-nowrap">
                  {floor}º
                </td>
                {positions.map((pos) => {
                  const unit = unitMap.get(`${floor}-${pos}`);
                  if (!unit) return <td key={pos} className="px-2 py-1.5" />;

                  const isOpen = openUnit?.unit.id === unit.id;
                  const dimmed = filterStatus !== "all" && !filteredIds.has(unit.id);

                  return (
                    <td key={pos} className="px-1.5 py-1.5 text-center">
                      <button
                        onClick={(e) => {
                          if (!isAdmin) return;
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setOpenUnit(isOpen ? null : { unit, rect });
                        }}
                        title={isAdmin ? `Alterar: ${STATUS_LABEL[unit.status as UnitStatus]}` : STATUS_LABEL[unit.status as UnitStatus]}
                        className={`relative flex items-center justify-center rounded-lg text-[11px] font-bold text-white w-14 h-8 transition-all select-none
                          ${isAdmin ? "cursor-pointer hover:scale-110 hover:shadow-lg" : "cursor-default"}
                          ${isOpen ? "ring-2 ring-white/50 scale-110" : ""}
                          ${dimmed ? "opacity-20" : ""}
                        `}
                        style={{
                          backgroundColor: STATUS_COLOR[unit.status as UnitStatus] ?? STATUS_COLOR.disponivel,
                          boxShadow: isOpen
                            ? `0 0 12px ${STATUS_COLOR[unit.status as UnitStatus]}88`
                            : undefined,
                        }}
                      >
                        {unit.number}
                        {saving && isOpen && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                            <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <p className="text-[11px] text-gray-600 text-center">
          Clique em qualquer unidade para alterar o status
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
  onUpdateUnit,
}: {
  units: Unit[];
  isAdmin: boolean;
  onUpdateUnit: (id: string, status: UnitStatus, notes?: string, extras?: { responsavel?: string; pendencias?: string }) => Promise<void>;
}) {
  const [viewMode, setViewMode] = useState<"3d" | "grid">("3d");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
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
        <GridView units={units} isAdmin={isAdmin} onUpdateUnit={onUpdateUnit} />
      )}

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
                    Unidade
                  </p>
                  <p className="text-3xl font-black text-white">{syncedSelected.number}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{syncedSelected.tower}</p>
                  <p className="text-xs text-gray-500">
                    {syncedSelected.floor}º andar · Posição {syncedSelected.position}
                  </p>
                </div>

                {/* Pendências checklist */}
                <div className="bg-[#0F1E2E] border border-white/5 rounded-2xl p-4">
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
