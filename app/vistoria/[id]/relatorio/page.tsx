"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AREAS, CHECKLIST,
  type AreaKey, type FullChecklist, type ChecklistCategory,
  emptyFullChecklist, countArea,
} from "../../checklistData";

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

const STATUS_STYLE: Record<string, { background: string; color: string; borderColor: string }> = {
  AP: { background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" },
  P:  { background: "#fef9c3", color: "#854d0e", borderColor: "#fde68a" },
  PR: { background: "#dbeafe", color: "#1e40af", borderColor: "#bfdbfe" },
  NE: { background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" },
};

function fmtDT(s: string) {
  return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtD(s: string) {
  return new Date(s).toLocaleDateString("pt-BR");
}

export default function RelatorioVistoriaPage() {
  const { id } = useParams<{ id: string }>();
  const [vistoria, setVistoria] = useState<VistoriaData | null>(null);
  const [checklist, setChecklist] = useState<FullChecklist | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/vistorias/${id}`)
      .then((r) => r.json())
      .then((data: VistoriaData) => {
        setVistoria(data);
        const empty = emptyFullChecklist();
        if (data.checklist) {
          try {
            const saved = JSON.parse(data.checklist) as FullChecklist;
            for (const areaKey of Object.keys(empty) as AreaKey[]) {
              for (const key of Object.keys(saved[areaKey] ?? {})) {
                if (empty[areaKey][key] && saved[areaKey][key]) empty[areaKey][key] = saved[areaKey][key];
              }
            }
          } catch { /* use empty */ }
        }
        setChecklist(empty);
      });
  }, [id]);

  if (!vistoria || !checklist) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2AB9B0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cats: ChecklistCategory[] = CHECKLIST;
  const areas = AREAS.filter((a) => vistoria.tipo === "area_comum" ? a.key !== "apto" : a.key === "apto");
  const totalAll = areas.reduce((acc, a) => { const c = countArea(checklist[a.key]); return { done: acc.done + c.done, total: acc.total + c.total }; }, { done: 0, total: 0 });
  const pct = totalAll.total ? Math.round((totalAll.done / totalAll.total) * 100) : 0;

  // Pendências: todos os itens com status P (pendente) em qualquer área
  const pendencias: { area: string; item: string; obs: string }[] = [];
  for (const area of areas) {
    for (const cat of cats) {
      for (const item of cat.items) {
        const cell = checklist[area.key][item.key];
        if (cell?.status === "P") pendencias.push({ area: area.label, item: item.label, obs: cell.obs });
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5]" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Toolbar — hidden on print */}
      <div className="no-print sticky top-0 z-10 bg-[#0B1929] border-b border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => { window.location.href = `/vistoria/${id}`; }} className="text-gray-400 hover:text-white text-sm transition-colors">← Voltar</button>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-[#2AB9B0] hover:bg-[#239b93] text-white text-sm font-bold transition-colors"
        >
          🖨 Imprimir / Salvar PDF
        </button>
      </div>

      {/* Report sheet */}
      <div className="max-w-3xl mx-auto bg-white text-black my-6 print:my-0 print:max-w-none shadow-lg print:shadow-none rounded-2xl print:rounded-none overflow-hidden">

        {/* Header */}
        <div className="px-8 py-6 border-b-2 border-[#0B1929] flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-[#0B1929]">SEPENG Engenharia</p>
            <p className="text-xs text-gray-500">Relatório de Vistoria — Amihan Jaguaribe</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-[#0B1929]">
              {vistoria.tipo === "area_comum" ? `Pav. ${vistoria.unit.floor}` : `AP ${vistoria.unit.number}`}
            </p>
            <p className="text-xs text-gray-500">
              {vistoria.tipo === "area_comum" ? "Área Comum" : `${vistoria.unit.floor}º andar`} · {vistoria.unit.tower}
            </p>
          </div>
        </div>

        {/* Info grid */}
        <div className="px-8 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-gray-200 text-xs">
          <div>
            <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-0.5">Data</p>
            <p className="text-gray-800">{fmtD(vistoria.iniciadoEm)}</p>
          </div>
          <div>
            <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-0.5">Responsável</p>
            <p className="text-gray-800">{vistoria.responsavel || "—"}</p>
          </div>
          <div>
            <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-0.5">Visto / Supervisor</p>
            <p className="text-gray-800">{vistoria.supervisor || "—"}</p>
          </div>
          <div>
            <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-0.5">Tipo de vistoria</p>
            <p className="text-gray-800">{vistoria.tipo === "area_comum" ? "Áreas comuns" : "Habite-se"}</p>
          </div>
        </div>

        {/* Identification */}
        <div className="px-8 py-3 bg-[#2AB9B0]/5 border-b border-gray-200 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-gray-600">
          <span>Iniciado por <strong className="text-[#0B1929]">{vistoria.iniciadoPor ?? "—"}</strong></span>
          <span>Início <strong className="text-[#0B1929]">{fmtDT(vistoria.iniciadoEm)}</strong></span>
          <span>Finalizado por <strong className="text-[#0B1929]">{vistoria.finalizadoPor ?? "—"}</strong></span>
          <span>Fim <strong className="text-[#0B1929]">{vistoria.finalizadoEm ? fmtDT(vistoria.finalizadoEm) : "—"}</strong></span>
          <span className="ml-auto px-2 py-0.5 rounded-full font-bold" style={{
            background: vistoria.status === "finalizada" ? "#dcfce7" : "#fef9c3",
            color: vistoria.status === "finalizada" ? "#166534" : "#854d0e",
          }}>
            {vistoria.status === "finalizada" ? "Finalizada" : "Rascunho"}
          </span>
        </div>

        {/* Progress summary */}
        <div className="px-8 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-bold text-gray-600">Progresso geral</p>
            <p className="text-xs text-gray-500">{totalAll.done} de {totalAll.total} itens ({pct}%)</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#2AB9B0] rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Resumo de pendências */}
        {pendencias.length > 0 && (
          <div className="px-8 py-4 border-b border-gray-200 break-inside-avoid">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              ⚠ Pendências apontadas ({pendencias.length})
            </p>
            <div className="flex flex-col gap-1.5">
              {pendencias.map((p, i) => (
                <div key={i} className="flex gap-2 text-xs bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5">
                  <span className="font-semibold text-gray-700 flex-shrink-0">{p.area}:</span>
                  <span className="text-gray-700">{p.item}</span>
                  {p.obs && <span className="text-gray-500 italic">— {p.obs}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Por área */}
        {areas.map((area) => {
          const areaChecklist = checklist[area.key];
          const { done, total } = countArea(areaChecklist);
          return (
            <div key={area.key} className="px-8 py-5 border-b border-gray-200 break-inside-avoid-page">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-[#0B1929]">{area.label}</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{done}/{total}</span>
              </div>
              <div className="flex flex-col gap-3">
                {cats.map((cat) => (
                  <div key={cat.key}>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{cat.label}</p>
                    <table className="w-full text-xs border-collapse">
                      <tbody>
                        {cat.items.map((item) => {
                          const cell = areaChecklist[item.key] ?? { status: null, obs: "" };
                          return (
                            <tr key={item.key} className="border-b border-gray-100 last:border-0">
                              <td className="py-1.5 pr-3 text-gray-700 align-top" style={{ width: "60%" }}>{item.label}</td>
                              <td className="py-1.5 pr-3 align-top" style={{ width: "18%" }}>
                                {cell.status ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border" style={STATUS_STYLE[cell.status]}>
                                    {cell.status}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 text-[10px]">—</span>
                                )}
                              </td>
                              <td className="py-1.5 text-gray-500 italic align-top">{cell.obs || ""}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Observações gerais */}
        {vistoria.observacoes && (
          <div className="px-8 py-5 border-b border-gray-200 break-inside-avoid">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Observações gerais</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{vistoria.observacoes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-4 text-center text-[10px] text-gray-400">
          Relatório gerado em {fmtDT(new Date().toISOString())} · SEPENG Engenharia
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { margin: 12mm; }
        }
      `}</style>
    </div>
  );
}
