import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { sampleAssets } from "@/lib/api";

export default function AssetDetails() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const asset = sampleAssets.find((item) => item.slug === slug) || sampleAssets[0];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#05070b" }} contentContainerStyle={{ padding: 20 }}>
      <View style={{ height: 220, borderRadius: 8, backgroundColor: "#10233a", justifyContent: "center", alignItems: "center", marginBottom: 18 }}>
        <Text style={{ color: "#fff", fontSize: 64 }}>GJS</Text>
      </View>
      <Text style={{ color: "#ff8a1f", fontWeight: "800" }}>{asset.category?.name} / v{asset.version}</Text>
      <Text style={{ color: "#fff", fontSize: 30, fontWeight: "900", marginTop: 8 }}>{asset.title}</Text>
      <Text style={{ color: "#a8b3c7", fontSize: 16, marginTop: 12 }}>{asset.description || asset.short_description}</Text>
      <TouchableOpacity style={{ backgroundColor: "#ef3b2d", padding: 14, borderRadius: 8, marginTop: 24 }}>
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "800" }}>{asset.is_free ? "Free download" : `Checkout INR ${asset.price}`}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
