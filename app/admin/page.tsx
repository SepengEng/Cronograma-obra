"use client";

import { useEffect, useState, FormEvent } from "react";

type Visit = {
  id: string;
  date: string;
  visitor: string;
  type: string;
  notes: string | null;
};

function formatDisplay(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }) + " — " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function toLocalInput(dateStr: string) {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Visit | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    date: "",
    visitor: "",
    type: "visita",
    notes: "",
  });

  async function loadVisits(key: string) {
    setLoading(true);
    const r = await fetch("/api/visits");
    const data = await r.json();
    setVisits(data);
    setLoading(false);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/visits", {
      headers: { "x-admin-secret": secret },
    });
    if (r.ok) {
      setAuthed(true);
      setAuthError("");
      localStorage.setItem("admin_secret", secret);
      loadVisits(secret);
    } else {
      setAuthError("Senha incorreta.");
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("admin_secret");
    if (saved) {
      setSecret(saved);
      fetch("/api/visits", { headers: { "x-admin-secret": saved } }).then((r) => {
        if (r.ok) {
          setAuthed(true);
          r.json().then(setVisits);
        }
      });
    }
  }, []);

  function openNew() {
    setEditing(null);
    setForm({ date: "", visitor: "", type: "visita", notes: "" });
    setShowForm(true);
  }

  function openEdit(v: Visit) {
    setEditing(v);
    setForm({
      date: toLocalInput(v.date),
      visitor: v.visitor,
      type: v.type,
      notes: v.notes ?? "",
    });
    setShowForm(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
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
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const updated = await r.json();
        setVisits((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      }
    } else {
      const r = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const created = await r.json();
        setVisits((prev) => [...prev, created].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      }
    }
    setSaving(false);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/visits/${id}`, {
      method: "DELETE",
      headers: { "x-admin-secret": secret },
    });
    setVisits((prev) => prev.filter((v) => v.id !== id));
    setDeleteId(null);
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🏗️</div>
            <h1 className="text-2xl font-bold text-white">Painel Admin</h1>
            <p className="text-gray-400 mt-1 text-sm">Cronograma de Visitas — Obra</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha de acesso</label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="••••••••"
                autoFocus
              />
              {authError && <p className="text-red-400 text-sm mt-1.5">{authError}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  const now = new Date();
  const upcoming = visits.filter((v) => new Date(v.date) >= new Date(now.toDateString()));
  const past = visits.filter((v) => new Date(v.date) < new Date(now.toDateString()));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center text-lg">🏗️</div>
            <div>
              <h1 className="text-base font-bold text-white">Cronograma Admin</h1>
              <p className="text-xs text-gray-400">Gerenciar visitas e vistorias</p>
            </div>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <span className="text-base leading-none">+</span> Nova
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-500">Carregando...</div>
        ) : (
          <>
            <Section
              title="Próximas"
              visits={upcoming}
              onEdit={openEdit}
              onDelete={(id) => setDeleteId(id)}
              empty="Nenhuma visita futura agendada."
            />
            {past.length > 0 && (
              <details className="mt-8">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400 transition-colors mb-3">
                  Passadas ({past.length})
                </summary>
                <Section
                  title=""
                  visits={past.slice().reverse()}
                  onEdit={openEdit}
                  onDelete={(id) => setDeleteId(id)}
                  empty=""
                  dim
                />
              </details>
            )}
          </>
        )}
      </main>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-5">{editing ? "Editar visita" : "Nova visita"}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <Field label="Tipo">
                <div className="flex gap-2">
                  {["visita", "vistoria"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${form.type === t ? "bg-orange-500 border-orange-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"}`}
                    >
                      {t === "visita" ? "👥 Visita" : "📋 Vistoria"}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Visitante / Empresa">
                <input
                  type="text"
                  value={form.visitor}
                  onChange={(e) => setForm((f) => ({ ...f, visitor: e.target.value }))}
                  required
                  placeholder="Ex: Engenheiro João Silva"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </Field>

              <Field label="Data e horário">
                <input
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </Field>

              <Field label="Observações (opcional)">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Instruções para a equipe da obra..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm resize-none"
                />
              </Field>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
                >
                  {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="text-base font-bold mb-1">Remover visita?</h2>
            <p className="text-gray-400 text-sm mb-5">Essa ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
              >
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

function Section({
  title,
  visits,
  onEdit,
  onDelete,
  empty,
  dim,
}: {
  title: string;
  visits: Visit[];
  onEdit: (v: Visit) => void;
  onDelete: (id: string) => void;
  empty: string;
  dim?: boolean;
}) {
  return (
    <div className={dim ? "opacity-50" : ""}>
      {title && (
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      )}
      {visits.length === 0 && empty ? (
        <p className="text-gray-500 text-sm py-4">{empty}</p>
      ) : (
        <div className="space-y-2">
          {visits.map((v) => (
            <AdminCard key={v.id} visit={v} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminCard({
  visit,
  onEdit,
  onDelete,
}: {
  visit: Visit;
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
        <p className="font-medium text-white text-sm truncate">{visit.visitor}</p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDisplay(visit.date)}</p>
        {visit.notes && <p className="text-xs text-gray-500 mt-1 truncate">{visit.notes}</p>}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(visit)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm"
          title="Editar"
        >
          ✏️
        </button>
        <button
          onClick={() => onDelete(visit.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors text-sm"
          title="Excluir"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
