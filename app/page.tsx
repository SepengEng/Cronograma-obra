"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("session")) router.replace("/cronograma");
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "register" && password !== confirmPassword) {
      setErro("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    setErro("");
    const endpoint = mode === "login" ? "/api/auth" : "/api/register";
    try {
      const r = await fetch(endpoint, {
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
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl items-center justify-center text-4xl mb-5 shadow-lg shadow-orange-500/20">
            🏗️
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Cronograma de Obra</h1>
          <p className="text-gray-500 mt-2">Visitas e vistorias agendadas</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Mode toggle */}
          <div className="flex bg-black/30 rounded-xl p-1 mb-7 gap-1">
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setErro(""); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${mode === m ? "bg-orange-500 text-white shadow-md" : "text-gray-400 hover:text-white"}`}>
                {m === "login" ? "Entrar" : "Primeiro acesso"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required autoFocus
                placeholder="Como você se chama"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" />
            </div>
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirmar senha</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" />
              </div>
            )}

            {erro && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {erro}
              </div>
            )}

            <button type="submit" disabled={loading || !name || !password || (mode === "register" && !confirmPassword)}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all text-sm shadow-lg shadow-orange-500/20 mt-2">
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta de administrador"}
            </button>

            {mode === "register" && (
              <p className="text-xs text-gray-600 text-center leading-relaxed">
                Disponível apenas para o primeiro acesso.<br />Novos usuários são criados pelo administrador.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
