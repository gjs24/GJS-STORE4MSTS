# ⚡ Connecting Next.js Frontend to Java Spring Boot Backend

Your current frontend is built with **Next.js 14 / React / TypeScript**. Switching or connecting it to the Java Spring Boot 3 backend is fast and clean because Spring Boot produces standard JSON REST APIs.

---

## 🔌 Mental Model: Python DRF vs Spring Boot API

In Django REST Framework:
```ts
// Endpoint was:
const res = await fetch("http://localhost:8000/api/assets/");
```

In Spring Boot 3:
```ts
// Endpoint is now:
const res = await fetch("http://localhost:8080/api/v1/assets");
```

Everything else (React state, UI buttons, Tailwind CSS, Canvas preview for Board Studio) **stays 100% identical!**

---

## 🚀 How to Connect in 3 Simple Steps

### Step 1: Update Environment Variable
In your Next.js project root, create or edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### Step 2: Use the Provided API Client (`api-client.ts`)
Copy `api-client.ts` from this folder into `frontend/lib/` or `frontend/services/`. It handles:
- Automatically attaching `Authorization: Bearer <token>` from `localStorage`
- Formatting query parameters for pagination and search
- Throwing friendly error messages if an order fails

### Step 3: Example Component Usage

#### Fetching Train Assets:
```tsx
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

export function TrainCatalog() {
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrains() {
      try {
        const response = await apiClient.get("/assets?category=electric-locomotives");
        setTrains(response.data.content); // Spring Page content array
      } catch (err) {
        console.error("Failed to load trains:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTrains();
  }, []);

  if (loading) return <div>Loading Indian Railways Assets...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {trains.map((train) => (
        <div key={train.id} className="card p-4 border rounded-xl">
          <img src={train.thumbnailUrl} alt={train.title} className="rounded-lg mb-3" />
          <h3 className="font-bold text-lg">{train.title}</h3>
          <p className="text-gray-400 text-sm">{train.shortDescription}</p>
          <div className="mt-4 flex justify-between items-center">
            <span className="font-bold text-green-400">
              {train.isFree ? "FREE" : `₹${train.price}`}
            </span>
            <button className="btn btn-primary px-4 py-2">View Addon</button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

#### Purchasing a Railway Board / Asset:
```tsx
import { apiClient } from "@/lib/api-client";

async function handlePurchase(templateId: string, phoneNumber: string) {
  try {
    const res = await apiClient.post("/orders/create", {
      templateId: templateId,
      customerPhone: phoneNumber
    });

    const orderData = res.data;
    console.log("Order created:", orderData.orderNumber);

    // If Cashfree paymentSessionId returned, open Cashfree checkout SDK
    if (orderData.paymentSessionId) {
      window.Cashfree.checkout({
        paymentSessionId: orderData.paymentSessionId,
        redirectTarget: "_modal"
      });
    }
  } catch (err: any) {
    alert(err.response?.data?.message || "Failed to create order");
  }
}
```

