import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppSupport } from "@/components/whatsapp-support";
import { GoogleAuthProvider } from "@/components/google-auth-provider";
import { EntrancePopup } from "@/components/entrance-popup";

export const metadata: Metadata = {
  title: "MSTS-GJS Production Store",
  description: "Premium MSTS and Open Rails train simulator assets by GJS Production.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: "try{var t=localStorage.getItem('siteTheme')||'dark';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}"
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
