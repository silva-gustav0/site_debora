/** Versão publicada do painel (muda a cada deploy) e do app Android instalado (muda só quando o APK é refeito). */
export const WEB_VERSION = process.env.APP_BUILD_ID || "dev";
export const APK_VERSION = 2;
export const APK_URL = "/app/debora-equipe.apk";
