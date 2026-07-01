"use client";

import { MessageCircle, Users } from "lucide-react";

const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+91-7845727002";
const whatsappGroupUrl = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL || "https://chat.whatsapp.com/GHexP0ffx84FmG75OoQkcG";

function whatsappNumber(phone: string) {
  return phone.replace(/\D/g, "");
}

export function WhatsAppSupport() {
  const number = whatsappNumber(supportPhone);
  const joinGroupUrl =
    whatsappGroupUrl ||
    (number
      ? `https://wa.me/${number}?text=${encodeURIComponent("Hi, I want to join the MSTS-GJS WhatsApp group.")}`
      : "");

  if (!number && !joinGroupUrl) return null;

  return (
    <>
      {joinGroupUrl ? (
        <a
          href={joinGroupUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Join WhatsApp group"
          className="fixed bottom-24 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-emerald-300/30 bg-emerald-500 px-4 py-3 text-white shadow-[0_0_32px_rgba(16,185,129,.42)] transition hover:-translate-y-0.5 hover:bg-emerald-400 sm:right-5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/25">
            <Users size={21} />
          </span>
          <span className="min-w-0 pr-1 text-left">
            <span className="block text-sm font-semibold leading-tight">Join WhatsApp Group</span>
            <span className="block text-xs leading-tight text-emerald-50/85">Updates, offers and support</span>
          </span>
        </a>
      ) : null}

      {number ? (
        <a
          href={`https://wa.me/${number}?text=${encodeURIComponent("Hi, I need support for MSTS-GJS Production Store.")}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat on WhatsApp"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_28px_rgba(16,185,129,.45)] ring-1 ring-white/20 transition hover:scale-105 hover:bg-emerald-400"
        >
          <MessageCircle size={26} />
        </a>
      ) : null}
    </>
  );
}
