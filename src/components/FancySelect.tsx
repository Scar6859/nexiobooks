"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type SelectOption = string | { value: string; label: string };

function normalizeOptions(options: readonly SelectOption[]) {
  return options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
}

type FancySelectProps = {
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  label?: string;
  allOption?: string;
  className?: string;
  required?: boolean;
};

export default function FancySelect({
  options,
  value,
  defaultValue,
  onChange,
  name,
  placeholder = "Select…",
  label,
  allOption,
  className = "",
  required,
}: FancySelectProps) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const normalized = normalizeOptions(options);
  const allOptions = allOption
    ? [{ value: allOption, label: allOption }, ...normalized]
    : normalized;

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? allOptions[0]?.value ?? ""
  );
  const selectedValue = isControlled ? value : internalValue;
  const selectedLabel =
    allOptions.find((o) => o.value === selectedValue)?.label ?? placeholder;

  function select(next: string) {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
    setOpen(false);
  }

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {name && (
        <input type="hidden" name={name} value={selectedValue} required={required} />
      )}

      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
        >
          {label}
        </label>
      )}

      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`group flex w-full items-center justify-between gap-2 rounded-xl border bg-[var(--surface-2)] px-4 py-2.5 text-left text-sm transition-all duration-200 ${
          open
            ? "border-[var(--gold-muted)] ring-2 ring-[var(--gold)]/20"
            : "border-[var(--border)] hover:border-[var(--gold)]/40"
        }`}
      >
        <span
          className={`truncate font-medium ${
            selectedValue ? "text-[var(--foreground)]" : "text-[var(--muted)]"
          }`}
        >
          {selectedLabel}
        </span>
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)] transition-all duration-200 group-hover:bg-[var(--gold)]/10 group-hover:text-[var(--gold-muted)] ${
            open ? "rotate-180 bg-[var(--gold)]/10 text-[var(--gold-muted)]" : ""
          }`}
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>

      <ul
        role="listbox"
        aria-labelledby={id}
        className={`absolute z-50 mt-2 max-h-60 w-full origin-top overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl shadow-black/30 transition-all duration-200 ${
          open
            ? "visible scale-100 opacity-100"
            : "invisible hidden scale-95 opacity-0"
        }`}
      >
        {allOptions.map((option) => {
          const isSelected = option.value === selectedValue;
          return (
            <li key={option.value} role="option" aria-selected={isSelected}>
              <button
                type="button"
                onClick={() => select(option.value)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                  isSelected
                    ? "bg-[var(--gold)]/10 font-semibold text-[var(--foreground)]"
                    : "text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && (
                  <Check className="h-4 w-4 shrink-0 text-[var(--gold-muted)]" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
