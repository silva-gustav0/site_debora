export type ServiceRow = {
  id: string;
  name: string;
  category: "facial" | "corporal" | "terapias" | "combo";
  description: string | null;
  duration_min: number;
  price: number;
  return_days: number | null;
  active: boolean;
  sort_order: number;
};

export type ClientStage = "lead" | "em_contato" | "cliente" | "vip" | "inativa";
export type ClientSource = "site" | "instagram" | "whatsapp" | "indicacao" | "passante" | "outro";

export type ClientRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  instagram: string | null;
  source: ClientSource;
  stage: ClientStage;
  tags: string[];
  notes: string | null;
  skin_type: string | null;
  allergies: string | null;
  health_notes: string | null;
  marketing_opt_in: boolean;
  cpf: string | null;
  address: string | null;
  occupation: string | null;
  anamnesis: Anamnesis;
  consent_signed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentStatus = "solicitado" | "confirmado" | "concluido" | "cancelado" | "faltou";

export type AppointmentRow = {
  id: string;
  client_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  price: number;
  notes: string | null;
  source: "site" | "painel";
  created_at: string;
  client_package_id: string | null;
  public_token: string;
  confirmed_at: string | null;
  reminder_sent_at: string | null;
  cancel_reason: string | null;
};

export type AppointmentWithRefs = AppointmentRow & {
  clients: Pick<ClientRow, "id" | "name" | "phone"> | null;
  services: Pick<ServiceRow, "id" | "name" | "duration_min"> | null;
};

export type PaymentMethod = "pix" | "dinheiro" | "credito" | "debito" | "transferencia" | "outro";

export type TransactionRow = {
  id: string;
  kind: "receita" | "despesa";
  category: string;
  description: string | null;
  amount: number;
  method: PaymentMethod;
  occurred_on: string;
  client_id: string | null;
  appointment_id: string | null;
  created_at: string;
  status: "pago" | "pendente";
  due_on: string | null;
  fee: number;
  client_package_id: string | null;
  stock_movement_id: string | null;
};

export type InteractionKind = "nota" | "whatsapp" | "ligacao" | "mensagem_site" | "followup";

export type InteractionRow = {
  id: string;
  client_id: string;
  kind: InteractionKind;
  content: string;
  due_on: string | null;
  done_at: string | null;
  created_at: string;
};

export type ClientStats = {
  client_id: string;
  visits: number;
  first_visit: string | null;
  last_visit: string | null;
  next_appointment: string | null;
  no_shows: number;
  total_spent: number;
  last_service_id: string | null;
  avg_interval_days: number | null;
};

/** Resultado padrão das server actions usadas com useActionState. */
export type ActionState = { ok: boolean; message: string } | null;

export type Anamnesis = {
  fitzpatrick?: string;
  skin_type?: string;
  concerns?: string[];
  conditions?: string[];
  medications?: string;
  allergies_detail?: string;
  pregnant?: boolean;
  breastfeeding?: boolean;
  uses_acids?: boolean;
  sun_exposure?: string;
  sunscreen?: boolean;
  smoker?: boolean;
  water_intake?: string;
  previous_procedures?: string;
  goals?: string;
};

export type DayHours = { open: string; close: string; break_start: string | null; break_end: string | null } | null;
export type BusinessHours = Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", DayHours>;

export type TemplateKey = "confirmacao" | "lembrete" | "pos_atendimento" | "retorno" | "reativacao" | "aniversario";

export type Settings = {
  clinic_name: string;
  whatsapp: string;
  address: string;
  business_hours: BusinessHours;
  slot_step_min: number;
  min_lead_min: number;
  max_days_ahead: number;
  cancel_min_hours: number;
  fee_credit: number;
  fee_debit: number;
  templates: Record<TemplateKey, string>;
};

export type TimeBlock = { id: string; starts_at: string; ends_at: string; reason: string };

export type PackageRow = {
  id: string;
  name: string;
  service_id: string;
  sessions: number;
  price: number;
  validity_days: number | null;
  active: boolean;
};

export type ClientPackage = {
  id: string;
  client_id: string;
  package_id: string | null;
  service_id: string;
  name: string;
  sessions_total: number;
  price: number;
  purchased_on: string;
  expires_on: string | null;
  status: "ativo" | "concluido" | "expirado" | "cancelado";
  notes: string | null;
  sessions_used: number;
  sessions_scheduled: number;
  sessions_remaining: number;
};

export type SessionRecord = {
  id: string;
  client_id: string;
  appointment_id: string | null;
  record_date: string;
  procedure: string;
  products_used: string | null;
  parameters: string | null;
  observations: string | null;
  next_steps: string | null;
  created_at: string;
};

export type ClientPhoto = {
  id: string;
  client_id: string;
  path: string;
  kind: "antes" | "depois" | "evolucao";
  taken_on: string;
  caption: string | null;
};

export type Product = {
  id: string;
  name: string;
  brand: string | null;
  category: "uso_cabine" | "home_care";
  unit: string;
  stock_qty: number;
  min_qty: number;
  cost_price: number;
  sale_price: number;
  active: boolean;
};

export type StockMovement = {
  id: string;
  product_id: string;
  kind: "entrada" | "saida" | "venda" | "ajuste";
  qty: number;
  unit_cost: number | null;
  note: string | null;
  client_id: string | null;
  created_at: string;
};
