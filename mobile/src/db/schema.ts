import { column, Schema, Table } from "@powersync/react-native";

/**
 * Cópia local (SQLite criptografado) das tabelas do painel, sincronizada com o Supabase pelo PowerSync.
 * Tipos no aparelho: uuid/texto/data/json/listas → text; dinheiro e quantidades → real; inteiros e booleanos → integer.
 * O `id` é criado pelo PowerSync (em `staff` é o user_id; em `settings`, "1").
 */
const { text, real, integer } = column;

const clients = new Table({
  name: text, phone: text, email: text, birth_date: text, instagram: text, source: text, stage: text,
  tags: text, notes: text, skin_type: text, allergies: text, health_notes: text, marketing_opt_in: integer, welcome_discount_pct: real,
  created_at: text, updated_at: text, cpf: text, address: text, occupation: text, anamnesis: text, consent_signed_at: text,
}, { indexes: { phone: ["phone"], name: ["name"] } });

const appointments = new Table({
  client_id: text, service_id: text, starts_at: text, ends_at: text, status: text, price: real, notes: text,
  source: text, created_at: text, client_package_id: text, public_token: text, confirmed_at: text,
  reminder_sent_at: text, cancel_reason: text, voucher_id: text, voucher_amount: real, discount_pct: real,
}, { indexes: { starts: ["starts_at"], client: ["client_id", "starts_at"] } });

const services = new Table({
  name: text, category: text, description: text, duration_min: integer, price: real, return_days: integer,
  active: integer, sort_order: integer, created_at: text, show_on_home: integer, icon: text,
});

const time_blocks = new Table({ starts_at: text, ends_at: text, reason: text, created_at: text }, { indexes: { starts: ["starts_at"] } });

const session_records = new Table({
  client_id: text, appointment_id: text, record_date: text, procedure: text, products_used: text,
  parameters: text, observations: text, next_steps: text, created_by: text, created_at: text,
}, { indexes: { client: ["client_id", "record_date"] } });

const client_photos = new Table({
  client_id: text, path: text, kind: text, taken_on: text, caption: text, created_at: text,
}, { indexes: { client: ["client_id"] } });

const interactions = new Table({
  client_id: text, kind: text, content: text, due_on: text, done_at: text, created_by: text, created_at: text,
}, { indexes: { client: ["client_id", "created_at"], due: ["due_on"] } });

const packages = new Table({
  name: text, service_id: text, sessions: integer, price: real, validity_days: integer, active: integer, created_at: text,
});

const client_packages = new Table({
  client_id: text, package_id: text, service_id: text, name: text, sessions_total: integer, price: real,
  purchased_on: text, expires_on: text, status: text, notes: text, created_at: text,
}, { indexes: { client: ["client_id"] } });

const products = new Table({
  name: text, brand: text, category: text, unit: text, stock_qty: real, min_qty: real,
  cost_price: real, sale_price: real, active: integer, created_at: text,
});

const stock_movements = new Table({
  product_id: text, kind: text, qty: real, unit_cost: real, note: text, client_id: text, created_at: text,
}, { indexes: { product: ["product_id", "created_at"] } });

const transactions = new Table({
  kind: text, category: text, description: text, amount: real, method: text, occurred_on: text, client_id: text,
  appointment_id: text, created_at: text, status: text, due_on: text, fee: real, client_package_id: text, stock_movement_id: text,
}, { indexes: { occurred: ["occurred_on"], client: ["client_id"] } });

const vouchers = new Table({
  code: text, kind: text, service_id: text, service_name: text, amount: real, balance: real, buyer_name: text,
  buyer_email: text, buyer_phone: text, for_self: integer, recipient_name: text, message: text, status: text,
  source: text, order_nsu: text, payment: text, paid_at: text, expires_on: text, used_at: text, created_at: text,
}, { indexes: { code: ["code"] } });

const settings = new Table({
  clinic_name: text, whatsapp: text, address: text, business_hours: text, slot_step_min: integer,
  min_lead_min: integer, max_days_ahead: integer, cancel_min_hours: integer, fee_credit: real, fee_debit: real,
  templates: text, updated_at: text, anamnesis_form: text, consent_text: text,
});

const staff = new Table({ name: text, is_admin: integer, created_at: text });

/** Só no aparelho: alterações que o servidor recusou (ex.: horário ocupado por outro aparelho). */
const sync_conflicts = new Table({
  created_at: text, table_name: text, row_id: text, operation: text, data: text, error_code: text, message: text,
}, { localOnly: true });

/** Só no aparelho: fotos tiradas sem internet, aguardando envio ao Storage (depois viram client_photos). */
const photo_uploads = new Table({
  client_id: text, local_uri: text, kind: text, taken_on: text, caption: text, created_at: text, error: text,
}, { localOnly: true });

export const AppSchema = new Schema({
  clients, appointments, services, time_blocks, session_records, client_photos, interactions, packages,
  client_packages, products, stock_movements, transactions, vouchers, settings, staff, sync_conflicts, photo_uploads,
});

export type Database = (typeof AppSchema)["types"];

/** Colunas que no Postgres são json/jsonb ou listas: vão como objeto no envio, não como texto. */
export const JSON_COLUMNS: Record<string, string[]> = {
  clients: ["tags", "anamnesis"],
  settings: ["business_hours", "templates", "anamnesis_form"],
  vouchers: ["payment"],
};
