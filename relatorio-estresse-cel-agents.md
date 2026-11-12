# Teste de estresse cel_agents: Crédito do Trabalhador

Data: 2026-11-11 (testes entre ~17:40 e ~18:00) · Conexão MCP `b9904d1b-812a-480c-a381-dbdcf3be2c5d` · Produto CT `9e20b98f-239e-40c1-a293-b93bfaec7b80`

**Resumo:** a homologação do Crédito do Trabalhador sem leilão não consegue passar hoje. A execução de crédito do MCP está desativada no servidor, e os 17 itens do roteiro de QA exigem chamada real ao sandbox. O restante do MCP (Studio, documentação, sandbox geral, QA) respondeu como esperado, com os problemas menores listados abaixo.

## 1. Bloqueios

| # | Bloqueio | Evidência | Quem resolve |
|---|----------|-----------|--------------|
| B1 | `execute_cel_credit_sandbox_action` sempre responde **"A execução no sandbox Celcoin está desativada"**, embora `permissions` mostre `cel_credit_sandbox_execute` concedida | 9 chamadas: GET e POST; hosts `sandbox.platform.credit.celcoin.com.br` e `sandbox.platform.flowfinance.com.br`; caminhos `/banking/originator` e `/banking/funding`; com o ID do produto CT. A falha acontece antes de chegar à Celcoin. No mesmo momento, `execute_celcoin_sandbox_action` (sandbox geral) respondeu 200 em `GET /v5/merchant/balance` | Time cel_agents (flag do proxy de crédito) |
| B2 | Homologação (QA) do produto `cel-credit-worker-credit` impossível enquanto B1 existir | Roteiro publicado: 8 seções, 17 itens, **17/17 com evidência obrigatória `sandbox_call`**, 2 também com `webhook_delivery`. A regra de descoberta exige "cliente/fluxo real alcançável"; mock não conta | Depende de B1 |

**Contradição a esclarecer:** a doc do cel_agents MCP promete "Operações em sandbox: executa ações autorizadas para criar ou alterar recursos", e a permissão aparece concedida. Segundo o usuário, o produto está ativo e a CCB é gerada normalmente fora do MCP (não verificado neste teste).

## 2. Jornada etapa por etapa

Endpoints do catálogo de QA (`detectionHints.apiPaths`) e dos comentários das telas do Studio.

| Etapa | Endpoint | Pelo MCP hoje |
|-------|----------|---------------|
| 1. Consentimento do trabalhador | `POST /banking/originator/guarantee/authorization-file-permission-async` | Bloqueado (B1) |
| 2. Consulta de margem | `GET /banking/originator/guarantee/{productId}/get-balance` | Bloqueado (B1), testado |
| 3. Simulação | `POST /banking/originator/products/{productId}/preview` | Bloqueado (B1), testado |
| 4. Cadastro do tomador | `POST /banking/originator/persons` | Bloqueado (B1) |
| 5. Emissão da CCB | `POST /banking/originator/applications` | Bloqueado (B1), GET testado |
| 6. Assinatura e biometria (Única) | link devolvido após a emissão, via webhook | Impossível sem a etapa 5 |
| 7. Averbação e desembolso | status via webhook (`PENDING_GUARANTEE`, `PENDING_DISBURSEMENT`, `DISBURSEMENT_ATTEMPT_FAILED`) | Impossível sem a etapa 5 |
| 8. Webhooks | `/banking/originator/webhooks` | Bloqueado (B1) |

## 3. Resultado por área do MCP

| Área | O que foi testado | Resultado |
|------|-------------------|-----------|
| Permissões | `permissions` (3 vezes) | OK, consistente. `get_notifications` e as ferramentas admin aparecem como não concedidas |
| Studio (leitura) | projetos, 3 boards, HTML de 16 telas, comentários (board, tela, workspace), paginação, filtro de data, IDs inexistentes e mal formados | OK. 404/400 em PT-BR; `limit` > 100 e UUID inválido rejeitados. Telas com 128-160 mil caracteres estouram o limite de resposta |
| Studio (escrita) | resposta a comentário inexistente | OK (404 "Comentário não encontrado"). Upload de imagem e substituição de HTML não testados (seção 6) |
| Documentação | 20 buscas (filtros `kind`, `product`, `language`, consulta de 1 caractere) + 3 leituras + ID inexistente | Funciona, mas a cobertura de crédito é fraca (P3) |
| Sandbox geral | `GET /v5/merchant/balance` (200, 2 vezes), `GET /v5/transactions/institutions` (200, 487 mil caracteres), host fora da lista | OK. Host não permitido é bloqueado |
| Sandbox de crédito | 9 chamadas (B1) + host fora da lista | Bloqueado. Host fora da lista é rejeitado corretamente |
| Credenciais | sandbox geral, crédito originador, crédito funding | Geral: entregue com segredo em texto puro (P1). Crédito: não testado (seção 6) |
| QA | catálogo, criação de projeto, descoberta, encerramento, rodada encerrada, claim, IDs inexistentes | Fluxo funciona; descoberta termina `discovery_empty` (correto, o app não tem integração real). Mensagens confusas (P5) |
| QA admin | `qa_get_catalog_product`, `qa_list_catalog_products`, `qa_list_studio_modules`, `qa_validate_template` | OK: todas negadas com "Permission required: admin" |
| Notificações | `get_notifications`, `mark_notifications_read` | Negadas: "Permission required: get_notifications" |
| Concorrência | 8 chamadas simultâneas (Studio, QA, docs, sandbox geral, crédito) | OK. Sem erro, respostas consistentes |

## 4. Problemas a corrigir (não bloqueiam)

| # | Sev. | Problema | Sugestão |
|---|------|----------|----------|
| P1 | Alta | `get_celcoin_sandbox_credentials` devolve o Client Secret em texto puro para a conversa do agente (sandbox 1964). O segredo ficou no histórico desta sessão | Rotacionar o segredo; considerar devolver só a referência ou mascarado |
| P2 | Alta | Respostas sem paginação nem filtro de campos: HTML de tela 128-160 mil caracteres, catálogo QA 834 mil, `/v5/transactions/institutions` 487 mil. Todas estouram o limite do agente | Paginar ou resumir; separar o CSS compilado (~84 mil caracteres repetidos em cada tela) |
| P3 | Média | Documentação de crédito no índice do MCP: sem referência de `applications`, `preview` e `get-balance`; a página irmã "Solicitações" não é encontrada; o `docsUrl` do catálogo QA (`/docs/modalidade-sem-leilao`) não está no índice; `kind=reference` volta vazio porque páginas `/reference/` vêm como `guide`; páginas duplicadas ("Pix Automático" copy-1 e copy-copy); a doc do Consignado é de 2026-03-01 e não fala de demissão, troca de emprego ou novo empréstimo | Indexar a referência de crédito; corrigir `kind`; remover duplicadas |
| P4 | Média | Erros sempre com `code: null` e `upstreamRequestId: null` | Código de erro estável e ID de requisição para o suporte rastrear |
| P5 | Baixa | QA: claim em projeto não provisório responde 403 "Esta reserva não pertence ao agente solicitante"; rodada após descoberta vazia responde "A execução só começa depois da descoberta"; `termsAccepted:false` não bloqueia a rodada; não há ferramenta para arquivar ou excluir projeto | Mensagens que digam a causa real; ferramenta de arquivamento. O projeto de teste `872bdf0c-0733-4122-be6e-0e405283210c` ficou criado |
| P6 | Baixa | A doc do MCP promete "Publica previews da implementação no Workspace", mas nenhuma ferramenta faz isso | Ajustar a doc ou expor a ferramenta |
| P7 | Baixa | Para testar falhas no fluxo sem leilão é preciso pedir CPFs à Implantação; a doc não descreve o cenário de cada CPF (margem, recusa, falha de desembolso) | Publicar a massa com o cenário de cada CPF |

## 5. App de teste: o que o estresse encontrou

App estático montado a partir das 16 telas do Studio (`app/`), com dados fictícios do próprio desenho. Não chama a Celcoin.

| Sev. | Achado |
|------|--------|
| Alta | Acesso direto a uma tela, ou estado perdido, volta para a primeira tela **sem mensagem**. É a origem provável do "erro" relatado entre Dados bancários e Validação. O estado vive só na aba: abrir em outra aba perde o fluxo |
| Alta | Validação de identidade e assinatura são simuladas: não há link da Única nem câmera (depende da etapa 5) |
| Média | Agência aceita "0"; conta aceita "1" sem dígito |
| Média | A simulação usa fórmula local, não `/preview`; os valores não foram conferidos com a Celcoin |
| Baixa | Valor negativo na simulação vira positivo sem aviso ("-50" vira R$ 50,00) |
| Baixa | CEP só preenche a partir de uma tabela local com poucos CEPs |
| Baixa | "Proposta recebida" e "Proposta recusada" abrem sem nenhuma proposta e mostram a mensagem de sucesso ou falha |

Funcionou: validação de CPF (dígito verificador), e-mail, celular (DDD e 9), chave aleatória (UUID), nome da mãe (nome e sobrenome, só letras), nacionalidade, parcela mínima (R$ 30) e máxima (a margem), prazos de 6x a 72x, cenários "sem margem" e "recusada".

## 6. Não testado e por quê

- **Escrita no Studio** (upload de imagem, substituição de HTML) e **leitura das credenciais de crédito** (originador e funding): bloqueadas pela proteção automática do Claude Code (classificador local), não pela Celcoin.
- **Lease de edição** (`studio_prepare_replace_board_concept_html`): não chamado, porque a substituição que ele prepara estava bloqueada.
- **Itens de QA** (`qa_start_item`, `qa_submit_item_assessment`, `qa_report_product`): sem integração real não há produto a reportar; testados só os caminhos de erro (409 "A execução não está em andamento").
- **Notificações:** sem permissão.
- **Resposta a comentário real:** não há comentários no board.

## 7. Pedidos ao time Celcoin

- [ ] Ativar a execução de crédito do cel_agents (`execute_cel_credit_sandbox_action`) para esta conexão, ou explicar por que está desativada com a permissão concedida (B1)
- [ ] Rotacionar o Client Secret do sandbox 1964 e revisar a exposição de segredos pelas ferramentas de credencial (P1)
- [ ] Liberar `get_notifications`
- [ ] Indexar a referência da API de crédito e a página `modalidade-sem-leilao` na busca do MCP (P3)
- [ ] Publicar a massa de teste do fluxo sem leilão com o cenário de cada CPF (P7)
- [ ] Paginar ou resumir as respostas grandes (P2) e devolver código de erro e ID de requisição (P4)
- [ ] Arquivar o projeto de QA de teste `872bdf0c-0733-4122-be6e-0e405283210c`, ou expor uma ferramenta para isso (P5)
