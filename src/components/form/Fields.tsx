/**
 * Presentational form fields. Every field has a real <label>; errors are wired
 * with aria-invalid + aria-describedby so screen readers announce them.
 * Inputs are 16px+ (see globals.css) and at least 48px tall.
 */
import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const control =
  "mt-1.5 block min-h-12 w-full rounded-lg border bg-surface px-3.5 py-2.5 text-ink placeholder:text-ink-soft/70 focus:outline-none focus-visible:outline-3 focus-visible:outline-brand";

function describedBy(id: string, error?: string, hint?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

function borderFor(error?: string) {
  return error ? "border-danger" : "border-line";
}

function Label({ htmlFor, children, optional }: { htmlFor: string; children: ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block font-semibold">
      {children}
      {optional ? <span className="ml-1 font-normal text-ink-soft">(optional)</span> : null}
    </label>
  );
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${id}-error`} className="mt-1.5 text-[0.95rem] font-medium text-danger">
      {error}
    </p>
  );
}

function Hint({ id, hint }: { id: string; hint?: string }) {
  return hint ? (
    <p id={`${id}-hint`} className="mt-1 text-sm text-ink-soft">
      {hint}
    </p>
  ) : null;
}

type TextFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  inputRef?: Ref<HTMLInputElement>;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

export function TextField({ id, label, error, hint, optional, inputRef, className, ...rest }: TextFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <Hint id={id} hint={hint} />
      <input
        ref={inputRef}
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${control} ${borderFor(error)}`}
        {...rest}
      />
      <FieldError id={id} error={error} />
    </div>
  );
}

type TextAreaProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">;

export function TextAreaField({ id, label, error, hint, optional, className, ...rest }: TextAreaProps) {
  return (
    <div className={className}>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <Hint id={id} hint={hint} />
      <textarea
        id={id}
        name={id}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${control} ${borderFor(error)}`}
        {...rest}
      />
      <FieldError id={id} error={error} />
    </div>
  );
}

type SelectFieldProps = {
  id: string;
  label: string;
  options: readonly string[];
  placeholder?: string;
  error?: string;
  hint?: string;
  optional?: boolean;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id">;

export function SelectField({ id, label, options, placeholder = "Choose one", error, hint, optional, className, ...rest }: SelectFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <Hint id={id} hint={hint} />
      <select
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${control} ${borderFor(error)} appearance-auto`}
        {...rest}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <FieldError id={id} error={error} />
    </div>
  );
}

interface RadioGroupProps {
  id: string;
  legend: string;
  name: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  inline?: boolean;
}

export function RadioGroup({ id, legend, name, options, value, onChange, error, inline }: RadioGroupProps) {
  return (
    <fieldset id={id} className="min-w-0">
      <legend className="font-semibold">{legend}</legend>
      <div className={`mt-2 grid gap-2 ${inline ? "grid-cols-2" : ""}`}>
        {options.map((o) => {
          const optId = `${id}-${o.value.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
          return (
            <label
              key={o.value}
              htmlFor={optId}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border bg-surface px-3.5 py-2.5 has-checked:border-brand has-checked:bg-brand/5 ${
                error ? "border-danger" : "border-line"
              }`}
            >
              <input
                id={optId}
                type="radio"
                name={name}
                value={o.value}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
                aria-describedby={error ? `${id}-error` : undefined}
                className="size-5 accent-brand"
              />
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
      <FieldError id={id} error={error} />
    </fieldset>
  );
}

interface CheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

export function CheckboxField({ id, label, checked, onChange, error }: CheckboxProps) {
  return (
    <div>
      <label htmlFor={id} className={`flex cursor-pointer gap-3 rounded-lg border bg-surface p-4 ${error ? "border-danger" : "border-line"}`}>
        <input
          id={id}
          name={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-5 shrink-0 accent-brand"
        />
        <span>{label}</span>
      </label>
      <FieldError id={id} error={error} />
    </div>
  );
}

/** Off-screen honeypot. Hidden from people and assistive tech; bots fill it. */
export function Honeypot({ inputRef }: { inputRef: Ref<HTMLInputElement> }) {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
      <label htmlFor="website">Leave this field empty</label>
      <input ref={inputRef} id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}
