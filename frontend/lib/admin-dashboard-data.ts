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
  { label: "Total Users", value: 18420, displayValue: "18,420", change: "+12.4% this month", tone: "cyan", icon: Users },
  { label: "Total Orders", value: 3248, displayValue: "3,248", change: "+8.9% this month", tone: "amber", icon: ShoppingCart },
  { label: "Total Sales", value: 842000, displayValue: "₹8.42L", change: "+18.7% revenue", tone: "red", icon: BadgeIndianRupee },
  { label: "Total Downloads", value: 76340, displayValue: "76,340", change: "+21.2% installs", tone: "emerald", icon: Download },
  { label: "Total Assets", value: 156, displayValue: "156", change: "14 new releases", tone: "amber", icon: Boxes },
  { label: "Page Views", value: 244800, displayValue: "2.44L", change: "+32.5% traffic", tone: "cyan", icon: Eye }
];

export const salesOverview: SalesPoint[] = [
  { month: "Jan", sales: 54000, downloads: 2800, revenue: 62000 },
  { month: "Feb", sales: 68000, downloads: 3400, revenue: 74000 },
  { month: "Mar", sales: 72000, downloads: 4100, revenue: 88000 },
  { month: "Apr", sales: 96000, downloads: 5200, revenue: 112000 },
  { month: "May", sales: 124000, downloads: 6100, revenue: 148000 },
  { month: "Jun", sales: 138000, downloads: 6900, revenue: 162000 },
  { month: "Jul", sales: 152000, downloads: 7400, revenue: 184000 },
  { month: "Aug", sales: 176000, downloads: 8200, revenue: 218000 },
  { month: "Sep", sales: 168000, downloads: 7900, revenue: 204000 },
  { month: "Oct", sales: 194000, downloads: 9100, revenue: 246000 },
  { month: "Nov", sales: 232000, downloads: 10400, revenue: 288000 },
  { month: "Dec", sales: 264000, downloads: 11800, revenue: 332000 }
];

export const orderStatus: OrderStatusPoint[] = [
  { name: "Paid", value: 72, color: "#22c55e" },
  { name: "Pending", value: 18, color: "#ff8a1f" },
  { name: "Failed", value: 10, color: "#ef3b2d" }
];

export const latestOrders: AdminOrderRow[] = [
  { id: "GJS-2048", user: "Aarav Sharma", asset: "WAP-7 Locomotive", amount: "₹349", status: "Paid", date: "13 May" },
  { id: "GJS-2047", user: "Rohan Verma", asset: "Bhopal-Jabalpur Route", amount: "₹599", status: "Pending", date: "13 May" },
  { id: "GJS-2046", user: "Meera Nair", asset: "Premium Horn Sounds", amount: "₹149", status: "Paid", date: "12 May" },
  { id: "GJS-2045", user: "Kabir Singh", asset: "ICF Coach Pack", amount: "₹249", status: "Paid", date: "12 May" },
  { id: "GJS-2044", user: "Nitin Patel", asset: "Realistic Track Textures", amount: "₹199", status: "Failed", date: "11 May" }
];

export const recentUsers: UserRow[] = [
  { name: "Aarav Sharma", email: "aarav.rail@example.com", city: "Bhopal", purchases: 8, joined: "Today" },
  { name: "Meera Nair", email: "meera.openrails@example.com", city: "Kochi", purchases: 5, joined: "Yesterday" },
  { name: "Rohan Verma", email: "rohan.msts@example.com", city: "Jabalpur", purchases: 3, joined: "12 May" },
  { name: "Kabir Singh", email: "kabir.routes@example.com", city: "Delhi", purchases: 11, joined: "11 May" }
];

export const topAssets: TopAsset[] = [
  { name: "WAP-7 Locomotive", category: "Trains", simulator: "MSTS + Open Rails", downloads: 8420, revenue: "₹2.94L", status: "Featured" },
  { name: "Bhopal-Jabalpur Route", category: "Routes", simulator: "Open Rails", downloads: 6210, revenue: "₹3.71L", status: "Premium" },
  { name: "ICF Coach Pack", category: "Trains", simulator: "MSTS", downloads: 5280, revenue: "₹1.31L", status: "Premium" },
  { name: "Premium Horn Sounds", category: "Sounds", simulator: "Both", downloads: 4840, revenue: "₹72K", status: "Premium" },
  { name: "Realistic Track Textures", category: "Textures", simulator: "Open Rails", downloads: 4220, revenue: "₹84K", status: "Free" }
];

export const railwayCards: RailwayCard[] = [
  { title: "WAP-7 Locomotive", category: "Premium Train Model", price: "₹349", downloads: "8.4K", accent: "from-red-500/35 to-orange-400/10" },
  { title: "Bhopal-Jabalpur Route", category: "Cinematic Route Pack", price: "₹599", downloads: "6.2K", accent: "from-sky-400/25 to-red-500/10" },
  { title: "ICF Coach Pack", category: "Coach Add-on", price: "₹249", downloads: "5.2K", accent: "from-orange-400/30 to-amber-300/10" }
];

export const quickActions = [
  { label: "Upload Asset", icon: PackageCheck },
  { label: "Create Coupon", icon: BadgeIndianRupee },
  { label: "Feature Banner", icon: TrainFront },
  { label: "Export Orders", icon: Download }
];
