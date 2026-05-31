export type Service = {
  id: string;
  category: "facial" | "corporal" | "terapias";
  title: string;
  description: string;
  highlight?: boolean;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  specialties: string[];
  initials: string;
  color: string;
};

export type BlogPost = {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  featured?: boolean;
};

export const services: Service[] = [
  // ── Estética Facial ──────────────────────────────
  {
    id: "limpeza-pele",
    category: "facial",
    title: "Limpeza de Pele",
    description:
      "Tratamento profundo que remove impurezas, cravos e células mortas, deixando a pele renovada, suave e com brilho natural.",
    highlight: true,
  },
  {
    id: "tratamento-melasma",
    category: "facial",
    title: "Tratamento para Melasma",
    description:
      "Protocolo especializado com ativos despigmentantes que reduzem manchas escuras e uniformizam o tom da pele de forma segura.",
  },
  {
    id: "microagulhamento",
    category: "facial",
    title: "Microagulhamento",
    description:
      "Técnica de indução percutânea de colágeno que trata cicatrizes, poros dilatados, linhas de expressão e melhora a textura da pele.",
    highlight: true,
  },
  {
    id: "hidratacoes",
    category: "facial",
    title: "Hidratações",
    description:
      "Infusão de ativos hidratantes de alta concentração que restauram o viço, a elasticidade e a barreira de proteção da pele.",
  },
  {
    id: "peeling-quimico",
    category: "facial",
    title: "Peeling Químico",
    description:
      "Renovação celular com ácidos de alta performance que minimizam manchas, poros dilatados e linhas de expressão.",
  },
  {
    id: "peeling-natural",
    category: "facial",
    title: "Peeling Natural",
    description:
      "Esfoliação com ingredientes naturais que renovam a camada superficial da pele de forma suave, sem agressões.",
  },
  {
    id: "rejuvenescimento",
    category: "facial",
    title: "Rejuvenescimento",
    description:
      "Tratamento combinado de técnicas e ativos que estimulam a produção de colágeno, firmam a pele e reduzem os sinais do envelhecimento.",
    highlight: true,
  },
  {
    id: "clareamento",
    category: "facial",
    title: "Clareamento",
    description:
      "Protocolo com ativos clareadores que uniformizam o tom da pele, reduzindo manchas de sol, cicatrizes e hiperpigmentações.",
  },
  {
    id: "tratamento-acne",
    category: "facial",
    title: "Tratamento para Acne",
    description:
      "Combinação de limpeza profunda, ativos antibacterianos e calmantes para controlar a acne e prevenir novas lesões.",
  },

  // ── Estética Corporal ─────────────────────────────
  {
    id: "depilacao-cera",
    category: "corporal",
    title: "Depilação com Cera",
    description:
      "Remoção suave e eficaz dos pelos com cera, deixando a pele lisa e macia por muito mais tempo do que métodos convencionais.",
  },
  {
    id: "drenagem-linfatica",
    category: "corporal",
    title: "Drenagem Linfática",
    description:
      "Manobras manuais suaves que estimulam o sistema linfático, reduzindo edemas, eliminando toxinas e promovendo bem-estar.",
    highlight: true,
  },
  {
    id: "plastica-pes",
    category: "corporal",
    title: "Plástica dos Pés",
    description:
      "Tratamento completo para os pés que inclui esfoliação, hidratação intensa e cuidados especiais para calosidades e fissuras.",
  },
  {
    id: "pos-operatorio",
    category: "corporal",
    title: "Pós Operatório",
    description:
      "Acompanhamento especializado no período pós-cirúrgico com drenagem linfática e técnicas que aceleram a recuperação e minimizam edemas.",
    highlight: true,
  },

  // ── Terapias Complementares ───────────────────────
  {
    id: "auriculoterapia",
    category: "terapias",
    title: "Auriculoterapia",
    description:
      "Técnica de acupuntura auricular que estimula pontos específicos da orelha para promover equilíbrio físico, emocional e alívio da dor.",
  },
  {
    id: "ventosaterapia",
    category: "terapias",
    title: "Ventosaterapia",
    description:
      "Terapia com ventosas que aumenta a circulação sanguínea, alivia tensões musculares, reduz celulite e promove desintoxicação.",
    highlight: true,
  },
  {
    id: "day-spa",
    category: "terapias",
    title: "Day Spa",
    description:
      "Experiência imersiva de relaxamento com banho de imersão, esfoliação corporal, hidratação e massagem. Um dia dedicado a você.",
  },
  {
    id: "massagem-relaxante",
    category: "terapias",
    title: "Massagem Relaxante",
    description:
      "Técnica com movimentos suaves e fluidos com óleos essenciais premium que liberam tensões, aliviam estresse e renovam as energias.",
    highlight: true,
  },
];

export const teamMembers: TeamMember[] = [
  {
    id: "debora",
    name: "Débora Silva",
    role: "Fundadora & Esteticista Sênior",
    bio: "Com mais de 15 anos de experiência em estética avançada, Débora fundou a clínica com a missão de oferecer tratamentos de excelência em um ambiente acolhedor e transformador.",
    specialties: ["Tratamentos Faciais", "Microagulhamento", "Rejuvenescimento"],
    initials: "DS",
    color: "#C8737A",
  },
  {
    id: "ana",
    name: "Ana Costa",
    role: "Especialista Corporal",
    bio: "Formada em Estética e Cosmetologia, Ana é referência em técnicas corporais, drenagem linfática e cuidados pós-operatórios.",
    specialties: ["Drenagem Linfática", "Pós Operatório", "Depilação"],
    initials: "AC",
    color: "#C9973A",
  },
  {
    id: "mariana",
    name: "Mariana Santos",
    role: "Especialista Facial",
    bio: "Especializada em tratamentos faciais avançados, Mariana atua com precisão no tratamento de melasma, acne e rejuvenescimento.",
    specialties: ["Melasma", "Tratamento de Acne", "Peeling"],
    initials: "MS",
    color: "#8B3A42",
  },
  {
    id: "juliana",
    name: "Juliana Oliveira",
    role: "Terapeuta Complementar",
    bio: "Especializada em terapias holísticas, Juliana integra auriculoterapia, ventosaterapia e técnicas de bem-estar para equilibrar corpo e mente.",
    specialties: ["Auriculoterapia", "Ventosaterapia", "Massagem"],
    initials: "JO",
    color: "#A85B63",
  },
];

export const blogPosts: BlogPost[] = [
  {
    slug: "beneficios-limpeza-pele",
    category: "Cuidados com a Pele",
    title: "Os Benefícios da Limpeza de Pele Regular",
    excerpt:
      "Saiba por que a limpeza de pele profissional é indispensável na sua rotina de beleza e como ela transforma a saúde da sua pele a longo prazo.",
    date: "15 Mai 2025",
    readTime: "4 min",
    featured: true,
  },
  {
    slug: "drenagem-linfatica-saude",
    category: "Tratamentos Corporais",
    title: "Drenagem Linfática: Saúde e Beleza em Um Só Tratamento",
    excerpt:
      "Descubra como a drenagem linfática vai além da estética, beneficiando o sistema imunológico e promovendo saúde de dentro para fora.",
    date: "8 Mai 2025",
    readTime: "5 min",
  },
  {
    slug: "skincare-em-casa",
    category: "Dicas de Beleza",
    title: "Como Cuidar da Pele em Casa Entre as Sessões",
    excerpt:
      "Guia prático com rotina matinal e noturna, produtos essenciais e hábitos que potencializam os resultados dos seus tratamentos na clínica.",
    date: "1 Mai 2025",
    readTime: "6 min",
  },
  {
    slug: "poder-da-massagem",
    category: "Bem-Estar",
    title: "Massagem Relaxante: O Poder do Toque na Saúde",
    excerpt:
      "Entenda a ciência por trás do toque terapêutico e como a massagem regular impacta positivamente a saúde física e emocional.",
    date: "22 Abr 2025",
    readTime: "4 min",
  },
  {
    slug: "peeling-renove-pele",
    category: "Cuidados com a Pele",
    title: "Peeling: Renove Sua Pele e Sua Autoestima",
    excerpt:
      "Conheça os diferentes tipos de peeling, suas indicações e como esse tratamento revoluciona a textura e luminosidade da pele.",
    date: "14 Abr 2025",
    readTime: "5 min",
  },
  {
    slug: "rituais-de-spa",
    category: "SPA & Relaxamento",
    title: "Day Spa: Uma Experiência Transformadora",
    excerpt:
      "Mergulhe no universo do bem-estar e descubra como um dia de SPA pode redefinir sua relação com o autocuidado e a autoestima.",
    date: "5 Abr 2025",
    readTime: "3 min",
  },
];

export const categoryLabels: Record<string, string> = {
  facial:   "Estética Facial",
  corporal: "Estética Corporal",
  terapias: "Terapias Complementares",
};

export const timeSlots = [
  "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30",
];

// ── Real clinic contact data ──────────────────────
export const clinicInfo = {
  name:      "Débora Silva Estética e Bem-Estar",
  shortName: "Clínica Débora",
  address:   "Rua Yilidio Figueiredo, 468",
  neighborhood: "Centro de Perus",
  city:      "São Paulo — SP",
  phone:     "(11) 98427-1714",
  whatsapp:  "5511984271714",
  instagram: "@deborasilvaesteticaebemestar",
  instagramUrl: "https://instagram.com/deborasilvaesteticaebemestar",
  email:     "contato@clinicadebora.com.br",
  hours:     "Seg–Sex: 9h às 19h  |  Sáb: 9h às 14h",
};
