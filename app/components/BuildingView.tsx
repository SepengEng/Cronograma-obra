"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Unit, UnitStatus } from "./unitTypes";
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

export default function BuildingView({
  units,
  isAdmin,
  onUpdateUnit,
}: {
  units: Unit[];
  isAdmin: boolean;
  onUpdateUnit: (id: string, status: UnitStatus, notes?: string) => Promise<void>;
}) {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [saving, setSaving] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  // Keep selectedUnit in sync with latest units data
  const syncedSelected = selectedUnit
    ? (units.find((u) => u.id === selectedUnit.id) ?? null)
    : null;

  const handleSelect = (u: Unit | null) => {
    setSelectedUnit(u);
    setEditNotes(u?.notes ?? "");
    setShowNotes(false);
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

  // Stats per status
  const counts = ALL_STATUSES.reduce<Record<UnitStatus, number>>(
    (acc, s) => ({ ...acc, [s]: units.filter((u) => u.status === s).length }),
    {} as Record<UnitStatus, number>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {ALL_STATUSES.map((s) => (
          <div
            key={s}
            className="flex items-center gap-2.5 bg-[#0F1E2E] border border-white/5 rounded-xl px-3.5 py-2.5"
          >
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: STATUS_COLOR[s] }}
            />
            <div className="min-w-0">
              <p className="text-xs text-gray-500 leading-tight truncate">{STATUS_LABEL[s]}</p>
              <p className="text-base font-bold text-white leading-tight">{counts[s]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Canvas + side panel */}
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
              </div>
            </>
          ) : (
            <div className="bg-[#0F1E2E] border border-white/5 rounded-2xl flex-1 flex flex-col items-center justify-center text-center p-5" style={{ height: 520 }}>
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
