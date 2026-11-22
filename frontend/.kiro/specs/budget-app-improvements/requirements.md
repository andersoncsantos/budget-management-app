# Requirements Document

## Introduction

Este documento descreve os requisitos para melhorar significativamente o aplicativo React de orçamento existente (Orçamento 2026). As melhorias abrangem quatro áreas principais: (1) uma página dedicada para registro de transações de despesas individuais com operações CRUD completas; (2) uma camada de serviço abstraída que desacopla o acesso a dados da UI, preparando a aplicação para integração futura com um backend real; (3) um sistema de temas moderno com suporte a modo claro/escuro; e (4) gráficos aprimorados com novos tipos de visualização, tooltips melhorados e filtros interativos.

O aplicativo usa React 19, TypeScript, Vite, Tailwind CSS v4, Recharts 3, Lucide React e React Router DOM v7. O idioma da interface é o português brasileiro. Não há backend — localStorage ou estado em memória são aceitáveis, desde que a camada de serviço esteja devidamente abstraída.

---

## Glossary

- **App**: O aplicativo React de orçamento como um todo.
- **BudgetService**: A camada de serviço responsável por todas as operações de leitura e escrita de dados orçamentários.
- **ServiceAdapter**: Uma implementação concreta do contrato `BudgetService` (ex.: `LocalStorageAdapter`, `InMemoryAdapter`, `ApiAdapter`).
- **Transação**: Um registro individual de despesa com valor, categoria, mês, data e descrição.
- **Categoria**: Um agrupamento nomeado de despesas (ex.: "Alimentação", "Contas", "Compras").
- **Tema**: O esquema visual da interface — claro (`light`) ou escuro (`dark`).
- **ThemeProvider**: O componente React responsável por gerenciar e distribuir o estado do tema.
- **Router**: O componente React Router DOM v7 que gerencia a navegação entre páginas.
- **Página de Orçamento**: A página principal existente com KPIs, gráficos e tabela de orçamento.
- **Página de Despesas**: A nova página para registrar, editar e excluir transações individuais.
- **KPI**: Indicador-chave de desempenho — os cartões de resumo (total de receitas, total de despesas, saldo líquido).
- **Formulário de Despesa**: O formulário usado para criar ou editar uma transação.
- **Mês**: Um dos doze meses do ano, representado como `'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec'`.

---

## Requirements

### Requirement 1: Navegação entre Páginas

**User Story:** Como usuário, quero navegar entre a visão geral do orçamento e a página de registro de despesas, para que eu possa acessar cada funcionalidade de forma organizada.

#### Acceptance Criteria

1. THE App SHALL renderizar a Página de Orçamento na rota `/`.
2. THE App SHALL renderizar a Página de Despesas na rota `/despesas`.
3. WHEN o usuário clica no link de navegação para "Despesas", THE Router SHALL navegar para `/despesas` sem recarregar a página.
4. WHEN o usuário clica no link de navegação para "Orçamento", THE Router SHALL navegar para `/` sem recarregar a página.
5. THE App SHALL exibir uma barra de navegação persistente em todas as páginas com links para "Orçamento" e "Despesas".
6. IF o usuário navega para uma rota inexistente, THEN THE Router SHALL redirecionar para `/`.
7. WHEN o usuário clica nos botões de voltar ou avançar do navegador, THE Router SHALL navegar para a rota correspondente sem recarregar a página.
8. WHEN o usuário acessa diretamente uma URL válida (`/` ou `/despesas`) no navegador, THE App SHALL renderizar a página correspondente.
9. THE App SHALL aplicar um estilo visual distinto (ex.: sublinhado, cor diferente ou indicador ativo) ao link de navegação correspondente à rota atualmente ativa.

---

### Requirement 2: Registro de Transações de Despesas

**User Story:** Como usuário, quero registrar transações individuais de despesas, para que eu possa acompanhar cada gasto de forma detalhada.

#### Acceptance Criteria

1. THE Página de Despesas SHALL exibir uma lista de todas as transações registradas, ordenadas por data decrescente.
2. WHEN o usuário submete o Formulário de Despesa com dados válidos, THE BudgetService SHALL criar uma nova Transação e adicioná-la à lista.
3. THE Formulário de Despesa SHALL conter os campos: valor (numérico positivo entre R$ 0,01 e R$ 999.999.999,99), categoria (seleção a partir das categorias existentes ou nova categoria), mês (seleção de Mês), data (data completa), e descrição (texto livre opcional com no máximo 255 caracteres).
4. WHEN o usuário submete o Formulário de Despesa com valor igual a zero ou negativo, THE Formulário de Despesa SHALL exibir a mensagem de erro "O valor deve ser maior que zero".
5. WHEN o usuário submete o Formulário de Despesa sem selecionar uma categoria, THE Formulário de Despesa SHALL exibir a mensagem de erro "Selecione ou informe uma categoria".
6. WHEN o usuário submete o Formulário de Despesa sem selecionar um mês, THE Formulário de Despesa SHALL exibir a mensagem de erro "Selecione o mês da despesa".
7. WHEN o usuário submete o Formulário de Despesa sem informar uma data, THE Formulário de Despesa SHALL exibir a mensagem de erro "Informe a data da despesa".
8. WHEN o usuário clica em "Editar" em uma Transação existente, THE Formulário de Despesa SHALL ser preenchido com os dados da Transação selecionada.
9. WHEN o usuário submete o Formulário de Despesa com dados válidos durante uma edição, THE BudgetService SHALL atualizar a Transação existente e recalcular os totais afetados.
10. WHEN o usuário clica em "Cancelar" durante uma edição, THE Formulário de Despesa SHALL ser limpo e retornar ao modo de criação sem salvar alterações.
11. WHEN o usuário clica em "Excluir" em uma Transação, THE Página de Despesas SHALL exibir uma confirmação antes de remover a Transação.
12. WHEN o usuário confirma a exclusão, THE BudgetService SHALL remover a Transação e recalcular os totais afetados.

---

### Requirement 3: Consistência dos Dados Orçamentários

**User Story:** Como usuário, quero que os KPIs e gráficos da Página de Orçamento reflitam automaticamente as transações registradas, para que eu tenha uma visão consolidada e sempre atualizada.

#### Acceptance Criteria

1. WHEN uma Transação é criada ou excluída, THE BudgetService SHALL recalcular o total da Categoria correspondente para o Mês afetado. WHEN uma Transação é editada e o mês ou categoria é alterado, THE BudgetService SHALL recalcular os totais das Categorias e Meses tanto anteriores quanto novos.
2. WHEN uma Transação é criada, editada ou excluída, THE BudgetService SHALL recalcular o total geral de despesas ("Gastos Total") para todos os Meses afetados.
3. WHEN uma Transação é criada ou excluída, THE BudgetService SHALL recalcular o saldo mensal (`balance.monthlyValues`) para o Mês afetado. WHEN uma Transação é editada e o mês é alterado, THE BudgetService SHALL recalcular o saldo mensal para os Meses anterior e novo.
4. THE BudgetService SHALL garantir que o total anual de cada Categoria seja igual à soma dos seus doze valores mensais.
5. THE BudgetService SHALL garantir que o total anual do saldo seja igual à soma dos doze saldos mensais.
6. WHEN uma Transação é criada, editada ou excluída, THE BudgetContext SHALL propagar os dados atualizados para todos os componentes consumidores, fazendo com que KPIs e gráficos sejam re-renderizados com os novos valores.

---

### Requirement 4: Camada de Serviço Abstraída

**User Story:** Como desenvolvedor, quero que o acesso a dados seja abstraído atrás de uma interface de serviço, para que eu possa substituir o armazenamento local por uma API real no futuro sem alterar os componentes React.

#### Acceptance Criteria

1. THE BudgetService SHALL expor uma interface TypeScript com os métodos: `getBudgetData(): BudgetData`, `getTransactions(): Transaction[]`, `addTransaction(t: Omit<Transaction, 'id'>): Transaction`, `updateTransaction(id: string, t: Partial<Omit<Transaction, 'id'>>): Transaction`, `deleteTransaction(id: string): void`, e `updateMetadata(m: Partial<BudgetMetadata>): BudgetMetadata`.
2. THE App SHALL utilizar exclusivamente o BudgetService para leitura e escrita de dados — nenhum componente React SHALL importar `budgetData.ts` diretamente.
3. THE App SHALL incluir um `LocalStorageAdapter` que implementa a interface do BudgetService usando `localStorage` como mecanismo de persistência. IF uma operação de escrita no `localStorage` falhar (ex.: quota excedida), THEN o `LocalStorageAdapter` SHALL lançar um erro descritivo sem corromper o estado em memória.
4. THE App SHALL incluir um `InMemoryAdapter` que implementa a interface do BudgetService usando estado em memória, para uso em testes.
5. WHEN o `LocalStorageAdapter` não encontra dados persistidos ou encontra dados corrompidos/inválidos, THE LocalStorageAdapter SHALL inicializar o armazenamento com os dados de `budgetData.ts` como estado inicial.
6. THE App SHALL permitir a troca do ServiceAdapter ativo por meio da variável de ambiente `VITE_STORAGE_ADAPTER` (valores: `localStorage` | `memory`), sem modificar componentes React.

---

### Requirement 5: Sistema de Temas (Claro/Escuro)

**User Story:** Como usuário, quero alternar entre o tema claro e o tema escuro, para que eu possa usar o aplicativo confortavelmente em diferentes condições de iluminação.

#### Acceptance Criteria

1. THE ThemeProvider SHALL disponibilizar o tema atual (`light` | `dark`) e uma função `toggleTheme` para todos os componentes filhos via React Context.
2. WHEN o usuário clica no botão de alternância de tema, THE ThemeProvider SHALL alternar o tema entre `light` e `dark`.
3. WHEN o tema é `dark`, THE App SHALL aplicar a classe `dark` ao elemento `<html>`, ativando as variantes `dark:` do Tailwind CSS.
4. WHEN o tema é `light`, THE App SHALL remover a classe `dark` do elemento `<html>`.
5. WHEN o App é carregado pela primeira vez e existe uma preferência salva em `localStorage` sob a chave `theme`, THE ThemeProvider SHALL aplicar esse valor como tema inicial, ignorando a preferência do sistema operacional.
6. IF nenhuma preferência está salva em `localStorage`, THEN THE ThemeProvider SHALL verificar a preferência do sistema operacional via `prefers-color-scheme`; IF `prefers-color-scheme` também não estiver disponível ou não estiver definida, THEN THE ThemeProvider SHALL aplicar o tema `light` como padrão.
7. WHEN o tema é alterado, THE ThemeProvider SHALL persistir a nova preferência em `localStorage` sob a chave `theme`.
8. WHEN o tema ativo for `dark`, THE App SHALL exibir um ícone de sol no botão de alternância, indicando que clicar mudará para o tema claro.
9. WHEN o tema ativo for `light`, THE App SHALL exibir um ícone de lua no botão de alternância, indicando que clicar mudará para o tema escuro.

---

### Requirement 6: Gráficos Aprimorados

**User Story:** Como usuário, quero visualizações de dados mais ricas e interativas, para que eu possa entender melhor meu orçamento e identificar tendências.

#### Acceptance Criteria

1. THE AnalyticsSection SHALL exibir um gráfico de linha (`LineChart`) mostrando a evolução do saldo mensal ao longo dos doze meses do ano.
2. THE AnalyticsSection SHALL manter o gráfico de barras existente para comparação mensal de receitas e despesas.
3. THE AnalyticsSection SHALL manter o gráfico de pizza (donut) existente para distribuição de gastos por categoria.
4. WHEN o usuário passa o cursor sobre um ponto do gráfico de linha, THE AnalyticsSection SHALL exibir um tooltip com o mês e o valor do saldo formatado em BRL.
5. WHEN o usuário passa o cursor sobre uma barra do gráfico de barras, THE AnalyticsSection SHALL exibir um tooltip com o mês, o valor de receitas e o valor de despesas, todos formatados em BRL.
6. WHEN o usuário passa o cursor sobre uma fatia do gráfico de pizza, THE AnalyticsSection SHALL exibir um tooltip com o nome da categoria, o valor absoluto em BRL e o percentual calculado sobre o total das categorias atualmente visíveis no gráfico (não sobre o total global de despesas).
7. THE AnalyticsSection SHALL exibir um filtro de categoria com todas as categorias selecionadas por padrão ao carregar a página.
8. WHEN o usuário seleciona ou deseleciona uma categoria no filtro, THE AnalyticsSection SHALL atualizar o gráfico de pizza na próxima renderização do componente para refletir apenas as categorias selecionadas.
9. WHERE o tema ativo for `dark`, THE AnalyticsSection SHALL renderizar os eixos, linhas de grade, texto de legendas e fundo dos tooltips com cores que garantam contraste mínimo de 4.5:1 contra o fundo escuro do painel.

---

### Requirement 7: Persistência e Recuperação de Dados

**User Story:** Como usuário, quero que meus dados e preferências sejam preservados entre sessões do navegador, para que eu não perca informações ao fechar e reabrir o aplicativo.

#### Acceptance Criteria

1. WHEN o usuário adiciona, edita ou exclui uma Transação, THE LocalStorageAdapter SHALL persistir o estado completo de `BudgetData` (incluindo transações, entradas orçamentárias e metadados) em `localStorage` antes de retornar o resultado.
2. WHEN o App é recarregado, THE LocalStorageAdapter SHALL restaurar todas as Transações e dados orçamentários do estado salvo em `localStorage`.
3. THE LocalStorageAdapter SHALL serializar e desserializar os dados usando JSON, preservando valores numéricos e strings sem alteração de tipo ou valor.
4. THE LocalStorageAdapter SHALL garantir que, para qualquer objeto `BudgetData` válido, o resultado de `JSON.parse(JSON.stringify(data))` seja estruturalmente equivalente ao objeto original (mesmas chaves e valores numéricos/string idênticos).
5. IF os dados em `localStorage` não puderem ser parseados como JSON válido, OU se o objeto resultante não contiver os campos obrigatórios `metadata`, `income`, `expenses` e `balance`, THEN THE LocalStorageAdapter SHALL descartar os dados inválidos, emitir `console.warn` com uma mensagem descritiva exclusivamente nessa situação, e inicializar com os dados padrão de `budgetData.ts`.
6. IF uma operação de escrita no `localStorage` lançar um erro de quota excedida (`QuotaExceededError`), THEN THE LocalStorageAdapter SHALL propagar o erro para o chamador sem alterar o estado em memória nem corromper os dados previamente persistidos.
