'use client';
import { useRef, useEffect, useState, useCallback } from 'react';

/* Lienzo para dibujar la firma con dedo o mouse.
   onChange(dataUrl | null) — PNG con fondo transparente. */
export default function FirmaPad({ onChange }) {
  const canvasRef = useRef(null);
  const dibujando = useRef(false);
  const trazos = useRef(false);
  const [vacio, setVacio] = useState(true);

  useEffect(() => {
    const c = canvasRef.current;
    const escala = window.devicePixelRatio || 1;
    const w = c.offsetWidth, h = 160;
    c.width = w * escala;
    c.height = h * escala;
    c.style.height = h + 'px';
    const ctx = c.getContext('2d');
    ctx.scale(escala, escala);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a2b64';
  }, []);

  const pos = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };

  const empezar = useCallback((e) => {
    e.preventDefault();
    dibujando.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }, []);

  const mover = useCallback((e) => {
    if (!dibujando.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    trazos.current = true;
  }, []);

  const terminar = useCallback(() => {
    if (!dibujando.current) return;
    dibujando.current = false;
    if (trazos.current) {
      setVacio(false);
      onChange?.(canvasRef.current.toDataURL('image/png'));
    }
  }, [onChange]);

  function limpiar() {
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    trazos.current = false;
    setVacio(true);
    onChange?.(null);
  }

  return (
    <div>
      <div className="relative rounded-lg border-2 border-dashed border-linea bg-white">
        {vacio && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-piedra/60">
            Dibuja tu firma aquí
          </span>
        )}
        <canvas
          ref={canvasRef}
          className="w-full touch-none"
          onMouseDown={empezar} onMouseMove={mover} onMouseUp={terminar} onMouseLeave={terminar}
          onTouchStart={empezar} onTouchMove={mover} onTouchEnd={terminar}
        />
      </div>
      <button type="button" onClick={limpiar} className="mt-2 text-xs text-piedra underline hover:text-tinta">
        Borrar y firmar de nuevo
      </button>
    </div>
  );
}
