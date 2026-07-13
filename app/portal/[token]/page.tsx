"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import SignaturePad from "../../components/SignaturePad";
import type { PosObraItem, EntregaChaves } from "../../components/unitTypes";

const STATUS: Record<PosObraItem["status"], { label: string; color: string }> = {
  aberto:       { label: "Aberto",       color: "#F97316" },
  em_andamento: { label: "Em andamento", color: "#EAB308" },
  atendido:     { label: "Atendido",     color: "#06B6D4" },
  aceito:       { label: "Aceito",       color: "#22C55E" },
};

type PortalData = {
  number: string;
  tower: string;
  floor: number;
  responsavel: string | null;
  posObra: string | null;
  vistoriaCheck: string | null;
  entregaChaves: string | null;
};

function parse(raw: string | null): PosObraItem[] {
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
}

/* ── Vistoria (recebimento do documento) ────────────────────────── */
type TermoItem = { status: "aceito" | "nao_aceito" | "nao_aplica" | null; obs: string };
type VistoriaCheck = {
  status: "pendente" | "recebido_sem_pendencias" | "recebido_com_pendencias";
  dataRecebimento: string;
  obs: string;
  termoItens: Record<string, TermoItem>;
  parecer: "aprovado_sem_ressalva" | "aprovado_com_ressalva" | "pendente_revistoria" | null;
};
function parseVistoriaCheck(raw: string | null): VistoriaCheck | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as VistoriaCheck; } catch { return null; }
}
const PARECER_LABEL: Record<NonNullable<VistoriaCheck["parecer"]>, string> = {
  aprovado_sem_ressalva: "Aprovada e aceita sem ressalva",
  aprovado_com_ressalva: "Aprovada com ressalva de vício aparente",
  pendente_revistoria:   "Itens pendentes — revistoria agendada",
};

/* ── Entrega de chaves ──────────────────────────────────────────── */
function parseEntrega(raw: string | null): EntregaChaves | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as EntregaChaves; } catch { return null; }
}

function VistoriaCard({ raw }: { raw: string | null }) {
  const v = parseVistoriaCheck(raw);

  if (!v || v.status === "pendente") {
    return (
      <section className="bg-[#0F1E2E] border border-white/5 rounded-2xl p-4 flex flex-col gap-1.5">
        <h2 className="text-xs font-bold text-gray-400 flex items-center gap-1.5">🔍 Vistoria</h2>
        <p className="text-xs text-gray-600 italic">Documento ainda não disponível.</p>
      </section>
    );
  }

  const naoAceitos = Object.entries(v.termoItens ?? {}).filter(([, ti]) => ti?.status === "nao_aceito");
  const semPendencias = v.status === "recebido_sem_pendencias";

  return (
    <section className="bg-[#0F1E2E] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
      <h2 className="text-xs font-bold text-gray-400 flex items-center gap-1.5">🔍 Vistoria</h2>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: semPendencias ? "#22C55E" : "#EAB308" }} />
        <span className="text-xs font-semibold" style={{ color: semPendencias ? "#22C55E" : "#EAB308" }}>
          {semPendencias ? "Recebido sem pendências" : `Recebido — ${naoAceitos.length} pendência${naoAceitos.length !== 1 ? "s" : ""}`}
        </span>
      </div>
      {v.dataRecebimento && (
        <p className="text-[10px] text-gray-600">em {new Date(v.dataRecebimento + "T00:00").toLocaleDateString("pt-BR")}</p>
      )}
      {naoAceitos.length > 0 && (
        <ul className="flex flex-col gap-1 mt-1">
          {naoAceitos.map(([item, ti]) => (
            <li key={item} className="text-[11px] text-gray-400 leading-tight">
              • {item}{ti.obs ? <span className="text-gray-600 italic"> — {ti.obs}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {v.parecer && (
        <p className="text-[10px] text-gray-500 mt-1 pt-1.5 border-t border-white/5">{PARECER_LABEL[v.parecer]}</p>
      )}
    </section>
  );
}

function EntregaCard({ raw }: { raw: string | null }) {
  const e = parseEntrega(raw);
  const assinado = !!e?.documentoAssinado;
  const docs = e?.docs ?? [];

  return (
    <section className="bg-[#0F1E2E] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
      <h2 className="text-xs font-bold text-gray-400 flex items-center gap-1.5">🔑 Entrega de chaves</h2>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: assinado ? "#22C55E" : "#6B7280" }} />
        <span className="text-xs font-semibold" style={{ color: assinado ? "#22C55E" : "#9CA3AF" }}>
          {assinado ? "Documento assinado" : "Aguardando assinatura"}
        </span>
      </div>
      {assinado && e?.dataAssinatura && (
        <p className="text-[10px] text-gray-600">em {new Date(e.dataAssinatura).toLocaleDateString("pt-BR")}</p>
      )}
      {docs.length > 0 && (
        <ul className="flex flex-col gap-1 mt-1">
          {docs.map((d) => (
            <li key={d.id} className="text-[11px] flex items-center gap-1.5">
              <span style={{ color: d.done ? "#22C55E" : "#4b5563" }}>{d.done ? "✓" : "○"}</span>
              <span className={d.done ? "text-gray-400" : "text-gray-600"}>{d.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [items, setItems] = useState<PosObraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/portal/${token}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: PortalData) => { setData(d); setItems(parse(d.posObra)); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!titulo.trim()) return;
    setSubmitting(true);
    const r = await fetch(`/api/portal/${token}/request`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, descricao }),
    });
    if (r.ok) { const novo = await r.json(); setItems((p) => [...p, novo]); setTitulo(""); setDescricao(""); }
    setSubmitting(false);
  };

  const accept = async (id: string, img: string) => {
    const r = await fetch(`/api/portal/${token}/accept`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: id, assinaturaImg: img }),
    });
    if (r.ok) { const upd = await r.json(); setItems((p) => p.map((it) => (it.id === id ? upd : it))); setAcceptingId(null); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1929] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2AB9B0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#0B1929] flex flex-col items-center justify-center text-center px-6">
        <p className="text-4xl mb-3">🔒</p>
        <p className="text-white font-bold text-lg">Link inválido ou expirado</p>
        <p className="text-gray-500 text-sm mt-1">Entre em contato com a construtora para receber um novo link.</p>
      </div>
    );
  }

  const ordered = items.slice().reverse();

  return (
    <div className="min-h-screen bg-[#0B1929] text-white">
      {/* Header */}
      <header className="bg-[#0F1E2E] border-b border-white/5 px-5 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img src="/logo.png" alt="SBE" className="h-9 w-auto object-contain" />
          <div>
            <p className="font-bold text-base leading-tight">Portal do Proprietário</p>
            <p className="text-xs text-gray-500 leading-tight mt-0.5">
              Apartamento <span className="text-[#2AB9B0] font-semibold">{data.number}</span> · {data.floor}º andar · {data.tower}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {data.responsavel && (
          <p className="text-sm text-gray-400">Olá, <span className="text-white font-semibold">{data.responsavel}</span> 👋</p>
        )}

        {/* Status: Vistoria + Entrega de chaves */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <VistoriaCard raw={data.vistoriaCheck} />
          <EntregaCard raw={data.entregaChaves} />
        </div>

        {/* Novo pedido */}
        <section className="bg-[#0F1E2E] border border-white/5 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-3">🔧 Abrir pedido de manutenção / revisão</h2>
          <div className="flex flex-col gap-2.5">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Infiltração no banheiro"
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2AB9B0]"
            />
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Descreva o problema com detalhes…"
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2AB9B0] resize-none"
            />
            <button
              onClick={submit}
              disabled={submitting || !titulo.trim()}
              className="self-end px-5 py-2.5 rounded-xl bg-[#2AB9B0] hover:bg-[#1EA59D] text-white text-sm font-bold disabled:opacity-40 transition-all"
            >
              {submitting ? "Enviando…" : "Enviar pedido"}
            </button>
          </div>
        </section>

        {/* Lista de pedidos */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-gray-400">Meus pedidos ({items.length})</h2>
          {ordered.length === 0 && (
            <p className="text-sm text-gray-600 italic">Você ainda não tem pedidos registrados.</p>
          )}
          {ordered.map((it) => {
            const st = STATUS[it.status];
            return (
              <div key={it.id} className="bg-[#0F1E2E] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{it.titulo}</p>
                    {it.descricao && <p className="text-xs text-gray-400 mt-0.5">{it.descricao}</p>}
                    <p className="text-[10px] text-gray-600 mt-1">{new Date(it.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: st.color + "22", color: st.color, border: `1px solid ${st.color}55` }}>
                    {st.label}
                  </span>
                </div>

                {/* Resposta da empresa */}
                {it.resposta && (
                  <div className="pl-3 border-l-2 border-[#06B6D4]/40">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Resposta da construtora</p>
                    <p className="text-sm text-gray-300 mt-0.5">{it.resposta}</p>
                  </div>
                )}

                {/* Aceite */}
                {it.status === "atendido" && (
                  acceptingId === it.id ? (
                    <div className="flex flex-col gap-2 bg-black/20 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Assine abaixo para confirmar que o serviço foi concluído a contento:</p>
                      <SignaturePad value="" canEdit onSave={(img) => accept(it.id, img)} note={false} />
                      <button onClick={() => setAcceptingId(null)} className="text-xs text-gray-500 hover:text-gray-300 self-start">Cancelar</button>
                    </div>
                  ) : (
                    <button onClick={() => setAcceptingId(it.id)}
                      className="self-start px-4 py-2 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-bold transition-all">
                      ✔ Aceitar e assinar
                    </button>
                  )
                )}

                {/* Já aceito */}
                {it.status === "aceito" && (
                  <div className="flex items-center gap-3 bg-[#22C55E]/[0.07] border border-[#22C55E]/20 rounded-xl px-3 py-2">
                    <span className="text-[#22C55E] text-sm font-bold flex-shrink-0">✔ Aceito</span>
                    {it.assinaturaData && <span className="text-[10px] text-gray-500">em {new Date(it.assinaturaData).toLocaleString("pt-BR")}</span>}
                    {it.assinaturaImg && <img src={it.assinaturaImg} alt="assinatura" className="h-8 ml-auto rounded bg-black/30 border border-white/10" />}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <p className="text-[10px] text-gray-600 text-center pb-6">
          Este link é pessoal e exclusivo do seu apartamento. Não compartilhe.
        </p>
      </main>
    </div>
  );
}
