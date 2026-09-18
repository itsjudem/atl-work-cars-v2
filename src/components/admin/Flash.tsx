import { Notice } from "./AuthCard";

/** Success / error message passed back from a server action via ?ok= / ?error=. */
export function Flash({ params }: { params: Record<string, string | string[] | undefined> }) {
  const ok = typeof params.ok === "string" ? params.ok : null;
  const error = typeof params.error === "string" ? params.error : null;
  return (
    <>
      {ok ? <Notice tone="success">{ok}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </>
  );
}
