"use client";

import { useRef, useEffect, useState } from "react";

/* Assinatura desenhada em canvas (provisória — gov.br quando houver credenciais) */
export default function SignaturePad({
  value, canEdit, onSave, note = true,
}: {
  value: string;
  canEdit: boolean;
  onSave: (dataUrl: string) => void;
  note?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height);
      img.src = value;
    }
  }, [value]);

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  };
  const start = (e: React.PointerEvent) => {
    if (!canEdit) return;
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#fff";
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y); ctx.stroke();
    setDirty(true);
  };
  const end = () => { drawing.current = false; };
  const clear = () => {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setDirty(true);
  };
  const save = () => { onSave(canvasRef.current!.toDataURL("image/png")); setDirty(false); };

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={520}
        height={160}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className={`w-full rounded-xl border border-white/15 bg-black/30 touch-none ${canEdit ? "cursor-crosshair" : ""}`}
      />
      {canEdit && (
        <div className="flex gap-2">
          <button onClick={clear} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-400 text-xs font-semibold hover:bg-white/5">Limpar</button>
          <button onClick={save} disabled={!dirty} className="flex-1 py-2 rounded-xl bg-[#2AB9B0] text-white text-xs font-bold disabled:opacity-40">Salvar assinatura</button>
        </div>
      )}
      {note && (
        <p className="text-[10px] text-gray-600 text-center">
          ⚠️ Assinatura provisória (desenho). Integração gov.br será adicionada quando as credenciais estiverem disponíveis.
        </p>
      )}
    </div>
  );
}
