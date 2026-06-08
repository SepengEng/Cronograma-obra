"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem("session");
    if (session) router.replace("/cronograma");
  }, [router]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: senha }),
      });
      const data = await r.json();
      if (r.ok) {
        localStorage.setItem("session", JSON.stringify({ role: data.role, secret: senha }));
        router.replace("/cronograma");
      } else {
        setErro("Senha incorreta.");
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🏗️</div>
          <h1 className="text-2xl font-bold text-white">Cronograma de Obra</h1>
          <p className="text-gray-400 mt-1 text-sm">Visitas e vistorias agendadas</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha de acesso</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="••••••••"
              autoFocus
            />
            {erro && <p className="text-red-400 text-sm mt-1.5">{erro}</p>}
          </div>
          <button
            type="submit"
            disabled={loading || !senha}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
