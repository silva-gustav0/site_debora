import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand } from "@/constants/brand";
import { useSession } from "@/lib/session";

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
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView behavior="padding" style={s.center}>
        <Text style={s.eyebrow}>Clínica Débora Silva</Text>
        <Text style={s.title}>Área da equipe</Text>
        <TextInput
          style={s.input} placeholder="E-mail" autoCapitalize="none" autoComplete="email" keyboardType="email-address"
          value={email} onChangeText={setEmail} placeholderTextColor={Brand.muted}
        />
        <TextInput
          style={s.input} placeholder="Senha" secureTextEntry autoComplete="current-password"
          value={password} onChangeText={setPassword} onSubmitEditing={submit} placeholderTextColor={Brand.muted}
        />
        {(error ?? sessionError) && <Text style={s.error}>{error ?? sessionError}</Text>}
        <Pressable style={s.button} onPress={submit} disabled={pending}>
          {pending ? <ActivityIndicator color={Brand.white} /> : <Text style={s.buttonText}>Entrar</Text>}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function LockScreen() {
  const { unlock, signOut, error } = useSession();
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.center}>
        <Text style={s.eyebrow}>App bloqueado</Text>
        <Text style={s.title}>Use a digital ou o PIN do aparelho</Text>
        {error && <Text style={s.error}>{error}</Text>}
        <Pressable style={s.button} onPress={unlock}>
          <Text style={s.buttonText}>Desbloquear</Text>
        </Pressable>
        <Pressable style={s.link} onPress={signOut}>
          <Text style={s.linkText}>Sair e apagar os dados deste aparelho</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export function LoadingScreen() {
  return (
    <View style={[s.screen, s.center]}>
      <ActivityIndicator color={Brand.bronze} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.cream },
  center: { flex: 1, justifyContent: "center", padding: 28, gap: 14 },
  eyebrow: { color: Brand.gold, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontWeight: "700" },
  title: { color: Brand.text, fontSize: 28, fontWeight: "600", marginBottom: 12 },
  input: {
    backgroundColor: Brand.white, borderColor: Brand.line, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Brand.text,
  },
  error: { color: Brand.danger, fontSize: 14 },
  button: { backgroundColor: Brand.bronze, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 6 },
  buttonText: { color: Brand.white, fontSize: 16, fontWeight: "700" },
  link: { alignItems: "center", paddingVertical: 10 },
  linkText: { color: Brand.muted, fontSize: 14, textDecorationLine: "underline" },
});
