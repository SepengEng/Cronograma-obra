"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type Role = "admin" | "obra";
type Session = { role: Role; secret: string };

type Visit = {
  id: string;
  date: string;
  visitor: string;
  type: string;
  notes: string | null;
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function toLocalInput(dateStr: string) {
  const d = new Date(dateStr);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function groupByDate(visits: Visit[]) {
  const g: Record<string, Visit[]> = {};
  for (const v of visits) {
    const k = new Date(v.date).toISOString().split("T")[0];
    if (!g[k]) g[k] = [];
    g[k].push(v);
  }
  return g;
}

export default function CronogramaPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Visit | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ date: "", visitor: "", type: "visita", notes: "" });

  useEffect(() => {
    const raw = localStorage.getItem("session");
    if (!raw) { router.replace("/"); return; }
    const s: Session = JSON.parse(raw);
    setSession(s);
    fetch("/api/visits")
      .then((r) => r.json())
      .then((data) => setVisits(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  function logout() {
    localStorage.removeItem("session");
    router.replace("/");
  }

  function openNew() {
    setEditing(null);
    setForm({ date: "", visitor: "", type: "visita", notes: "" });
    setShowForm(true);
  }

  function openEdit(v: Visit) {
    setEditing(v);
    setForm({ date: toLocalInput(v.date), visitor: v.visitor, type: v.type, notes: v.notes ?? "" });
    setShowForm(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    const body = {
      date: new Date(form.date).toISOString(),
      visitor: form.visitor,
      type: form.type,
      notes: form.notes || null,
    };
    if (editing) {
      const r = await fetch(`/api/visits/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": session.secret },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const updated = await r.json();
        setVisits((prev) => prev.map((v) => v.id === updated.id ? updated : v).sort((a, b) => +new Date(a.date) - +new Date(b.date)));
      }
    } else {
      const r = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": session.secret },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const created = await r.json();
        setVisits((prev) => [...prev, created].sort((a, b) => +new Date(a.date) - +new Date(b.date)));
      }
    }
    setSaving(false);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    if (!session) return;
    await fetch(`/api/visits/${id}`, { method: "DELETE", headers: { "x-admin-secret": session.secret } });
    setVisits((prev) => prev.filter((v) => v.id !== id));
    setDeleteId(null);
  }

  const isAdmin = session?.role === "admin";
  const now = new Date();
  const upcoming = visits.filter((v) => new Date(v.date) >= new Date(now.toDateString()));
  const past = visits.filter((v) => new Date(v.date) < new Date(now.toDateString()));
  const groups = groupByDate(upcoming);
  const sortedDates = Object.keys(groups).sort();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center text-lg">🏗️</div>
            <div>
              <h1 className="text-base font-bold text-white">Cronograma de Obra</h1>
              <p className="text-xs text-gray-400">
                {isAdmin ? "Modo admin — escritório" : "Modo visualização — obra"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={openNew}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <span className="text-base leading-none">+</span> Nova
              </button>
            )}
            <button
              onClick={logout}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1.5"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-500">
            <span className="animate-spin mr-2">⏳</span> Carregando...
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📅</div>
            <p className="text-lg font-medium text-gray-400">Nenhuma visita agendada</p>
            {isAdmin && (
              <button onClick={openNew} className="mt-4 text-orange-400 hover:text-orange-300 text-sm underline">
                Agendar primeira visita
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <p className="text-sm text-gray-400">
              <span className="font-semibold text-white">{upcoming.length}</span> visita{upcoming.length !== 1 ? "s" : ""} programada{upcoming.length !== 1 ? "s" : ""}
            </p>
            {sortedDates.map((dateKey) => (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-gray-800" />
                  <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider px-2">
                    {formatDate(dateKey + "T12:00:00")}
                  </span>
                  <div className="h-px flex-1 bg-gray-800" />
                </div>
                <div className="space-y-3">
                  {groups[dateKey].map((v) => (
                    <VisitCard key={v.id} visit={v} isAdmin={isAdmin} onEdit={openEdit} onDelete={setDeleteId} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {past.length > 0 && (
          <details className="mt-12">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400 transition-colors">
              Ver {past.length} visita{past.length !== 1 ? "s" : ""} passada{past.length !== 1 ? "s" : ""}
            </summary>
            <div className="mt-4 space-y-3 opacity-50">
              {past.slice().reverse().map((v) => (
                <VisitCard key={v.id} visit={v} isAdmin={isAdmin} onEdit={openEdit} onDelete={setDeleteId} />
              ))}
            </div>
          </details>
        )}
      </main>

      {/* Modal form (admin only) */}
      {showForm && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-5">{editing ? "Editar visita" : "Nova visita"}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <Field label="Tipo">
                <div className="flex gap-2">
                  {["visita", "vistoria"].map((t) => (
                    <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${form.type === t ? "bg-orange-500 border-orange-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"}`}>
                      {t === "visita" ? "👥 Visita" : "📋 Vistoria"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Visitante / Empresa">
                <input type="text" value={form.visitor} onChange={(e) => setForm((f) => ({ ...f, visitor: e.target.value }))} required
                  placeholder="Ex: Engenheiro João Silva"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
              </Field>
              <Field label="Data e horário">
                <input type="datetime-local" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
              </Field>
              <Field label="Observações (opcional)">
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3}
                  placeholder="Instruções para a equipe da obra..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none" />
              </Field>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm font-medium">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
                  {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="text-base font-bold mb-1">Remover visita?</h2>
            <p className="text-gray-400 text-sm mb-5">Essa ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm font-medium">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function VisitCard({ visit, isAdmin, onEdit, onDelete }: {
  visit: Visit; isAdmin: boolean;
  onEdit: (v: Visit) => void;
  onDelete: (id: string) => void;
}) {
  const isVistoria = visit.type === "vistoria";
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-3 group">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${isVistoria ? "bg-blue-900/40 border border-blue-800" : "bg-orange-900/40 border border-orange-800"}`}>
        {isVistoria ? "📋" : "👥"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-white truncate">{visit.visitor}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${isVistoria ? "bg-blue-900/50 text-blue-300 border border-blue-800" : "bg-orange-900/50 text-orange-300 border border-orange-800"}`}>
            {isVistoria ? "Vistoria" : "Visita"}
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-0.5">🕐 {formatTime(visit.date)}</p>
        {visit.notes && (
          <p className="text-sm text-gray-400 mt-2 bg-gray-800/60 rounded-lg px-3 py-2 border border-gray-700">{visit.notes}</p>
        )}
      </div>
      {isAdmin && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(visit)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm">✏️</button>
          <button onClick={() => onDelete(visit.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors text-sm">🗑️</button>
        </div>
      )}
    </div>
  );
}
