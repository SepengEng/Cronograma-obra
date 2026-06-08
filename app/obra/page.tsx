"use client";

import { useEffect, useState } from "react";

type Visit = {
  id: string;
  date: string;
  visitor: string;
  type: string;
  notes: string | null;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function groupByDate(visits: Visit[]) {
  const groups: Record<string, Visit[]> = {};
  for (const v of visits) {
    const key = new Date(v.date).toISOString().split("T")[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  }
  return groups;
}

export default function ObraPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/visits")
      .then((r) => r.json())
      .then((data) => {
        setVisits(data);
        setLoading(false);
      });
  }, []);

  const now = new Date();
  const upcoming = visits.filter((v) => new Date(v.date) >= new Date(now.toDateString()));
  const past = visits.filter((v) => new Date(v.date) < new Date(now.toDateString()));
  const groups = groupByDate(upcoming);
  const sortedDates = Object.keys(groups).sort();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-xl">🏗️</div>
          <div>
            <h1 className="text-lg font-bold text-white">Cronograma de Visitas</h1>
            <p className="text-xs text-gray-400">Obra — visualização da equipe</p>
          </div>
          <div className="ml-auto">
            <span className="inline-flex items-center gap-1.5 bg-green-900/50 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full border border-green-800">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Ao vivo
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-500">
            <span className="animate-spin mr-2">⏳</span> Carregando...
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <div className="text-5xl mb-4">📅</div>
            <p className="text-lg font-medium text-gray-400">Nenhuma visita agendada</p>
            <p className="text-sm mt-1">O escritório ainda não agendou visitas futuras.</p>
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
                  {groups[dateKey].map((visit) => (
                    <VisitCard key={visit.id} visit={visit} />
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
              {past.slice().reverse().map((visit) => (
                <VisitCard key={visit.id} visit={visit} />
              ))}
            </div>
          </details>
        )}
      </main>
    </div>
  );
}

function VisitCard({ visit }: { visit: Visit }) {
  const isVistoria = visit.type === "vistoria";
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${isVistoria ? "bg-blue-900/50 border border-blue-700" : "bg-orange-900/50 border border-orange-700"}`}>
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
          <p className="text-sm text-gray-400 mt-2 bg-gray-800/60 rounded-lg px-3 py-2 border border-gray-700">
            {visit.notes}
          </p>
        )}
      </div>
    </div>
  );
}
