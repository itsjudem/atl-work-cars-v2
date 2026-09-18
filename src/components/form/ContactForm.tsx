"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { contactCopy } from "@/data/copy";
import { track } from "@/lib/analytics";
import { HONEYPOT_FIELD } from "@/lib/application-schema";
import { type ContactField, type ContactValues, emptyContact, validateContact } from "@/lib/contact-schema";
import type { FieldErrors } from "@/lib/validation";
import { Honeypot, TextAreaField, TextField } from "./Fields";

const fid = (f: ContactField) => `contact-${f}`;
const ORDER: ContactField[] = ["firstName", "lastName", "phone", "email", "message"];

export function ContactForm({ headingLevel = "h3" }: { headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  const [values, setValues] = useState<ContactValues>(emptyContact);
  const [errors, setErrors] = useState<FieldErrors<ContactField>>({});
  const [status, setStatus] = useState<"editing" | "submitting" | "success">("editing");
  const [serverError, setServerError] = useState<string | null>(null);
  // A new object each time, so repeated requests for the same field still run.
  const [focusRequest, setFocusRequest] = useState<{ field: ContactField } | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusRequest) document.getElementById(fid(focusRequest.field))?.focus();
  }, [focusRequest]);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  function update(field: ContactField, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    const errs = validateContact(values);
    const bad = ORDER.find((f) => errs[f]);
    setErrors(errs);
    if (bad) {
      setFocusRequest({ field: bad });
      return;
    }
    setStatus("submitting");
    setServerError(null);
    try {
      const res = await fetch("/api/contact/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, [HONEYPOT_FIELD]: honeypotRef.current?.value ?? "" }),
      });
      const data: unknown = await res.json().catch(() => null);
      const body = (data && typeof data === "object" ? data : {}) as { ok?: boolean; error?: string; errors?: FieldErrors<ContactField> };
      if (res.ok && body.ok) {
        setStatus("success");
        track("contact_submit", { page: window.location.pathname });
        return;
      }
      if (body.errors) {
        setErrors(body.errors);
        const badField = ORDER.find((f) => body.errors?.[f]);
        if (badField) setFocusRequest({ field: badField });
      }
      setServerError(body.error ?? "We couldn't send your message. Please try again.");
      setStatus("editing");
    } catch {
      setServerError("We couldn't reach our server. Check your connection and try again.");
      setStatus("editing");
    }
  }

  if (status === "success") {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="rounded-xl border-2 border-accent bg-surface p-6 focus:outline-none">
        <H className="text-2xl font-bold text-accent">{contactCopy.successHeading}</H>
        <p className="mt-2">{contactCopy.successBody}</p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="relative grid gap-5 rounded-xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="contact-form-heading">
      <H id="contact-form-heading" className="text-2xl font-bold">
        {contactCopy.formHeading}
      </H>
      <Honeypot inputRef={honeypotRef} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id={fid("firstName")} label="First name" autoComplete="given-name" value={values.firstName} onChange={(e) => update("firstName", e.target.value)} error={errors.firstName} maxLength={50} />
        <TextField id={fid("lastName")} label="Last name" autoComplete="family-name" value={values.lastName} onChange={(e) => update("lastName", e.target.value)} error={errors.lastName} maxLength={50} />
      </div>
      <TextField id={fid("phone")} label="Phone" type="tel" inputMode="tel" autoComplete="tel-national" value={values.phone} onChange={(e) => update("phone", e.target.value)} error={errors.phone} maxLength={20} />
      <TextField id={fid("email")} label="Email" optional type="email" inputMode="email" autoComplete="email" value={values.email} onChange={(e) => update("email", e.target.value)} error={errors.email} maxLength={254} />
      <TextAreaField id={fid("message")} label="Message" value={values.message} onChange={(e) => update("message", e.target.value)} error={errors.message} maxLength={2000} />
      <p className="text-sm text-ink-soft">We&apos;ll reply by phone, text or email. Message and data rates may apply.</p>
      {serverError ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/5 p-4 font-medium text-danger">
          {serverError}
        </p>
      ) : null}
      <button type="submit" disabled={status === "submitting"} className="btn-primary disabled:opacity-70 sm:justify-self-start">
        {status === "submitting" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
