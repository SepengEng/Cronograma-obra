"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("session")) router.replace("/cronograma");
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const data = await r.json();
      if (r.ok) {
        localStorage.setItem("session", JSON.stringify({ role: data.role, name: data.name, id: data.id }));
        router.replace("/cronograma");
      } else {
        setErro(data.error || "Ocorreu um erro.");
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0B1929] flex flex-col items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#2AB9B0]/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <img src="/logo.png" alt="SBE" className="h-20 w-auto object-contain mx-auto mb-5" />
          <h1 className="text-3xl font-bold text-white tracking-tight">Cronograma de Obra</h1>
          <p className="text-gray-500 mt-2">Visitas e vistorias agendadas</p>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required autoFocus
                placeholder="Como você se chama"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2AB9B0] focus:border-transparent transition-all text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2AB9B0] focus:border-transparent transition-all text-sm" />
            </div>

            {erro && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {erro}
              </div>
            )}

            <button type="submit" disabled={loading || !name || !password}
              className="w-full bg-[#2AB9B0] hover:bg-[#1EA59D] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all text-sm shadow-lg shadow-[#2AB9B0]/20 mt-2">
              {loading ? "Aguarde..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
