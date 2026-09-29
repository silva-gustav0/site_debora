# Guia do app da equipe (Expo) — leia antes de mexer

App Android da clínica: o **painel inteiro** funcionando **offline**, em vários aparelhos ao mesmo tempo.
Referência de comportamento: o painel web em `../src/app/painel/**` e `../src/components/painel/**`
(as telas do app devem fazer o mesmo que as do painel, adaptadas a toque/celular/tablet).

Leia também `AGENTS.md` (Expo SDK 57 muda APIs: consulte https://docs.expo.dev/versions/v57.0.0/ antes de usar uma API do Expo).

## Como os dados funcionam

- Banco local SQLite criptografado, sincronizado pelo PowerSync. Esquema: `src/db/schema.ts` (espelha o Postgres).
  No SQLite: uuid/texto/data/json/listas → `text`; dinheiro/quantidade → `real`; inteiros/booleanos → `integer` (0/1).
- **Ler**: `useQuery<T>(sql, params)` de `@powersync/react-native` (reativo: a tela atualiza sozinha quando o dado muda,
  inclusive quando chega de outro aparelho). Converta com `asBool`, `asJson`, `asList` de `@/db/hooks`.
  Hooks prontos em `@/db/hooks`: `useSettings()`, `useMe()`, `useServices()`, `SITE_URL`.
- **Gravar**: SEMPRE por `write(async (w) => { ... })` de `@/db/write`. Tudo o que um botão faz vai num único `write`
  (vira um lote só no servidor: tudo ou nada). Dentro: `w.insert(table, row)` (devolve o id), `w.update(table, id, patch)`,
  `w.remove(table, id)`, `w.get<T>(sql)`, `w.all<T>(sql)`. Booleanos e objetos são convertidos sozinhos.
  Nunca use `supabase.from(...).insert/update` para tabelas sincronizadas.
- **Regras que o banco aplica sozinho** (não repita no app, apenas mostre uma estimativa local se quiser):
  - Concluir atendimento com voucher: o servidor calcula `voucher_amount` e desconta o saldo (uma vez).
  - Pacote: o servidor valida cliente/serviço/saldo ao agendar e encerra o pacote quando as sessões acabam.
  - Estágio da cliente: agendar pelo painel → `em_contato`; concluir/vender pacote → `cliente`.
  - Voucher reservado por agendamento em aberto não pode ser cancelado.
  - Estoque: `products.stock_qty` é calculado pelo servidor a partir de `stock_movements` (movimentação não se edita;
    para corrigir, exclua ou lance outra). Colunas que o servidor ignora vindas do app: `products.stock_qty`,
    `appointments.voucher_amount`, `appointments.public_token`, `vouchers.balance/payment/code` (após criar), `vouchers.used_at`.
    Pode gravá-las localmente como estimativa para a tela (ex.: somar a movimentação ao `stock_qty` local).
  - Dois atendimentos no mesmo horário: o servidor recusa (erro 23P01).
- **Conflitos**: se o servidor recusar um lote (regra/horário ocupado), ele vai para a tabela local `sync_conflicts`
  e o aparelho volta ao estado do servidor. A tela Início mostra os conflitos; não trate isso nas telas.
- Validação na tela antes de gravar (mesmas regras/mensagens do painel web: nome ≥ 2, valor > 0 etc.).
- **Online apenas** (mostre aviso amigável sem internet): link de anamnese (`anamnesis_links`, insert direto via
  `supabase` de `@/lib/supabase`), envio/visualização de fotos (Storage `client-photos`, URL assinada), gestão da equipe
  (`POST ${SITE_URL}/api/app/equipe` com `Authorization: Bearer <access_token da sessão>` e corpo
  `{action:"create",name,email,password,is_admin}` \| `{action:"remove",user_id}` \| `{action:"set_admin",user_id,is_admin}`;
  resposta `{ok,message}`).
- Datas: fuso de São Paulo. Use `@shared/format` (`todaySP`, `addDays`, `fmtDate`, `fmtTime`, `dateSP`, `brl`, `formatPhone`,
  `maskPhone`, `digits`, `whatsappLink`, `fillTemplate`, `STATUS_LABEL`, `STAGE_LABEL`, `METHOD_LABEL`…) e `@shared/hours`
  (`toTimestamp(date, "HH:MM")` → timestamp com -03:00, `freeSlots`, `dayHours`, `WEEKDAY_NAMES`).
  Timestamps gravados como ISO (`toTimestamp(...)` ou `new Date().toISOString()`); datas como `AAAA-MM-DD`.
- Código compartilhado com o site: `@shared/*` = `../src/lib/*` (só arquivos puros: `format`, `hours`, `types`,
  `settings-core` (`cardFee`, `DEFAULT_SETTINGS`), `recurrence`, `anamnesis` (`anamnesisFromAnswers`), `anamnesis-schema`,
  `attendance-themes`, `promo-templates`). **Nunca** importe arquivos com `import "server-only"` (settings.ts, vouchers.ts, queries.ts…).
  Se precisar de uma função pura que está num desses, copie a lógica para `src/lib/` do app com um comentário apontando a origem.
- WhatsApp: `Linking.openURL(whatsappLink(phone, texto))` (react-native).

## Interface

- Use os componentes de `@/components/ui` (Screen, Card, ListItem, Button, ConfirmButton, Field, MoneyField + parseMoney,
  Select, DateField, TimeField, Toggle, Segmented, Chip, Badge, Avatar, Stat, Sheet, Section, Empty, useToast, Row, Txt, TONES).
  Não crie estilos novos se um componente já resolve. Cores em `@/constants/brand`.
- Feedback: `useToast()("Agendamento criado.")` / `toast("Mensagem", "error")`. Sem `Alert.alert` para confirmar exclusão:
  use `ConfirmButton` (dois toques).
- Textos em português, linguagem inclusiva (como no painel: "cliente", "a equipe", evitar gênero quando possível).
- Funcionar no celular (retrato) e no tablet: listas em coluna; em telas largas pode usar `Row wrap` com cartões lado a lado.
- Navegação: expo-router. Abas em `src/app/(tabs)/`; demais telas em `src/app/<rota>.tsx` (Stack sem cabeçalho nativo:
  o `Screen` desenha o título e o botão voltar com `back`). Parâmetros: `useLocalSearchParams`. Navegar: `router.push("/rota")`.

## Mapa de telas (quem faz o quê)

| Rota | Tela |
|---|---|
| `(tabs)/index` | Início: faturamento do mês, pedidos a confirmar, agenda do dia, alertas (estoque mínimo, contas vencendo, pacotes, aniversários), tarefas, conflitos de sincronização |
| `(tabs)/agenda`, `agenda/novo`, `agenda/bloqueio`, `agendamento/[id]`, `atendimento/[id]` | Agenda (dia/semana), novo agendamento, bloqueios, detalhe (status, WhatsApp, remarcar, concluir com pagamento/voucher, link de anamnese), tela de atendimento |
| `(tabs)/clientes`, `clientes/nova`, `clientes/[id]`, `clientes/[id]/editar`, `clientes/[id]/anamnese` | Clientes: busca/filtros, ficha completa (dados, anamnese, evolução, fotos, pacotes, histórico, CRM), termo |
| `(tabs)/financeiro`, `financeiro/novo`, `pacotes`, `estoque`, `vouchers`, `crm`, `recorrencia` | Gestão |
| `(tabs)/mais`, `relatorios`, `servicos`, `configuracoes`, `equipe`, `conflitos` | Menu "Mais" e o resto |

Antes de terminar: `npx tsc --noEmit` e `npx expo lint` sem erros (na pasta `mobile/`).
