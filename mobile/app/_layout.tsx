import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#05070b" },
        headerTintColor: "#fff",
        contentStyle: { backgroundColor: "#05070b" }
      }}
    />
  );
}
