"use client";

import { useEffect, useState } from "react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { adminGet, adminPatch, type AdminOrder } from "@/lib/admin-api";

type PaginatedOrders = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminOrder[];
};



export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
const [page, setPage] = useState(1);
const [count, setCount] = useState(0);

  useEffect(() => {
  adminGet<PaginatedOrders>(
    `/admin/orders/?page=${page}`,
    {
      count: 0,
      next: null,
      previous: null,
      results: [],
    }
  ).then((data) => {
    setOrders(data.results);
    setCount(data.count);
  });
}, [page]);

  async function updateStatus(order: AdminOrder, status: AdminOrder["status"]) {
    const updated = await adminPatch<AdminOrder>(`/admin/orders/${order.id}/`, { status });
    setOrders((current) => current.map((item) => item.id === updated.id ? updated : item));
  }
const totalPages = Math.ceil(count / 10);
  return (
    <AdminLayout title="Orders & Payments">
      <AdminLoginNote />
      <div className="overflow-hidden rounded border border-white/10">
        <div className="grid gap-2 bg-white/10 p-3 text-xs uppercase text-slate-400 md:grid-cols-[80px_1fr_130px_120px_140px]">
          <span>ID</span><span>Asset / User</span><span>Amount</span><span>Status</span><span>Manage</span>
        </div>
        {orders.length === 0 ? <div className="p-5 text-sm text-slate-400">No orders yet.</div> : null}
        {orders.map((order) => (
          <div key={order.id} className="grid items-center gap-2 border-t border-white/10 bg-white/[0.03] p-4 text-sm md:grid-cols-[80px_1fr_130px_120px_140px]">
            <span>#{order.id}</span>
            <span>
              <span className="block font-semibold">{order.asset?.title || "Asset"}</span>
              <span className="text-xs text-slate-400">{order.user?.username || "User"}</span>
            </span>
            <span>{order.currency} {order.amount}</span>
            <span>{order.status}</span>
            <select value={order.status} onChange={(event) => updateStatus(order, event.target.value as AdminOrder["status"])} className="rounded border border-white/10 bg-black/40 px-2 py-2">
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            
          </div>
        ))}
      </div>
      {count > 0 && (
  <div className="flex items-center justify-between border-t border-white/10 p-4">
    <button
      disabled={page === 1}
      onClick={() => setPage(page - 1)}
      className="rounded bg-white/10 px-4 py-2 disabled:opacity-40"
    >
      Previous
    </button>

    <span className="text-sm text-slate-400">
      Page {page} of {totalPages}
    </span>

    <button
      disabled={page === totalPages}
      onClick={() => setPage(page + 1)}
      className="rounded bg-white/10 px-4 py-2 disabled:opacity-40"
    >
      Next
    </button>
  </div>
)}
    </AdminLayout>
  );
}
