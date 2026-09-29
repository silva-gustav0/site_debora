import { File, Paths } from "expo-file-system";
import { shareAsync } from "expo-sharing";
import { toCsv } from "@shared/csv";

/** Gera o CSV, salva no cache e abre o menu de compartilhar do aparelho. */
export async function shareCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(toCsv(header, rows));
  await shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: filename });
}
