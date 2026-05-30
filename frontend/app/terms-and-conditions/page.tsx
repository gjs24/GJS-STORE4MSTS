import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms & Conditions | MSTS-GJS Production Store",
  description: "Terms and conditions for MSTS-GJS Production Store digital assets."
};

const lastUpdated = "30 May 2026";

export default function TermsAndConditionsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      eyebrow={`Last updated: ${lastUpdated}`}
      intro="These Terms & Conditions govern your use of MSTS-GJS Production Store and purchases of downloadable digital MSTS/Open Rails assets including train models, routes, textures, sounds, cab views, and 3D assets."
      sections={[
        {
          title: "Digital Product Store",
          body:
            "All products sold on this website are downloadable digital files. No physical goods are sold or shipped. Product access is provided digitally after successful payment and order verification."
        },
        {
          title: "License And Permitted Use",
          body:
            "Purchased and free assets are licensed for personal MSTS/Open Rails use only unless a separate commercial license is expressly provided with the product or in writing by MSTS-GJS Production Store."
        },
        {
          title: "Restrictions",
          items: [
            "Users must not redistribute, resell, share, upload, leak, pirate, or make downloaded assets publicly available.",
            "Users must not modify assets for resale, repack them, include them in paid bundles, or claim ownership of the original work.",
            "Users must not bypass payment, download limits, account access controls, or anti-abuse systems."
          ]
        },
        {
          title: "Orders, Pricing, And Payments",
          body:
            "Prices are shown in Indian Rupees where applicable. Payments are processed through Razorpay. An order is considered confirmed only after successful payment status is received and product access is enabled."
        },
        {
          title: "Downloads And Compatibility",
          body:
            "Customers are responsible for checking product descriptions, simulator compatibility, required dependencies, and installation instructions before purchase. We may update, replace, or remove assets when necessary for maintenance, compliance, or quality reasons."
        },
        {
          title: "Intellectual Property",
          body:
            "All store content, product files, previews, descriptions, graphics, and downloadable assets remain the property of their respective owners or licensors. No ownership rights are transferred through purchase."
        },
        {
          title: "Trademarks And Affiliation",
          body:
            "Microsoft Train Simulator and Open Rails are trademarks of their respective owners. This website is an independent asset platform and is not officially affiliated with Microsoft, Open Rails, or Indian Railways."
        },
        {
          title: "Account Responsibility",
          body:
            "You are responsible for keeping account credentials secure and for all activity under your account. We may suspend access where fraud, piracy, abuse, or policy violation is suspected."
        }
      ]}
    />
  );
}
