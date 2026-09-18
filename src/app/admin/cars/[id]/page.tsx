import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CarFields } from "@/components/admin/CarFields";
import { Flash } from "@/components/admin/Flash";
import { History } from "@/components/admin/History";
import { Notes } from "@/components/admin/Notes";
import { formatPhone } from "@/lib/format";
import { carName, carStatusLabels, carStatusStyle, type CarStatus } from "@/lib/admin/car-status";
import { one, type SearchParams, searchTerm, UUID } from "@/lib/admin/nav";
import { can } from "@/lib/admin/roles";
import { requireStaff } from "@/lib/admin/session";
import { formatAtlanta, formatDay, todayAtlanta } from "@/lib/admin/time";
import type { VehicleFields } from "@/lib/admin/vehicle-fields";
import { createClient } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/vehicles/photo";
import {
  addCarNote,
  assignRenter,
  deleteCar,
  deleteCarNote,
  removePhoto,
  saveCar,
  savePhotoAlt,
  setCarStatus,
  setPublished,
  uploadPhoto,
} from "../actions";

export const metadata: Metadata = { title: { absolute: "Car | ATL Work Cars Admin" } };

type Car = VehicleFields & {
  id: string;
  code: string;
  status: CarStatus;
  photo_path: string | null;
  photo_alt: string | null;
  rented_since: string | null;
  created_at: string;
  updated_at: string;
  renter: { id: string; first_name: string; last_name: string; phone: string | null } | null;
};

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  renting: { id: string; code: string; year: number; make: string; model: string; trim: string | null }[];
}

const input = "mt-1.5 block min-h-12 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-ink";

export default async function CarDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const me = await requireStaff(`/admin/cars/${id}/`);
  const sp = await searchParams;
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data } = await supabase.from("vehicles").select("*, renter:contacts(id, first_name, last_name, phone)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const car = data as unknown as Car;
  const name = carName(car);
  const here = `/admin/cars/${car.id}/`;

  const mayEdit = can.editCars(me.role);
  const mayDelete = can.deleteAnything(me.role);
  const confirm = one(sp, "confirm");
  const confirmDelete = confirm === "delete" && mayDelete;
  const unrentTo = one(sp, "to");
  const confirmUnrent = confirm === "unrent" && mayEdit && car.status === "rented" && (unrentTo === "available" || unrentTo === "in_repair");

  // Renter search (Owner / Fleet Manager): active contacts by name, phone or email.
  const rq = searchTerm(one(sp, "rq"));
  let candidates: Candidate[] = [];
  if (mayEdit && rq) {
    let query = supabase.from("contacts").select("id, first_name, last_name, phone, email, renting:vehicles(id, code, year, make, model, trim)").is("archived_at", null);
    for (const word of rq.split(" ").filter(Boolean)) {
      const digits = word.replace(/\D/g, "");
      const ors = [`first_name.ilike.*${word}*`, `last_name.ilike.*${word}*`, `email.ilike.*${word}*`];
      if (digits.length >= 3) ors.push(`phone.like.*${digits}*`);
      query = query.or(ors.join(","));
    }
    const { data: found } = await query.order("last_name").limit(10);
    candidates = (found ?? []) as unknown as Candidate[];
  }

  const photo = photoUrl(car.photo_path);
  const statusButton = (to: "available" | "in_repair", label: string) =>
    car.status === to ? null : car.status === "rented" ? (
      <Link href={`${here}?confirm=unrent&to=${to}`} className="btn-secondary">{label}…</Link>
    ) : (
      <form action={setCarStatus}>
        <input type="hidden" name="id" value={car.id} />
        <input type="hidden" name="status" value={to} />
        <button type="submit" className="btn-secondary">{label}</button>
      </form>
    );

  return (
    <>
      <p><Link href="/admin/cars/" className="inline-flex min-h-11 items-center font-semibold">← All cars</Link></p>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-bold">{name}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${carStatusStyle[car.status]}`}>{carStatusLabels[car.status]}</span>
      </div>
      <p className="mt-1 text-ink-soft">
        <span className="font-mono">{car.code}</span> · {car.is_published ? "Shown on the website" : <strong className="text-caution">Hidden from the website</strong>}
        {car.is_sample ? " · Sample listing" : ""} · updated {formatAtlanta(car.updated_at)}
      </p>
      <Flash params={sp} />

      {mayEdit || mayDelete ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {mayEdit ? (
            <form action={setPublished}>
              <input type="hidden" name="id" value={car.id} />
              <input type="hidden" name="value" value={car.is_published ? "false" : "true"} />
              <button type="submit" className={car.is_published ? "btn-secondary" : "btn-primary"}>{car.is_published ? "Hide from website" : "Show on website"}</button>
            </form>
          ) : null}
          {car.is_published ? <Link href="/cars/" className="btn-secondary">View on website</Link> : null}
          {mayDelete && !confirmDelete ? <Link href={`${here}?confirm=delete`} className="btn-secondary border-danger text-danger">Delete…</Link> : null}
        </div>
      ) : null}

      {confirmUnrent && car.renter ? (
        <div role="alertdialog" aria-labelledby="unrent-title" className="mt-5 rounded-xl border-2 border-caution bg-caution-soft p-5">
          <h2 id="unrent-title" className="text-xl font-bold text-caution">Remove {car.renter.first_name} {car.renter.last_name} as the renter?</h2>
          <p className="mt-1">The car becomes {carStatusLabels[unrentTo as CarStatus]}. The rental is kept in the car&apos;s history.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={setCarStatus}>
              <input type="hidden" name="id" value={car.id} />
              <input type="hidden" name="status" value={unrentTo} />
              <button type="submit" className="btn-primary">Remove renter</button>
            </form>
            <Link href={here} className="btn-secondary">Cancel</Link>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div role="alertdialog" aria-labelledby="del-title" className="mt-5 rounded-xl border-2 border-danger bg-surface p-5">
          <h2 id="del-title" className="text-xl font-bold">Delete {name} ({car.code})?</h2>
          {car.status === "rented" ? (
            <p className="mt-2 font-semibold text-danger">This car is rented. Change the car&apos;s status first.</p>
          ) : (
            <>
              <p className="mt-2 text-ink-soft">This permanently deletes the car, its photo and its notes, and removes it from the website. Applications that named it keep the car&apos;s name. It can&apos;t be undone — to take it off the website only, use “Hide from website”.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={deleteCar}>
                  <input type="hidden" name="id" value={car.id} />
                  <input type="hidden" name="confirm" value="yes" />
                  <button type="submit" className="btn bg-danger text-white">Delete permanently</button>
                </form>
                <Link href={here} className="btn-secondary">Cancel</Link>
              </div>
            </>
          )}
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="details" className="content-start">
          <h2 id="details" className="text-2xl font-bold">Details</h2>
          <form action={saveCar} className="mt-3 grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
            <input type="hidden" name="id" value={car.id} />
            <fieldset disabled={!mayEdit} className="contents">
              <CarFields car={car} />
            </fieldset>
            {mayEdit ? <button type="submit" className="btn-primary sm:col-span-2 sm:justify-self-start">Save car</button> : null}
          </form>
        </section>

        <div className="grid content-start gap-6">
          <section aria-labelledby="status" className="rounded-xl border border-line bg-surface p-5">
            <h2 id="status" className="text-xl font-bold">Status and renter</h2>
            {car.status === "rented" && car.renter ? (
              <p className="mt-2">
                Rented to <Link href={`/admin/contacts/${car.renter.id}/`} className="font-semibold">{car.renter.first_name} {car.renter.last_name}</Link>
                {car.renter.phone ? ` · ${formatPhone(car.renter.phone)}` : ""} since {formatDay(car.rented_since)}.
              </p>
            ) : (
              <p className="mt-2">{carStatusLabels[car.status]} — no renter.</p>
            )}
            {mayEdit ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {statusButton("available", "Set Available")}
                  {statusButton("in_repair", "Set In repair")}
                </div>

                <h3 className="mt-5 font-semibold">{car.status === "rented" ? "Change the renter" : "Rent this car to a contact"}</h3>
                <form method="get" className="mt-2 flex gap-2">
                  <label htmlFor="rq" className="sr-only">Find a contact</label>
                  <input id="rq" name="rq" defaultValue={rq} placeholder="Name, phone or email" className={`${input} mt-0`} />
                  <button type="submit" className="btn-secondary">Find</button>
                </form>
                {rq && candidates.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-soft">No active contacts match. Add them on the <Link href="/admin/contacts/new/">Contacts page</Link> first.</p>
                ) : null}
                {candidates.length ? (
                  <form action={assignRenter} className="mt-3 grid gap-3">
                    <input type="hidden" name="id" value={car.id} />
                    <fieldset>
                      <legend className="font-semibold">Choose the renter</legend>
                      <ul className="mt-2 grid gap-2">
                        {candidates.map((c) => {
                          const other = (c.renting ?? []).filter((v) => v.id !== car.id);
                          return (
                            <li key={c.id} className="flex items-start gap-3 rounded-lg border border-line p-3">
                              <input id={`c-${c.id}`} type="radio" name="contact_id" value={c.id} required defaultChecked={car.renter?.id === c.id} className="mt-1 size-5" />
                              <label htmlFor={`c-${c.id}`}>
                                <span className="font-semibold">{c.first_name} {c.last_name}</span>
                                <span className="block text-sm text-ink-soft">{[c.phone ? formatPhone(c.phone) : null, c.email].filter(Boolean).join(" · ") || "No phone or email"}</span>
                                {other.length ? <span className="mt-1 block text-sm font-semibold text-caution">Already renting {other.map(carName).join(", ")}</span> : null}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </fieldset>
                    <div>
                      <label htmlFor="rented_since" className="block font-semibold">Rental start date</label>
                      <input id="rented_since" name="rented_since" type="date" required defaultValue={car.rented_since ?? todayAtlanta()} className={input} />
                    </div>
                    <button type="submit" className="btn-primary justify-self-start">{car.status === "rented" ? "Save renter" : "Mark as Rented"}</button>
                  </form>
                ) : null}
              </>
            ) : null}
          </section>

          <section aria-labelledby="photo" className="rounded-xl border border-line bg-surface p-5">
            <h2 id="photo" className="text-xl font-bold">Photo</h2>
            {photo ? (
              <Image src={photo} alt={car.photo_alt ?? ""} width={640} height={400} className="mt-3 h-auto w-full rounded-lg border border-line object-cover" />
            ) : (
              <p className="mt-2 text-ink-soft">No photo. The website shows a plain placeholder.</p>
            )}
            {mayEdit && photo ? (
              <div className="mt-3 grid gap-3">
                <form action={savePhotoAlt} className="grid gap-2">
                  <input type="hidden" name="id" value={car.id} />
                  <label htmlFor="alt-edit" className="font-semibold">Photo description</label>
                  <input id="alt-edit" name="photo_alt" required maxLength={300} defaultValue={car.photo_alt ?? ""} className={`${input} mt-0`} />
                  <button type="submit" className="btn-secondary justify-self-start">Save description</button>
                </form>
                <form action={removePhoto}>
                  <input type="hidden" name="id" value={car.id} />
                  <button type="submit" className="min-h-11 font-semibold text-danger underline-offset-4 hover:underline">Remove photo</button>
                </form>
              </div>
            ) : null}
            {mayEdit ? (
              <form action={uploadPhoto} encType="multipart/form-data" className="mt-4 grid gap-3 border-t border-line pt-4">
                <input type="hidden" name="id" value={car.id} />
                <div>
                  <label htmlFor="photo-file" className="block font-semibold">{photo ? "Replace photo" : "Upload photo"}</label>
                  <p id="photo-hint" className="text-sm text-ink-soft">JPG, PNG or WebP, up to 500 KB.</p>
                  <input id="photo-file" name="photo" type="file" required accept="image/jpeg,image/png,image/webp" aria-describedby="photo-hint" className="mt-1.5 block w-full text-sm" />
                </div>
                <div>
                  <label htmlFor="photo_alt" className="block font-semibold">Describe the photo</label>
                  <p id="alt-hint" className="text-sm text-ink-soft">For people who can&apos;t see it, e.g. “Silver 2021 Toyota Prius, front view”.</p>
                  <input id="photo_alt" name="photo_alt" required maxLength={300} aria-describedby="alt-hint" className={input} />
                </div>
                <button type="submit" className="btn-primary justify-self-start">Upload</button>
              </form>
            ) : null}
          </section>
        </div>
      </div>

      <Notes parent="vehicle_id" parentId={car.id} canAdd={mayEdit} canDelete={mayDelete} addAction={addCarNote} deleteAction={deleteCarNote} />
      <History recordType="vehicle" recordId={car.id} />
      <p className="mt-6 text-sm text-ink-soft">Added {formatAtlanta(car.created_at)}.</p>
    </>
  );
}
