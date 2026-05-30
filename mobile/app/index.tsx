import { Link } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function Home() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#05070b" }} contentContainerStyle={{ padding: 20 }}>
      <View style={{ minHeight: 260, justifyContent: "center" }}>
        <Text style={{ color: "#ff8a1f", fontWeight: "800", textTransform: "uppercase" }}>GJS Production</Text>
        <Text style={{ color: "#fff", fontSize: 38, fontWeight: "900", marginTop: 8 }}>MSTS-GJS Production Store</Text>
        <Text style={{ color: "#a8b3c7", fontSize: 16, marginTop: 12 }}>Buy and download MSTS and Open Rails trains, routes, sounds, cab views, textures, and updates.</Text>
        <Link href="/assets" asChild>
          <TouchableOpacity style={{ backgroundColor: "#ef3b2d", padding: 14, borderRadius: 8, marginTop: 22 }}>
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "800" }}>Browse assets</Text>
          </TouchableOpacity>
        </Link>
      </View>
      {["Trains", "Routes", "Sounds", "Cab Views", "Textures", "Free Downloads", "Premium Downloads"].map((item) => (
        <View key={item} style={{ borderColor: "#243249", borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 10 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>{item}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
