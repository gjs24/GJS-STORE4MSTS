import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppSupport } from "@/components/whatsapp-support";

export const metadata: Metadata = {
  title: "MSTS-GJS Production Store",
  description: "Premium MSTS and Open Rails train simulator assets by GJS Production."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <WhatsAppSupport />
        <SiteFooter />
      </body>
    </html>
  );
}
