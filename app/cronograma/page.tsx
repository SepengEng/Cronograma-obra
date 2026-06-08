"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type Role = "admin" | "obra";
type Session = { role: Role; name: string; id: string };
type AppUser = { id: string; name: string; role: string };
type Visit = { id: string; date: string; visitor: string; type: string; notes: string | null };

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS_SHORT = ["D","S","T","Q","Q","S","S"];
const DAYS_FULL = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function toLocalInput(s: string) {
  const d = new Date(s), p = (n:number)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
}
function fmtDay(key: string) {
  const [y,m,d] = key.split("-").map(Number);
  return new Date(y,m-1,d).toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
}

export default function CronogramaPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session|null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(()=>{ const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),1); });
  const [selected, setSelected] = useState(()=>toKey(new Date()));
  const [view, setView] = useState<"calendar"|"lista">("calendar");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Visit|null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string|null>(null);
  const [form, setForm] = useState({date:"",visitor:"",type:"visita",notes:""});

  // Users panel
  const [showUsers, setShowUsers] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [newUser, setNewUser] = useState({name:"",password:"",role:"obra"});
  const [addingUser, setAddingUser] = useState(false);
  const [userErr, setUserErr] = useState("");

  useEffect(()=>{
    const raw = localStorage.getItem("session");
    if(!raw){ router.replace("/"); return; }
    const s:Session = JSON.parse(raw);
    setSession(s);
    fetch("/api/visits").then(r=>r.json()).then(d=>setVisits(Array.isArray(d)?d:[])).catch(()=>{}).finally(()=>setLoading(false));
  },[router]);

  const byDate: Record<string,Visit[]> = {};
  for(const v of visits){ const k=toKey(new Date(v.date)); (byDate[k]??=[]).push(v); }

  const todayKey = toKey(new Date());
  const firstDay = new Date(month.getFullYear(),month.getMonth(),1).getDay();
  const daysInMonth = new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const cells:(number|null)[] = [...Array(firstDay).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)];
  while(cells.length%7) cells.push(null);

  const selectedVisits = (byDate[selected]||[]).sort((a,b)=>+new Date(a.date)-+new Date(b.date));
  const isAdmin = session?.role==="admin";

  function dayKey(day:number){ return `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`; }

  function openNew(dk?:string){
    setEditing(null);
    setForm({date:(dk||selected)+"T09:00",visitor:"",type:"visita",notes:""});
    setShowForm(true);
  }
  function openEdit(v:Visit){ setEditing(v); setForm({date:toLocalInput(v.date),visitor:v.visitor,type:v.type,notes:v.notes??""}); setShowForm(true); }

  async function handleSave(e:FormEvent){
    e.preventDefault(); if(!session) return; setSaving(true);
    const body={date:new Date(form.date).toISOString(),visitor:form.visitor,type:form.type,notes:form.notes||null};
    if(editing){
      const r=await fetch(`/api/visits/${editing.id}`,{method:"PATCH",headers:{"Content-Type":"application/json","x-user-id":session.id},body:JSON.stringify(body)});
      if(r.ok){const u=await r.json();setVisits(p=>p.map(v=>v.id===u.id?u:v));}
    } else {
      const r=await fetch("/api/visits",{method:"POST",headers:{"Content-Type":"application/json","x-user-id":session.id},body:JSON.stringify(body)});
      if(r.ok){const c=await r.json();setVisits(p=>[...p,c]);}
    }
    setSaving(false); setShowForm(false);
  }

  async function handleDelete(id:string){
    if(!session) return;
    await fetch(`/api/visits/${id}`,{method:"DELETE",headers:{"x-user-id":session.id}});
    setVisits(p=>p.filter(v=>v.id!==id)); setConfirmDelete(null);
  }

  async function loadUsers(){
    if(!session) return;
    const r=await fetch("/api/users",{headers:{"x-user-id":session.id}});
    if(r.ok) setUsers(await r.json());
  }
  async function handleAddUser(e:FormEvent){
    e.preventDefault(); if(!session) return; setAddingUser(true); setUserErr("");
    const r=await fetch("/api/register",{method:"POST",headers:{"Content-Type":"application/json","x-user-id":session.id},body:JSON.stringify(newUser)});
    const d=await r.json();
    if(r.ok){setUsers(p=>[...p,d]);setNewUser({name:"",password:"",role:"obra"});}
    else setUserErr(d.error||"Erro ao criar usuário");
    setAddingUser(false);
  }
  async function toggleRole(uid:string,role:string){
    if(!session) return;
    const nr=role==="admin"?"obra":"admin";
    const r=await fetch(`/api/users/${uid}`,{method:"PATCH",headers:{"Content-Type":"application/json","x-user-id":session.id},body:JSON.stringify({role:nr})});
    if(r.ok) setUsers(p=>p.map(u=>u.id===uid?{...u,role:nr}:u));
  }
  async function handleDeleteUser(uid:string){
    if(!session) return;
    const r=await fetch(`/api/users/${uid}`,{method:"DELETE",headers:{"x-user-id":session.id}});
    if(r.ok) setUsers(p=>p.filter(u=>u.id!==uid));
  }

  return (
    <div className="min-h-screen bg-[#0B1929] text-white flex flex-col">

      {/* Header */}
      <header className="bg-[#0F1E2E] border-b border-white/5 px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#2AB9B0] to-[#18ABDA] rounded-xl flex items-center justify-center text-xl shadow-md shadow-[#2AB9B0]/20 flex-shrink-0">🏗️</div>
            <div>
              <p className="font-bold text-white text-base leading-tight">Cronograma de Obra</p>
              <p className="text-xs text-gray-500 leading-tight mt-0.5">
                {session?.name} <span className={`font-semibold ${isAdmin?"text-[#2AB9B0]":"text-gray-400"}`}>· {isAdmin?"Admin":"Obra"}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button onClick={()=>{setShowUsers(true);loadUsers();}}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-xl transition-all">
                  <span>👥</span>
                  <span className="hidden sm:inline">Usuários</span>
                </button>
                <button onClick={()=>openNew()}
                  className="flex items-center gap-1.5 bg-[#2AB9B0] hover:bg-[#2AB9B0] text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-[#2AB9B0]/20">
                  <span className="text-base leading-none">+</span>
                  <span className="hidden sm:inline">Agendar</span>
                </button>
              </>
            )}
            <button onClick={()=>{localStorage.removeItem("session");router.replace("/");}}
              className="text-sm text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-xl transition-all">
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* View tabs */}
      <div className="bg-[#0F1E2E] border-b border-white/5 px-5">
        <div className="max-w-2xl mx-auto flex gap-1">
          {(["calendar","lista"] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)}
              className={`relative px-5 py-3.5 text-sm font-semibold transition-all ${view===v?"text-[#2AB9B0]":"text-gray-500 hover:text-gray-300"}`}>
              {v==="calendar"?"📅 Calendário":"📋 Lista geral"}
              {view===v&&<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2AB9B0] rounded-full"/>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-5">

        {view==="lista" ? (
          <ListaView visits={visits} loading={loading} isAdmin={isAdmin} onEdit={openEdit} onDelete={setConfirmDelete} onNew={openNew} onSelectDay={(k)=>{setView("calendar");setSelected(k);}} />
        ) : (<>

        {/* Calendar card */}
        <div className="bg-[#0F1E2E] border border-white/5 rounded-2xl overflow-hidden shadow-xl">

          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
            <button onClick={()=>setMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1))}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all text-lg">‹</button>
            <h2 className="text-lg font-bold text-white">{MONTHS[month.getMonth()]} <span className="text-gray-500 font-normal">{month.getFullYear()}</span></h2>
            <button onClick={()=>setMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1))}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all text-lg">›</button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 px-4 pt-4 pb-2">
            {DAYS_FULL.map((d,i)=>(
              <div key={d} className={`text-center text-xs font-semibold py-1 ${i===0||i===6?"text-gray-600":"text-gray-500"}`}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 px-4 pb-4 gap-1">
            {cells.map((day,i)=>{
              if(!day) return <div key={i}/>;
              const k = dayKey(day);
              const dv = byDate[k]||[];
              const isToday = k===todayKey;
              const isSel = k===selected;
              const isPast = k<todayKey;
              const hasV = dv.some(v=>v.type==="visita");
              const hasVist = dv.some(v=>v.type==="vistoria");
              return(
                <button key={i} onClick={()=>setSelected(k)}
                  className={`relative flex flex-col items-center justify-center rounded-xl transition-all min-h-[60px] sm:min-h-[68px] gap-1
                    ${isSel?"bg-[#2AB9B0] shadow-lg shadow-[#2AB9B0]/20":isToday?"bg-[#2AB9B0]/10 ring-1 ring-[#2AB9B0]/50":"hover:bg-white/5"}
                    ${isPast&&!isSel?"opacity-40":""}`}>
                  <span className={`text-sm sm:text-base font-bold leading-none ${isSel?"text-white":isToday?"text-[#2AB9B0]":"text-gray-200"}`}>
                    {day}
                  </span>
                  {dv.length>0&&(
                    <div className="flex gap-0.5 items-center">
                      {hasV&&<span className={`w-1.5 h-1.5 rounded-full ${isSel?"bg-white":"bg-[#2AB9B0]"}`}/>}
                      {hasVist&&<span className={`w-1.5 h-1.5 rounded-full ${isSel?"bg-white/70":"bg-[#18ABDA]"}`}/>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 px-6 pb-5 border-t border-white/5 pt-4">
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#2AB9B0]"/><span className="text-xs text-gray-500">Visita</span></div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#18ABDA]"/><span className="text-xs text-gray-500">Vistoria</span></div>
          </div>
        </div>

        {/* Day detail */}
        <div className="bg-[#0F1E2E] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div>
              <p className="font-bold text-white capitalize">{fmtDay(selected)}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {selectedVisits.length===0?"Nenhum agendamento":`${selectedVisits.length} agendamento${selectedVisits.length>1?"s":""}`}
              </p>
            </div>
            {isAdmin&&(
              <button onClick={()=>openNew(selected)}
                className="flex items-center gap-1.5 bg-white/5 hover:bg-[#2AB9B0] border border-white/10 hover:border-[#2AB9B0] text-gray-400 hover:text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all">
                <span>+</span> Agendar
              </button>
            )}
          </div>

          {loading?(
            <div className="py-14 text-center text-gray-600 text-sm">Carregando...</div>
          ):selectedVisits.length===0?(
            <div className="py-14 text-center">
              <p className="text-gray-600">Nenhum agendamento para este dia</p>
            </div>
          ):(
            <div className="divide-y divide-white/5">
              {selectedVisits.map(v=>(
                <VisitRow key={v.id} visit={v} isAdmin={isAdmin} onEdit={openEdit} onDelete={setConfirmDelete}/>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming summary */}
        {!loading&&(()=>{
          const upNext = visits.filter(v=>toKey(new Date(v.date))>selected).slice(0,3);
          if(upNext.length===0) return null;
          return(
            <div className="bg-[#0F1E2E] border border-white/5 rounded-2xl overflow-hidden">
              <p className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-white/5">Próximos agendamentos</p>
              <div className="divide-y divide-white/5">
                {upNext.map(v=>{
                  const k=toKey(new Date(v.date));
                  const [,m,d]=k.split("-").map(Number);
                  return(
                    <button key={v.id} onClick={()=>setSelected(k)}
                      className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-white/3 transition-colors text-left">
                      <div className="text-center min-w-[40px]">
                        <p className="text-lg font-bold text-white leading-none">{d}</p>
                        <p className="text-xs text-gray-500 uppercase">{MONTHS[m-1].slice(0,3)}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{v.visitor}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{fmtTime(v.date)} · {v.type==="vistoria"?"Vistoria":"Visita"}</p>
                      </div>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${v.type==="vistoria"?"bg-[#18ABDA]":"bg-[#2AB9B0]"}`}/>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
        </>)}
      </div>

      {/* Form modal */}
      {showForm&&isAdmin&&(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#122030] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">{editing?"Editar agendamento":"Novo agendamento"}</h2>
              <button onClick={()=>setShowForm(false)} className="text-gray-500 hover:text-white text-2xl leading-none transition-colors">×</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex gap-2">
                {["visita","vistoria"].map(t=>(
                  <button key={t} type="button" onClick={()=>setForm(f=>({...f,type:t}))}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all ${form.type===t?(t==="visita"?"bg-[#2AB9B0] border-[#2AB9B0] text-white":"bg-[#18ABDA] border-[#18ABDA] text-white"):"bg-white/5 border-white/10 text-gray-400 hover:border-white/20"}`}>
                    {t==="visita"?"👥 Visita":"📋 Vistoria"}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Visitante / Empresa</label>
                <input type="text" value={form.visitor} onChange={e=>setForm(f=>({...f,visitor:e.target.value}))} required
                  placeholder="Nome ou empresa"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2AB9B0] text-sm"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Data e horário</label>
                <input type="datetime-local" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#2AB9B0] text-sm"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Observações</label>
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3}
                  placeholder="Instruções para a equipe (opcional)"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2AB9B0] text-sm resize-none"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowForm(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-semibold transition-all">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-[#2AB9B0] hover:bg-[#2AB9B0] disabled:opacity-50 text-white font-bold text-sm transition-all shadow-md shadow-[#2AB9B0]/20">
                  {saving?"Salvando...":editing?"Salvar alterações":"Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete&&isAdmin&&(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#122030] border border-white/10 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🗑️</div>
            <p className="font-bold text-white text-lg mb-1">Remover agendamento?</p>
            <p className="text-gray-500 text-sm mb-6">Essa ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={()=>setConfirmDelete(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-semibold transition-all">Cancelar</button>
              <button onClick={()=>handleDelete(confirmDelete)}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all">Remover</button>
            </div>
          </div>
        </div>
      )}

      {/* Users modal */}
      {showUsers&&isAdmin&&session&&(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#122030] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <h2 className="text-lg font-bold">👥 Usuários</h2>
              <button onClick={()=>setShowUsers(false)} className="text-gray-500 hover:text-white text-2xl leading-none transition-colors">×</button>
            </div>

            {/* Add user form */}
            <form onSubmit={handleAddUser} className="px-6 py-4 border-b border-white/5 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Novo usuário</p>
              <div className="flex gap-2">
                <input type="text" value={newUser.name} onChange={e=>setNewUser(p=>({...p,name:e.target.value}))} required
                  placeholder="Nome"
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AB9B0]"/>
                <input type="password" value={newUser.password} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))} required
                  placeholder="Senha"
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AB9B0]"/>
              </div>
              <div className="flex gap-2">
                <div className="flex gap-1 flex-1">
                  {["obra","admin"].map(r=>(
                    <button key={r} type="button" onClick={()=>setNewUser(p=>({...p,role:r}))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${newUser.role===r?(r==="admin"?"bg-[#2AB9B0] border-[#2AB9B0] text-white":"bg-white/10 border-white/10 text-white"):"bg-white/5 border-white/5 text-gray-500"}`}>
                      {r==="admin"?"Admin":"Obra"}
                    </button>
                  ))}
                </div>
                <button type="submit" disabled={addingUser||!newUser.name||!newUser.password}
                  className="px-4 py-2 rounded-xl bg-[#2AB9B0] hover:bg-[#2AB9B0] disabled:opacity-40 text-white text-xs font-bold transition-all">
                  {addingUser?"...":"Criar"}
                </button>
              </div>
              {userErr&&<p className="text-red-400 text-xs">{userErr}</p>}
            </form>

            {/* User list */}
            <div className="overflow-y-auto flex-1">
              {users.length===0?(
                <p className="text-gray-600 text-sm text-center py-8">Nenhum usuário cadastrado</p>
              ):(
                <div className="divide-y divide-white/5">
                  {users.map(u=>(
                    <div key={u.id} className="flex items-center gap-3 px-6 py-3.5">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-bold text-gray-300 flex-shrink-0">
                        {u.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                        <span className={`text-xs font-medium ${u.role==="admin"?"text-[#2AB9B0]":"text-gray-500"}`}>
                          {u.role==="admin"?"Administrador":"Equipe de obra"}
                        </span>
                      </div>
                      {u.id!==session.id&&(
                        <div className="flex items-center gap-1.5">
                          <button onClick={()=>toggleRole(u.id,u.role)}
                            className="text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap">
                            {u.role==="admin"?"→ Obra":"→ Admin"}
                          </button>
                          <button onClick={()=>handleDeleteUser(u.id)}
                            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all text-sm">
                            ×
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
    </div>
  );
}

function ListaView({visits,loading,isAdmin,onEdit,onDelete,onNew,onSelectDay}:{
  visits:Visit[];loading:boolean;isAdmin:boolean;
  onEdit:(v:Visit)=>void;onDelete:(id:string)=>void;
  onNew:()=>void;onSelectDay:(k:string)=>void;
}) {
  const todayKey = toKey(new Date());
  const upcoming = visits.filter(v=>toKey(new Date(v.date))>=todayKey).sort((a,b)=>+new Date(a.date)-+new Date(b.date));
  const past = visits.filter(v=>toKey(new Date(v.date))<todayKey).sort((a,b)=>+new Date(b.date)-+new Date(a.date));

  function groupByMonth(list:Visit[]) {
    const g:Record<string,Visit[]>={};
    for(const v of list){
      const d=new Date(v.date);
      const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      (g[k]??=[]).push(v);
    }
    return g;
  }

  const upGroups=groupByMonth(upcoming);
  const upKeys=Object.keys(upGroups).sort();

  return(
    <div className="flex flex-col gap-4">
      {/* Admin add button */}
      {isAdmin&&(
        <div className="flex justify-end">
          <button onClick={onNew}
            className="flex items-center gap-2 bg-[#2AB9B0] hover:bg-[#1EA59D] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-[#2AB9B0]/20">
            + Novo agendamento
          </button>
        </div>
      )}

      {loading?(
        <div className="bg-[#0F1E2E] border border-white/5 rounded-2xl py-16 text-center text-gray-600 text-sm">Carregando...</div>
      ):upcoming.length===0&&past.length===0?(
        <div className="bg-[#0F1E2E] border border-white/5 rounded-2xl py-16 text-center">
          <p className="text-gray-600">Nenhum agendamento cadastrado</p>
        </div>
      ):(
        <>
          {/* Upcoming grouped by month */}
          {upKeys.length===0?(
            <div className="bg-[#0F1E2E] border border-white/5 rounded-2xl py-10 text-center">
              <p className="text-gray-600 text-sm">Sem agendamentos futuros</p>
            </div>
          ):upKeys.map(mk=>{
            const [y,m]=mk.split("-").map(Number);
            return(
              <div key={mk} className="bg-[#0F1E2E] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-3.5 border-b border-white/5 bg-white/2">
                  <p className="text-xs font-bold text-[#2AB9B0] uppercase tracking-wider">{MONTHS[m-1]} {y}</p>
                </div>
                <div className="divide-y divide-white/5">
                  {upGroups[mk].map(v=>(
                    <div key={v.id} className="flex items-start gap-4 px-6 py-4 group hover:bg-white/2 transition-colors cursor-pointer" onClick={()=>onSelectDay(toKey(new Date(v.date)))}>
                      {/* Date badge */}
                      <div className="flex-shrink-0 text-center min-w-[44px] pt-0.5">
                        <p className="text-2xl font-bold text-white leading-none">{new Date(v.date).getDate()}</p>
                        <p className="text-[10px] text-gray-500 uppercase mt-0.5">{["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][new Date(v.date).getDay()]}</p>
                      </div>
                      {/* Divider */}
                      <div className={`w-px self-stretch mt-1 flex-shrink-0 ${v.type==="vistoria"?"bg-[#18ABDA]/40":"bg-[#2AB9B0]/40"}`}/>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${v.type==="vistoria"?"bg-[#18ABDA]/10 text-[#18ABDA]":"bg-[#2AB9B0]/10 text-[#2AB9B0]"}`}>
                            {fmtTime(v.date)}
                          </span>
                          <span className="text-xs text-gray-600">{v.type==="vistoria"?"Vistoria":"Visita"}</span>
                        </div>
                        <p className="text-base font-semibold text-white">{v.visitor}</p>
                        {v.notes&&<p className="text-sm text-gray-500 mt-1 leading-relaxed">{v.notes}</p>}
                      </div>
                      {/* Admin actions */}
                      {isAdmin&&(
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>onEdit(v)} className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-all text-sm">✏️</button>
                          <button onClick={()=>onDelete(v.id)} className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm">🗑️</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Past visits collapsible */}
          {past.length>0&&(
            <details className="group">
              <summary className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-400 transition-colors list-none py-1">
                <span className="group-open:rotate-90 transition-transform inline-block">›</span>
                {past.length} agendamento{past.length>1?"s":""} passado{past.length>1?"s":""}
              </summary>
              <div className="mt-3 bg-[#0F1E2E] border border-white/5 rounded-2xl overflow-hidden opacity-50">
                <div className="divide-y divide-white/5">
                  {past.map(v=>(
                    <div key={v.id} className="flex items-start gap-4 px-6 py-3.5">
                      <div className="flex-shrink-0 text-center min-w-[44px] pt-0.5">
                        <p className="text-xl font-bold text-gray-400 leading-none">{new Date(v.date).getDate()}</p>
                        <p className="text-[10px] text-gray-600 uppercase mt-0.5">{MONTHS[new Date(v.date).getMonth()].slice(0,3)}</p>
                      </div>
                      <div className={`w-px self-stretch mt-1 flex-shrink-0 bg-white/10`}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-600 mb-0.5">{fmtTime(v.date)} · {v.type==="vistoria"?"Vistoria":"Visita"}</p>
                        <p className="text-sm font-semibold text-gray-400">{v.visitor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function VisitRow({visit,isAdmin,onEdit,onDelete}:{visit:Visit;isAdmin:boolean;onEdit:(v:Visit)=>void;onDelete:(id:string)=>void}) {
  const vistoria = visit.type==="vistoria";
  return(
    <div className="flex items-start gap-4 px-6 py-4 group hover:bg-white/2 transition-colors">
      <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${vistoria?"bg-[#18ABDA]/10 border border-[#18ABDA]/20":"bg-[#2AB9B0]/10 border border-[#2AB9B0]/20"}`}>
        {vistoria?"📋":"👥"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${vistoria?"bg-[#18ABDA]/10 text-[#18ABDA]":"bg-[#2AB9B0]/10 text-[#2AB9B0]"}`}>
            {fmtTime(visit.date)}
          </span>
          <span className="text-xs text-gray-600">{vistoria?"Vistoria":"Visita"}</span>
        </div>
        <p className="text-base font-semibold text-white">{visit.visitor}</p>
        {visit.notes&&<p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{visit.notes}</p>}
      </div>
      {isAdmin&&(
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
          <button onClick={()=>onEdit(visit)} className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-all text-sm">✏️</button>
          <button onClick={()=>onDelete(visit.id)} className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm">🗑️</button>
        </div>
      )}
    </div>
  );
}
