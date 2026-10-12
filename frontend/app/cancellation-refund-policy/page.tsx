import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy | MSTS-GJS Production Store",
  description: "Cancellation and refund policy for MSTS-GJS Production Store digital downloads."
};

const lastUpdated = "30 May 2026";

export default function CancellationRefundPolicyPage() {
  return (
    <LegalPage
      title="Cancellation & Refund Policy"
      eyebrow={`Last updated: ${lastUpdated}`}
      intro="This policy applies to purchases of downloadable digital MSTS/Open Rails assets from MSTS-GJS Production Store."
      sections={[
        {
          title: "Cancellations",
          body:
            "Orders for digital products cannot usually be cancelled once payment is successful and download access has been created. If you placed an order by mistake, contact support immediately before downloading the product."
        },
        {
          title: "Refund Eligibility",
          body:
            "Because our products are digital downloads, no refund is available after successful download, except where the file is corrupted, inaccessible, duplicate payment has occurred, or wrong product access was provided."
        },
        {
          title: "Eligible Refund Cases",
          items: [
            "The downloaded file is corrupted and a replacement cannot be provided.",
            "The product file or download link is inaccessible after successful payment.",
            "A duplicate payment was charged for the same order.",
            "Wrong product access was provided due to a store or payment processing issue."
          ]
        },
        {
          title: "Non-Refundable Cases",
          items: [
            "The product has already been successfully downloaded and is usable.",
            "The customer purchased the wrong product despite clear product information.",
            "The customer's simulator setup, third-party dependencies, or local installation is incompatible unless the listing was materially incorrect.",
            "The customer violates license terms, redistribution rules, or anti-piracy restrictions."
          ]
        },
        {
          title: "Refund Review Process",
          body:
            "Refund requests must include order details, payment reference where available, product name, and a description of the issue. Approved refunds will be processed through the original payment method or Razorpay-supported refund process. Refunds are usually initiated within 5-7 business days after approval, subject to Razorpay, bank, and payment method timelines."
        }
      ]}
    />
  );
}
