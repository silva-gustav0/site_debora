import { Tabs } from "expo-router/js-tabs";

/** Telas do menu lateral como abas irmãs: trocar de tela não empilha nem anima (evita tela sumindo no Android). */
export default function PainelLayout() {
  return (
    <Tabs
      backBehavior="history"
      tabBar={() => null}
      screenOptions={{ headerShown: false, animation: "none", lazy: true, freezeOnBlur: true, sceneStyle: { backgroundColor: "transparent" } }}
    />
  );
}
