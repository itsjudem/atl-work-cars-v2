import { Analytics } from "@/components/Analytics";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { StickyCtaBar } from "@/components/StickyCtaBar";
import { localBusinessSchema } from "@/lib/structured-data";

/** Public website chrome: header, footer, mobile sticky bar, schema, tracking. */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <StickyCtaBar />
      <JsonLd data={localBusinessSchema()} />
      <Analytics />
    </>
  );
}
