import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Shipping/Delivery Policy | MSTS-GJS Production Store",
  description: "Digital delivery policy for MSTS-GJS Production Store downloads."
};

const lastUpdated = "30 May 2026";

export default function ShippingDeliveryPolicyPage() {
  return (
    <LegalPage
      title="Shipping/Delivery Policy"
      eyebrow={`Last updated: ${lastUpdated}`}
      intro="MSTS-GJS Production Store sells downloadable digital assets for MSTS and Open Rails. This policy explains how digital delivery works."
      sections={[
        {
          title: "No Physical Shipping",
          body:
            "There is no physical shipping for any product sold on this website. We do not ship CDs, DVDs, printed material, parcels, or any physical goods."
        },
        {
          title: "Digital Delivery After Payment",
          body:
            "Files are delivered digitally after successful payment. Once Cashfree confirms payment and the order is verified, download access is made available through the customer account, purchase page, or download section."
        },
        {
          title: "Delivery Timeline",
          body:
            "Most digital products are available immediately after successful payment. In rare cases, payment confirmation, fraud checks, or server maintenance may delay access. If access is not available after successful payment, contact support with your order details."
        },
        {
          title: "Download Access",
          items: [
            "Customers should download files only from their authorized account or official store download links.",
            "Download links and product access are for the buyer's personal use and must not be shared.",
            "Large files may require a stable internet connection and enough local storage space."
          ]
        },
        {
          title: "Failed Or Interrupted Downloads",
          body:
            "If a download fails, is incomplete, or the file appears corrupted, contact support. We will review the issue and may restore access, provide a replacement file, or apply the refund policy where applicable."
        }
      ]}
    />
  );
}
