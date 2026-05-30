import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | MSTS-GJS Production Store",
  description: "Privacy policy for MSTS-GJS Production Store digital asset purchases and downloads."
};

const lastUpdated = "30 May 2026";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      eyebrow={`Last updated: ${lastUpdated}`}
      intro="This Privacy Policy explains how MSTS-GJS Production Store collects, uses, and protects information for our Indian digital ecommerce store for MSTS and Open Rails downloadable assets."
      sections={[
        {
          title: "Information We Collect",
          items: [
            "Name, email address, phone number, login/account details, and support messages.",
            "Billing details, payment status, order history, download history, and product access records.",
            "Technical details such as device, browser, IP address, and activity needed to secure accounts and downloads."
          ]
        },
        {
          title: "How We Use Information",
          items: [
            "To create accounts, process orders, provide digital downloads, and maintain purchase records.",
            "To send order confirmations, payment updates, support replies, and important service notices.",
            "To prevent fraud, unauthorized downloads, piracy, and misuse of paid digital assets."
          ]
        },
        {
          title: "Payments Through Razorpay",
          body:
            "Payments are processed through Razorpay as our payment gateway/payment processor. We do not store full card numbers, UPI IDs, bank account details, CVV, PIN, or net banking credentials on our server. Sensitive payment information is handled securely by Razorpay according to its payment security practices."
        },
        {
          title: "Sharing Of Information",
          body:
            "We may share limited information with service providers such as Razorpay, hosting providers, analytics/security tools, and legal or regulatory authorities when required by applicable Indian law. We do not sell customer personal information."
        },
        {
          title: "Data Security And Retention",
          body:
            "We use reasonable technical and organizational safeguards to protect account, order, and download information. Records may be retained as needed for order support, legal compliance, accounting, fraud prevention, and dispute resolution."
        },
        {
          title: "Your Choices",
          body:
            "You may contact us to request correction of account information or assistance with privacy-related queries. Some transaction records may need to be retained for legal, tax, payment, and security reasons."
        }
      ]}
    />
  );
}
