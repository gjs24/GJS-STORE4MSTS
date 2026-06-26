"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, FileText, PackageCheck, ShoppingCart } from "lucide-react";
import { PriceDisplay } from "@/components/price-display";
import type { Asset } from "@/lib/api";
import { downloadAsset, downloadInvoice, type DownloadLog, type StoreOrder, type WishlistItem, userGet, verifyPayment } from "@/lib/store-api";

type AccountListProps = {
  type: "purchases" | "downloads" | "wishlist";
};

type Row = {
  id: number;
  asset: Asset;
  meta: string;
  status?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function AccountList({ type }: AccountListProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState("Loading your library...");
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    const path = type === "purchases" ? "/user/purchases/" : type === "downloads" ? "/user/downloads/" : "/wishlist/";
    const loadRows = () => userGet<Array<StoreOrder | DownloadLog | WishlistItem>>(path)
      .then((data) => {
        const nextRows = data.map((item) => ({
          id: item.id,
          asset: item.asset,
          meta:
            type === "purchases"
              ? `Purchased ${formatDate((item as StoreOrder).created_at)}`
              : type === "downloads"
                ? `Downloaded ${formatDate((item as DownloadLog).downloaded_at)}`
                : `Saved ${formatDate((item as WishlistItem).created_at)}`,
          status: "status" in item ? item.status : undefined
        }));
        setRows(nextRows);
        setMessage(nextRows.length ? "" : "No items yet. Browse the marketplace to build your simulator library.");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Please login to view this page."));
    const verifyReturnedOrder = async () => {
      if (type !== "purchases") return;
      const orderId = Number(new URLSearchParams(window.location.search).get("order_id") || "");
      if (!orderId) return;
      setMessage("Confirming Cashfree payment...");
      try {
        const order = await verifyPayment(orderId);
        setMessage(order.download_enabled ? "Payment confirmed. Download access is ready." : "Payment is not confirmed yet. Please refresh in a moment.");
        window.history.replaceState(null, "", window.location.pathname);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not confirm Cashfree payment yet.");
      }
    };
    verifyReturnedOrder().finally(loadRows);
    if (type !== "purchases") return;
    const interval = window.setInterval(loadRows, 10000);
    return () => window.clearInterval(interval);
  }, [type]);

  async function handleDownload(asset: Asset) {
    setBusyId(asset.id);
    setMessage("Preparing secure download...");
    try {
      const download = await downloadAsset(asset.id);
      setMessage("Download ready. Starting package download...");
      const link = document.createElement("a");
      link.href = download.url;
      link.download = download.filename || `${asset.slug}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (download.revoke) setTimeout(download.revoke, 1000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start download.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleInvoice(orderId: number) {
    setBusyId(orderId);
    setMessage("Preparing invoice...");
    try {
      const invoice = await downloadInvoice(orderId);
      const link = document.createElement("a");
      link.href = invoice.url;
      link.download = invoice.filename || `GJS-${orderId}-invoice.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (invoice.revoke) setTimeout(invoice.revoke, 1000);
      setMessage("Invoice download started.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not download invoice.");
    } finally {
      setBusyId(null);
    }
  }

  if (message && rows.length === 0) {
    return (
      <div className="rounded border border-white/10 bg-white/[0.03] p-6 text-slate-300">
        <p>{message}</p>
        <Link href="/assets" className="mt-4 inline-flex rounded bg-rail-red px-4 py-2 text-sm font-semibold text-white">
          Browse assets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message ? <p className="rounded border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">{message}</p> : null}
      <div className="grid gap-4">
        {rows.map((row) => (
          <div key={row.id} className="grid gap-4 rounded border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase text-rail-amber">{row.asset.category?.name}</p>
              <Link href={`/assets/${row.asset.slug}`} className="mt-1 block text-lg font-semibold text-white hover:text-rail-amber">
                {row.asset.title}
              </Link>
              <p className="mt-2 text-sm text-slate-400">{row.meta}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="rounded border border-white/10 px-2 py-1">v{row.asset.version}</span>
                <span className="rounded border border-white/10 px-2 py-1">{row.asset.file_size}</span>
                <span className="rounded border border-white/10 px-2 py-1"><PriceDisplay asset={row.asset} compact /></span>
                {row.status ? <span className="rounded border border-white/10 px-2 py-1">{row.status}</span> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {type === "wishlist" ? (
                <Link href={`/assets/${row.asset.slug}`} className="rounded border border-white/10 px-4 py-2 text-sm font-semibold">
                  <ShoppingCart className="mr-2 inline" size={16} /> View
                </Link>
              ) : null}
              {type === "purchases" && row.status && ["APPROVED", "PAID"].includes(row.status) ? (
                <button onClick={() => handleInvoice(row.id)} disabled={busyId === row.id} className="rounded border border-white/10 px-4 py-2 text-sm font-semibold disabled:opacity-60">
                  <FileText className="mr-2 inline" size={16} /> Invoice
                </button>
              ) : null}
              {type !== "purchases" || (row.status && ["APPROVED", "PAID"].includes(row.status)) ? (
                <button onClick={() => handleDownload(row.asset)} disabled={busyId === row.asset.id} className="rounded bg-rail-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {type === "purchases" ? <PackageCheck className="mr-2 inline" size={16} /> : <Download className="mr-2 inline" size={16} />}
                  Download
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
