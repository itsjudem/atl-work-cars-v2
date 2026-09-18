import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { termsOfService } from "@/data/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service | ATL Work Cars",
  description: termsOfService.description,
  path: "/terms-of-service/",
});

export default function TermsPage() {
  return <LegalPage doc={termsOfService} />;
}
