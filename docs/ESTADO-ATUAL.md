# Estado atual do projeto

Última atualização: 28/09/2026. Produção: https://clinica-talissa-eta.vercel.app (Vercel, projeto `clinica-talissa`).
Todo push no `master` publica em produção.

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
- Commit direto no `master` (publica na Vercel).
