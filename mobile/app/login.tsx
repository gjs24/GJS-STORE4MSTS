import { Text, TextInput, TouchableOpacity, View } from "react-native";

export default function Login() {
  return (
    <View style={{ flex: 1, backgroundColor: "#05070b", padding: 20, justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontSize: 30, fontWeight: "900", marginBottom: 20 }}>Login</Text>
      <TextInput placeholder="Username" placeholderTextColor="#738199" style={{ color: "#fff", borderColor: "#243249", borderWidth: 1, borderRadius: 8, padding: 14, marginBottom: 12 }} />
      <TextInput placeholder="Password" placeholderTextColor="#738199" secureTextEntry style={{ color: "#fff", borderColor: "#243249", borderWidth: 1, borderRadius: 8, padding: 14, marginBottom: 12 }} />
      <TouchableOpacity style={{ backgroundColor: "#ef3b2d", padding: 14, borderRadius: 8 }}><Text style={{ color: "#fff", textAlign: "center", fontWeight: "800" }}>Login</Text></TouchableOpacity>
    </View>
  );
}
