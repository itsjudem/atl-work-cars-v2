import Link from "next/link";
import { closingCta } from "@/data/copy";
import { cta } from "@/data/navigation";

export function ClosingCta() {
  return (
    <section className="bg-navy" aria-labelledby="closing-cta">
      <div className="container-page py-14 text-center sm:py-20">
        <h2 id="closing-cta" className="section-heading text-white">
          {closingCta.heading}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-navy-soft">{closingCta.body}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={cta.primary.href} data-cta="closing_apply" className="btn-primary">
            {cta.primary.label}
          </Link>
          <Link href={cta.secondary.href} data-cta="closing_cars" className="btn-on-dark">
            {cta.secondary.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
