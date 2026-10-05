"use client";

import { useFormStatus } from "react-dom";

/**
 * A submit button that says it's working. Server actions take a moment (every
 * change is checked by the database), and a button that looks unpressed makes
 * people click twice. While the form is submitting this disables itself and
 * swaps its label, so nothing is ever sent twice by accident.
 */
export function SubmitButton({
  children,
  pendingLabel = "Working…",
  disabled,
  ...rest
}: Omit<React.ComponentProps<"button">, "type"> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} type="submit" disabled={pending || disabled} aria-busy={pending || undefined}>
      {pending ? pendingLabel : children}
    </button>
  );
}
