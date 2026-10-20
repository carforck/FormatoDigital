"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface EditableTextProps {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  type?: "text" | "number" | "date" | "tel" | "email";
  ariaLabel?: string;
  disabled?: boolean;
  /** Texto a mostrar en modo lectura (ej. "$1.500.000"). Al editar usa `value` crudo. */
  displayValue?: string;
}

export function EditableText({
  value,
  onCommit,
  placeholder = "—",
  className,
  inputClassName,
  multiline = false,
  type = "text",
  ariaLabel,
  disabled = false,
  displayValue,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current) inputRef.current.select();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  }
  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (disabled) {
    const mostrar =
      displayValue ?? (value && value.trim() ? value : placeholder);
    return <span className={className}>{mostrar}</span>;
  }

  if (editing) {
    const baseInputCls = cn(
      "w-full max-w-full rounded border border-sotec-greenDeep bg-white px-1 py-0 text-inherit outline-none focus:ring-2 focus:ring-sotec-green/50",
      inputClassName,
    );
    if (multiline) {
      return (
        <textarea
          ref={(el) => {
            inputRef.current = el;
          }}
          rows={6}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              commit();
            }
          }}
          aria-label={ariaLabel}
          className={baseInputCls}
        />
      );
    }
    return (
      <input
        ref={(el) => {
          inputRef.current = el;
        }}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        aria-label={ariaLabel}
        className={baseInputCls}
      />
    );
  }

  const tieneValor = value && value.toString().trim();
  const muestra = displayValue ?? (tieneValor ? value : "");
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      aria-label={ariaLabel}
      title="Clic para editar"
      className={cn(
        "inline-block min-w-[1ch] cursor-text rounded px-1 -mx-1 hover:bg-amber-50 focus:bg-amber-100 focus:outline-none",
        !tieneValor && "text-slate-400",
        className,
      )}
    >
      {muestra || placeholder}
    </span>
  );
}
