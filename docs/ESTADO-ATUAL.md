# Estado atual do projeto

Última atualização: 29/09/2026 (noite). Produção: **Cloudflare Workers** (`clinica-debora`) em
https://deborasilvaestetica.com.br (DNS e hospedagem no Cloudflare; a Vercel não publica mais).
Todo push no `master` publica o site (GitHub Actions) e, se mexer em `mobile/**` ou `src/lib/**`, a atualização do app.

## Onde paramos (29/09/2026)

1. **App Android 2.1** publicado (visual igual ao painel web no tablet) na Release `app-v2.1.0` do GitHub.
   Falta **testar no tablet real** e corrigir o que estiver diferente do painel (pedir prints deitado e em pé).
2. **Auditoria de 29/09** pela metade: as de *banco/sincronização* e *site/infra/GitHub Actions* foram interrompidas
   pelo limite de uso e precisam ser refeitas. As de *app* e *qualidade* terminaram; achados na lista de pendências abaixo.
3. **Vouchers online (InfinitePay)** continuam aguardando a InfiniteTag da clínica (seção própria abaixo).

## Pendências (em ordem)

- **App — segurança (auditoria 29/09):** fotos vistas ficam no cache de disco do `expo-image` sem criptografia
  (usar `cachePolicy="memory"` e limpar no sair); fotos pendentes, `atendimento-*.json` e CSVs exportados ficam fora do
  banco criptografado e não são apagados no `wipeDevice`; se a pessoa é removida com o app aberto (ou a sessão expira),
  o app cai no login sem apagar os dados; sem `FLAG_SECURE` (miniatura nos apps recentes); conferir `PRAGMA cipher_version`
  após abrir o banco; ativar assinatura de código do EAS Update.
- **App — qualidade (auditoria 29/09):** timestamps exibidos sem `ts()` na ficha da cliente e em listas (`created_at`);
  `order by` em texto com formatos misturados (usar `datetime()`); índices locais faltando (`appointments.client_package_id`,
  `appointments.voucher_id`, `transactions.appointment_id`, `transactions.client_package_id`, `transactions(status, due_on)`);
  erros de gravação sem aviso (helper `save()` com toast); configurações regravam todas as colunas (perde edição de outro aparelho);
  `faltou` ainda bloqueia horário livre na agenda do app; CRM usa mês em UTC.
- **App — funções:** aviso de "APK novo disponível" dentro do app (hoje só o painel antigo avisa); "Vender pacote" na tela
  Pacotes; cartão "Chamar de volta" no Início; cenas animadas completas no atendimento.
- **Refazer auditorias** de banco/sincronização e site/infra/GitHub Actions.
- **Supabase → Authentication:** desativar "Allow new users to sign up" (ainda **ativo**); proteção contra senhas vazadas;
  senha mínima 10. Opcional: MFA e CAPTCHA.
- **Cloudflare:** ativar DNSSEC (no Cloudflare e depois no Registro.br).
- **Tokens** que passaram pela conversa de 28–29/09 (Supabase `sbp_`, Vercel `vcp_`, PowerSync `jpt_`, Cloudflare `cfut_`,
  Expo): revogar os que não estão em uso. Em uso como secrets do GitHub: `CLOUDFLARE_API_TOKEN` e `EXPO_TOKEN` (se revogar,
  criar outro e atualizar com `gh secret set`).
- Apagar o projeto antigo da Vercel quando não houver mais links "meu agendamento" antigos em uso.
- Guardar backup do keystore do app antigo (`equipe.keystore`) — o app novo usa a chave do EAS.

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
- Domínio `deborasilvaestetica.com.br` (e `www` → sem www) ligado ao Worker como domínio personalizado (`routes` no
  `wrangler.jsonc`). Zona Cloudflare `d92a2c2ec619c23fec195d8db8b46c58`. HSTS no `next.config.ts`.
- Vercel: Git desconectado e domínio removido. A última versão continua em `clinica-talissa-eta.vercel.app` só para
  links antigos já enviados às clientes (mesmo banco); pode ser apagada quando não houver mais links antigos em uso.

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
- **Visual (2.1):** igual ao painel web — menu lateral (`src/components/sidebar.tsx`: completo ≥1024 px, ícones ≥768 px,
  gaveta no celular), fontes Cormorant Garamond/Lato, ícones Lucide, componentes em `src/components/ui.tsx`
  (Screen/Card/Stat/Button/Tabs/Sheet que vira gaveta à direita no tablet), gráficos/tabelas em `src/components/charts.tsx`.
  Fotos de referência do painel foram tiradas com usuário temporário (refazer se o painel mudar).
- **Versões:** `app.json` `version` 2.1.0 / `versionCode` 4, `runtimeVersion` por fingerprint (na prática saiu igual à versão).
  Ao adicionar biblioteca nativa: subir `version`, gerar APK (`eas build`), publicar Release (`gh release create app-vX.Y.Z
  debora-equipe.apk --latest`) e atualizar `APK_VERSION`/`APK_VERSION_NAME` em `src/lib/version.ts`.
  Mudança só de código/visual chega sozinha pelo EAS Update na próxima abertura do app.
- Feitos em 29/09: exportar CSV, atendimentos sem pagamento, indicadores do Início, cronômetro do atendimento salvo no aparelho,
  painel web com tempo real em uma ida ao servidor.

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

1. **Configurar a InfiniteTag da clínica** (o `$usuario` da conta InfinitePay, sem o `$`) no Worker do Cloudflare:
   ```bash
   printf "SUA_INFINITETAG" | npx wrangler secret put INFINITEPAY_HANDLE   # com CLOUDFLARE_API_TOKEN/ACCOUNT_ID
   ```
   Vale na hora (sem novo deploy). Localmente, adicione `INFINITEPAY_HANDLE=...` ao `.env.local`.
2. Enquanto a variável não existir, o link **"Vale-presente"** fica escondido do menu e `/vouchers` mostra "Em breve".
   O resto já funciona: agendar com código de voucher e vouchers vendidos na clínica ou de cortesia, criados em **Painel → Vouchers**.
3. **Fazer uma compra real de teste** (R$ 50 no Pix) em `/vouchers` e conferir:
   - a InfinitePay volta para `/voucher/retorno` e a página do voucher mostra código + QR code;
   - o voucher aparece como "Disponível" em Painel → Vouchers e a venda aparece no Financeiro (categoria "Voucher");
   - agendar pelo site com o código ("Tem um voucher?") e concluir na agenda ou no tablet mostra "Já está pago".
   - Se a página ficar em "Confirmando seu pagamento…", veja os logs do Worker (`npx wrangler tail` ou painel Cloudflare → Workers → clinica-debora → Logs).
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
- Testes de ponta a ponta: build no motor do Cloudflare (`npx opennextjs-cloudflare build && npx wrangler dev`) + Playwright
  (`chromium-headless-shell`), usando um usuário e dados **temporários** no banco de produção, sempre apagados no final.
- Textos do site em português, com linguagem inclusiva.
- Commit direto no `master` (publica no Cloudflare). Não existe branch `main`.
- Testes e verificações com timeouts curtos; não ficar esperando deploy em loop longo.
- Código enxuto, comentário de uma linha por função; agentes em paralelo quando fizer sentido (Sonnet no que é simples).
- Nunca ecoar segredos; tokens ficam em arquivos 600 na pasta temporária da sessão ou como secrets do GitHub/Cloudflare.
