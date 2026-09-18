"use client";

import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { applyCopy } from "@/data/copy";
import {
  countyOptions,
  pickupAreaOptions,
  platformStatusOptions,
  primaryUseOptions,
  urgencyOptions,
  usStates,
  vehicleTypeOptions,
  yesNoOptions,
} from "@/data/form-options";
import { cta } from "@/data/navigation";
import { site, smsHref, telHref } from "@/data/site";
import { track } from "@/lib/analytics";
import {
  type ApplicationField,
  type ApplicationValues,
  applicationSteps,
  emptyApplication,
  HONEYPOT_FIELD,
  type StepId,
  validateApplication,
  validateStep,
} from "@/lib/application-schema";
import type { FieldErrors } from "@/lib/validation";
import { CheckboxField, Honeypot, RadioGroup, SelectField, TextAreaField, TextField } from "./Fields";

export interface SelectedVehicle {
  id: string;
  label: string;
  isSample: boolean;
  bodyTypeLabel: string;
}

type Status = "editing" | "submitting" | "success";

const LAST_STEP: StepId = 4;
const fid = (f: ApplicationField) => `app-${f}`;

const toOptions = (list: readonly string[]) => list.map((v) => ({ value: v, label: v }));

export function ApplicationForm({ vehicle }: { vehicle: SelectedVehicle | null }) {
  const [values, setValues] = useState<ApplicationValues>(() => ({
    ...emptyApplication,
    vehicleId: vehicle?.id ?? "",
    preferredVehicleType: vehicle && vehicleTypeOptions.includes(vehicle.bodyTypeLabel) ? vehicle.bodyTypeLabel : "",
  }));
  const [step, setStep] = useState<StepId>(1);
  const [errors, setErrors] = useState<FieldErrors<ApplicationField>>({});
  const [status, setStatus] = useState<Status>("editing");
  const [serverError, setServerError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  // A new object each time, so repeated requests for the same target still run.
  const [focusRequest, setFocusRequest] = useState<{ target: "heading" | ApplicationField } | null>(null);

  const honeypotRef = useRef<HTMLInputElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // Focus moves AFTER the new UI has rendered — never inside the event handler.
  useEffect(() => {
    if (!focusRequest) return;
    const { target: focusTarget } = focusRequest;
    if (focusTarget === "heading") stepHeadingRef.current?.focus();
    else {
      const el = document.getElementById(fid(focusTarget));
      // Radio groups: focus the first radio rather than the fieldset.
      const target = el instanceof HTMLFieldSetElement ? el.querySelector("input") : el;
      target?.focus();
    }
  }, [focusRequest]);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  function update<K extends ApplicationField>(field: K, value: ApplicationValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function firstInvalid(errs: FieldErrors<ApplicationField>): ApplicationField | null {
    for (const s of applicationSteps) for (const f of s.fields) if (errs[f]) return f;
    return null;
  }

  function goNext() {
    const stepErrors = validateStep(step, values);
    setErrors(stepErrors);
    const bad = firstInvalid(stepErrors);
    if (bad) {
      setFocusRequest({ target: bad });
      return;
    }
    track("application_step_complete", { step });
    setStep((s) => (s < LAST_STEP ? ((s + 1) as StepId) : s));
    setFocusRequest({ target: "heading" });
  }

  function goBack() {
    setErrors({});
    setStep((s) => (s > 1 ? ((s - 1) as StepId) : s));
    setFocusRequest({ target: "heading" });
  }

  // Enter inside a field advances a step; it never submits a half-filled form.
  function onKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter") return;
    const t = e.target;
    if (t instanceof HTMLTextAreaElement || t instanceof HTMLButtonElement) return;
    if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement) {
      e.preventDefault();
      if (step < LAST_STEP) goNext();
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    if (step < LAST_STEP) {
      goNext();
      return;
    }

    const allErrors = validateApplication(values);
    const bad = firstInvalid(allErrors);
    if (bad) {
      setErrors(allErrors);
      const owning = applicationSteps.find((s) => (s.fields as readonly ApplicationField[]).includes(bad));
      if (owning) setStep(owning.id);
      setFocusRequest({ target: bad });
      return;
    }

    setStatus("submitting");
    setServerError(null);
    try {
      const res = await fetch("/api/apply/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, [HONEYPOT_FIELD]: honeypotRef.current?.value ?? "" }),
      });
      const data: unknown = await res.json().catch(() => null);
      const body = (data && typeof data === "object" ? data : {}) as {
        ok?: boolean;
        reference?: string;
        error?: string;
        errors?: FieldErrors<ApplicationField>;
      };
      if (res.ok && body.ok) {
        setReference(typeof body.reference === "string" ? body.reference : null);
        setStatus("success");
        track("application_submit", {
          primary_use: values.primaryUse,
          urgency: values.urgency,
          county: values.county,
          vehicle: values.vehicleId || "none",
        });
        return;
      }
      if (body.errors && firstInvalid(body.errors)) {
        const badField = firstInvalid(body.errors);
        setErrors(body.errors);
        const owning = applicationSteps.find((s) => (s.fields as readonly ApplicationField[]).includes(badField as ApplicationField));
        if (owning) setStep(owning.id);
        if (badField) setFocusRequest({ target: badField });
      }
      setServerError(body.error ?? "We couldn't send your application. Please try again.");
      setStatus("editing");
    } catch {
      setServerError(`We couldn't reach our server. Check your connection and try again, or call ${site.phoneDisplay}.`);
      setStatus("editing");
    }
  }

  if (status === "success") {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="rounded-xl border-2 border-accent bg-surface p-6 focus:outline-none sm:p-8">
        <h2 className="text-3xl font-bold text-accent">{applyCopy.successHeading}</h2>
        <p className="mt-3 text-lg">{applyCopy.successBody}</p>
        {reference ? (
          <p className="mt-4 text-ink-soft">
            Your reference number: <strong className="font-mono text-ink">{reference}</strong>
          </p>
        ) : null}
        <p className="mt-4 text-ink-soft">
          Questions in the meantime? <a href={telHref}>Call</a> or <a href={smsHref}>text</a> {site.phoneDisplay}.
        </p>
      </div>
    );
  }

  const current = applicationSteps[step - 1];
  const err = (f: ApplicationField) => errors[f];

  return (
    <form noValidate onSubmit={onSubmit} onKeyDown={onKeyDown} className="relative rounded-xl border border-line bg-surface p-5 sm:p-8" aria-labelledby="apply-step-heading">
      <Honeypot inputRef={honeypotRef} />

      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Application progress">
        {applicationSteps.map((s) => (
          <li key={s.id} aria-current={s.id === step ? "step" : undefined} className="text-center">
            <span className={`block h-1.5 rounded-full ${s.id <= step ? "bg-brand" : "bg-line"}`} />
            <span className={`mt-1.5 hidden text-xs sm:block ${s.id === step ? "font-semibold text-ink" : "text-ink-soft"}`}>{s.title}</span>
          </li>
        ))}
      </ol>

      <p className="text-sm font-semibold text-ink-soft">
        Step {step} of {applicationSteps.length}
      </p>
      <h2 id="apply-step-heading" ref={stepHeadingRef} tabIndex={-1} className="mt-1 text-3xl font-bold focus:outline-none">
        {current.title}
      </h2>

      <div className="mt-6 grid gap-5">
        {step === 1 ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField id={fid("firstName")} label="First name" autoComplete="given-name" value={values.firstName} onChange={(e) => update("firstName", e.target.value)} error={err("firstName")} maxLength={50} />
              <TextField id={fid("lastName")} label="Last name" autoComplete="family-name" value={values.lastName} onChange={(e) => update("lastName", e.target.value)} error={err("lastName")} maxLength={50} />
            </div>
            <TextField id={fid("phone")} label="Phone" type="tel" inputMode="tel" autoComplete="tel-national" hint="10-digit US number. We may call or text you about your application." value={values.phone} onChange={(e) => update("phone", e.target.value)} error={err("phone")} maxLength={20} />
            <TextField id={fid("email")} label="Email" type="email" inputMode="email" autoComplete="email" value={values.email} onChange={(e) => update("email", e.target.value)} error={err("email")} maxLength={254} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField id={fid("zip")} label="ZIP code" inputMode="numeric" autoComplete="postal-code" value={values.zip} onChange={(e) => update("zip", e.target.value.replace(/\D/g, "").slice(0, 5))} error={err("zip")} />
              <SelectField id={fid("county")} label="County" options={countyOptions} value={values.county} onChange={(e) => update("county", e.target.value)} error={err("county")} />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <SelectField id={fid("primaryUse")} label="What will you primarily use the vehicle for?" options={primaryUseOptions} value={values.primaryUse} onChange={(e) => update("primaryUse", e.target.value)} error={err("primaryUse")} />
            <TextField id={fid("platforms")} label="Which platforms do you currently work with?" optional hint="List any apps or companies you drive for." value={values.platforms} onChange={(e) => update("platforms", e.target.value)} error={err("platforms")} maxLength={200} />
            <RadioGroup id={fid("platformStatus")} name="platformStatus" legend="Are you currently active on those platforms?" options={toOptions(platformStatusOptions)} value={values.platformStatus} onChange={(v) => update("platformStatus", v)} error={err("platformStatus")} />
            <RadioGroup id={fid("urgency")} name="urgency" legend="How soon do you need a vehicle?" options={toOptions(urgencyOptions)} value={values.urgency} onChange={(v) => update("urgency", v)} error={err("urgency")} inline />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <TextField id={fid("age")} label="Age" inputMode="numeric" hint="Your age in years." className="sm:max-w-40" value={values.age} onChange={(e) => update("age", e.target.value.replace(/\D/g, "").slice(0, 3))} error={err("age")} />
            <RadioGroup id={fid("hasLicense")} name="hasLicense" legend="Do you have a valid driver's license?" options={yesNoOptions} value={values.hasLicense} onChange={(v) => update("hasLicense", v)} error={err("hasLicense")} inline />
            {values.hasLicense === "yes" ? (
              <SelectField id={fid("licenseState")} label="State issuing license" options={usStates} value={values.licenseState} onChange={(e) => update("licenseState", e.target.value)} error={err("licenseState")} hint="Just the state — we don't need your license number." />
            ) : null}
            <RadioGroup id={fid("hasVehicle")} name="hasVehicle" legend="Do you currently have a vehicle?" options={yesNoOptions} value={values.hasVehicle} onChange={(v) => update("hasVehicle", v)} error={err("hasVehicle")} inline />
            <SelectField id={fid("preferredVehicleType")} label="Preferred vehicle type" optional options={vehicleTypeOptions} value={values.preferredVehicleType} onChange={(e) => update("preferredVehicleType", e.target.value)} error={err("preferredVehicleType")} />
          </>
        ) : null}

        {step === 4 ? (
          <>
            <SelectField id={fid("pickupArea")} label="Preferred pickup area" optional options={pickupAreaOptions} value={values.pickupArea} onChange={(e) => update("pickupArea", e.target.value)} error={err("pickupArea")} />
            <TextAreaField id={fid("notes")} label="Additional notes" optional hint="Anything else we should know? Please don't include ID numbers or payment details." value={values.notes} onChange={(e) => update("notes", e.target.value)} error={err("notes")} maxLength={1000} />
            <CheckboxField id={fid("consent")} label={applyCopy.consent} checked={values.consent} onChange={(c) => update("consent", c)} error={err("consent")} />
            <p className="text-sm text-ink-soft">{applyCopy.disclaimer}</p>
          </>
        ) : null}
      </div>

      {serverError ? (
        <p role="alert" className="mt-6 rounded-lg border border-danger/40 bg-danger/5 p-4 font-medium text-danger">
          {serverError}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {step > 1 ? (
          <button type="button" onClick={goBack} className="btn-secondary">
            Back
          </button>
        ) : (
          <span />
        )}
        {step < LAST_STEP ? (
          <button type="button" onClick={goNext} className="btn-primary">
            Continue
          </button>
        ) : (
          <button type="submit" disabled={status === "submitting"} className="btn-primary disabled:opacity-70" data-cta="application_submit_button">
            {status === "submitting" ? "Sending…" : cta.submit}
          </button>
        )}
      </div>
    </form>
  );
}
