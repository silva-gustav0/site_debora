import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Field } from "@/components/ui";
import { Brand, Font } from "@/constants/brand";
import { SITE_URL } from "@/db/hooks";
import { useSession } from "@/lib/session";

const FEATURES = ["Agenda com pedidos do site", "Prontuário e fotos", "Pacotes e estoque", "Financeiro e relatórios"];

/** Selo "D" dourado com o nome da clínica. */
const Brandmark = ({ dark }: { dark?: boolean }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
    <LinearGradient colors={[Brand.goldLight, Brand.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.logo}><Text style={s.logoText}>D</Text></LinearGradient>
    <Text style={[s.brandName, { color: dark ? Brand.white : Brand.ink }]}>Débora Silva</Text>
  </View>
);

/** Moldura do login do painel: painel escuro com o slogan à esquerda (tablet deitado) e formulário à direita. */
function AuthFrame({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: ReactNode }) {
  const split = useWindowDimensions().width >= 1024;
  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: Brand.canvas }}>
      {split && (
        <LinearGradient colors={[...Brand.sidebar]} locations={[0, 0.55, 1]} style={{ flex: 1.1 }}>
          <View style={s.glow} />
          <SafeAreaView style={s.hero}>
            <Brandmark dark />
            <View>
              <Text style={[s.eyebrow, { color: Brand.goldSoft, marginBottom: 16 }]}>GESTÃO DA CLÍNICA</Text>
              <Text style={s.heroTitle}>Agenda, clientes{"\n"}e finanças em <Text style={s.heroEm}>um só lugar</Text>.</Text>
              <View style={s.features}>
                {FEATURES.map((t) => <View key={t} style={s.feature}><View style={s.dot} /><Text style={s.featureText}>{t}</Text></View>)}
              </View>
            </View>
            <Text style={s.restricted}>Acesso restrito à equipe.</Text>
          </SafeAreaView>
        </LinearGradient>
      )}
      <LinearGradient colors={["#F3E8DA", Brand.canvas]} start={{ x: 1, y: 0 }} end={{ x: 0.3, y: 0.6 }} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={s.formWrap} keyboardShouldPersistTaps="handled">
              <View style={s.form}>
                {!split && <View style={{ alignItems: "center", marginBottom: 32 }}><Brandmark /></View>}
                <Text style={s.eyebrow}>{eyebrow.toUpperCase()}</Text>
                <Text style={s.title}>{title}</Text>
                <Text style={s.subtitle}>{subtitle}</Text>
                {children}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

/** Login da equipe (mesma tela do painel web). */
export function LoginScreen() {
  const { signIn, error: sessionError } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!email || !password) return setError("Informe e-mail e senha.");
    setPending(true);
    setError(await signIn(email, password));
    setPending(false);
  };

  return (
    <AuthFrame eyebrow="Boas-vindas" title="Entrar" subtitle="Use o e-mail e a senha cadastrados pela clínica.">
      <Field label="E-mail" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Field label="Senha" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} onSubmitEditing={submit} />
      {(error ?? sessionError) && <Text style={s.error}>{error ?? sessionError}</Text>}
      <Button onPress={submit} loading={pending} style={{ marginTop: 4 }}>Entrar</Button>
      <Pressable onPress={() => Linking.openURL(SITE_URL)} style={s.link}><Text style={s.linkText}>← Voltar ao site</Text></Pressable>
    </AuthFrame>
  );
}

/** Carregando (abrindo o banco local). */
export function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Brand.canvas }}>
      <ActivityIndicator color={Brand.bronze} />
    </View>
  );
}

const s = StyleSheet.create({
  logo: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  logoText: { fontFamily: Font.displayRegular, fontSize: 24, color: "#29201A" },
  brandName: { fontFamily: Font.displayRegular, fontSize: 25 },
  glow: { position: "absolute", right: -96, top: -96, width: 420, height: 420, borderRadius: 210, backgroundColor: "rgba(232,200,130,0.1)" },
  hero: { flex: 1, justifyContent: "space-between", padding: 48 },
  heroTitle: { fontFamily: Font.display, fontSize: 60, lineHeight: 62, color: Brand.white },
  heroEm: { fontFamily: Font.displayItalic, color: Brand.goldSoft },
  features: { flexDirection: "row", flexWrap: "wrap", rowGap: 12, marginTop: 32, maxWidth: 448 },
  feature: { width: "50%", flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Brand.goldSoft },
  featureText: { fontFamily: Font.body, fontSize: 14, color: "rgba(255,255,255,0.7)" },
  restricted: { fontFamily: Font.body, fontSize: 12, color: "rgba(255,255,255,0.4)" },
  formWrap: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20, paddingVertical: 48 },
  form: { width: "100%", maxWidth: 384, gap: 14 },
  eyebrow: { fontFamily: Font.bold, fontSize: 10.5, letterSpacing: 2.3, color: Brand.eyebrow },
  title: { fontFamily: Font.display, fontSize: 48, lineHeight: 52, color: Brand.ink, marginTop: -6 },
  subtitle: { fontFamily: Font.body, fontSize: 14, color: Brand.muted, marginTop: -8, marginBottom: 18 },
  error: { fontFamily: Font.body, fontSize: 14, color: Brand.danger },
  link: { alignItems: "center", paddingVertical: 10, marginTop: 18 },
  linkText: { fontFamily: Font.body, fontSize: 12.5, color: Brand.muted },
});
