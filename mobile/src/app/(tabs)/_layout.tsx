import { Tabs } from "expo-router";
import { Ionicons, type IconName } from "@/components/ui";
import { Brand } from "@/constants/brand";

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Início", icon: "home-outline" },
  { name: "agenda", title: "Agenda", icon: "calendar-outline" },
  { name: "clientes", title: "Clientes", icon: "people-outline" },
  { name: "financeiro", title: "Financeiro", icon: "wallet-outline" },
  { name: "mais", title: "Mais", icon: "grid-outline" },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.bronze,
        tabBarInactiveTintColor: Brand.muted,
        tabBarStyle: { backgroundColor: Brand.white, borderTopColor: Brand.line },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name} name={t.name}
          options={{ title: t.title, tabBarIcon: ({ color, size }) => <Ionicons name={t.icon} size={size} color={color} /> }}
        />
      ))}
    </Tabs>
  );
}
