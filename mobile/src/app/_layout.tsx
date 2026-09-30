import { CormorantGaramond_300Light, CormorantGaramond_400Regular, CormorantGaramond_400Regular_Italic } from "@expo-google-fonts/cormorant-garamond";
import { Lato_400Regular, Lato_700Bold } from "@expo-google-fonts/lato";
import { PowerSyncContext } from "@powersync/react-native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { LoadingScreen, LoginScreen } from "@/components/auth-screens";
import { Shell } from "@/components/sidebar";
import { ToastProvider } from "@/components/ui";
import { UpdateBanner } from "@/components/update-banner";
import { Brand } from "@/constants/brand";
import { openDatabase } from "@/db/database";
import { SessionProvider, useSession } from "@/lib/session";

SplashScreen.preventAutoHideAsync();

type Db = Awaited<ReturnType<typeof openDatabase>>;

/** Só mostra o app com a pessoa logada (sem pedir a senha do aparelho). */
function Gate() {
  const { status } = useSession();
  const [db, setDb] = useState<Db | null>(null);
  const [fonts] = useFonts({
    CormorantGaramond_300Light, CormorantGaramond_400Regular, CormorantGaramond_400Regular_Italic, Lato_400Regular, Lato_700Bold,
  });

  useEffect(() => {
    if (status !== "loading" && fonts) SplashScreen.hideAsync();
    if (status === "ready" && !db) openDatabase().then(setDb);
  }, [status, db, fonts]);

  if (status === "loading" || !fonts) return null;
  if (status === "signed-out") return <LoginScreen />;
  if (!db) return <LoadingScreen />;
  return (
    <PowerSyncContext.Provider value={db}>
      <ToastProvider>
        <Shell>
          {/* Sem animação entre telas: o "fade" do Android deixava telas invisíveis ao voltar várias de uma vez. */}
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Brand.canvas }, animation: "none" }}>
            <Stack.Screen name="(painel)" />
            {["agendamento/[id]", "agenda/novo", "agenda/bloqueio"].map((name) => (
              <Stack.Screen key={name} name={name} options={{ presentation: "transparentModal", contentStyle: { backgroundColor: "transparent" } }} />
            ))}
          </Stack>
        </Shell>
      </ToastProvider>
    </PowerSyncContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <Gate />
      <UpdateBanner />
    </SessionProvider>
  );
}
