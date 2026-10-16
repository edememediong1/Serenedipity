import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage
      title={
        <>
          Terms of <em>service</em>
        </>
      }
    >
      <p>[TERMS_OF_SERVICE]</p>
      <p>This page is a placeholder until the terms have been reviewed.</p>
    </LegalPage>
  );
}
