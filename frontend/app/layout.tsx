import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppSupport } from "@/components/whatsapp-support";
import { GoogleAuthProvider } from "@/components/google-auth-provider";
import { EntrancePopup } from "@/components/entrance-popup";

const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || "MSTS-GJS Production Store";
const legalOwnerName = process.env.NEXT_PUBLIC_LEGAL_OWNER_NAME || "GNANAJEBASEELAN G";
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "gjs2721@gmail.com";
const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+91-7845727002";
const businessAddress = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "No 18 Kamala Nehru Colony, Arumuganeri, Tamilnadu, India - 628202";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mstsgjsproductionstore.com";

export const metadata: Metadata = {
  title: "MSTS-GJS Production Store",
  description:
    "MSTS-GJS Production Store, owned and operated by GNANAJEBASEELAN G, sells MSTS and Open Rails digital downloads priced in Indian Rupees (INR).",
  keywords: [
    "MSTS-GJS Production Store",
    "GNANAJEBASEELAN G",
    "GJS Production",
    "MSTS assets",
    "Open Rails assets",
    "INR digital downloads",
    "Cashfree Payments"
  ],
  openGraph: {
    title: "MSTS-GJS Production Store",
    description:
      "Digital MSTS and Open Rails downloads by GJS Production. Paid products are priced in Indian Rupees (INR).",
    url: siteUrl,
    siteName: "MSTS-GJS Production Store",
    type: "website"
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: businessName,
    legalName: legalOwnerName,
    url: siteUrl,
    email: supportEmail,
    telephone: supportPhone,
    address: businessAddress,
    currenciesAccepted: "INR",
    paymentAccepted: "Cashfree Payments, UPI, card, net banking",
    priceRange: "INR 0.00 - INR 999.00",
    description:
      "MSTS-GJS Production Store sells downloadable digital assets for MSTS and Open Rails. Paid products are priced in Indian Rupees (INR)."
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: "try{var t=localStorage.getItem('siteTheme')||'dark';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}"
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c")
          }}
        />
        <GoogleAuthProvider>
          <SiteHeader />
          <main>{children}</main>
          <EntrancePopup />
          <WhatsAppSupport />
          <SiteFooter />
        </GoogleAuthProvider>
      </body>
    </html>
  );
}
