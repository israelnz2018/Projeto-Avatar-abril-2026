# Webhooks Hotmart da LBW

Catálogo sem credenciais ou tokens. As URLs abaixo são públicas por natureza; os segredos ficam somente no n8n e na Hotmart.

| Pacote LBW | Produto Hotmart | URL de produção | Status |
|---|---|---|---|
| Capabilidade de Processo Avançado | Capabilidade de Processo | `https://primary-production-1d53.up.railway.app/webhook/capabilidadeavancada` | Em configuração |
| Estatística Aplicada e Ferramentas da Qualidade | Estatística Aplicada e Ferramentas da Qualidade | `https://primary-production-1d53.up.railway.app/webhook/estatisticaaplicada` | Em configuração |
| Análise Inferencial - Testes de Hipóteses | Análise Inferencial - Testes de Hipóteses | `https://primary-production-1d53.up.railway.app/webhook/testedehipotesis` | Em configuração |
| Controle Estatístico de Processo | Controle Estatístico de Processo | `https://primary-production-1d53.up.railway.app/webhook/controleestatistico` | Em configuração |

## Padrão de cadastro

- Um webhook e um workflow n8n por pacote.
- URL de produção, sem espaços e sem acentos no path.
- O `plano` enviado pelo workflow deve ser exatamente o nome do pacote LBW.
- Cada curso de Data Analysis inclui sempre `graficos` e `diversas`, além do módulo específico.
- O evento de compra aprovado libera o pacote; a revogação por reembolso/chargeback depende do processamento de revogação no backend.

## Regra de segurança

Não registrar neste arquivo `X-HOTMART-HOTTOK`, `x-lbw-secret`, senhas ou valores de credenciais.
