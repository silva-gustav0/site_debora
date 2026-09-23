# Talissa Estética e Bem Estar

Site da clínica + painel de gestão da esteticista (Next.js 16 + Supabase).

## O que tem

**Site (público)**
- Agendamento online com horários livres reais (respeita duração do serviço, horário de funcionamento, intervalo, bloqueios e antecedência mínima).
- Link “Meu agendamento” para a cliente consultar, salvar na agenda do celular (.ics) ou cancelar dentro do prazo.
- Formulário de contato que vira lead e tarefa no CRM.

**Painel (`/painel`, só equipe)**
- **Início**: faturamento do mês, pedidos a confirmar, agenda do dia, alertas (estoque, contas, pacotes, aniversários), tarefas e retornos.
- **Agenda**: grade dia/semana, clique no horário vazio para agendar, bloqueios, confirmação/lembrete/pós-atendimento por WhatsApp com mensagens prontas, concluir com pagamento (taxa de cartão automática) e evolução.
- **Clientes**: busca, filtros, exportação CSV e ficha completa: anamnese estruturada (fototipo, contraindicações), termo de consentimento para imprimir, evolução por sessão, fotos antes/depois (armazenamento privado), pacotes, histórico e relacionamento.
- **CRM & Campanhas**: funil, tarefas, campanhas segmentadas (aniversariantes, inativas, retorno, leads, VIP, etiquetas).
- **Recorrência**: frequência real de cada cliente e quem está atrasada para voltar.
- **Financeiro**: receitas, despesas, contas a pagar/receber, parcelas, DRE simplificado, 12 meses, CSV.
- **Pacotes**, **Estoque** (cabine e home care, com alerta de mínimo e venda), **Relatórios** (ocupação, faltas, mapa de demanda, origem das clientes), **Serviços** e **Configurações** (horários, regras do site, taxas, modelos de mensagem, equipe).

## Configuração

1. Crie `.env.local` a partir de `.env.example` (Supabase → Project Settings → API Keys).
   `SUPABASE_SECRET_KEY` aceita a *secret key* (`sb_secret_…`) ou a chave legada `service_role`. Nunca a exponha no navegador.
2. Aplique o banco: `supabase link --project-ref <ref>` e `supabase db push`.
3. Crie o primeiro acesso ao painel:
   ```bash
   npm run staff -- email@exemplo.com "Nome" "senha-com-8+"
   ```
   Depois, novas pessoas podem ser adicionadas em **Configurações → Equipe**.
4. No Supabase (Authentication → Sign In / Providers), **desative “Allow new users to sign up”**: contas são criadas só pela clínica.
5. `npm run dev` e acesse `http://localhost:3000` e `/painel`.

Na Vercel, cadastre as mesmas variáveis e `NEXT_PUBLIC_SITE_URL` com o domínio real (usado nos links enviados às clientes).

## Banco de dados

Migrações em `supabase/migrations`. Todas as tabelas têm RLS: só membros da tabela `staff` leem ou escrevem. O site público grava pedidos pelo servidor, com validação, e a disponibilidade é revalidada no momento do agendamento. Uma restrição no banco impede dois atendimentos no mesmo horário.
