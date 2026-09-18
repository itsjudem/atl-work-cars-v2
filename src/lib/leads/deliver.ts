import "server-only";
import type { ApplicationRecord } from "@/lib/application-schema";
import type { ContactRecord } from "@/lib/contact-schema";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Where submissions go. Every lead passes through `deliver()`, which fans out
 * to a list of sinks:
 *   1. database — saved to Supabase (applications / contacts) when configured.
 *      This sink is REQUIRED: if it fails, the visitor is asked to try again
 *      rather than being told their submission was received.
 *   2. log — a log line visible in the hosting dashboard (always).
 *   3. webhook — POST to LEAD_WEBHOOK_URL when that server-only variable is set.
 *
 * To add email or a CRM, write another sink and add it to `sinks`.
 */

export interface ApplicationLead {
  type: "application";
  reference: string;
  submittedAt: string;
  vehicle: { id: string; label: string; isSample: boolean } | null;
  data: ApplicationRecord;
}

export interface ContactLead {
  type: "contact";
  submittedAt: string;
  data: ContactRecord;
}

export type Lead = ApplicationLead | ContactLead;

interface Sink {
  name: string;
  /** A failure here fails the whole submission. */
  required?: boolean;
  /** Whether this sink is configured in the current environment. */
  enabled: () => boolean;
  send: (lead: Lead) => Promise<void>;
}

const logSink: Sink = {
  name: "log",
  enabled: () => true,
  async send(lead) {
    console.log(`[lead] ${JSON.stringify(lead)}`);
  },
};

const webhookSink: Sink = {
  name: "webhook",
  enabled: () => Boolean(process.env.LEAD_WEBHOOK_URL),
  async send(lead) {
    const url = process.env.LEAD_WEBHOOK_URL;
    if (!url) return;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`webhook responded ${res.status}`);
  },
};

class DatabaseError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
  ) {
    super(message);
  }
}

/**
 * Saves with the SECRET key (one of its three permitted uses). The reference and
 * timestamp come from the server; history ("submitted from the website") is
 * written by a database trigger.
 */
const databaseSink: Sink = {
  name: "database",
  required: true,
  enabled: () => createAdminClient() !== null,
  async send(lead) {
    const db = createAdminClient();
    if (!db) return;

    if (lead.type === "contact") {
      const d = lead.data;
      const { error } = await db.from("contacts").insert({
        first_name: d.firstName,
        last_name: d.lastName,
        phone: d.phone,
        email: d.email,
        source: "contact_form",
        original_message: d.message,
      });
      if (error) throw new DatabaseError(error.message, error.code);
      return;
    }

    const d = lead.data;
    // The car applied for, by its public code (e.g. awc-102). Missing car → no link.
    let vehicleId: string | null = null;
    if (lead.vehicle) {
      const { data } = await db.from("vehicles").select("id").eq("code", lead.vehicle.id).maybeSingle();
      vehicleId = (data?.id as string | undefined) ?? null;
    }

    const { error } = await db.from("applications").insert({
      reference: lead.reference,
      submitted_at: lead.submittedAt,
      first_name: d.firstName,
      last_name: d.lastName,
      phone: d.phone,
      email: d.email,
      zip: d.zip,
      county: d.county,
      primary_use: d.primaryUse,
      platforms: d.platforms,
      platform_status: d.platformStatus,
      urgency: d.urgency,
      age: d.age,
      has_license: d.hasLicense,
      license_state: d.licenseState,
      has_vehicle: d.hasVehicle,
      preferred_vehicle_type: d.preferredVehicleType,
      pickup_area: d.pickupArea,
      consent: d.consent,
      applicant_notes: d.applicantNotes,
      vehicle_id: vehicleId,
      vehicle_label: lead.vehicle?.label ?? null,
    });
    if (error) throw new DatabaseError(error.message, error.code);
  },
};

const sinks: Sink[] = [databaseSink, logSink, webhookSink];

export interface DeliveryResult {
  delivered: string[];
  failed: string[];
  /** A required sink failed — the submission must be reported as not received. */
  requiredFailed: boolean;
  /** The database rejected a duplicate reference (retry with a new one). */
  duplicateReference: boolean;
}

/**
 * Send a lead to every enabled sink. One sink failing never stops the others;
 * the log line is always written, so a lead is never silently lost.
 */
export async function deliver(lead: Lead): Promise<DeliveryResult> {
  const result: DeliveryResult = { delivered: [], failed: [], requiredFailed: false, duplicateReference: false };
  for (const sink of sinks.filter((s) => s.enabled())) {
    try {
      await sink.send(lead);
      result.delivered.push(sink.name);
    } catch (err) {
      result.failed.push(sink.name);
      if (sink.required) result.requiredFailed = true;
      if (err instanceof DatabaseError && err.code === "23505") result.duplicateReference = true;
      console.error(`[lead] sink "${sink.name}" failed`, err instanceof Error ? err.message : err);
    }
  }
  return result;
}
