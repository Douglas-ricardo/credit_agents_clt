# Crédito do Trabalhador: app de teste e avaliação do cel_agents

Protótipo navegável do fluxo de **Crédito do Trabalhador** (consignado CLT, sem leilão), montado a partir das telas do Studio da Celcoin, mais a documentação de um teste de estresse do MCP `cel_agents` feito com a persona de um "usuário leigo".

> O app **não chama a Celcoin**. Usa dados fictícios do próprio desenho do Studio. Validação de identidade, assinatura e simulação são simuladas localmente.

## O que tem aqui

| Caminho | Conteúdo |
|---------|----------|
| `screens/` | 16 telas exportadas do Studio (`00.html` a `15.html`) e `_runtime.js`, o runtime de estado e navegação |
| `build.py` | Gera `app/*.html` a partir de `screens/`: liga a navegação entre telas e guarda o estado em `sessionStorage` |
| `app/` | App estático pronto para abrir no navegador. O ponto de entrada é `app/index.html` |
| `PROMPTS-LEIGO.md` | Roteiro de prompts (P0 a P10) do teste com a persona de usuário leigo |
| `friction-log-leigo.md` | Registro das travas e dos resultados de cada prompt |
| `relatorio-estresse-cel-agents.md` | Relatório do teste de estresse do MCP: bloqueios, problemas e pedidos ao time Celcoin |

## Como rodar

Requer Python 3.

```bash
# regenerar o app a partir das telas (opcional, app/ já está gerado)
python build.py

# abrir o app
# abra app/index.html no navegador, ou sirva a pasta:
python -m http.server 8000 --directory app
```

Depois acesse `http://localhost:8000`.

## Fluxo do app

```
Autorização → Consultando margem → Ofertas → Simulação → Resumo
   → Cadastro → Endereço → Dados bancários → Identidade → Validação → Proposta recebida
```

Telas de apoio: Sem margem, Proposta recusada, Meus empréstimos, Contrato e Parcelas.

Cenários simulados por parâmetro de URL, por exemplo `?margem=sem` (sem margem) e `identidade=recusada` (recusada). Não são estados reais da Celcoin.

## Estado do teste (2026-11-11)

- **Bloqueio principal:** `execute_cel_credit_sandbox_action` responde "A execução no sandbox Celcoin está desativada", embora a permissão apareça concedida. Por isso a jornada real (consentimento, margem, simulação, CCB, assinatura, desembolso, webhooks) e a homologação de QA (17 itens, todos exigem chamada real ao sandbox) não puderam ser exercitadas.
- **O que funcionou:** Studio (leitura), documentação, sandbox geral, QA (caminhos de erro) e concorrência.
- **Achados do app:** acesso direto a uma tela sem estado volta à primeira tela sem mensagem; agência e conta aceitam valores inválidos; a simulação usa fórmula local, não `/preview`.

Detalhes completos em [`relatorio-estresse-cel-agents.md`](relatorio-estresse-cel-agents.md).

## Segredos

Client ID e Client Secret nunca entram neste repositório. Use `.env.local`, que está no `.gitignore`.
