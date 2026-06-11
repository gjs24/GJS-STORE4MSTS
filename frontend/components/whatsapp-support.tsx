"use client";

import { MessageCircle } from "lucide-react";

const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+91-7845727002";

function whatsappNumber(phone: string) {
  return phone.replace(/\D/g, "");
}

export function WhatsAppSupport() {
  const number = whatsappNumber(supportPhone);
  if (!number) return null;

  return (
    <a
      href={`https://wa.me/${number}?text=${encodeURIComponent("Hi, I need support for MSTS-GJS Production Store.")}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_28px_rgba(16,185,129,.45)] ring-1 ring-white/20 transition hover:scale-105 hover:bg-emerald-400"
    >
      <MessageCircle size={26} />
    </a>
  );
}
