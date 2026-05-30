import { Link, type Href } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function Profile() {
  return (
    <View style={{ flex: 1, backgroundColor: "#05070b", padding: 20 }}>
      <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900", marginBottom: 20 }}>Profile</Text>
      {[
        ["Login", "/login"],
        ["Register", "/register"],
        ["My downloads", "/downloads"],
        ["Purchases", "/purchases"]
      ].map(([label, href]) => (
        <Link key={href} href={href as Href<string>} asChild>
          <TouchableOpacity style={{ borderColor: "#243249", borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 10 }}>
            <Text style={{ color: "#fff" }}>{label}</Text>
          </TouchableOpacity>
        </Link>
      ))}
    </View>
  );
}
