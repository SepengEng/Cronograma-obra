"use client";

import { useState } from "react";
import type { Unit, UnitPatch, PosObraItem } from "./unitTypes";
import ApartmentModal from "./ApartmentModal";

function parsePosObra(raw: string | null): PosObraItem[] {
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
}

const STATUS: Record<PosObraItem["status"], { label: string; color: string }> = {
  aberto:       { label: "Aberto",       color: "#F97316" },
  em_andamento: { label: "Em andamento", color: "#EAB308" },
  atendido:     { label: "Atendido",     color: "#06B6D4" },
  aceito:       { label: "Aceito",       color: "#22C55E" },
};

type PedidoRow = PosObraItem & { unit: Unit };

export default function PedidosView({
  units, isAdmin, sessionId, onPatch,
}: {
  units: Unit[];
  isAdmin: boolean;
  sessionId: string;
  onPatch: (id: string, patch: UnitPatch) => Promise<void>;
}) {
  const [filterStatus, setFilterStatus] = useState<PosObraItem["status"] | "all">("all");
  const [fichaUnitId, setFichaUnitId] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);

  // Link único do portal — o mesmo para todos os clientes. Cada um se identifica
  // com apartamento + e-mail (ou CPF) e cai na própria unidade.
  const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/portal` : "/portal";

  const copiarLink = async () => {
    try { await navigator.clipboard.writeText(portalUrl); } catch { /* área de transferência indisponível */ }
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2500);
  };

  const all: PedidoRow[] = units
    .flatMap((u) => parsePosObra(u.posObra).map((it) => ({ ...it, unit: u })))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const filtered = filterStatus === "all" ? all : all.filter((p) => p.status === filterStatus);

  const fichaUnit = fichaUnitId ? units.find((u) => u.id === fichaUnitId) ?? null : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Link geral do portal — enviar para todos os proprietários */}
      {isAdmin && (
        <div className="bg-[#0F1E2E] border border-[#2AB9B0]/20 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-bold text-white">🔗 Link do Portal do Cliente</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Um único link para todos os proprietários. Cada um entra com o número do apartamento
                e o e-mail cadastrado (ou o CPF, depois do primeiro acesso).
              </p>
            </div>
            <button
              onClick={copiarLink}
              className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-xl bg-[#2AB9B0] hover:bg-[#1EA59D] text-white transition-all whitespace-nowrap"
            >
              {linkCopiado ? "✓ Copiado!" : "Copiar link"}
            </button>
          </div>
          <code className="text-[11px] text-[#2AB9B0] bg-black/30 border border-white/5 rounded-lg px-3 py-2 break-all">
            {portalUrl}
          </code>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all
            ${filterStatus === "all" ? "bg-white/10 border-white/20 text-white" : "border-white/10 text-gray-500 hover:text-gray-300"}`}
        >
          Todos ({all.length})
        </button>
        {(Object.keys(STATUS) as PosObraItem["status"][]).map((s) => {
          const count = all.filter((p) => p.status === s).length;
          if (count === 0) return null;
          const st = STATUS[s];
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s === filterStatus ? "all" : s)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all
                ${filterStatus === s ? "text-white border-white/20" : "border-white/10 text-gray-500 hover:text-gray-300"}`}
              style={filterStatus === s ? { backgroundColor: st.color + "33", borderColor: st.color + "66" } : {}}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color }} />
              {st.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <p className="text-center text-xs text-gray-600 py-8">Nenhum pedido encontrado.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => {
            const st = STATUS[p.status];
            return (
              <button
                key={p.id}
                onClick={() => setFichaUnitId(p.unit.id)}
                className="text-left bg-[#0F1E2E] border border-white/5 hover:border-white/15 rounded-2xl p-4 flex flex-col gap-2 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#2AB9B0]">{p.unit.number}</span>
                      <span className="text-xs text-gray-500">{p.unit.floor}º andar</span>
                      {p.origem === "portal" && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#2AB9B0]/15 text-[#2AB9B0] border border-[#2AB9B0]/30">👤 do proprietário</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-white mt-1">{p.titulo}</p>
                    {p.descricao && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{p.descricao}</p>}
                    <p className="text-[10px] text-gray-600 mt-1">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: st.color + "22", color: st.color, border: `1px solid ${st.color}55` }}>
                    {st.label}
                  </span>
                </div>
                {p.resposta && (
                  <div className="pl-3 border-l-2 border-[#06B6D4]/40">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Resposta</p>
                    <p className="text-xs text-gray-300 mt-0.5 line-clamp-2">{p.resposta}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {fichaUnit && (
        <ApartmentModal
          unit={fichaUnit}
          isAdmin={isAdmin}
          sessionId={sessionId}
          onPatch={onPatch}
          onClose={() => setFichaUnitId(null)}
          initialTab="posobra"
        />
      )}
    </div>
  );
}
