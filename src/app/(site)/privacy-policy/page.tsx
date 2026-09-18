import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { privacyPolicy } from "@/data/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy | ATL Work Cars",
  description: privacyPolicy.description,
  path: "/privacy-policy/",
});

export default function PrivacyPolicyPage() {
  return <LegalPage doc={privacyPolicy} />;
}
