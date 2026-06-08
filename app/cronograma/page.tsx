"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type Role = "admin" | "obra";
type Session = { role: Role; name: string; id: string };
type AppUser = { id: string; name: string; role: string; createdAt: string };
type Visit = { id: string; date: string; visitor: string; type: string; notes: string | null };

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function toLocalInput(dateStr: string) {
  const d = new Date(dateStr);
  const p = (n: number) => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
}
function formatFullDate(dateKey: string) {
  const [y,m,d] = dateKey.split("-").map(Number);
  return new Date(y,m-1,d).toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
}

export default function CronogramaPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session|null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState<string|null>(() => toDateKey(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Visit|null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [form, setForm] = useState({ date:"", visitor:"", type:"visita", notes:"" });
  const [showUsers, setShowUsers] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("session");
    if (!raw) { router.replace("/"); return; }
    const s: Session = JSON.parse(raw);
    setSession(s);
    fetch("/api/visits")
      .then(r => r.json())
      .then(data => setVisits(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function loadUsers(s: Session) {
    const r = await fetch("/api/users", { headers: { "x-user-id": s.id } });
    if (r.ok) setUsers(await r.json());
  }

  async function toggleRole(userId: string, currentRole: string, s: Session) {
    const newRole = currentRole === "admin" ? "obra" : "admin";
    const r = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-id": s.id },
      body: JSON.stringify({ role: newRole }),
    });
    if (r.ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  }

  async function deleteUser(userId: string, s: Session) {
    const r = await fetch(`/api/users/${userId}`, {
      method: "DELETE",
      headers: { "x-user-id": s.id },
    });
    if (r.ok) setUsers(prev => prev.filter(u => u.id !== userId));
  }

  // Group visits by date key
  const byDate: Record<string, Visit[]> = {};
  for (const v of visits) {
    const k = toDateKey(new Date(v.date));
    if (!byDate[k]) byDate[k] = [];
    byDate[k].push(v);
  }

  // Build calendar grid
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
  const todayKey = toDateKey(new Date());
  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedVisits = selected ? (byDate[selected] || []) : [];

  function prevMonth() { setMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1)); }
  function nextMonth() { setMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1)); }

  function selectDay(day: number) {
    const key = `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    setSelected(key);
  }

  function openNew(dateKey?: string) {
    setEditing(null);
    const base = dateKey ? dateKey : (selected || toDateKey(new Date()));
    setForm({ date: base + "T09:00", visitor:"", type:"visita", notes:"" });
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
    const body = { date: new Date(form.date).toISOString(), visitor: form.visitor, type: form.type, notes: form.notes || null };
    if (editing) {
      const r = await fetch(`/api/visits/${editing.id}`, {
        method:"PATCH", headers:{"Content-Type":"application/json","x-user-id":session.id},
        body: JSON.stringify(body),
      });
      if (r.ok) { const u = await r.json(); setVisits(p => p.map(v => v.id===u.id ? u : v)); }
    } else {
      const r = await fetch("/api/visits", {
        method:"POST", headers:{"Content-Type":"application/json","x-user-id":session.id},
        body: JSON.stringify(body),
      });
      if (r.ok) { const c = await r.json(); setVisits(p => [...p,c]); }
    }
    setSaving(false);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    if (!session) return;
    await fetch(`/api/visits/${id}`, { method:"DELETE", headers:{"x-user-id":session.id} });
    setVisits(p => p.filter(v => v.id !== id));
    setDeleteId(null);
  }

  const isAdmin = session?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-base">🏗️</div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Cronograma de Obra</p>
            <p className="text-xs text-gray-500 leading-tight">{session?.name} · {isAdmin ? "Admin" : "Obra"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button onClick={() => { setShowUsers(true); loadUsers(session!); }}
                className="text-xs text-gray-400 hover:text-white px-2 py-1.5 transition-colors">
                👥 Usuários
              </button>
              <button onClick={() => openNew()}
                className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                + Agendar
              </button>
            </>
          )}
          <button onClick={() => { localStorage.removeItem("session"); router.replace("/"); }}
            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 transition-colors">
            Sair
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 flex flex-col gap-4">

        {/* Calendar */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">‹</button>
            <span className="text-base font-bold">{MONTHS[month.getMonth()]} {month.getFullYear()}</span>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">›</button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 px-3 pb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 px-3 pb-4 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const key = `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const dayVisits = byDate[key] || [];
              const isToday = key === todayKey;
              const isSelected = key === selected;
              const hasVisita = dayVisits.some(v => v.type === "visita");
              const hasVistoria = dayVisits.some(v => v.type === "vistoria");
              const isPast = key < todayKey;

              return (
                <button key={i} onClick={() => selectDay(day)}
                  className={`relative flex flex-col items-center justify-start pt-1.5 pb-1 rounded-xl transition-all min-h-[52px]
                    ${isSelected ? "bg-orange-500" : isToday ? "bg-gray-800 ring-2 ring-orange-500" : "hover:bg-gray-800"}
                    ${isPast && !isSelected ? "opacity-50" : ""}`}>
                  <span className={`text-sm font-semibold leading-none ${isSelected ? "text-white" : isToday ? "text-orange-400" : "text-gray-200"}`}>
                    {day}
                  </span>
                  {dayVisits.length > 0 && (
                    <div className="flex gap-0.5 mt-1.5 items-center justify-center">
                      {hasVisita && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-orange-400"}`} />}
                      {hasVistoria && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/70" : "bg-blue-400"}`} />}
                    </div>
                  )}
                  {dayVisits.length > 1 && (
                    <span className={`text-[10px] font-bold mt-0.5 leading-none ${isSelected ? "text-white/80" : "text-gray-400"}`}>
                      {dayVisits.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-5 pb-4 border-t border-gray-800 pt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-xs text-gray-400">Visita</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-xs text-gray-400">Vistoria</span>
            </div>
          </div>
        </div>

        {/* Selected day panel */}
        {selected && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
              <div>
                <p className="text-sm font-bold text-white capitalize">{formatFullDate(selected)}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedVisits.length === 0 ? "Sem agendamentos" : `${selectedVisits.length} agendamento${selectedVisits.length>1?"s":""}`}
                </p>
              </div>
              {isAdmin && (
                <button onClick={() => openNew(selected)}
                  className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center text-white font-bold text-lg transition-colors leading-none">
                  +
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-8 text-center text-gray-500 text-sm">Carregando...</div>
            ) : selectedVisits.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-600 text-sm">Nenhum agendamento neste dia</p>
                {isAdmin && (
                  <button onClick={() => openNew(selected)} className="mt-2 text-orange-400 hover:text-orange-300 text-xs underline">
                    Agendar aqui
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {selectedVisits.sort((a,b) => +new Date(a.date) - +new Date(b.date)).map(v => (
                  <DayVisitRow key={v.id} visit={v} isAdmin={isAdmin} onEdit={openEdit} onDelete={setDeleteId} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && isAdmin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-base font-bold mb-4">{editing ? "Editar agendamento" : "Novo agendamento"}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="flex gap-2">
                {["visita","vistoria"].map(t => (
                  <button key={t} type="button" onClick={() => setForm(f=>({...f,type:t}))}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${form.type===t ? "bg-orange-500 border-orange-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400"}`}>
                    {t==="visita" ? "👥 Visita" : "📋 Vistoria"}
                  </button>
                ))}
              </div>
              <input type="text" value={form.visitor} onChange={e=>setForm(f=>({...f,visitor:e.target.value}))} required
                placeholder="Visitante / Empresa"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
              <input type="datetime-local" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
              <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2}
                placeholder="Observações para a equipe (opcional)"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none" />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={()=>setShowForm(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold text-sm transition-colors">
                  {saving ? "Salvando..." : editing ? "Salvar" : "Agendar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users modal */}
      {showUsers && isAdmin && session && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-base font-bold">👥 Usuários</h2>
              <button onClick={() => setShowUsers(false)} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {users.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">Nenhum usuário</p>
              ) : (
                <div className="divide-y divide-gray-800">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-300 flex-shrink-0">
                        {u.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{u.name}</p>
                        <span className={`text-xs font-semibold ${u.role === "admin" ? "text-orange-400" : "text-gray-500"}`}>
                          {u.role === "admin" ? "Admin" : "Obra"}
                        </span>
                      </div>
                      {u.id !== session.id && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleRole(u.id, u.role, session)}
                            className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-2 py-1 rounded-lg transition-colors">
                            {u.role === "admin" ? "→ Obra" : "→ Admin"}
                          </button>
                          <button onClick={() => deleteUser(u.id, session)}
                            className="text-xs text-gray-500 hover:text-red-400 px-2 py-1 rounded-lg transition-colors">
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && isAdmin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xs p-5 text-center">
            <p className="font-bold mb-1">Remover agendamento?</p>
            <p className="text-gray-400 text-sm mb-4">Não pode ser desfeito.</p>
            <div className="flex gap-2">
              <button onClick={()=>setDeleteId(null)} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm font-medium">Cancelar</button>
              <button onClick={()=>handleDelete(deleteId)} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DayVisitRow({ visit, isAdmin, onEdit, onDelete }: {
  visit: Visit; isAdmin: boolean;
  onEdit: (v: Visit) => void;
  onDelete: (id: string) => void;
}) {
  const isVistoria = visit.type === "vistoria";
  return (
    <div className="flex items-start gap-3 px-5 py-3 group">
      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${isVistoria ? "bg-blue-900/50 border border-blue-800/60" : "bg-orange-900/50 border border-orange-800/60"}`}>
        {isVistoria ? "📋" : "👥"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isVistoria ? "bg-blue-900/60 text-blue-300" : "bg-orange-900/60 text-orange-300"}`}>
            {formatTime(visit.date)}
          </span>
          <span className={`text-xs text-gray-500`}>{isVistoria ? "Vistoria" : "Visita"}</span>
        </div>
        <p className="text-sm font-semibold text-white mt-1">{visit.visitor}</p>
        {visit.notes && <p className="text-xs text-gray-400 mt-1 leading-relaxed">{visit.notes}</p>}
      </div>
      {isAdmin && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={()=>onEdit(visit)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 text-sm transition-colors">✏️</button>
          <button onClick={()=>onDelete(visit.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 text-sm transition-colors">🗑️</button>
        </div>
      )}
    </div>
  );
}
