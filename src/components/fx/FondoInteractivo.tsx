"use client";

import { useEffect, useRef } from "react";

/**
 * Red de partículas en canvas: los nodos se mueven lento, se conectan entre sí
 * y se iluminan / apartan alrededor del cursor. Se pausa fuera de pantalla y
 * queda estática con prefers-reduced-motion.
 */
export function FondoInteractivo({ densidad = 0.00009, rgb = "146,208,80" }: { densidad?: number; rgb?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let activo = true;
    const mouse = { x: -9999, y: -9999 };
    type P = { x: number; y: number; vx: number; vy: number; r: number };
    let ps: P[] = [];

    const medir = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = c.offsetWidth;
      h = c.offsetHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(28, Math.min(110, Math.round(w * h * densidad)));
      ps = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, r: Math.random() * 1.6 + 0.8 }));
    };

    const dibujar = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        if (!quieto) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) {
            const f = (1 - Math.sqrt(d2) / 120) * 0.8;
            p.x += (dx / Math.sqrt(d2 || 1)) * f;
            p.y += (dy / Math.sqrt(d2 || 1)) * f;
          }
        }
      }
      for (let i = 0; i < ps.length; i++) {
        const a = ps[i];
        for (let j = i + 1; j < ps.length; j++) {
          const b = ps[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 120) {
            ctx.strokeStyle = `rgba(${rgb},${(1 - d / 120) * 0.22})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (dm < 180) {
          ctx.strokeStyle = `rgba(${rgb},${(1 - dm / 180) * 0.55})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
        ctx.fillStyle = dm < 180 ? `rgba(${rgb},0.95)` : `rgba(${rgb},0.5)`;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r + (dm < 180 ? 1 : 0), 0, Math.PI * 2);
        ctx.fill();
      }
      if (!quieto && activo) raf = requestAnimationFrame(dibujar);
    };

    const mover = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const salir = () => {
      mouse.x = mouse.y = -9999;
    };
    const io = new IntersectionObserver(([e]) => {
      activo = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (activo) raf = requestAnimationFrame(dibujar);
    });

    medir();
    dibujar();
    io.observe(c);
    window.addEventListener("resize", medir);
    const host = c.parentElement!;
    host.addEventListener("pointermove", mover);
    host.addEventListener("pointerleave", salir);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", medir);
      host.removeEventListener("pointermove", mover);
      host.removeEventListener("pointerleave", salir);
    };
  }, [densidad, rgb]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
