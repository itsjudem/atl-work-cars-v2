"use client";

import { useFormStatus } from "react-dom";

/**
 * A submit button that says it's working. Server actions take a moment (every
 * change is checked by the database), and a button that looks unpressed makes
 * people click twice. While the form is submitting this disables itself, so
 * nothing is ever sent twice by accident.
 *
 * With `pendingLabel` it swaps its words ("Log in" → "Logging in…"). Without
 * one it keeps its label and shows a small spinner beside it.
 */
export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  ...rest
}: Omit<React.ComponentProps<"button">, "type"> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} type="submit" disabled={pending || disabled} aria-busy={pending || undefined}>
      {pending && pendingLabel ? (
        pendingLabel
      ) : (
        <>
          {children}
          {pending ? (
            <span
              aria-hidden
              className="ml-2 inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px]"
            />
          ) : null}
        </>
      )}
    </button>
  );
}
