/** Temas da tela de atendimento: animação e observações rápidas conforme o procedimento. */
export type SceneKind = "limpeza" | "peeling" | "microagulhamento" | "manchas" | "rejuvenescimento" | "massagem" | "drenagem" | "depilacao" | "pes";

export type ChipGroup = { field: "observations" | "products_used" | "next_steps"; title: string; chips: string[] };

export type AttendanceTheme = {
  scene: SceneKind;
  /** Nome curto da etapa mostrado sob o cronômetro. */
  mood: string;
  /** Cores do fundo animado (de → para) e do brilho. */
  from: string;
  to: string;
  glow: string;
  groups: ChipGroup[];
};

const SKIN = ["Pele oleosa", "Pele seca", "Pele mista", "Pele sensível", "Desidratada"];
const REACTION = ["Sem reação", "Leve vermelhidão", "Ardência leve", "Boa tolerância", "Cliente relaxou bem"];
const HOME_CARE = ["Protetor solar FPS 50", "Evitar sol por 48 h", "Hidratar 2x ao dia", "Não usar ácidos por 5 dias", "Retorno em 15 dias", "Retorno em 30 dias"];

const THEMES: Record<SceneKind, AttendanceTheme> = {
  limpeza: {
    scene: "limpeza", mood: "Limpeza profunda", from: "#1E2B2A", to: "#2E4442", glow: "#9FD8CF",
    groups: [
      { field: "observations", title: "Pele", chips: [...SKIN, "Comedões abertos", "Comedões fechados", "Milium", "Poros dilatados"] },
      { field: "observations", title: "Sessão", chips: ["Vapor de ozônio", "Esfoliação", "Extração feita", "Alta frequência", "Máscara calmante", ...REACTION] },
      { field: "products_used", title: "Produtos", chips: ["Sabonete de limpeza", "Esfoliante enzimático", "Emoliente", "Loção adstringente", "Máscara de argila", "Sérum calmante"] },
      { field: "next_steps", title: "Orientações", chips: HOME_CARE },
    ],
  },
  peeling: {
    scene: "peeling", mood: "Renovação da pele", from: "#2B1F24", to: "#46303A", glow: "#F2B8C6",
    groups: [
      { field: "observations", title: "Pele", chips: [...SKIN, "Manchas", "Linhas finas", "Textura irregular"] },
      { field: "observations", title: "Sessão", chips: ["1 camada", "2 camadas", "3 camadas", "Neutralizado", "Frost leve", ...REACTION] },
      { field: "products_used", title: "Produtos", chips: ["Ácido glicólico", "Ácido mandélico", "Ácido salicílico", "Jessner", "Ácido retinoico", "Neutralizante"] },
      { field: "next_steps", title: "Orientações", chips: ["Descamação esperada em 3 a 5 dias", "Não arrancar peles", ...HOME_CARE] },
    ],
  },
  microagulhamento: {
    scene: "microagulhamento", mood: "Estímulo de colágeno", from: "#231F2E", to: "#3A3350", glow: "#C9B8F2",
    groups: [
      { field: "observations", title: "Área", chips: ["Rosto inteiro", "Testa", "Bochechas", "Cicatrizes de acne", "Linhas de expressão", "Estrias"] },
      { field: "observations", title: "Sessão", chips: ["Anestésico tópico", "Agulha 0,5 mm", "Agulha 1,0 mm", "Agulha 1,5 mm", "Eritema esperado", "Pontos de sangramento"] },
      { field: "products_used", title: "Produtos", chips: ["Drug delivery", "Fatores de crescimento", "Ácido hialurônico", "Vitamina C", "Máscara calmante"] },
      { field: "next_steps", title: "Orientações", chips: ["Não lavar o rosto por 12 h", "Sem maquiagem por 24 h", ...HOME_CARE] },
    ],
  },
  manchas: {
    scene: "manchas", mood: "Uniformizando o tom", from: "#2B2419", to: "#4A3C26", glow: "#F0D49A",
    groups: [
      { field: "observations", title: "Pele", chips: [...SKIN, "Melasma", "Acne ativa", "Rosácea", "Manchas pós-acne", "Vermelhidão difusa"] },
      { field: "observations", title: "Sessão", chips: ["Limpeza prévia", "Clareador aplicado", "LED azul", "LED vermelho", "Máscara calmante", ...REACTION] },
      { field: "products_used", title: "Produtos", chips: ["Ácido tranexâmico", "Ácido azelaico", "Niacinamida", "Vitamina C", "Ácido kójico", "Protetor com cor"] },
      { field: "next_steps", title: "Orientações", chips: HOME_CARE },
    ],
  },
  rejuvenescimento: {
    scene: "rejuvenescimento", mood: "Firmeza e viço", from: "#2A2219", to: "#4B3A24", glow: "#F3DDA6",
    groups: [
      { field: "observations", title: "Pele", chips: [...SKIN, "Flacidez leve", "Linhas finas", "Rugas marcadas", "Falta de viço"] },
      { field: "observations", title: "Sessão", chips: ["Radiofrequência", "Massagem facial", "Máscara de colágeno", "LED vermelho", ...REACTION] },
      { field: "products_used", title: "Produtos", chips: ["Ácido hialurônico", "Peptídeos", "Vitamina C", "Retinol", "Colágeno"] },
      { field: "next_steps", title: "Orientações", chips: HOME_CARE },
    ],
  },
  massagem: {
    scene: "massagem", mood: "Relaxamento", from: "#2B2019", to: "#4A3527", glow: "#E8C882",
    groups: [
      { field: "observations", title: "Corpo", chips: ["Tensão na cervical", "Tensão nos ombros", "Lombar", "Nós musculares", "Pernas cansadas"] },
      { field: "observations", title: "Sessão", chips: ["Pressão leve", "Pressão média", "Pressão firme", "Pedras quentes", ...REACTION] },
      { field: "products_used", title: "Produtos", chips: ["Óleo de amêndoas", "Óleo essencial de lavanda", "Creme de massagem", "Gel crioterápico"] },
      { field: "next_steps", title: "Orientações", chips: ["Beber bastante água", "Alongar diariamente", "Retorno em 7 dias", "Retorno em 15 dias"] },
    ],
  },
  drenagem: {
    scene: "drenagem", mood: "Drenagem e leveza", from: "#1B2530", to: "#2B3D4E", glow: "#A9D2F0",
    groups: [
      { field: "observations", title: "Corpo", chips: ["Edema leve", "Edema moderado", "Fibrose", "Sensibilidade na região", "Hematomas"] },
      { field: "observations", title: "Sessão", chips: ["Abdômen", "Flancos", "Pernas", "Costas", "Braços", "Manobras suaves", ...REACTION] },
      { field: "products_used", title: "Produtos", chips: ["Óleo neutro", "Gel condutor", "Ultrassom", "Radiofrequência", "Taping"] },
      { field: "next_steps", title: "Orientações", chips: ["Usar a cinta", "Beber bastante água", "Evitar sal em excesso", "Retorno em 2 dias", "Retorno em 7 dias"] },
    ],
  },
  depilacao: {
    scene: "depilacao", mood: "Pele lisinha", from: "#2B1E1A", to: "#4B3128", glow: "#F4B98A",
    groups: [
      { field: "observations", title: "Área", chips: ["Pernas inteiras", "Meia perna", "Axilas", "Virilha", "Buço", "Braços", "Costas"] },
      { field: "observations", title: "Sessão", chips: ["Cera quente", "Cera fria", "Pelos encravados", "Pele sensível", ...REACTION] },
      { field: "products_used", title: "Produtos", chips: ["Loção pré-depilatória", "Óleo pós-depilatório", "Talco", "Gel calmante"] },
      { field: "next_steps", title: "Orientações", chips: ["Esfoliar a cada 3 dias", "Evitar sol por 24 h", "Hidratar a região", "Retorno em 30 dias"] },
    ],
  },
  pes: {
    scene: "pes", mood: "Cuidado dos pés", from: "#1F2A22", to: "#324636", glow: "#B9E0B5",
    groups: [
      { field: "observations", title: "Pés", chips: ["Calosidades", "Rachaduras", "Pele ressecada", "Unhas encravadas", "Sensibilidade"] },
      { field: "observations", title: "Sessão", chips: ["Escalda-pés", "Lixamento", "Esfoliação", "Hidratação profunda", "Parafina", ...REACTION] },
      { field: "products_used", title: "Produtos", chips: ["Ureia 10%", "Ureia 20%", "Esfoliante", "Creme hidratante", "Óleo de melaleuca"] },
      { field: "next_steps", title: "Orientações", chips: ["Hidratar à noite com meia", "Usar calçados confortáveis", "Retorno em 15 dias", "Retorno em 30 dias"] },
    ],
  },
};

const RULES: [RegExp, SceneKind][] = [
  [/depila|cera/, "depilacao"],
  [/p[eé]s|podo/, "pes"],
  [/microagulh|agulh/, "microagulhamento"],
  [/peeling|[aá]cido/, "peeling"],
  [/melasma|mancha|acne|ros[aá]cea|clare/, "manchas"],
  [/rejuven|lifting|colágeno|colageno|radiofreq/, "rejuvenescimento"],
  [/drenag|p[oó]s[- ]?op|modelad|linf/, "drenagem"],
  [/massag|relax|pedras|shiatsu|reflexo/, "massagem"],
  [/limpeza|facial|hidrata/, "limpeza"],
];

/** Escolhe o tema pelo nome do serviço (o identificador nem sempre bate com o nome). */
export function themeFor(serviceName: string, category?: string | null): AttendanceTheme {
  const n = serviceName.toLowerCase();
  const hit = RULES.find(([re]) => re.test(n));
  if (hit) return THEMES[hit[1]];
  return THEMES[category === "corporal" ? "massagem" : "limpeza"];
}
