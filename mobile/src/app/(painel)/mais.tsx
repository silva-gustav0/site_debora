import { Redirect } from "expo-router";

/** O menu lateral substituiu a aba "Mais": volta para o início. */
export default function Mais() {
  return <Redirect href="/" />;
}
