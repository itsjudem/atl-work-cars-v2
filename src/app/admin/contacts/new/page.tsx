import type { Metadata } from "next";
import Link from "next/link";
import { NewContactForm } from "@/components/admin/NewContactForm";
import { countyOptions } from "@/data/form-options";
import { NO_PERMISSION } from "@/lib/admin/errors";
import { can } from "@/lib/admin/roles";
import { requireStaff } from "@/lib/admin/session";

export const metadata: Metadata = { title: { absolute: "Add contact | ATL Work Cars Admin" } };

/** Owners and Sales add people who phone or walk in. */
export default async function NewContact() {
  const me = await requireStaff("/admin/contacts/new/");
  return (
    <>
      <p><Link href="/admin/contacts/" className="inline-flex min-h-11 items-center font-semibold">← All contacts</Link></p>
      <h1 className="text-4xl font-bold">Add a contact</h1>
      {can.editContacts(me.role) ? <NewContactForm counties={countyOptions} /> : <p className="mt-4 rounded-xl border border-line bg-surface p-4">{NO_PERMISSION}</p>}
    </>
  );
}
