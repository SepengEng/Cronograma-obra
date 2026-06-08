"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("session")) router.replace("/cronograma");
  }, [router]);

  function reset() {
    setErro("");
    setName("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleLogin(e: FormEvent) {
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
        setErro(data.error || "Erro ao entrar.");
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    }
    setLoading(false);
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) { setErro("As senhas não coincidem."); return; }
    setLoading(true);
    setErro("");
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const data = await r.json();
      if (r.ok) {
        localStorage.setItem("session", JSON.stringify({ role: data.role, name: data.name, id: data.id }));
        router.replace("/cronograma");
      } else {
        setErro(data.error || "Erro ao cadastrar.");
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🏗️</div>
          <h1 className="text-2xl font-bold text-white">Cronograma de Obra</h1>
          <p className="text-gray-500 mt-1 text-sm">Visitas e vistorias</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-900 rounded-xl p-1 mb-6 border border-gray-800">
          {(["login", "register"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); reset(); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === t ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"}`}>
              {t === "login" ? "Entrar" : "Cadastrar"}
            </button>
          ))}
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="Seu nome" autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="Senha"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            {erro && <p className="text-red-400 text-sm">{erro}</p>}
            <button type="submit" disabled={loading || !name || !password}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="Seu nome" autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="Crie uma senha"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
              placeholder="Confirme a senha"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            {erro && <p className="text-red-400 text-sm">{erro}</p>}
            <button type="submit" disabled={loading || !name || !password || !confirmPassword}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">
              {loading ? "Cadastrando..." : "Cadastrar"}
            </button>
            <p className="text-xs text-gray-600 text-center">O primeiro cadastro vira administrador automaticamente.</p>
          </form>
        )}
      </div>
    </div>
  );
}
