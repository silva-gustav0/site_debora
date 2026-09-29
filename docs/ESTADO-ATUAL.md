# Estado atual do projeto

Última atualização: 29/09/2026. Produção: **Cloudflare Workers** (`clinica-debora`), domínio `deborasilvaestetica.com.br`
(DNS no Cloudflare; migrando da Vercel — ver seção abaixo). Todo push no `master` publica em produção (GitHub Actions).

## Hospedagem no Cloudflare (29/09/2026)

- Site Next.js roda em Cloudflare Workers via OpenNext (`wrangler.jsonc`, `open-next.config.ts`). Sem cache de páginas:
  as páginas públicas que leem o banco são `force-dynamic`. Imagens pelo binding `IMAGES`.
- Deploy: `.github/workflows/deploy-cloudflare.yml` a cada push no `master` (secrets `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`, `NEXT_PUBLIC_SUPABASE_*`). Manual: `npm run deploy` (sem `.env.local` no build, para a chave
  secreta não entrar no código; ela é o secret `SUPABASE_SECRET_KEY` do Worker: `npx wrangler secret put`).
- Teste local no motor do Cloudflare: `npx opennextjs-cloudflare build && npx wrangler dev`.
- O `proxy.ts` (middleware Node) é suportado pelo OpenNext como **experimental**: testar login/painel após atualizar pacotes.
- Plano gratuito: 10 ms de CPU por acesso (rajada de 60 acessos passou). Se aparecer "Error 1102", assinar Workers Paid.
- App Android: `.github/workflows/app-update.yml` publica atualização pela internet (EAS Update, canal `preview`) a cada
  push em `mobile/**` ou `src/lib/**` (secret `EXPO_TOKEN`). APK novo só quando mudar algo nativo (`eas build`).
- APK publicado nas Releases do GitHub; `/app/debora-equipe.apk` redireciona para a mais nova.

## App Android nativo (offline) — `mobile/` (29/09/2026)

Substitui o app antigo (TWA que só abria o site). Guia técnico: `mobile/APP-GUIDE.md`.
- Expo SDK 57 + PowerSync (SQLite criptografado, chave no Keystore). Todo o painel funciona offline e sincroniza
  em tempo real (envio em até 100 ms). Regras de negócio ficam no banco (gatilhos + `apply_changes`, migração
  `20261001120000`), valendo para site, painel web e app. Recusas do servidor aparecem em "Conflitos".
- PowerSync Cloud: instância `6abb2c938453e7cf833af506` (config em `mobile/powersync/`; publicar com
  `npx powersync deploy` e `PS_ADMIN_TOKEN`). Usuário de replicação `powersync_role` (senha em `.env.local`).
- Build: EAS (`npx eas-cli build -p android --profile preview`), conta Expo `gustavoramalho`, projeto `debora-equipe`,
  chave de assinatura gerada pelo EAS. Mesmo pacote do app antigo: **desinstalar o app antigo antes** de instalar.
- Código compartilhado com o site: `mobile` importa `../src/lib` puro via `@shared/*` (não importar arquivos `server-only`).
- Equipe (criar/remover acesso) pelo app usa `POST /api/app/equipe` (chave secreta só no servidor).
- Máquina de desenvolvimento tem disco pequeno (live, ~7,7 GB): não compilar Android localmente.

**Pendências do app:** testar no tablet (fotos/Storage, compartilhar CSV, datas, tempo de sincronização medido).
Feitos em 29/09: exportar CSV (clientes e financeiro), atendimentos sem pagamento, ticket médio/novas clientes/6 meses
no Início, cronômetro e anotações do atendimento salvos no aparelho. Painel web: tempo real com uma ida ao servidor só.

## Vistoria de segurança (28/09/2026)

Feita com 4 agentes (site público, painel, banco, configuração). Correções aplicadas:

- Next.js 16.2.6 → 16.3.6 (falhas críticas/altas, incluindo bypass do `proxy.ts`).
- Site público (`src/app/actions/public.ts`): e-mail validado sem curingas e buscado de forma exata; formulário público
  não altera ficha existente (dados diferentes viram tarefa "Pedido pelo site com dados diferentes da ficha");
  "Meu agendamento" não mostra mais o nome da ficha.
- Limite de envios (`src/lib/rate-limit.ts`, tabela `rate_events`, só hash de IP/telefone): agendamento, contato,
  anamnese, compra e consulta de voucher e login do painel. Máx. 2 pedidos do site aguardando confirmação por WhatsApp.
- Vouchers: um pagamento libera um único voucher (índice único em `payment->>transaction_nsu`), confere `order_nsu`
  quando a InfinitePay devolver, `balance <= amount`, voucher de serviço excluído não vira crédito livre,
  conclusão com voucher não desconta duas vezes.
- Anamnese: gerar link novo revoga todos os anteriores; agendamento cancelado/falta invalida o link.
- Painel: CSV sem fórmulas; equipe com papel **administradora** (`staff.is_admin`; as 3 contas existentes viraram
  administradoras), remover acesso e trocar papel em Configurações → Equipe; trocar senha pede a senha atual; senhas ≥ 10.
- Imagens do site só do próprio site, do Storage do projeto ou do Unsplash; link do Maps só https.
- Cabeçalhos: CSP, X-Frame-Options, nosniff, Referrer-Policy (no-referrer em páginas com token), sem `x-powered-by`.
- Banco: privilégios padrão do `anon` revogados, `stock_movements` sem UPDATE, pedido do site não cai em horário bloqueado.
- Android: `allowBackup="false"` (vale no próximo build do APK).

**Pendências da vistoria (fazer no painel do Supabase → Authentication):**
- Desativar "Allow new users to sign up" (está **ativo** em produção; o `config.toml` só vale localmente).
- Ativar proteção contra senhas vazadas e senha mínima de 10 caracteres.
- Opcional: MFA (TOTP) para a equipe, CAPTCHA (Turnstile) nos formulários públicos.
- Guardar backup offline do keystore do Android (`equipe.keystore`).

## Onde paramos: vouchers (vale-presente) com InfinitePay

Está tudo construído, testado localmente e publicado. **Falta ativar a venda online**:

1. **Configurar a InfiniteTag da clínica** (o `$usuario` da conta InfinitePay, sem o `$`) na Vercel:
   ```bash
   npx vercel login
   npx vercel env add INFINITEPAY_HANDLE production   # cole a InfiniteTag
   npx vercel env add INFINITEPAY_HANDLE preview
   ```
   Depois faça um novo deploy (um push qualquer no `master` ou `npx vercel --prod`).
   Localmente, adicione `INFINITEPAY_HANDLE=...` ao `.env.local`.
2. Enquanto a variável não existir, o link **"Vale-presente"** fica escondido do menu e `/vouchers` mostra "Em breve".
   O resto já funciona: agendar com código de voucher e vouchers vendidos na clínica ou de cortesia, criados em **Painel → Vouchers**.
3. **Fazer uma compra real de teste** (R$ 50 no Pix) em `/vouchers` e conferir:
   - a InfinitePay volta para `/voucher/retorno` e a página do voucher mostra código + QR code;
   - o voucher aparece como "Disponível" em Painel → Vouchers e a venda aparece no Financeiro (categoria "Voucher");
   - agendar pelo site com o código ("Tem um voucher?") e concluir na agenda ou no tablet mostra "Já está pago".
   - Se a página ficar em "Confirmando seu pagamento…", veja os logs da Vercel (`/api/infinitepay/webhook`).
     O formato da resposta de `POST /links` não é documentado pela InfinitePay. O código aceita `url`, `link` ou `checkout_url`
     (`src/lib/vouchers.ts` → `createCheckoutLink`) e registra no log o erro quando o link não é criado.

### Como os vouchers funcionam (resumo técnico)

- Tabela `vouchers` + `appointments.voucher_id` / `appointments.voucher_amount` (migrações `20260929*`, já aplicadas).
- Compra: `startVoucherPurchase` (`src/app/actions/vouchers.ts`) cria o voucher `pendente` e o link da InfinitePay (`order_nsu` = UUID do voucher).
- Liberação: `activatePaidVoucher` (`src/lib/vouchers.ts`), chamada pelo webhook e pela página de retorno. **O webhook da
  InfinitePay não é assinado**, então o voucher só é liberado após confirmar com `POST /payment_check` (pago e valor ≥ preço).
  Aviso falso é recusado (testado).
- Código `DS-XXXX-XXXX`, válido por 6 meses, página pública `/voucher/<order_nsu>` com QR code.
- Voucher de serviço: só serviços ativos com preço > 0. Voucher de valor: R$ 50 a R$ 2.000, com saldo (o que sobrar continua no voucher).
- Um voucher reserva só um agendamento em aberto por vez (índice único); cancelar o agendamento libera o voucher.
- A venda entra no Financeiro na compra; ao concluir o atendimento não há nova cobrança (só a diferença, se houver).

## Feito recentemente (tudo em produção)

- **Tela de atendimento no tablet** (`/painel/atendimento/[id]`, botão "Iniciar atendimento" no agendamento): cronômetro,
  cena animada por procedimento, observações rápidas (minimizáveis), finalizar grava prontuário e pagamento.
- **Anamnese e termo editáveis** em Configurações → Anamnese e termo (modelo em `settings.anamnesis_form` / `consent_text`).
- **Promoções**: modelos de datas comemorativas e aviso fixo no site (Site → Promoções).
- **Painel no tablet**: tempo real (Supabase Realtime), menu de ícones, animações, cache no app.

## Pendências e observações

- Conferir no tablet real: tela de atendimento (som ao fim do tempo só toca após um toque na tela; regra do Android).
- Serviço **"Plastica teste" (R$ 10)** está ativo e aparece como opção de voucher. Desativar se for só teste.
- A maioria dos serviços está com preço R$ 0; só os com preço podem virar voucher de serviço.
- Não há serviço com "massagem" no nome; a cena de massagem da tela de atendimento aparece quando houver.
- A Stripe foi instalada por engano e **removida** (recurso e integração apagados na Vercel). Não usar.

## Como trabalhamos neste projeto (combinados com o Gustavo)

- Pode lançar agentes para dividir tarefas; tarefas simples ou mecânicas vão para o modelo Sonnet. Revise o que os agentes fizerem.
- Pode aplicar migrações sozinho: `supabase db push --dry-run` para conferir e depois `echo Y | supabase db push`.
  Migração destrutiva (apagar tabela/dados) precisa de confirmação.
- Testes de ponta a ponta: build local (`npx next build && npx next start -p 3123`) + Playwright (`playwright-core` com o Chrome
  instalado), usando um usuário e dados **temporários** no banco de produção, sempre apagados no final.
- Textos do site em português, com linguagem inclusiva.
- Commit direto no `master` (publica no Cloudflare).
