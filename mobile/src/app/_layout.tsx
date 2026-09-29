import { PowerSyncContext } from "@powersync/react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { LoadingScreen, LockScreen, LoginScreen } from "@/components/auth-screens";
import { openDatabase } from "@/db/database";
import { SessionProvider, useSession } from "@/lib/session";

SplashScreen.preventAutoHideAsync();

type Db = Awaited<ReturnType<typeof openDatabase>>;

/** Só mostra o app com a pessoa logada e desbloqueada (digital/PIN). */
function Gate() {
  const { status } = useSession();
  const [db, setDb] = useState<Db | null>(null);

  useEffect(() => {
    if (status !== "loading") SplashScreen.hideAsync();
    if (status === "ready" && !db) openDatabase().then(setDb);
  }, [status, db]);

  if (status === "loading") return null;
  if (status === "signed-out") return <LoginScreen />;
  if (status === "locked") return <LockScreen />;
  if (!db) return <LoadingScreen />;
  return (
    <PowerSyncContext.Provider value={db}>
      <Stack screenOptions={{ headerShown: false }} />
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
