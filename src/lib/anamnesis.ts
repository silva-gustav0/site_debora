import { bool, list, opt } from "./form";
import type { Anamnesis } from "./types";

/** Lê a ficha do formulário e devolve as colunas do cliente a atualizar (usada pela equipe e pelo link do cliente). */
export function anamnesisUpdate(fd: FormData, filledBy: "equipe" | "cliente") {
  const text = (k: string, max: number) => opt(fd, k, max) ?? undefined;
  const anamnesis: Anamnesis = {
    fitzpatrick: text("fitzpatrick", 4), skin_type: text("skin_type", 40),
    concerns: list(fd, "concerns").slice(0, 20), conditions: list(fd, "conditions").slice(0, 20),
    medications: text("medications", 1000), allergies_detail: text("allergies_detail", 1000),
    pregnant: bool(fd, "pregnant"), breastfeeding: bool(fd, "breastfeeding"), uses_acids: bool(fd, "uses_acids"),
    sunscreen: bool(fd, "sunscreen"), smoker: bool(fd, "smoker"),
    sun_exposure: text("sun_exposure", 40), water_intake: text("water_intake", 40),
    previous_procedures: text("previous_procedures", 1500), goals: text("goals", 1500),
    filled_by: filledBy, filled_at: new Date().toISOString(),
  };
  return {
    anamnesis,
    skin_type: anamnesis.skin_type ?? null,
    allergies: anamnesis.allergies_detail ?? null,
    health_notes: [
      anamnesis.pregnant && "Gestante",
      anamnesis.breastfeeding && "Amamentando",
      ...(anamnesis.conditions ?? []),
      anamnesis.medications && `Medicamentos: ${anamnesis.medications}`,
    ].filter(Boolean).join(" · ") || null,
  };
}
