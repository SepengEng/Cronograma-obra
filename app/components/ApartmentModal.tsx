"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type {
  Unit, UnitPatch, PendenciaItem, PosObraItem, EntregaChaves,
} from "./unitTypes";
import { STATUS_COLOR, STATUS_LABEL, STATUS_EMOJI } from "./unitTypes";
/* ─── helpers ─────────────────────────────────────────────────── */
function parseList<T>(raw: string | null): T[] {
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
}
function parseEntrega(raw: string | null): EntregaChaves {
  const base: EntregaChaves = { docs: [], dataEntrega: "", documentoAssinado: false, dataAssinatura: "" };
  if (!raw) return base;
  try { return { ...base, ...JSON.parse(raw) }; } catch { return base; }
}
const uid = () => (crypto?.randomUUID?.() ?? String(Math.random()).slice(2));

const TABS = [
  { key: "proprietario", label: "👤 Proprietário" },
  { key: "financiamento", label: "💰 Financiamento" },
  { key: "contrato", label: "📄 Contrato" },
  { key: "vistoria", label: "🔍 Vistoria" },
  { key: "entrega", label: "🔑 Entrega de chaves" },
  { key: "posobra", label: "🔧 Pós-obra" },
] as const;
type TabKey = typeof TABS[number]["key"];

/* ─── Checklist reutilizável (laranja → verde) ────────────────── */
function Checklist({
  items, isAdmin, onChange, emptyLabel = "Nenhum item ainda",
}: {
  items: PendenciaItem[];
  isAdmin: boolean;
  onChange: (items: PendenciaItem[]) => void;
  emptyLabel?: string;
}) {
  const [newText, setNewText] = useState("");
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = total ? (done / total) * 100 : 0;

  const toggle = (id: string) => onChange(items.map((it) => it.id === id ? { ...it, done: !it.done } : it));
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));
  const add = () => {
    const t = newText.trim();
    if (!t) return;
    onChange([...items, { id: uid(), text: t, done: false }]);
    setNewText("");
  };

  return (
    <div className="flex flex-col gap-3">
      {total > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#22C55E" : "#F97316" }} />
          </div>
          <span className="text-xs font-bold" style={{ color: pct === 100 ? "#22C55E" : "#F97316" }}>
            {done}/{total}
          </span>
        </div>
      )}

      {total === 0 && <p className="text-sm text-gray-600 italic">{emptyLabel}</p>}

      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <div key={it.id}
            className={`flex items-start gap-3 group rounded-xl px-3 py-2.5 border transition-all
              ${it.done ? "bg-[#22C55E]/[0.07] border-[#22C55E]/30" : "bg-[#F97316]/[0.06] border-[#F97316]/25"}`}>
            <button
              onClick={() => isAdmin && toggle(it.id)}
              disabled={!isAdmin}
              className={`mt-0.5 w-5 h-5 rounded-md flex-shrink-0 border flex items-center justify-center transition-all
                ${it.done ? "bg-[#22C55E] border-[#22C55E] text-white" : "border-[#F97316]/60 hover:border-[#F97316]"}
                ${isAdmin ? "cursor-pointer" : "cursor-default"}`}
            >
              {it.done && <span className="text-[11px] font-bold">✓</span>}
            </button>
            <span className={`text-sm flex-1 leading-snug pt-0.5 ${it.done ? "line-through text-gray-500" : "text-gray-200"}`}>
              {it.text}
            </span>
            {isAdmin && (
              <button onClick={() => remove(it.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all flex-shrink-0 mt-1">✕</button>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="flex gap-2">
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Adicionar item…"
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2AB9B0]"
          />
          <button onClick={add} disabled={!newText.trim()}
            className="px-4 py-2 rounded-xl bg-[#2AB9B0] text-white text-sm font-bold disabled:opacity-40">+ Adicionar</button>
        </div>
      )}
    </div>
  );
}

/* ─── Campo de texto editável com Salvar ──────────────────────── */
function Field({
  label, value, onSave, isAdmin, type = "text", placeholder, prefix, icon,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  isAdmin: boolean;
  type?: string;
  placeholder?: string;
  prefix?: string;
  icon?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  const changed = v !== value;
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center bg-black/30 border border-white/10 rounded-xl focus-within:border-[#2AB9B0]/60 focus-within:ring-2 focus-within:ring-[#2AB9B0]/25 transition-all overflow-hidden">
          {icon && <span className="pl-3 text-base opacity-60 flex-shrink-0 select-none">{icon}</span>}
          {prefix && <span className="pl-3 text-sm text-gray-500 flex-shrink-0">{prefix}</span>}
          <input
            type={type}
            value={v}
            disabled={!isAdmin}
            onChange={(e) => setV(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && changed && onSave(v)}
            placeholder={placeholder}
            className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none disabled:text-gray-400 min-w-0"
          />
        </div>
        {isAdmin && changed && (
          <button onClick={() => onSave(v)} className="px-4 rounded-xl bg-[#2AB9B0] hover:bg-[#1EA59D] text-white text-xs font-bold flex-shrink-0 transition-all">Salvar</button>
        )}
      </div>
    </div>
  );
}

/* ─── Modal principal ─────────────────────────────────────────── */
export default function ApartmentModal({
  unit, isAdmin, sessionId, onPatch, onClose,
}: {
  unit: Unit;
  isAdmin: boolean;
  sessionId: string;
  onPatch: (id: string, patch: UnitPatch) => Promise<void>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("proprietario");
  const [saving, setSaving] = useState(false);

  const patch = useCallback(async (p: UnitPatch) => {
    setSaving(true);
    await onPatch(unit.id, p);
    setSaving(false);
  }, [onPatch, unit.id]);

  // esc pra fechar
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const color = STATUS_COLOR[unit.status];

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-stretch sm:items-center justify-center sm:p-4">
      <div className="bg-[#0D1B2A] w-full sm:max-w-3xl sm:rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-screen sm:max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="relative flex items-center gap-4 px-6 py-4 border-b border-white/5 flex-shrink-0 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(120% 120% at 0% 50%, ${color}18, transparent 55%)` }} />
          <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: color + "22", border: `1px solid ${color}55` }}>
            <span className="text-2xl font-black" style={{ color }}>{unit.number}</span>
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="text-lg font-bold text-white truncate">{unit.responsavel ?? "Sem proprietário"}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-500">{unit.floor}º andar · {unit.tower}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ backgroundColor: color + "22", color, border: `1px solid ${color}44` }}>
                {STATUS_EMOJI[unit.status]} {STATUS_LABEL[unit.status]}
              </span>
            </div>
          </div>
          {saving && <span className="relative text-xs text-[#2AB9B0] animate-pulse flex-shrink-0">salvando…</span>}
          <button onClick={onClose}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 text-xl leading-none flex-shrink-0 transition-all">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-3 py-2 border-b border-white/5 overflow-x-auto flex-shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all
                ${tab === t.key ? "bg-[#2AB9B0] text-white shadow-sm shadow-[#2AB9B0]/30" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "proprietario" && (
            <div className="flex flex-col gap-4 max-w-xl">
              <Field label="Nome do proprietário" icon="👤" value={unit.responsavel ?? ""} isAdmin={isAdmin}
                onSave={(v) => patch({ responsavel: v })} placeholder="Nome completo" />
              <Field label="Email" icon="✉️" type="email" value={unit.email ?? ""} isAdmin={isAdmin}
                onSave={(v) => patch({ email: v })} placeholder="email@exemplo.com" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Telefone" icon="📱" value={unit.telefone ?? ""} isAdmin={isAdmin}
                  onSave={(v) => patch({ telefone: v })} placeholder="(00) 00000-0000" />
                <Field label="CPF" icon="🪪" value={unit.cpf ?? ""} isAdmin={isAdmin}
                  onSave={(v) => patch({ cpf: v })} placeholder="000.000.000-00" />
              </div>
              {!isAdmin && !unit.email && !unit.telefone && !unit.cpf && (
                <p className="text-xs text-gray-600 italic">Contato ainda não cadastrado.</p>
              )}
            </div>
          )}

          {tab === "financiamento" && (
            <div className="flex flex-col gap-4 max-w-lg">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Situação</label>
                <select
                  value={unit.situacao ?? ""}
                  disabled={!isAdmin}
                  onChange={(e) => patch({ situacao: e.target.value })}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2AB9B0] disabled:text-gray-400"
                >
                  <option value="">—</option>
                  <option value="EM ABERTO">EM ABERTO</option>
                  <option value="FINANCIADO">FINANCIADO</option>
                  <option value="QUITADO">QUITADO</option>
                  <option value="ALIENAÇÃO FIDUCIÁRIA">ALIENAÇÃO FIDUCIÁRIA</option>
                  <option value="QUITAR À VISTA - PÓS HABITE-SE">QUITAR À VISTA - PÓS HABITE-SE</option>
                </select>
              </div>
            </div>
          )}

          {tab === "contrato" && (
            <ContratoTab unit={unit} isAdmin={isAdmin} sessionId={sessionId} patch={patch} />
          )}


          {tab === "vistoria" && (
            <VistoriaTab unit={unit} isAdmin={isAdmin} patch={patch} />
          )}

          {tab === "entrega" && (
            <EntregaTab unit={unit} isAdmin={isAdmin} patch={patch} />
          )}

          {tab === "posobra" && (
            <PosObraTab unit={unit} isAdmin={isAdmin} sessionId={sessionId} patch={patch} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Aba Contrato (link + upload de arquivos + observações) ───── */
type ContratoFileMeta = { id: string; name: string; mime: string; size: number; createdAt: string };

const fmtSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

const fileIcon = (mime: string) =>
  mime.includes("pdf") ? "📕"
  : mime.startsWith("image/") ? "🖼️"
  : mime.includes("word") || mime.includes("document") ? "📘"
  : mime.includes("sheet") || mime.includes("excel") ? "📗"
  : "📎";

function ContratoTab({
  unit, isAdmin, sessionId, patch,
}: {
  unit: Unit;
  isAdmin: boolean;
  sessionId: string;
  patch: (p: UnitPatch) => Promise<void>;
}) {
  const [files, setFiles] = useState<ContratoFileMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/units/${unit.id}/files`)
      .then((r) => r.json())
      .then((d) => { if (alive) setFiles(Array.isArray(d) ? d : []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [unit.id]);

  const doUpload = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setErr("");
    for (const file of Array.from(list)) {
      if (file.size > 4 * 1024 * 1024) { setErr(`"${file.name}" passa de 4 MB`); continue; }
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/units/${unit.id}/files`, { method: "POST", headers: { "x-user-id": sessionId }, body: fd });
      if (r.ok) { const rec = await r.json(); setFiles((p) => [rec, ...p]); }
      else { const e = await r.json().catch(() => ({})); setErr(e.error || "Falha no upload"); }
      setUploading(false);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = async (fid: string) => {
    const r = await fetch(`/api/files/${fid}`, { method: "DELETE", headers: { "x-user-id": sessionId } });
    if (r.ok) setFiles((p) => p.filter((f) => f.id !== fid));
  };

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      {/* Link opcional */}
      <Field label="Link do contrato (opcional)" icon="🔗" value={unit.contratoUrl ?? ""} isAdmin={isAdmin}
        onSave={(v) => patch({ contratoUrl: v })} placeholder="https://…" />
      {unit.contratoUrl && (
        <a href={unit.contratoUrl} target="_blank" rel="noreferrer" className="-mt-3 inline-flex items-center gap-1.5 text-sm text-[#2AB9B0] hover:underline">
          🔗 Abrir link
        </a>
      )}

      {/* Documentos */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Documentos anexados</label>

        {isAdmin && (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); doUpload(e.dataTransfer.files); }}
            className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed border-white/15 rounded-2xl py-6 cursor-pointer hover:border-[#2AB9B0]/50 hover:bg-[#2AB9B0]/5 transition-all ${uploading ? "opacity-60 pointer-events-none" : ""}`}
          >
            <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => doUpload(e.target.files)} />
            <span className="text-2xl">{uploading ? "⏳" : "📤"}</span>
            <span className="text-sm text-gray-300 font-semibold">{uploading ? "Enviando…" : "Clique ou arraste arquivos aqui"}</span>
            <span className="text-[10px] text-gray-600">PDF, imagens, Word… até 4 MB cada</span>
          </div>
        )}

        {err && <p className="text-xs text-red-400">{err}</p>}

        {loading ? (
          <p className="text-xs text-gray-600">Carregando arquivos…</p>
        ) : files.length === 0 ? (
          <p className="text-sm text-gray-600 italic">Nenhum arquivo anexado ainda.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 bg-[#0F1E2E] border border-white/5 rounded-xl px-3 py-2.5 group">
                <span className="text-lg flex-shrink-0">{fileIcon(f.mime)}</span>
                <a href={`/api/files/${f.id}`} target="_blank" rel="noreferrer" className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 group-hover:text-[#2AB9B0] truncate transition-colors">{f.name}</p>
                  <p className="text-[10px] text-gray-600">{fmtSize(f.size)} · {new Date(f.createdAt).toLocaleDateString("pt-BR")}</p>
                </a>
                <a href={`/api/files/${f.id}`} target="_blank" rel="noreferrer" className="text-sm text-gray-500 hover:text-[#2AB9B0] flex-shrink-0" title="Abrir">↗</a>
                {isAdmin && (
                  <button onClick={() => remove(f.id)} className="text-gray-600 hover:text-red-400 text-xs flex-shrink-0" title="Remover">✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Observações */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Observações do contrato</label>
        <textarea
          defaultValue={unit.contratoNotes ?? ""}
          disabled={!isAdmin}
          onBlur={(e) => e.target.value !== (unit.contratoNotes ?? "") && patch({ contratoNotes: e.target.value })}
          rows={4}
          placeholder="Cláusulas, prazos, condições…"
          className="bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2AB9B0]/25 focus:border-[#2AB9B0]/60 resize-none disabled:text-gray-400"
        />
      </div>
    </div>
  );
}

/* ─── Aba Vistoria (recebimento do documento) ─────────────────── */
type VistoriaCheck = {
  status: "pendente" | "recebido_sem_pendencias" | "recebido_com_pendencias";
  dataRecebimento: string;
  responsavel: string;
  pendencias: PendenciaItem[];
  obs: string;
};

function parseVistoria(raw: string | null): VistoriaCheck {
  const base: VistoriaCheck = { status: "pendente", dataRecebimento: "", responsavel: "", pendencias: [], obs: "" };
  if (!raw) return base;
  try { return { ...base, ...JSON.parse(raw) }; } catch { return base; }
}

function VistoriaTab({ unit, isAdmin, patch }: { unit: Unit; isAdmin: boolean; patch: (p: UnitPatch) => Promise<void> }) {
  const data = parseVistoria(unit.vistoriaCheck);
  const update = (next: Partial<VistoriaCheck>) =>
    patch({ vistoriaCheck: JSON.stringify({ ...data, ...next }) });

  const STATUS_OPTS: { key: VistoriaCheck["status"]; label: string; desc: string; color: string }[] = [
    { key: "pendente",                  label: "Pendente",                   desc: "Documento ainda não entregue ao cliente",    color: "#6B7280" },
    { key: "recebido_sem_pendencias",   label: "Recebido — sem pendências",  desc: "Cliente recebeu e aceitou sem ressalvas",   color: "#22C55E" },
    { key: "recebido_com_pendencias",   label: "Recebido — com pendências",  desc: "Cliente recebeu e apontou pendências",      color: "#EAB308" },
  ];

  const addPendencia = () => {
    const text = prompt("Descrição da pendência:");
    if (!text?.trim()) return;
    update({ pendencias: [...data.pendencias, { id: uid(), text: text.trim(), done: false }] });
  };

  const togglePendencia = (id: string) =>
    update({ pendencias: data.pendencias.map((p) => p.id === id ? { ...p, done: !p.done } : p) });

  const removePendencia = (id: string) =>
    update({ pendencias: data.pendencias.filter((p) => p.id !== id) });

  const doneCount = data.pendencias.filter((p) => p.done).length;

  return (
    <div className="flex flex-col gap-6 max-w-lg">

      {/* Status de recebimento */}
      <div>
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Status do documento</p>
        <div className="flex flex-col gap-2">
          {STATUS_OPTS.map((opt) => (
            <button
              key={opt.key}
              disabled={!isAdmin}
              onClick={() => update({ status: opt.key })}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all
                ${data.status === opt.key
                  ? "border-white/20 bg-white/5"
                  : "border-white/5 hover:border-white/10 hover:bg-white/[0.02]"}
                ${!isAdmin ? "cursor-default" : "cursor-pointer"}`}
            >
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-white">{opt.label}</span>
                <span className="text-xs text-gray-500">{opt.desc}</span>
              </div>
              {data.status === opt.key && <span className="ml-auto text-[#2AB9B0] text-sm">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Data e responsável */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Data de recebimento</label>
          <input
            type="date"
            value={data.dataRecebimento}
            disabled={!isAdmin}
            onChange={(e) => update({ dataRecebimento: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2AB9B0] disabled:text-gray-400"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Responsável</label>
          <input
            value={data.responsavel}
            disabled={!isAdmin}
            onChange={(e) => update({ responsavel: e.target.value })}
            placeholder="Quem recebeu"
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2AB9B0] disabled:text-gray-400"
          />
        </div>
      </div>

      {/* Pendências apontadas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            Pendências apontadas
            {data.pendencias.length > 0 && (
              <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: doneCount === data.pendencias.length ? "#22C55E22" : "#EAB30822", color: doneCount === data.pendencias.length ? "#22C55E" : "#EAB308" }}>
                {doneCount}/{data.pendencias.length}
              </span>
            )}
          </p>
          {isAdmin && (
            <button onClick={addPendencia} className="text-[11px] text-[#2AB9B0] hover:text-white transition-colors font-semibold">
              + Adicionar
            </button>
          )}
        </div>

        {data.pendencias.length === 0 ? (
          <p className="text-xs text-gray-600 italic">
            {data.status === "recebido_com_pendencias"
              ? "Adicione as pendências apontadas pelo cliente."
              : "Nenhuma pendência registrada."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.pendencias.map((p) => (
              <div key={p.id} className="flex items-center gap-3 group">
                <button
                  disabled={!isAdmin}
                  onClick={() => togglePendencia(p.id)}
                  className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all
                    ${p.done ? "bg-[#22C55E] border-[#22C55E]" : "border-white/20"}
                    ${isAdmin ? "cursor-pointer" : "cursor-default"}`}
                >
                  {p.done && <span className="text-[9px] text-white font-bold">✓</span>}
                </button>
                <span className={`text-sm flex-1 ${p.done ? "line-through text-gray-600" : "text-gray-200"}`}>{p.text}</span>
                {isAdmin && (
                  <button onClick={() => removePendencia(p.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Observações */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Observações</label>
        <textarea
          value={data.obs}
          disabled={!isAdmin}
          onChange={(e) => update({ obs: e.target.value })}
          rows={3}
          placeholder="Anotações sobre a entrega do documento de vistoria…"
          className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2AB9B0] resize-none disabled:text-gray-400"
        />
      </div>
    </div>
  );
}

/* ─── Aba Entrega de chaves ───────────────────────────────────── */
function EntregaTab({ unit, isAdmin, patch }: { unit: Unit; isAdmin: boolean; patch: (p: UnitPatch) => Promise<void>; }) {
  const data = parseEntrega(unit.entregaChaves);
  // docs padrão se ainda não houver nenhum
  const docs: PendenciaItem[] = data.docs.length ? data.docs : [
    { id: uid(), text: "Registro da Escritura", done: false },
    { id: uid(), text: "ITIV", done: false },
    { id: uid(), text: "Manual do Proprietário", done: false },
  ];
  const update = (next: Partial<EntregaChaves>) =>
    patch({ entregaChaves: JSON.stringify({ ...data, docs, ...next }) });

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Documentos da entrega</p>
        <Checklist items={docs} isAdmin={isAdmin} onChange={(items) => update({ docs: items })} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Data da entrega</label>
        <input type="date" value={data.dataEntrega} disabled={!isAdmin}
          onChange={(e) => update({ dataEntrega: e.target.value })}
          className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2AB9B0] disabled:text-gray-400 w-52" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Documento assinado</label>
        <button
          disabled={!isAdmin}
          onClick={() => {
            const next = !data.documentoAssinado;
            update({ documentoAssinado: next, dataAssinatura: next ? new Date().toISOString() : "" });
          }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all w-fit disabled:cursor-default ${
            data.documentoAssinado
              ? "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]"
              : "border-white/10 bg-black/30 text-gray-400 hover:border-white/20"
          }`}
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            data.documentoAssinado ? "border-[#22C55E] bg-[#22C55E]" : "border-gray-600"
          }`}>
            {data.documentoAssinado && <span className="text-white text-[10px] font-bold">✓</span>}
          </div>
          <span className="text-sm font-medium">
            {data.documentoAssinado ? "Documento assinado" : "Marcar como assinado"}
          </span>
        </button>
        {data.dataAssinatura && (
          <p className="text-[10px] text-gray-500">Assinado em {new Date(data.dataAssinatura).toLocaleString("pt-BR")}</p>
        )}
      </div>
    </div>
  );
}

/* ─── Aba Pós-obra ────────────────────────────────────────────── */
const POSOBRA_STATUS: Record<PosObraItem["status"], { label: string; color: string }> = {
  aberto:       { label: "Aberto",       color: "#F97316" },
  em_andamento: { label: "Em andamento", color: "#EAB308" },
  atendido:     { label: "Atendido",     color: "#06B6D4" },
  aceito:       { label: "Aceito",       color: "#22C55E" },
};

function PosObraTab({ unit, isAdmin, sessionId, patch }: { unit: Unit; isAdmin: boolean; sessionId: string; patch: (p: UnitPatch) => Promise<void>; }) {
  const items = parseList<PosObraItem>(unit.posObra);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const save = (next: PosObraItem[]) => patch({ posObra: JSON.stringify(next) });

  const sendEmail = async (requestId: string) => {
    setSending(requestId);
    const r = await fetch(`/api/units/${unit.id}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    setSending(null);
    if (r.ok) setSentIds((s) => new Set([...s, requestId]));
    else { const d = await r.json(); alert(d.error ?? "Erro ao enviar e-mail"); }
  };

  const add = () => {
    if (!titulo.trim()) return;
    save([...items, {
      id: uid(), titulo: titulo.trim(), descricao: descricao.trim(),
      status: "aberto", resposta: "", aceito: false, createdAt: new Date().toISOString(),
      origem: "admin",
    }]);
    setTitulo(""); setDescricao("");
  };

  const copyPortalLink = async () => {
    const r = await fetch(`/api/units/${unit.id}/portal`, { method: "POST", headers: { "x-user-id": sessionId } });
    if (!r.ok) return;
    const { token } = await r.json();
    const url = `${window.location.origin}/portal/${token}`;
    try { await navigator.clipboard.writeText(url); } catch { /* área de transferência indisponível */ }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };
  const patchItem = (id: string, p: Partial<PosObraItem>) =>
    save(items.map((it) => it.id === id ? { ...it, ...p } : it));
  const remove = (id: string) => save(items.filter((it) => it.id !== id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-400">
          Pedidos de revisão / manutenção pós-obra e as respostas da empresa.
        </p>
        {isAdmin && (
          <button onClick={copyPortalLink}
            className="flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap">
            {linkCopied ? "✓ Link copiado!" : "🔗 Copiar link do portal"}
          </button>
        )}
      </div>

      {/* Novo pedido */}
      {isAdmin && (
        <div className="bg-[#0F1E2E] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do pedido…"
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2AB9B0]" />
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} placeholder="Descrição (opcional)…"
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2AB9B0] resize-none" />
          <button onClick={add} disabled={!titulo.trim()}
            className="self-end px-4 py-2 rounded-xl bg-[#2AB9B0] text-white text-sm font-bold disabled:opacity-40">+ Registrar pedido</button>
        </div>
      )}

      {items.length === 0 && <p className="text-sm text-gray-600 italic">Nenhum pedido registrado</p>}

      {items.slice().reverse().map((it) => {
        const st = POSOBRA_STATUS[it.status];
        return (
          <div key={it.id} className="bg-[#0F1E2E] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-white">{it.titulo}</p>
                  {it.origem === "portal" && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#2AB9B0]/15 text-[#2AB9B0] border border-[#2AB9B0]/30">👤 do proprietário</span>
                  )}
                </div>
                {it.descricao && <p className="text-xs text-gray-400 mt-0.5">{it.descricao}</p>}
                <p className="text-[10px] text-gray-600 mt-1">{new Date(it.createdAt).toLocaleDateString("pt-BR")}</p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ backgroundColor: st.color + "22", color: st.color, border: `1px solid ${st.color}55` }}>
                {st.label}
              </span>
              {isAdmin && (
                <button onClick={() => remove(it.id)} className="text-gray-600 hover:text-red-400 text-xs flex-shrink-0">✕</button>
              )}
            </div>

            {/* Resposta da empresa */}
            <div className="flex flex-col gap-1.5 pl-3 border-l-2 border-white/10">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Resposta da empresa</label>
                {isAdmin && it.resposta?.trim() && (
                  unit.email ? (
                    <button
                      onClick={() => sendEmail(it.id)}
                      disabled={sending === it.id}
                      className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                        sentIds.has(it.id)
                          ? "border-[#22C55E]/40 text-[#22C55E] bg-[#22C55E]/10"
                          : "border-[#2AB9B0]/30 text-[#2AB9B0] hover:bg-[#2AB9B0]/10"
                      } disabled:opacity-50`}
                    >
                      {sending === it.id ? "Enviando…" : sentIds.has(it.id) ? "✓ Enviado" : "✉ Enviar por email"}
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-600 italic">sem e-mail cadastrado</span>
                  )
                )}
              </div>
              {isAdmin ? (
                <textarea
                  defaultValue={it.resposta}
                  onBlur={(e) => e.target.value !== it.resposta && patchItem(it.id, {
                    resposta: e.target.value,
                    status: e.target.value.trim() && it.status === "aberto" ? "atendido" : it.status,
                  })}
                  rows={2} placeholder="Escreva a resposta / providência…"
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2AB9B0] resize-none" />
              ) : (
                <p className="text-sm text-gray-300">{it.resposta || <span className="text-gray-600 italic">Aguardando resposta</span>}</p>
              )}
            </div>

            {/* Ações de status */}
            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                {(["aberto", "em_andamento", "atendido", "aceito"] as const).map((s) => (
                  <button key={s} onClick={() => patchItem(it.id, { status: s, aceito: s === "aceito" })}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all
                      ${it.status === s ? "text-white" : "text-gray-500 border-white/10 hover:text-gray-300"}`}
                    style={it.status === s ? { backgroundColor: POSOBRA_STATUS[s].color + "33", borderColor: POSOBRA_STATUS[s].color + "66", color: POSOBRA_STATUS[s].color } : {}}>
                    {POSOBRA_STATUS[s].label}
                  </button>
                ))}
              </div>
            )}

            {/* Assinatura da aceitação */}
            {it.assinaturaImg && (
              <div className="flex items-center gap-3 bg-[#22C55E]/[0.07] border border-[#22C55E]/20 rounded-xl px-3 py-2">
                <span className="text-[#22C55E] text-xs font-bold flex-shrink-0">✔ Aceito</span>
                {it.assinaturaData && <span className="text-[10px] text-gray-500">{new Date(it.assinaturaData).toLocaleString("pt-BR")}</span>}
                <img src={it.assinaturaImg} alt="assinatura" className="h-8 ml-auto rounded bg-black/30 border border-white/10" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
