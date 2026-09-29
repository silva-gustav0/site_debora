import { CormorantGaramond_300Light, CormorantGaramond_400Regular, CormorantGaramond_400Regular_Italic } from "@expo-google-fonts/cormorant-garamond";
import { Lato_400Regular, Lato_700Bold } from "@expo-google-fonts/lato";
import { PowerSyncContext } from "@powersync/react-native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { LoadingScreen, LockScreen, LoginScreen } from "@/components/auth-screens";
import { Shell } from "@/components/sidebar";
import { ToastProvider } from "@/components/ui";
import { openDatabase } from "@/db/database";
import { SessionProvider, useSession } from "@/lib/session";

SplashScreen.preventAutoHideAsync();

type Db = Awaited<ReturnType<typeof openDatabase>>;

/** Só mostra o app com a pessoa logada e desbloqueada (digital/PIN). */
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
  if (status === "locked") return <LockScreen />;
  if (!db) return <LoadingScreen />;
  return (
    <PowerSyncContext.Provider value={db}>
      <ToastProvider>
        <Shell>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" }, animation: "fade" }}>
            {["agendamento/[id]", "agenda/novo", "agenda/bloqueio"].map((name) => (
              <Stack.Screen key={name} name={name} options={{ presentation: "transparentModal" }} />
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
    </SessionProvider>
  );
}
