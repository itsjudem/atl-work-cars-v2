import type { Metadata } from "next";
import Link from "next/link";
import { cta } from "@/data/navigation";

export const metadata: Metadata = {
  title: { absolute: "Page Not Found | ATL Work Cars" },
  description: "The page you were looking for doesn't exist.",
};

export default function NotFound() {
  return (
    <section className="container-page py-20 sm:py-28">
      <p className="font-heading text-2xl font-bold text-brand">404</p>
      <h1 className="mt-2 text-4xl font-bold sm:text-5xl">This page took a wrong turn.</h1>
      <p className="lede">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href={cta.primary.href} data-cta="404_apply" className="btn-primary">
          {cta.primary.label}
        </Link>
        <Link href="/" className="btn-secondary">
          Go to the homepage
        </Link>
      </div>
    </section>
  );
}
