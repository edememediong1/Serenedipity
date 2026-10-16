import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title={
        <>
          Privacy <em>policy</em>
        </>
      }
    >
      <p>[PRIVACY_POLICY]</p>
      <p>
        This page is a placeholder. The final policy will cover what we collect, how check-in content is
        handled, and how to export or delete your data.
      </p>
    </LegalPage>
  );
}
