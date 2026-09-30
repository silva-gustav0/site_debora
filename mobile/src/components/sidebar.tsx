import { useQuery } from "@powersync/react-native";
import { todaySP } from "@shared/format";
import { LinearGradient } from "expo-linear-gradient";
import { router, usePathname } from "expo-router";
import {
  BarChart3, Boxes, CalendarDays, ExternalLink, Gift, KanbanSquare, LayoutDashboard, LogOut, type LucideIcon,
  Menu, Package, Repeat, Search, Settings, Sparkles, UserCog, Users, Wallet, X,
} from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand, Font } from "@/constants/brand";
import { SITE_URL, useMe } from "@/db/hooks";
import { useSession } from "@/lib/session";

type Item = { href: string; label: string; short?: string; icon: LucideIcon; badge?: "agenda" | "estoque" | "financeiro" };
const GROUPS: { label: string; items: Item[] }[] = [
  { label: "Dia a dia", items: [
    { href: "/", label: "Início", icon: LayoutDashboard },
    { href: "/agenda", label: "Agenda", icon: CalendarDays, badge: "agenda" },
    { href: "/clientes", label: "Clientes", icon: Users },
  ] },
  { label: "Relacionamento", items: [
    { href: "/crm", label: "CRM & Campanhas", short: "CRM", icon: KanbanSquare },
    { href: "/recorrencia", label: "Recorrência", icon: Repeat },
  ] },
  { label: "Gestão", items: [
    { href: "/financeiro", label: "Financeiro", icon: Wallet, badge: "financeiro" },
    { href: "/pacotes", label: "Pacotes", icon: Package },
    { href: "/vouchers", label: "Vouchers", icon: Gift },
    { href: "/estoque", label: "Estoque", icon: Boxes, badge: "estoque" },
    { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  ] },
  { label: "Ajustes", items: [
    { href: "/servicos", label: "Serviços", icon: Sparkles },
    { href: "/configuracoes", label: "Configurações", short: "Ajustes", icon: Settings },
    { href: "/equipe", label: "Equipe", icon: UserCog },
  ] },
];
const ITEMS = GROUPS.flatMap((g) => g.items);

/** Contadores dourados do menu: pedidos a confirmar, estoque baixo e contas vencidas (iguais aos do painel). */
function useBadges() {
  const { data } = useQuery<{ agenda: number; estoque: number; financeiro: number }>(
    `select (select count(*) from appointments where status = 'solicitado' and datetime(starts_at) >= datetime('now')) as agenda,
            (select count(*) from products where active = 1 and min_qty > 0 and stock_qty <= min_qty) as estoque,
            (select count(*) from transactions where status = 'pendente' and due_on <= ?) as financeiro`,
    [todaySP()],
  );
  return data[0] ?? { agenda: 0, estoque: 0, financeiro: 0 };
}

const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));
const go = (href: string) => router.navigate(href as never);

/** Moldura do app: menu lateral do painel (completo no tablet deitado, ícones no tablet em pé, gaveta no celular). */
export function Shell({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const full = path.startsWith("/atendimento"); // atendimento em tela cheia, como no painel
  const phone = width < 768;
  // A navegação (children) fica sempre na mesma posição da árvore: trocar de tela ou girar o tablet não a recria.
  return (
    <View style={[s.main, !phone && { flexDirection: "row" }]}>
      {full ? null : width >= 1024 ? <Gradient style={{ width: 256 }}><Full /></Gradient> : !phone ? <Gradient style={{ width: 76 }}><Rail /></Gradient> : (
        <Gradient>
          <SafeAreaView edges={["top"]} style={s.topbar}>
            <Pressable onPress={() => go("/")}><Text style={s.topTitle}>Débora Silva</Text></Pressable>
            <Pressable onPress={() => setOpen(true)} hitSlop={10} accessibilityLabel="Abrir menu"><Menu size={22} color={Brand.white} /></Pressable>
          </SafeAreaView>
        </Gradient>
      )}
      <View style={s.main}>{children}</View>
      <Modal visible={open && phone && !full} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, flexDirection: "row" }}>
          <Gradient style={{ width: 288, maxWidth: "85%" }}>
            <Pressable onPress={() => setOpen(false)} style={s.close} accessibilityLabel="Fechar menu"><X size={20} color="rgba(255,255,255,0.7)" /></Pressable>
            <Full onNavigate={() => setOpen(false)} />
          </Gradient>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </View>
  );
}

/** Fundo escuro com gradiente do menu (.panel-sidebar). */
function Gradient({ children, style }: { children: ReactNode; style?: object }) {
  return <LinearGradient colors={[...Brand.sidebar]} locations={[0, 0.55, 1]} style={style}>{children}</LinearGradient>;
}

/** Selo "D" dourado do painel. */
const Logo = ({ size = 40 }: { size?: number }) => (
  <LinearGradient colors={[Brand.goldLight, Brand.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.logo, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={s.logoText}>D</Text>
  </LinearGradient>
);

/** Menu completo: logo, busca, grupos, contadores e perfil. */
function Full({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const badges = useBadges();
  const me = useMe();
  const { signOut } = useSession();
  const [q, setQ] = useState("");
  const nav = (href: string) => { onNavigate?.(); go(href); };
  return (
    <SafeAreaView edges={["top", "bottom", "left"]} style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 16 }}>
      <Pressable onPress={() => nav("/")} style={s.brandRow}>
        <Logo />
        <View>
          <Text style={s.brandName}>Débora Silva</Text>
          <Text style={s.brandSub}>GESTÃO DA CLÍNICA</Text>
        </View>
      </Pressable>
      <View style={s.search}>
        <Search size={14} color="rgba(255,255,255,0.4)" />
        <TextInput
          value={q} onChangeText={setQ} placeholder="Buscar cliente…" placeholderTextColor="rgba(255,255,255,0.4)" style={s.searchInput}
          returnKeyType="search" onSubmitEditing={() => { nav(`/clientes?q=${encodeURIComponent(q)}`); setQ(""); }}
        />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 18 }}>
        {GROUPS.map((g) => (
          <View key={g.label}>
            <Text style={s.group}>{g.label.toUpperCase()}</Text>
            {g.items.map((it) => {
              const on = isActive(path, it.href), n = it.badge ? badges[it.badge] : 0;
              return (
                <Pressable key={it.href} onPress={() => nav(it.href)} style={({ pressed }) => [s.link, on && s.linkOn, pressed && { opacity: 0.8 }]}>
                  {on && <LinearGradient colors={["rgba(232,200,130,0.16)", "rgba(232,200,130,0.02)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />}
                  <it.icon size={16} strokeWidth={1.8} color={on ? Brand.white : Brand.sidebarText} />
                  <Text style={[s.linkText, on && { color: Brand.white }]}>{it.label}</Text>
                  {n > 0 && <Text style={s.badge}>{n}</Text>}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <View style={s.footer}>
        <View style={s.me}>
          <LinearGradient colors={[Brand.bronzeMid, Brand.bronzeDark]} style={s.avatar}><Text style={s.avatarText}>{initials(me?.name ?? "")}</Text></LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={s.meName} numberOfLines={1}>{me?.name ?? ""}</Text>
            <Text style={s.meRole}>{me?.isAdmin ? "Administradora" : "Equipe"}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 4 }}>
          <Pressable style={s.footBtn} onPress={() => Linking.openURL(SITE_URL)}><ExternalLink size={14} color={Brand.sidebarText} /><Text style={s.footText}>Site</Text></Pressable>
          <Pressable style={s.footBtn} onPress={() => nav("/conflitos")}><Repeat size={14} color={Brand.sidebarText} /><Text style={s.footText}>Sincronia</Text></Pressable>
          <Pressable style={s.footBtn} onPress={signOut}><LogOut size={14} color={Brand.sidebarText} /><Text style={s.footText}>Sair</Text></Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

/** Trilho de ícones com legenda (tablet em pé). */
function Rail() {
  const path = usePathname();
  const badges = useBadges();
  const { signOut } = useSession();
  return (
    <SafeAreaView edges={["top", "bottom", "left"]} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
      <Pressable onPress={() => go("/")} style={{ marginBottom: 8 }}><Logo /></Pressable>
      <ScrollView contentContainerStyle={{ alignItems: "center", gap: 2 }} showsVerticalScrollIndicator={false}>
        <RailLink icon={Search} label="Buscar" onPress={() => go("/clientes")} />
        {ITEMS.map((it) => (
          <RailLink key={it.href} icon={it.icon} label={it.short ?? it.label} on={isActive(path, it.href)} badge={it.badge ? badges[it.badge] : 0} onPress={() => go(it.href)} />
        ))}
      </ScrollView>
      <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", paddingTop: 8, alignSelf: "stretch", alignItems: "center" }}>
        <RailLink icon={LogOut} label="Sair" onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}

/** Um ícone do trilho, destacado quando é a tela atual. */
function RailLink({ icon: Icon, label, on, badge = 0, onPress }: { icon: LucideIcon; label: string; on?: boolean; badge?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.rail, on && s.railOn]}>
      <Icon size={19} strokeWidth={1.8} color={on ? Brand.white : Brand.sidebarText} />
      <Text style={[s.railText, on && { color: Brand.white }]} numberOfLines={1}>{label}</Text>
      {badge > 0 && <Text style={[s.badge, { position: "absolute", top: 4, right: 8, fontSize: 9.5 }]}>{badge}</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  main: { flex: 1, backgroundColor: Brand.canvas },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 56 },
  topTitle: { fontFamily: Font.displayRegular, fontSize: 22, color: Brand.white },
  close: { position: "absolute", top: 40, right: 12, padding: 8, zIndex: 2 },
  logo: { alignItems: "center", justifyContent: "center" },
  logoText: { fontFamily: Font.displayRegular, fontSize: 21, color: "#29201A" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, marginBottom: 22 },
  brandName: { fontFamily: Font.displayRegular, fontSize: 22, color: Brand.white, lineHeight: 24 },
  brandSub: { fontFamily: Font.body, fontSize: 9.5, letterSpacing: 2.8, color: "rgba(232,200,130,0.8)", marginTop: 3 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 4, marginBottom: 18, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12 },
  searchInput: { flex: 1, color: Brand.white, fontFamily: Font.body, fontSize: 14, paddingVertical: 8 },
  group: { fontFamily: Font.bold, fontSize: 9.5, letterSpacing: 2.3, color: "rgba(232,200,130,0.6)", paddingHorizontal: 12, marginBottom: 6 },
  link: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, overflow: "hidden" },
  linkOn: { borderLeftWidth: 2, borderLeftColor: Brand.goldSoft },
  linkText: { flex: 1, fontFamily: Font.body, fontSize: 13.5, color: Brand.sidebarText },
  badge: { backgroundColor: Brand.goldSoft, color: "#29201A", fontFamily: Font.bold, fontSize: 10.5, borderRadius: 999, paddingHorizontal: 6, minWidth: 20, textAlign: "center", overflow: "hidden" },
  footer: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", paddingTop: 14, marginTop: 14, gap: 10 },
  me: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { color: Brand.white, fontFamily: Font.bold, fontSize: 12 },
  meName: { color: Brand.white, fontFamily: Font.body, fontSize: 14 },
  meRole: { color: "rgba(255,255,255,0.45)", fontFamily: Font.body, fontSize: 11 },
  footBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, paddingVertical: 8 },
  footText: { color: Brand.sidebarText, fontFamily: Font.body, fontSize: 12.5 },
  rail: { width: 64, alignItems: "center", gap: 3, borderRadius: 12, paddingVertical: 8 },
  railOn: { backgroundColor: "rgba(232,200,130,0.16)", borderWidth: 1, borderColor: "rgba(232,200,130,0.35)" },
  railText: { fontFamily: Font.body, fontSize: 10, color: Brand.sidebarText },
});
