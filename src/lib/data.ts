export type Service = {
  id: string;
  category: "facial" | "corporal" | "terapias";
  title: string;
  description: string;
  highlight?: boolean;
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
      "Procedimento de higienização profunda que auxilia na remoção de impurezas, revitalização e cuidado facial. Ideal para todos os tipos de pele.",
    highlight: true,
  },
  {
    id: "drenagem-linfatica",
    category: "corporal",
    title: "Drenagem Linfática",
    description:
      "Técnica manual que auxilia na redução da retenção de líquidos, melhora da circulação e proporciona sensação de leveza corporal.",
    highlight: true,
  },
  {
    id: "massagem-relaxante",
    category: "terapias",
    title: "Massagem Relaxante",
    description:
      "Movimentos terapêuticos para aliviar tensões, reduzir o estresse e promover bem-estar físico e emocional profundo.",
    highlight: true,
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
  "18:00", "18:30", "19:00", "19:30",
];

export const clinicInfo = {
  name:         "Clínica Débora Silva",
  shortName:    "Débora Silva",
  address:      "Av. Paulista, 1337 - Bela Vista",
  neighborhood: "Bela Vista",
  city:         "São Paulo — SP",
  phone:        "(11) 6578-2211",
  whatsapp:     "551165782211",
  instagram:    "@talissaesteticaebemestar",
  instagramUrl: "https://instagram.com/talissaesteticaebemestar",
  email:        "contato@talissaestetica.com.br",
  hours:        "Seg–Sex: 9h às 20h  |  Sáb: 9h às 16h  |  Dom: Fechado",
};
