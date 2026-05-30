import { Link } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import type { Asset } from "@/lib/api";

export function AssetCard({ asset }: { asset: Asset }) {
  return (
    <Link href={{ pathname: "/asset/[slug]", params: { slug: asset.slug } }} asChild>
      <TouchableOpacity style={{ borderColor: "#243249", borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 12, backgroundColor: "#0b1624" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ color: "#ff8a1f", fontSize: 12 }}>{asset.category?.name || "Asset"}</Text>
          <Text style={{ color: "#fff", fontWeight: "700" }}>{asset.is_free ? "FREE" : `INR ${asset.price}`}</Text>
        </View>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>{asset.title}</Text>
        <Text style={{ color: "#a8b3c7", marginTop: 6 }}>{asset.short_description}</Text>
        <Text style={{ color: "#a8b3c7", marginTop: 10 }}>v{asset.version} • {asset.file_size} • ★ {asset.average_rating}</Text>
      </TouchableOpacity>
    </Link>
  );
}
