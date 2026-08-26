# Webhooks Hotmart da LBW

Catálogo sem credenciais ou tokens. As URLs abaixo são públicas por natureza; os segredos ficam somente no n8n e na Hotmart.

| Pacote LBW | Produto Hotmart | URL de produção | Status |
|---|---|---|---|
| Capabilidade de Processo Avançado | Capabilidade de Processo | `https://primary-production-1d53.up.railway.app/webhook/capabilidadeavancada` | Em configuração |
| Estatística Aplicada e Ferramentas da Qualidade | Estatística Aplicada e Ferramentas da Qualidade | `https://primary-production-1d53.up.railway.app/webhook/estatisticaaplicada` | Em configuração |
| Análise Inferencial - Testes de Hipóteses | Análise Inferencial - Testes de Hipóteses | `https://primary-production-1d53.up.railway.app/webhook/testedehipotesis` | Em configuração |
| Controle Estatístico de Processo | Controle Estatístico de Processo | `https://primary-production-1d53.up.railway.app/webhook/controleestatistico` | Em configuração |
| Análise Preditiva - Regressões, Correlações e Séries Temporais | Análise Preditiva - Regressões, Correlações e Séries Temporais | `https://primary-production-1d53.up.railway.app/webhook/analisepreditiva` | Em configuração |
| MSA - Análise do Sistema de Medição | MSA - Análise do Sistema de Medição | `https://primary-production-1d53.up.railway.app/webhook/analisedemedicao` | Em configuração |
| Como Resolver Problemas no Trabalho - Kit 90 dias | Como Resolver Problemas no Trabalho - Kit 90 dias | `https://primary-production-1d53.up.railway.app/webhook/kit90dias` | Em configuração |
| Formação Profissional + Software LBW (degrau 2: cursos + Data Analysis) | Software LBW Completo | `https://primary-production-1d53.up.railway.app/webhook/softwarelbw` | Em configuração |
| Como Recomendar Melhorias com Base em Dados - GATE | Como Recomendar Melhorias com Base em Dados - GATE | `https://primary-production-1d53.up.railway.app/webhook/gate` | Em configuração |
| Como Conduzir Mudanças com Menos Resistência | Como Conduzir Mudanças com Menos Resistência | `https://primary-production-1d53.up.railway.app/webhook/gestaodemudanca` | Configurado no backend |
| Como Antecipar Riscos Antes que Virem Problemas | Gerenciamento de Risco | `https://primary-production-1d53.up.railway.app/webhook/gerenciamentoderisco` | Configurado no backend |
| Como Aplicar a Cultura Lean | Cultura Lean | `https://primary-production-1d53.up.railway.app/webhook/culturalean` | Configurado no backend |
| Plataforma Profissional em Gestão de Projetos de Melhoria | Plataforma Profissional em Gestão de Projetos de Melhoria | `https://primary-production-1d53.up.railway.app/webhook/Plataforma` | Em configuração |
| Formação Profissional em Gestão de Projetos de Melhoria | Todos os cursos da plataforma | `https://primary-production-1d53.up.railway.app/webhook/formacao` | Configurado no backend |

## Padrão de cadastro

- Um webhook e um workflow n8n por pacote.
- URL de produção, sem espaços e sem acentos no path.
- O `plano` enviado pelo workflow deve ser exatamente o nome do pacote LBW.
- Cada curso de Data Analysis inclui sempre `graficos` e `diversas`, além do módulo específico.
- O evento de compra aprovado libera o pacote; a revogação por reembolso/chargeback depende do processamento de revogação no backend.

## Regra de segurança

Não registrar neste arquivo `X-HOTMART-HOTTOK`, `x-lbw-secret`, senhas ou valores de credenciais.
