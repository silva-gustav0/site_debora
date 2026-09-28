/** Modelo editável da ficha de anamnese e do termo de consentimento (guardado em settings). */
export type QuestionType = "choice" | "multi" | "yes_no" | "text" | "long_text";

export type AnamnesisQuestion = {
  /** Chave da resposta em clients.anamnesis. As do modelo padrão são as mesmas da ficha antiga. */
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
  placeholder?: string;
  /** Resposta "sim" / opções marcadas / texto preenchido entram no alerta de saúde da cliente. */
  alert?: boolean;
};

export type AnamnesisSection = { id: string; title: string; questions: AnamnesisQuestion[] };
export type AnamnesisFormDef = { sections: AnamnesisSection[] };
export type AnswerValue = string | string[] | boolean | undefined;

export const QUESTION_TYPES: { v: QuestionType; l: string }[] = [
  { v: "choice", l: "Escolha única" },
  { v: "multi", l: "Várias opções" },
  { v: "yes_no", l: "Sim / não" },
  { v: "text", l: "Texto curto" },
  { v: "long_text", l: "Texto longo" },
];

/** Chaves da ficha que não são perguntas. */
export const RESERVED_KEYS = new Set(["filled_by", "filled_at"]);

export const FITZPATRICK = [
  "I · Muito clara, sempre queima", "II · Clara, queima fácil", "III · Morena clara",
  "IV · Morena moderada", "V · Morena escura", "VI · Negra",
];

export const DEFAULT_ANAMNESIS_FORM: AnamnesisFormDef = {
  sections: [
    {
      id: "pele", title: "Pele",
      questions: [
        { id: "fitzpatrick", label: "Fototipo (Fitzpatrick)", type: "choice", options: FITZPATRICK },
        { id: "skin_type", label: "Tipo de pele", type: "choice", options: ["Normal", "Seca", "Oleosa", "Mista", "Sensível", "Acneica"] },
        {
          id: "concerns", label: "Queixas principais", type: "multi",
          options: ["Acne", "Manchas / melasma", "Linhas de expressão", "Flacidez", "Poros dilatados", "Olheiras", "Rosácea",
            "Oleosidade", "Desidratação", "Celulite", "Gordura localizada", "Retenção de líquido", "Estrias", "Tensão muscular", "Estresse"],
        },
      ],
    },
    {
      id: "saude", title: "Saúde",
      questions: [
        {
          id: "conditions", label: "Condições de saúde", type: "multi", alert: true,
          options: ["Hipertensão", "Diabetes", "Problemas cardíacos", "Marca-passo", "Epilepsia", "Trombose / varizes", "Câncer (atual ou histórico)",
            "Problemas de tireoide", "Herpes", "Queloide", "Doença autoimune", "Implante metálico", "Cirurgia recente", "Problemas renais"],
        },
        { id: "pregnant", label: "Gestante", type: "yes_no", alert: true },
        { id: "breastfeeding", label: "Amamentando", type: "yes_no", alert: true },
        { id: "medications", label: "Medicamentos em uso", type: "long_text", alert: true },
        { id: "allergies_detail", label: "Alergias (produtos, ativos, medicamentos)", type: "long_text" },
      ],
    },
    {
      id: "habitos", title: "Hábitos",
      questions: [
        { id: "uses_acids", label: "Usa ácidos / retinoides", type: "yes_no" },
        { id: "sunscreen", label: "Usa protetor solar", type: "yes_no" },
        { id: "smoker", label: "Fumante", type: "yes_no" },
        { id: "sun_exposure", label: "Exposição ao sol", type: "choice", options: ["Baixa", "Moderada", "Alta"] },
        { id: "water_intake", label: "Ingestão de água", type: "choice", options: ["Menos de 1 L/dia", "1 a 2 L/dia", "Mais de 2 L/dia"] },
      ],
    },
    {
      id: "historico", title: "Histórico e objetivos",
      questions: [
        { id: "previous_procedures", label: "Procedimentos estéticos anteriores", type: "long_text", placeholder: "Peelings, laser, toxina, preenchimentos, cirurgias…" },
        { id: "goals", label: "Objetivos", type: "long_text" },
      ],
    },
  ],
};

export const DEFAULT_CONSENT = `Declaro que as informações acima são verdadeiras e que fui informada(o) sobre os procedimentos estéticos a serem realizados, seus objetivos, cuidados pré e pós-procedimento, possíveis reações e contraindicações. Comprometo-me a informar qualquer alteração no meu estado de saúde e a seguir as orientações recebidas.

Estou ciente de que os resultados variam de pessoa para pessoa e dependem da continuidade do tratamento e dos cuidados em casa.

Autorizo o registro fotográfico para acompanhamento da evolução do tratamento, com armazenamento sigiloso, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). O uso das imagens em divulgação depende de autorização específica: ( ) autorizo   ( ) não autorizo.`;

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const ID_RE = /^[a-z][a-z0-9_]{0,39}$/;

/** Valida e limpa um modelo vindo do banco ou do editor; devolve null se não houver nenhuma pergunta válida. */
export function sanitizeForm(raw: unknown): AnamnesisFormDef | null {
  const sections = (raw as AnamnesisFormDef | null)?.sections;
  if (!Array.isArray(sections)) return null;
  const seen = new Set<string>();
  const out: AnamnesisSection[] = [];
  for (const s of sections.slice(0, 20)) {
    const questions: AnamnesisQuestion[] = [];
    for (const q of Array.isArray(s?.questions) ? s.questions.slice(0, 60) : []) {
      const id = clip(q?.id, 40), label = clip(q?.label, 200);
      const type = QUESTION_TYPES.some((t) => t.v === q?.type) ? q.type : null;
      if (!ID_RE.test(id) || RESERVED_KEYS.has(id) || seen.has(id) || !label || !type) continue;
      const options = type === "choice" || type === "multi"
        ? [...new Set((Array.isArray(q.options) ? q.options : []).map((o) => clip(o, 120)).filter(Boolean))].slice(0, 40)
        : undefined;
      if (options && options.length === 0) continue;
      seen.add(id);
      questions.push({
        id, label, type,
        ...(options ? { options } : {}),
        ...(clip(q.placeholder, 200) ? { placeholder: clip(q.placeholder, 200) } : {}),
        ...(q.alert ? { alert: true } : {}),
      });
    }
    if (questions.length) out.push({ id: clip(s.id, 40) || `s${out.length}`, title: clip(s.title, 80) || "Perguntas", questions });
  }
  return out.length ? { sections: out } : null;
}

export const formOrDefault = (raw: unknown) => sanitizeForm(raw) ?? DEFAULT_ANAMNESIS_FORM;
export const consentOrDefault = (raw: unknown) => clip(raw, 8000) || DEFAULT_CONSENT;

export const allQuestions = (form: AnamnesisFormDef) => form.sections.flatMap((s) => s.questions);

/** Opção correspondente à resposta salva (aceita respostas antigas abreviadas, como "III" no fototipo). */
export function matchOption(options: string[] = [], value: unknown) {
  if (typeof value !== "string" || !value) return "";
  return options.find((o) => o === value) ?? options.find((o) => o.startsWith(`${value} `)) ?? value;
}

/** Resposta em texto para exibir (ficha impressa, respostas antigas). */
export function formatAnswer(q: Pick<AnamnesisQuestion, "type" | "options">, value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (q.type === "yes_no") return value === true ? "Sim" : value === false ? "Não" : String(value);
  if (Array.isArray(value)) return value.join(", ");
  if (q.type === "choice") return matchOption(q.options, value);
  return typeof value === "object" ? "" : String(value);
}

/** Troca {clinica} e {nome} no texto do termo. */
export const fillConsent = (text: string, vars: { clinica: string; nome: string }) =>
  text.replaceAll("{clinica}", vars.clinica).replaceAll("{nome}", vars.nome);
