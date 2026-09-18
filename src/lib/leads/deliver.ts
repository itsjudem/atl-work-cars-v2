import "server-only";
import type { ApplicationRecord } from "@/lib/application-schema";
import type { ContactRecord } from "@/lib/contact-schema";

/**
 * Where submissions go. Every lead passes through `deliver()`, which fans out
 * to a list of sinks. Today: (1) a log line visible in the hosting dashboard,
 * and (2) a POST to LEAD_WEBHOOK_URL when that server-only variable is set.
 *
 * To add email, a CRM, Google Sheets or a database, write another sink and add
 * it to `sinks` — nothing else changes. (Phase 2 adds a Supabase sink here.)
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

const sinks: Sink[] = [logSink, webhookSink];

export interface DeliveryResult {
  delivered: string[];
  failed: string[];
}

/**
 * Send a lead to every enabled sink. One sink failing never loses the lead
 * from the others; the log sink always runs first.
 */
export async function deliver(lead: Lead): Promise<DeliveryResult> {
  const result: DeliveryResult = { delivered: [], failed: [] };
  for (const sink of sinks.filter((s) => s.enabled())) {
    try {
      await sink.send(lead);
      result.delivered.push(sink.name);
    } catch (err) {
      result.failed.push(sink.name);
      console.error(`[lead] sink "${sink.name}" failed`, err instanceof Error ? err.message : err);
    }
  }
  return result;
}
