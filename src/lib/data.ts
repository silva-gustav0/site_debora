export type Service = {
  id: string;
  category: "facial" | "corporal" | "spa" | "bemestar";
  title: string;
  description: string;
  duration: string;
  price: string;
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
  {
    id: "limpeza-pele",
    category: "facial",
    title: "Limpeza de Pele",
    description:
      "Tratamento profundo que remove impurezas, pontos negros e células mortas, deixando a pele renovada e com brilho natural.",
    duration: "60 min",
    price: "R$ 120",
    highlight: true,
  },
  {
    id: "peeling",
    category: "facial",
    title: "Peeling Químico",
    description:
      "Renovação celular com ácidos de alta performance. Minimiza manchas, poros dilatados e linhas de expressão.",
    duration: "45 min",
    price: "R$ 180",
  },
  {
    id: "hidratacao",
    category: "facial",
    title: "Hidratação Profunda",
    description:
      "Infusão de ativos hidratantes de última geração que restauram o viço e a elasticidade da pele.",
    duration: "50 min",
    price: "R$ 140",
  },
  {
    id: "design-sobrancelha",
    category: "facial",
    title: "Design de Sobrancelha",
    description:
      "Modelagem personalizada que realça o olhar e harmoniza os traços do rosto com técnica profissional.",
    duration: "30 min",
    price: "R$ 60",
  },
  {
    id: "massagem",
    category: "corporal",
    title: "Massagem Relaxante",
    description:
      "Técnica sueca com óleos essenciais premium que libera tensões, alivia estresse e promove bem-estar profundo.",
    duration: "60 min",
    price: "R$ 160",
    highlight: true,
  },
  {
    id: "drenagem",
    category: "corporal",
    title: "Drenagem Linfática",
    description:
      "Manobras manuais suaves que estimulam o sistema linfático, reduzem edemas e promovem desintoxicação.",
    duration: "60 min",
    price: "R$ 150",
  },
  {
    id: "modelagem",
    category: "corporal",
    title: "Modelagem Corporal",
    description:
      "Combina técnicas de massagem modeladora com produtos específicos para contornar e firmar o corpo.",
    duration: "75 min",
    price: "R$ 190",
  },
  {
    id: "day-spa",
    category: "spa",
    title: "Day SPA Completo",
    description:
      "Experiência imersiva de relaxamento com banho de imersão, esfoliação, massagem e tratamento facial.",
    duration: "3 horas",
    price: "R$ 380",
    highlight: true,
  },
  {
    id: "ritual-beleza",
    category: "spa",
    title: "Ritual de Beleza",
    description:
      "Jornada sensorial com aromaterapia, música ambiente, chás especiais e tratamentos personalizados.",
    duration: "2 horas",
    price: "R$ 260",
  },
  {
    id: "escalda-pes",
    category: "spa",
    title: "Escalda Pés & Reflexologia",
    description:
      "Banho terapêutico com ervas medicinais seguido de massagem reflexa nos pés para equilíbrio do organismo.",
    duration: "50 min",
    price: "R$ 100",
  },
  {
    id: "aromaterapia",
    category: "bemestar",
    title: "Aromaterapia",
    description:
      "Uso terapêutico de óleos essenciais puros para equilibrar emoções, aliviar ansiedade e promover saúde.",
    duration: "60 min",
    price: "R$ 130",
  },
  {
    id: "meditacao",
    category: "bemestar",
    title: "Meditação Guiada",
    description:
      "Sessão conduzida por profissional especializada que promove clareza mental, redução do estresse e autoconhecimento.",
    duration: "45 min",
    price: "R$ 90",
  },
];

export const teamMembers: TeamMember[] = [
  {
    id: "debora",
    name: "Débora Silva",
    role: "Fundadora & Esteticista Sênior",
    bio: "Com mais de 15 anos de experiência em estética avançada, Débora fundou a clínica com a missão de oferecer tratamentos de excelência em um ambiente acolhedor e transformador.",
    specialties: ["Tratamentos Faciais", "Peeling Avançado", "Gestão Clínica"],
    initials: "DS",
    color: "#C8737A",
  },
  {
    id: "ana",
    name: "Ana Costa",
    role: "Especialista Corporal",
    bio: "Formada em Estética e Cosmetologia, Ana é referência em técnicas corporais e drenagem linfática. Atende com sensibilidade e precisão cada necessidade da cliente.",
    specialties: ["Drenagem Linfática", "Modelagem Corporal", "Massoterapia"],
    initials: "AC",
    color: "#C9973A",
  },
  {
    id: "mariana",
    name: "Mariana Santos",
    role: "Especialista em Imagem",
    bio: "Maquiadora artística e especialista em design de sobrancelhas, Mariana transforma olhares e realça a beleza natural de cada cliente com técnica e sensibilidade.",
    specialties: ["Design de Sobrancelhas", "Maquiagem Artística", "Colorimetria"],
    initials: "MS",
    color: "#8B3A42",
  },
  {
    id: "juliana",
    name: "Juliana Oliveira",
    role: "Terapeuta & SPA Manager",
    bio: "Especializada em terapias holísticas e rituais de bem-estar, Juliana cria experiências sensoriais únicas que equilibram corpo, mente e espírito.",
    specialties: ["Aromaterapia", "Reflexologia", "Rituais de SPA"],
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
    title: "Rituais de SPA: Uma Experiência Transformadora",
    excerpt:
      "Mergulhe no universo do bem-estar e descubra como um dia de SPA pode redefinir sua relação com o autocuidado e a autoestima.",
    date: "5 Abr 2025",
    readTime: "3 min",
  },
];

export const categoryLabels: Record<string, string> = {
  facial: "Estética Facial",
  corporal: "Estética Corporal",
  spa: "SPA",
  bemestar: "Bem-Estar",
};

export const timeSlots = [
  "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30",
];
