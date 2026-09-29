/** Versão publicada do painel (muda a cada deploy) e do app Android instalado (muda só quando o APK é refeito). */
export const WEB_VERSION = process.env.APP_BUILD_ID || "dev";
export const APK_VERSION = 2; // sobe para 3 quando o APK novo estiver na Release do GitHub
// App nativo (offline), publicado nas Releases do GitHub: este endereço sempre baixa a versão mais nova.
export const APK_URL = "https://github.com/silva-gustav0/site_debora/releases/latest/download/debora-equipe.apk";
