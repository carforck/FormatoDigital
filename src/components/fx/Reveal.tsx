"use client";

import { cloneElement, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Hook: true cuando el elemento está en pantalla. Con `repetir` vuelve a false
 * al salir, para que la animación se repita cada vez que se pasa por ahí.
 */
export function useVisible<T extends Element>(margen = "-10% 0px", repetir = false) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) return setVisible(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (repetir) return setVisible(e.isIntersecting);
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: margen },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margen, repetir]);
  return { ref, visible };
}

/** Aparece deslizándose hacia arriba al entrar en pantalla. */
export function Reveal({ children, className, delay = 0, as: Tag = "div" }: { children: React.ReactNode; className?: string; delay?: number; as?: "div" | "li" | "section" }) {
  const { ref, visible } = useVisible<HTMLDivElement>();
  return (
    <Tag
      ref={ref as never}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("transition-all duration-700 ease-out motion-reduce:transition-none", visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0", className)}
    >
      {children}
    </Tag>
  );
}

/**
 * Número animado: cuenta desde 0 cada vez que entra en pantalla y, si el valor
 * cambia (p. ej. en la calculadora), viaja del valor anterior al nuevo.
 */
export function Contador({ valor, prefijo = "", sufijo = "", duracion = 1600, decimales = 0, formato }: { valor: number; prefijo?: string; sufijo?: string; duracion?: number; decimales?: number; formato?: (n: number) => string }) {
  const { ref, visible } = useVisible<HTMLSpanElement>("0px", true);
  const [n, setN] = useState(0);
  const actual = useRef(0);
  useEffect(() => {
    if (!visible) {
      actual.current = 0;
      setN(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      actual.current = valor;
      return setN(valor);
    }
    let raf = 0;
    const desde = actual.current;
    const t0 = performance.now();
    const paso = (t: number) => {
      const p = Math.min(1, (t - t0) / duracion);
      const v = desde + (valor - desde) * (1 - Math.pow(1 - p, 3));
      actual.current = v;
      setN(v);
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [visible, valor, duracion]);
  if (formato) {
    return (
      <span ref={ref} className="tabular-nums">
        {formato(n)}
      </span>
    );
  }
  return (
    <span ref={ref} className="tabular-nums">
      {prefijo}
      {n.toLocaleString("es-CO", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}
      {sufijo}
    </span>
  );
}

/** Contenedor que pasa la posición del mouse a sus hijos como --mx/--my (foco de luz). */
export function Spotlight({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      onPointerMove={(e) => {
        const t = e.target as HTMLElement;
        const card = t.closest<HTMLElement>("[data-spot]");
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}

/** Inclina su contenido en 3D siguiendo el mouse. */
export function Tilt({ children, className, max = 6 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div style={{ perspective: 1200 }} className={className}>
      <div
        ref={ref}
        className="h-full transition-transform duration-300 ease-out will-change-transform"
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          e.currentTarget.style.transform = `rotateY(${x * max}deg) rotateX(${-y * max}deg)`;
        }}
        onPointerLeave={(e) => (e.currentTarget.style.transform = "")}
      >
        {children}
      </div>
    </div>
  );
}

/** Barra de progreso de lectura fija arriba. */
export function ProgresoScroll() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const f = () => {
      const h = document.documentElement;
      setP(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight));
    };
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-sotec-green" style={{ transform: `scaleX(${p})` }} />;
}

/** Palabra que rota con efecto de escritura. */
export function TextoRotativo({ palabras }: { palabras: string[] }) {
  const [i, setI] = useState(0);
  const [txt, setTxt] = useState("");
  const [borrando, setBorrando] = useState(false);
  useEffect(() => {
    const w = palabras[i];
    const t = setTimeout(
      () => {
        if (!borrando && txt === w) return setBorrando(true);
        if (borrando && txt === "") {
          setBorrando(false);
          setI((i + 1) % palabras.length);
          return;
        }
        setTxt(borrando ? w.slice(0, txt.length - 1) : w.slice(0, txt.length + 1));
      },
      !borrando && txt === w ? 1600 : borrando ? 30 : 60,
    );
    return () => clearTimeout(t);
  }, [txt, borrando, i, palabras]);
  return (
    <span>
      {txt}
      <span className="ml-0.5 inline-block w-[2px] animate-blink bg-sotec-green align-middle" style={{ height: "1em" }} />
    </span>
  );
}

/**
 * Ícono que se dibuja trazo a trazo y rebota cada vez que entra en pantalla;
 * se mueve al pasar el mouse sobre su tarjeta (clase `group`).
 * Recibe el componente (`icon`) desde componentes de cliente, o el ícono ya
 * renderizado como hijo desde componentes de servidor.
 */
export function Icono({ icon: I, children, className, efecto = "wiggle" }: { icon?: LucideIcon; children?: React.ReactElement<{ className?: string }>; className?: string; efecto?: "wiggle" | "bounce" | "spin" | "nudge" }) {
  const { ref, visible } = useVisible<HTMLSpanElement>("0px", true);
  const [vez, setVez] = useState(0);
  useEffect(() => {
    if (visible) setVez((v) => v + 1);
  }, [visible]);
  const clase = (c?: string) => cn(c, visible ? "icono-dibujar" : "opacity-0");
  return (
    <span ref={ref} className={cn("inline-flex", `icono-${efecto}`)}>
      {I ? <I key={vez} className={clase(className)} aria-hidden /> : children && cloneElement(children, { key: vez, className: clase(children.props.className) })}
    </span>
  );
}
