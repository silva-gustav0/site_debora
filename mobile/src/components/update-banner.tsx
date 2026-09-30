import * as Updates from "expo-updates";
import { Download, RefreshCw, Smartphone, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Brand, Font } from "@/constants/brand";
import { SITE_URL } from "@/db/hooks";

const CHECK_EVERY_MS = 30 * 60_000;

/** "2.1.0" → [2, 1]: compara só versão principal e secundária do APK. */
const parts = (v: string | null | undefined) => (v ?? "").split(".").slice(0, 2).map((n) => Number(n) || 0);
const newer = (a: string, b: string | null) => { const [x1, y1] = parts(a), [x2, y2] = parts(b); return x1 > x2 || (x1 === x2 && y1 > y2); };

/**
 * Aviso de atualização do app: procura ao abrir, ao voltar para o app e a cada 30 min; "Atualizar agora" baixa com
 * barra de progresso e reinicia sozinho. Também avisa quando há um APK novo (mudança maior, precisa instalar).
 */
export function UpdateBanner() {
  const { isUpdateAvailable, isUpdatePending, isDownloading, downloadProgress, availableUpdate, downloadError } = Updates.useUpdates();
  const insets = useSafeAreaInsets();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [apk, setApk] = useState<{ name: string; url: string } | null>(null);
  const [apkClosed, setApkClosed] = useState(false);
  const [error, setError] = useState(false);
  const wantsRestart = useRef(false);

  const check = useCallback(() => {
    if (!__DEV__ && Updates.isEnabled) Updates.checkForUpdateAsync().catch(() => {});
    fetch(`${SITE_URL}/api/versao`, { cache: "no-store" }).then((r) => r.json())
      .then((v: { apkName?: string; apkUrl?: string }) => {
        if (v.apkName && v.apkUrl && newer(v.apkName, Updates.runtimeVersion)) setApk({ name: v.apkName, url: v.apkUrl });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    check();
    const every = setInterval(check, CHECK_EVERY_MS);
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") check(); });
    return () => { clearInterval(every); sub.remove(); };
  }, [check]);

  // Baixou porque a Débora pediu: reinicia na hora já na versão nova.
  useEffect(() => {
    if (isUpdatePending && wantsRestart.current) Updates.reloadAsync().catch(() => {});
  }, [isUpdatePending]);

  const update = async () => {
    setError(false);
    wantsRestart.current = true;
    try {
      if (isUpdatePending) await Updates.reloadAsync();
      else await Updates.fetchUpdateAsync();
    } catch { setError(true); wantsRestart.current = false; }
  };

  const id = availableUpdate?.updateId ?? "pendente";
  const showOta = (isUpdateAvailable || isUpdatePending || isDownloading) && dismissed !== id;
  if (!showOta && !(apk && !apkClosed)) return null;

  const pct = Math.round((downloadProgress ?? 0) * 100);
  return (
    <View pointerEvents="box-none" style={[s.wrap, { top: insets.top + 12 }]}>
      {showOta ? (
        <View style={s.card}>
          <View style={s.icon}>{isDownloading ? <Download size={18} color={Brand.goldSoft} /> : <RefreshCw size={18} color={Brand.goldSoft} />}</View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.title}>
              {isDownloading ? `Baixando atualização… ${pct}%` : isUpdatePending ? "Atualização pronta" : "Nova atualização disponível"}
            </Text>
            {isDownloading ? (
              <View style={s.track}><View style={[s.bar, { width: `${Math.max(4, pct)}%` }]} /></View>
            ) : (
              <Text style={s.text}>
                {error || downloadError ? "Não foi possível baixar agora. Confira a internet e tente de novo."
                  : isUpdatePending ? "Toque em reiniciar para usar a versão nova (leva poucos segundos)."
                  : "Melhorias e correções do app. Leva poucos segundos."}
              </Text>
            )}
          </View>
          {!isDownloading && (
            <>
              <Pressable onPress={update} style={({ pressed }) => [s.btn, pressed && { opacity: 0.8 }]}>
                <Text style={s.btnText}>{isUpdatePending ? "Reiniciar agora" : "Atualizar agora"}</Text>
              </Pressable>
              <Pressable onPress={() => setDismissed(id)} hitSlop={10} accessibilityLabel="Depois"><X size={18} color="rgba(255,255,255,0.55)" /></Pressable>
            </>
          )}
        </View>
      ) : apk && (
        <View style={s.card}>
          <View style={s.icon}><Smartphone size={18} color={Brand.goldSoft} /></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.title}>Nova versão do app ({apk.name})</Text>
            <Text style={s.text}>Esta versão precisa ser instalada: baixe o arquivo e toque em “Instalar”. Seus dados continuam.</Text>
          </View>
          <Pressable onPress={() => Linking.openURL(apk.url)} style={({ pressed }) => [s.btn, pressed && { opacity: 0.8 }]}>
            <Text style={s.btnText}>Baixar</Text>
          </Pressable>
          <Pressable onPress={() => setApkClosed(true)} hitSlop={10} accessibilityLabel="Depois"><X size={18} color="rgba(255,255,255,0.55)" /></Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center", paddingHorizontal: 16, zIndex: 50, elevation: 50 },
  card: {
    width: "100%", maxWidth: 560, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#2B221B", borderWidth: 1, borderColor: "rgba(201,151,58,0.45)",
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(232,200,130,0.14)", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: Font.bold, fontSize: 14, color: Brand.white },
  text: { fontFamily: Font.body, fontSize: 12.5, color: "rgba(255,255,255,0.7)" },
  track: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  bar: { height: 6, borderRadius: 3, backgroundColor: Brand.goldSoft },
  btn: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Brand.goldSoft },
  btnText: { fontFamily: Font.bold, fontSize: 12.5, color: "#2B221B" },
});
