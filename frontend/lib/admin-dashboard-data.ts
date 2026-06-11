import {
  BadgeIndianRupee,
  Boxes,
  Download,
  Eye,
  PackageCheck,
  ShoppingCart,
  TrainFront,
  Users,
  type LucideIcon
} from "lucide-react";

export type DashboardMetric = {
  label: string;
  value: number;
  displayValue: string;
  change: string;
  tone: "red" | "amber" | "cyan" | "emerald";
  icon: LucideIcon;
};

export type SalesPoint = {
  month: string;
  sales: number;
  downloads: number;
  revenue: number;
};

export type OrderStatusPoint = {
  name: string;
  value: number;
  color: string;
};

export type AdminOrderRow = {
  id: string;
  user: string;
  asset: string;
  amount: string;
  status: "Paid" | "Pending" | "Failed";
  date: string;
};

export type UserRow = {
  name: string;
  email: string;
  city: string;
  purchases: number;
  joined: string;
};

export type TopAsset = {
  name: string;
  category: string;
  simulator: string;
  downloads: number;
  revenue: string;
  status: "Featured" | "Premium" | "Free";
};

export type RailwayCard = {
  title: string;
  category: string;
  price: string;
  downloads: string;
  accent: string;
};

export const metrics: DashboardMetric[] = [
  { label: "Total Users", value: 0, displayValue: "0", change: "Start phase", tone: "cyan", icon: Users },
  { label: "Total Orders", value: 0, displayValue: "0", change: "No orders yet", tone: "amber", icon: ShoppingCart },
  { label: "Total Sales", value: 0, displayValue: "INR 0", change: "No revenue yet", tone: "red", icon: BadgeIndianRupee },
  { label: "Total Downloads", value: 0, displayValue: "0", change: "No downloads yet", tone: "emerald", icon: Download },
  { label: "Total Assets", value: 0, displayValue: "0", change: "No assets yet", tone: "amber", icon: Boxes },
  { label: "Page Views", value: 0, displayValue: "0", change: "Not tracked", tone: "cyan", icon: Eye }
];

export const salesOverview: SalesPoint[] = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
].map((month) => ({ month, sales: 0, downloads: 0, revenue: 0 }));

export const orderStatus: OrderStatusPoint[] = [
  { name: "Paid", value: 0, color: "#22c55e" },
  { name: "Pending", value: 0, color: "#ff8a1f" },
  { name: "Failed", value: 0, color: "#ef3b2d" }
];

export const latestOrders: AdminOrderRow[] = [];

export const recentUsers: UserRow[] = [];

export const topAssets: TopAsset[] = [];

export const railwayCards: RailwayCard[] = [];

export const quickActions = [
  { label: "Upload Asset", icon: PackageCheck },
  { label: "Create Coupon", icon: BadgeIndianRupee },
  { label: "Feature Banner", icon: TrainFront },
  { label: "Export Orders", icon: Download }
];
