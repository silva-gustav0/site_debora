/** Paleta do painel web (globals.css → .panel-root, .p-card, .p-btn…), para o app ter o mesmo visual. */
export const Brand = {
  ink: "#2B221B",
  text: "#2B221B",
  canvas: "#F7F2E9",
  cream: "#F7F2E9",
  bronze: "#82590F",
  bronzeDark: "#6B4A10",
  bronzeMid: "#9A6F1E",
  gold: "#C9973A",
  goldSoft: "#E8C882",
  goldLight: "#F3DDA6",
  eyebrow: "#B3842E",
  line: "#EEE5D8",
  lineSoft: "#F5EEE3",
  inputLine: "#E8DCC8",
  label: "#7D6B58",
  muted: "#857566",
  body: "#6B5A4B",
  placeholder: "#B3A48F",
  danger: "#9B2C2C",
  white: "#FFFFFF",
  sidebar: ["#29201A", "#30251D", "#231A13"] as const,
  sidebarText: "rgba(245,239,229,0.72)",
};

/** Fontes do painel: Cormorant Garamond nos títulos, Lato no texto. */
export const Font = {
  display: "CormorantGaramond_300Light",
  displayRegular: "CormorantGaramond_400Regular",
  displayItalic: "CormorantGaramond_400Regular_Italic",
  body: "Lato_400Regular",
  bold: "Lato_700Bold",
};
