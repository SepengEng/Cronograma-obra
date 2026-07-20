"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Máscara de CPF: 000.000.000-00
function mascaraCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function PortalAcessoPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [apartamento, setApartamento] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    const r = await fetch("/api/portal/acesso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf, apartamento, nome, email }),
    });
    const d = await r.json().catch(() => ({}));
    setLoading(false);
    if (r.ok && d.token) {
      router.push(`/portal/${d.token}`);
    } else {
      setErro(d.error ?? "Não foi possível acessar. Tente novamente.");
    }
  }

  const input =
    "bg-black/30 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#2AB9B0]/60 focus:ring-2 focus:ring-[#2AB9B0]/25 transition-all";

  return (
    <div className="min-h-screen bg-[#0B1929] text-white flex flex-col">
      <header className="bg-[#0F1E2E] border-b border-white/5 px-5 py-5">
        <div className="max-w-md mx-auto flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="SBE" className="h-9 w-auto object-contain" />
          <div>
            <p className="font-bold text-base leading-tight">Portal do Proprietário</p>
            <p className="text-xs text-gray-500 leading-tight mt-0.5">Acesse os dados do seu apartamento</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-[#0F1E2E] border border-white/5 rounded-2xl p-6">
            <h1 className="text-lg font-bold mb-1">Identifique-se</h1>
            <p className="text-xs text-gray-500 mb-5">
              Informe o número do apartamento e o e-mail cadastrado na compra. Seu CPF fica salvo no
              cadastro e passa a valer para os próximos acessos.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {erro && (
                <div className="text-xs rounded-xl px-3.5 py-2.5 bg-red-500/10 border border-red-500/25 text-red-300">
                  {erro}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Apartamento *</label>
                <input
                  required
                  value={apartamento}
                  onChange={(e) => setApartamento(e.target.value)}
                  placeholder="Ex: 101"
                  className={input}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">E-mail cadastrado *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className={input}
                />
                <p className="text-[10px] text-gray-600">O mesmo e-mail informado na compra.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">CPF</label>
                <input
                  inputMode="numeric"
                  value={cpf}
                  onChange={(e) => setCpf(mascaraCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className={input}
                />
                <p className="text-[10px] text-gray-600">
                  Fica salvo no seu cadastro. Depois disso, você pode entrar só com apartamento + CPF.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nome completo</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className={input} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 bg-[#2AB9B0] hover:bg-[#1EA59D] disabled:opacity-60 text-white font-bold text-sm rounded-xl py-3 transition-all"
              >
                {loading ? "Verificando..." : "Acessar meu portal"}
              </button>
            </form>
          </div>

          <p className="text-[11px] text-gray-600 text-center mt-4 leading-relaxed">
            Não consegue acessar? Entre em contato com a construtora para conferir seu cadastro.
          </p>
        </div>
      </main>
    </div>
  );
}
