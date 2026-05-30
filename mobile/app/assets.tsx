import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput } from "react-native";
import { AssetCard } from "@/components/AssetCard";
import { Asset, fetchAssets } from "@/lib/api";

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAssets().then(setAssets);
  }, []);

  const filtered = assets.filter((asset) => asset.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#05070b" }} contentContainerStyle={{ padding: 20 }}>
      <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900", marginBottom: 16 }}>Assets</Text>
      <TextInput placeholder="Search assets" placeholderTextColor="#738199" value={search} onChangeText={setSearch} style={{ color: "#fff", borderColor: "#243249", borderWidth: 1, borderRadius: 8, padding: 14, marginBottom: 16 }} />
      {filtered.map((asset) => <AssetCard key={asset.id} asset={asset} />)}
    </ScrollView>
  );
}
