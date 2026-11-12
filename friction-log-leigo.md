# Friction log (Crédito do Trabalhador, leigo): preencher durante a execução

Uma linha por evento. Severidade: **B** bloqueou, **A** atrapalhou, **M** menor. Tipo: `UI`, `Docs`, `MCP`, `IA`, `Design`, `Permissão`, `Dados`.

## Resumo por prompt

| Prompt | Resultado (ok / parcial / falhou) | Início | Fim | Intervenções suas (descreva cada uma e o motivo) | Erros de ferramenta | A IA inventou algo? (diga o quê) |
|--------|-----------------------------------|--------|-----|--------------------------------------------------|---------------------|-----------------------------------|
| P0 | n/a (conexão já existia) | | | nenhuma | nenhum | não |
| P1 | ok | 2026-11-10 ~16:40 | ~16:45 | nenhuma | `qa_get_product_catalog` estourou o limite de tokens (834 mil caracteres); lido via arquivo salvo | não; fontes: `permissions` e doc "Consignado Crédito Trabalhador" |
| P2 | ok | ~16:44 | ~16:45 | nenhuma | nenhum | não |

Obs.: execução em sessão NÃO limpa (contexto da conversa, skills e memória do usuário carregados), o que contraria a regra 1 do roteiro.
| P3 | parcial | 2026-11-11 | (sem hora registrada) | nenhuma (a IA não perguntou escopo; assumiu as 13 telas obrigatórias/ativas e pulou as 3 opcionais) | `studio_get_board_concept_html` estoura o limite de tokens em todas as telas (130-160 mil caracteres cada); resolvido lendo os arquivos salvos | NÃO inventou dados novos, mas o app usa os dados de exemplo (fictícios) que já vêm no HTML do Studio (Marina Alves Costa, Mercado Horizonte Ltda.). Nada chama a Celcoin ainda |
| P4 | ok | 2026-11-11 | (sem hora) | nenhuma | nenhum | não; comparação feita por diff programático do HTML do Studio contra o app. Não cobre aparência renderizada de todas as telas (só 3 vistas no navegador) |
| P5 | falhou (bloqueado no servidor) | 2026-11-11 | (sem hora) | nenhuma | `execute_cel_credit_sandbox_action`: "A execução no sandbox Celcoin está desativada" (permissão aparece concedida). Primeiro erro: "A URL deve apontar para /banking/originator ou /banking/funding" (chute de URL meu) | não. A IA descobriu e avisou; NÃO simulou sucesso e NÃO fez chamada direta à API (exigiria credenciais e autorização). CPF de teste: a doc diz que é preciso pedir ao time de Implantação |
| P6 | parcial | 2026-11-11 | (sem hora) | nenhuma | screenshots do navegador travaram (timeout CDP) em 2 telas; validei pelo título da página | não. "Sem margem" e "Recusada" funcionam por parâmetro de cenário simulado (`?margem=sem`, `identidade=recusada`), NÃO são estados reais da Celcoin. "Dinheiro não chegou": sem tela própria, só o status "Falha no pagamento" em dados de exemplo |
| P7 | parcial | 2026-11-11 | (sem hora) | nenhuma | nenhum | não inventou regra; a doc oficial não cobre demissão, troca de emprego ou novo empréstimo (3 buscas). O app não trata nenhum dos três além da tela "Sem margem" |
| P8 | não executado (aguarda confirmação) | 2026-11-11 | | nenhuma | nenhum | não; `qa_list_projects` retorna lista vazia; criar projeto exige confirmação do usuário |
| P9 | ok (sem o que responder) | 2026-11-11 | (sem hora) | nenhuma | `get_notifications`: "Permission required: get_notifications" | não; 0 comentários no board e no workspace; nada foi enviado. Falta criar o comentário de teste (pré-requisito do roteiro) |
| P10 | ok | 2026-11-11 | | nenhuma | nenhum | não |

## Eventos

| Hora | Prompt | Tipo | Sev. | O que aconteceu | Resultado esperado por um leigo | Evidência (print/trecho mascarado) |
|------|--------|------|------|-----------------|---------------------------------|------------------------------------|
| ~16:45 | P1 | MCP | M | `qa_get_product_catalog` devolve ~834 mil caracteres e estoura o limite de resposta | Lista curta de produtos | Arquivo salvo localmente; 14 produtos |
| ~16:45 | P1 | Permissão | A | `permissions` mostra `get_notifications` com granted:false (notificações não liberadas) e as ferramentas admin de QA também | Saber de antemão o que não vai funcionar | resposta de `permissions` |
| ~16:45 | P1 | Docs | M | A doc "Consignado Crédito Trabalhador" é de 2026-03-01 e só descreve visão geral, glossário e massa de teste; a massa sem leilão exige pedir CPFs de teste ao time de Implantação | Dados de teste prontos | doc_80ae51bcb7f8d29791a1 |

| 2026-11-11 | P3 | MCP | A | Cada `studio_get_board_concept_html` devolve 130-160 mil caracteres e estoura o limite; 9 chamadas em paralelo geraram 9 arquivos temporários | HTML utilizável sem passar por arquivo | arquivos em tool-results |
| 2026-11-11 | P3 | Design | A | O HTML do Studio é "tela isolada": `go()` não navega, estado só em memória, dados fictícios embutidos; para virar app foi preciso ligar navegação e guardar estado em sessionStorage (`build.py`) | Telas já prontas para virar app | screens/_runtime.js |
| 2026-11-11 | P3 | Docs | M | Comentários no HTML indicam os endpoints reais (ex.: `POST /banking/originator/guarantee/authorization-file-permission-async`, `GET .../get-balance`, `POST /products/{id}/preview`), útil para o P5 | | screens/00.html, 04.html |
| 2026-11-11 | P3 | IA | A | Telas opcionais (Consultando a margem, Sem margem, Proposta recusada) NÃO foram baixadas nem incluídas ainda; precisam entrar no P6 | | |

## Travas encontradas (consolidado, 2026-11-11)

Escopo do teste daqui para frente: apenas o que o MCP `cel_agents` disponibiliza. Massa de CPFs e webhook externo fornecidos pelo usuário foram descartados (não serão usados).

| # | Trava | Tipo | Sev. | Evidência | Situação |
|---|-------|------|------|-----------|----------|
| T1 | `execute_cel_credit_sandbox_action` retorna "A execução no sandbox Celcoin está desativada" em originator e funding, mesmo com `cel_credit_sandbox_execute` concedida e mesmo informando o ID do produto (9e20b98f-239e-40c1-a293-b93bfaec7b80). Falha antes de chegar à Celcoin; `execute_celcoin_sandbox_action` (sandbox geral) chega e responde | MCP/Permissão | B | 5 chamadas GET, mesma resposta | aberta; usuário afirma que o produto está ativo e a CCB gera normalmente fora do MCP (não verificado por mim) |
| T2 | Erro de URL do proxy: "A URL deve apontar para /banking/originator ou /banking/funding" quando a URL não segue o padrão | MCP | M | 1ª chamada | contornada |
| T3 | `get_notifications` / `mark_notifications_read`: "Permission required: get_notifications" | Permissão | A | permissions + chamada | aberta |
| T4 | Ferramentas admin de QA (`qa_list_catalog_products`, `qa_get_catalog_product`, `qa_create_*`, `qa_*template*` etc.) com granted:false | Permissão | M | permissions | esperado para perfil não admin |
| T5 | `qa_get_product_catalog` e `studio_get_board_concept_html` devolvem 130-830 mil caracteres e estouram o limite de resposta | MCP | A | arquivos salvos em tool-results | contornada lendo o arquivo |
| T6 | Doc "Consignado Crédito Trabalhador" é só visão geral (2026-03-01); sem referência de endpoints de margem/get-balance/status nem massa pública (massa exige pedir à Implantação). Nada sobre demissão, troca de emprego, novo empréstimo | Docs | A | 6 buscas | aberta |
| T7 | Telas do Studio são "isoladas" (navegação desligada, dados fictícios embutidos); app só navega com adaptação própria e todos os dados são de exemplo | Design | A | screens/_runtime.js | aberta |
| T8 | Validação de identidade/assinatura (Única) só simulada: sem link de assinatura nem captura de foto, dependem de emitir a CCB (T1) | Design/MCP | B | identidade.html, validando.html | aberta (depende de T1) |
| T9 | Sem tela própria para "dinheiro não chegou"; recusa e sem margem só por cenário simulado (`?margem=sem`, `?identidade=recusada`) | Design | A | runtime | aberta |
| T10 | Nenhum comentário no Studio (pré-requisito do P9 não cumprido) e nenhum projeto de QA existente | Dados | M | studio_get_newest_comments, qa_list_projects vazios | aberta |
| T11 | Sessão não limpa (contexto, skills e memória carregados), contrariando a regra 1 do roteiro | Processo | M | | registrada |
| T12 | Usuário reportou erro na etapa Dados bancários → Validação de identidade; não reproduzido. Causa provável: dado informado inválido (ex.: chave Pix/CPF) ou estado perdido entre telas | UI | A | relato do usuário | não confirmada |

### Teste de estresse (2026-11-11, ~17:40-18:00)

| # | Trava / achado | Tipo | Sev. | Evidência | Situação |
|---|----------------|------|------|-----------|----------|
| T13 | T1 reconfirmado: 9 chamadas de crédito (GET e POST, hosts credit.celcoin e flowfinance, originator e funding, produto 9e20b98f) → "execução desativada". Sandbox geral (`execute_celcoin_sandbox_action`) responde 200 (`/v5/merchant/balance`). Trava é só do proxy de crédito | MCP | B | chamadas 17:40-17:58 | aberta |
| T14 | QA do produto `cel-credit-worker-credit`: 17 de 17 itens exigem evidência `sandbox_call` (2 também `webhook_delivery`). Com T13, homologação é impossível | QA/MCP | B | catálogo (834 mil chars) | aberta |
| T15 | `get_celcoin_sandbox_credentials` devolve Client Secret em texto puro para a conversa do agente. Recomendado rotacionar o segredo do sandbox 1964 e mascarar na resposta | Segurança | A | resposta da ferramenta (valor não reproduzido aqui) | aberta |
| T16 | Busca da doc: sem referência da API de crédito (applications, preview, get-balance); página irmã "Solicitações" não é encontrada; `docsUrl` do catálogo QA (`modalidade-sem-leilao`) não está no índice; filtro `kind=reference` volta vazio porque páginas /reference/ vêm classificadas como `guide`; páginas duplicadas ("Pix Automático" copy-1, copy-copy) | Docs | A | 12 buscas | aberta |
| T17 | Respostas sem paginação: HTML de tela 128-160 mil chars, catálogo QA 834 mil, `/v5/transactions/institutions` 487 mil | MCP | A | arquivos em tool-results | aberta |
| T18 | Erros sempre com `code: null` e `upstreamRequestId: null`: sem código de máquina nem ID para rastrear com o suporte | MCP | M | todas as respostas de erro | aberta |
| T19 | QA: `qa_claim_project` em projeto não provisório responde 403 "Esta reserva não pertence ao agente solicitante" (enganoso); `qa_start_run` após descoberta vazia responde "A execução só começa depois da descoberta" (enganoso); projeto criado com `termsAccepted:false` não bloqueia a rodada; não há ferramenta para arquivar/excluir projeto de QA (projeto de teste 872bdf0c ficou) | QA | M | chamadas 17:51-17:53 | aberta |
| T20 | Doc do cel_agents MCP promete "Publica previews da implementação no Workspace": nenhuma ferramenta faz isso | Docs | M | doc_a898e462156a023869b7 | aberta |
| T21 | Escrita no Studio (upload de imagem, replace) e leitura de credenciais de crédito NÃO testadas: bloqueadas pelo classificador do Claude Code (proteção local, não Celcoin) | Processo | M | negação local | não testado |
| T22 | App: acesso direto ou estado perdido volta silenciosamente para a 1ª tela, sem mensagem (provável origem do "erro" relatado em T12); estado só na aba (nova aba perde o fluxo) | UI | A | teste com iframes | aberta |
| T23 | App: agência aceita "0", conta aceita "1" sem dígito; valor negativo na simulação vira positivo sem aviso; simulação é fórmula local (não `/preview`); CEP só de tabela local; "Proposta recebida/recusada" abrem sem nenhuma proposta | UI | M | teste com iframes | aberta |

Funcionou bem no estresse: validações de entrada do MCP (UUID inválido, limit>100, cursor inválido), 404 claros em PT-BR, bloqueio de ferramentas admin, allowlist de host nos dois proxies, 8 chamadas simultâneas sem erro, fluxo de descoberta do QA, validações de CPF/e-mail/celular/UUID/nome no app.

## O que funcionou bem

- P3: app estático em `app/` (13 telas, `python -m http.server`), fluxo autorização → ofertas → simulação verificado no navegador, sem erros de console; visual (Inter, roxo #7664FA) vem do próprio HTML do Studio.

- P2: projeto "Douglas Credito trabalhador" (board "Crédito do Trabalhador Sem Leilão", 16 telas: 13 obrigatórias, 3 opcionais) identificado sem ambiguidade entre 3 projetos.
- Catálogo de QA inclui `cel-credit-worker-credit` (Crédito do Trabalhador sem leilão), diferente do Crédito Pessoal.

-

## Hipóteses (H1 a H8): confirmada / derrubada / inconclusiva

| # | Veredito | Evidência |
|---|----------|-----------|
| H1 | parcial | Produto está no catálogo de QA, mas a doc é só visão geral (2026-03-01); busca por margem/get-balance/status não achou páginas de referência |
| H2 | confirmada | `permissions` mostra `cel_credit_sandbox_execute` concedida, mas a chamada retorna "execução no sandbox Celcoin está desativada" |
| H3 | confirmada | Diff: HTML/CSS idênticos ao Studio em 9 de 13 telas; nas outras 4 só mudaram links |
| H4 | confirmada (risco) | O app roda e parece real, mas todos os dados são fictícios do próprio HTML do Studio; um leigo não distingue sem aviso |
| H5 | derrubada | Doc diz que os CPFs de teste precisam ser pedidos ao time de Implantação; não há massa documentada para recusa nem falha de desembolso |
| H6 | inconclusiva | Chamada de crédito, projeto de QA e resposta de comentário foram aguardados/não feitos; mas a IA não tinha como testar sem ação externa |
| H7 | inconclusiva | Falta teste com leigo real; a explicação de margem/consentimento veio do glossário da doc |
| H8 | inconclusiva | P8 depende de criar projeto de QA (aguarda confirmação) |
