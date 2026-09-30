import { Directory, File, Paths } from "expo-file-system";
import { shareAsync } from "expo-sharing";
import { toCsv } from "@shared/csv";

/** Gera o CSV numa pasta do cache (limpa a cada exportação e ao sair) e abre o menu de compartilhar. */
export async function shareCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const dir = new Directory(Paths.cache, "exportacoes");
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true });
  const file = new File(dir, filename);
  file.create({ overwrite: true });
  file.write(toCsv(header, rows));
  await shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: filename });
}
