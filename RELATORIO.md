# Relatório · Desafio de Back-end · Folhagem & Cia

**Aspirante:** Rafael Vitor Santos Cavalcanti · **Branch:** `desafio/rafael-vitor`

## 1. O que foi feito

**Rotas obrigatórias (todas implementadas):**

| # | Rota | Sucesso |
|---|------|---------|
| 1 | `POST /plantas` | 201 |
| 2 | `GET /plantas` (filtros `?luminosidade=` e `?petFriendly=`, sozinhos ou juntos) | 200 |
| 3 | `GET /plantas/:id` | 200 |
| 4 | `PATCH /plantas/:id` | 200 |
| 5 | `DELETE /plantas/:id` | 204 |
| 6 | `POST /plantas/:id/venda` | 200 |
| 7 | `GET /plantas/estoque/valor-total` | 200 |

**Regras de negócio:** todos os campos obrigatórios no cadastro; `preco > 0`; `regaACadaDias >= 1`; `estoque >= 0` (zero é aceito); `luminosidade` só com os valores do enum; 400 com mensagem clara para dados inválidos (cadastro, edição, filtros, id e venda); 404 para id inexistente; a venda nunca deixa o estoque negativo.

**Bônus feitos:**
- Busca por nome sem diferenciar maiúsculas: `GET /plantas?nome=costela`
- Ordenação: `GET /plantas?ordem=preco` ou `?ordem=nome` (qualquer outro valor é 400)
- `GET /plantas/esgotadas` (plantas com estoque 0)
- Script de seed com 5 plantas de exemplo: `yarn seed`
- Venda protegida contra duas compras simultâneas do último vaso (explicado abaixo)

Nada do enunciado ficou de fora.

## 2. Como foi feito

Segui a ordem do enunciado, com um commit por passo: model e migration → repository → controller → rotas → seed.

- **Camadas:** mantive a mesma organização do CRUD de usuário. As rotas só ligam URL ao handler, o controller lê, valida e decide o status, e só o `PlantaRepository` fala com o Prisma.
- **Validação em uma função só:** criei `validarCampos`, que valida apenas os campos que vieram (`!== undefined`). No `POST`, antes confiro se nenhum campo está faltando e depois chamo a mesma função. No `PATCH`, chamo direto, então os campos enviados passam pelas mesmas regras e os que não vieram não mudam. Assim não duplico regra.
- **Nada de `!campo`:** uso `=== undefined` para saber se o campo veio, `Number.isInteger` para inteiros (recusa `"8990"`, `89.9` e `NaN`), `typeof === "boolean"` para `petFriendly`, texto com `trim() !== ""` e `Object.values(Luminosidade)` para o enum. Com isso, `estoque: 0` e `petFriendly: false` são aceitos.
- **Sem `req.body` direto no banco:** desestruturo só os campos da planta antes de mandar para o repository.
- **id:** converto com `Number(req.params.id)` e aceito só inteiro positivo; `abc` dá 400 e um id válido inexistente dá 404. No `PATCH` e no `DELETE`, busco a planta antes, para responder 404 em vez de deixar o erro do Prisma virar 500.
- **Filtros:** chegam como texto. `petFriendly` só aceita `"true"` ou `"false"` e vira booleano sem transformar "não enviado" em `false`. Um único `findMany` resolve todas as combinações, porque o Prisma ignora condições `undefined`. Filtro válido sem resultado devolve `200` com `[]`.
- **Rotas fixas antes das com parâmetro:** `/plantas/esgotadas` e `/plantas/estoque/valor-total` estão registradas antes de `/plantas/:id`.
- **Valor total:** busco só `preco` e `estoque` com `select` e somo num `for`. Com a loja vazia, volta tudo zerado.
- **Venda simultânea:** além de checar `estoque >= quantidade` (para dar a mensagem "temos só X vasos"), a baixa usa `updateMany` com `where: { id, estoque: { gte: quantidade } }` e `decrement`. A checagem e a baixa acontecem numa única operação no banco. Se duas pessoas comprarem o último vaso ao mesmo tempo, só uma consegue e a outra recebe 400. **Decisão diferente do enunciado:** por causa disso, a venda usa `updateMany` em vez de `update`, e depois busco a planta de novo para devolver o estado atualizado.

## 3. Principais dificuldades

- **Prisma sem motor:** no ambiente em que o código foi gerado e testado, o Prisma não conseguia baixar os binários dele (download bloqueado). Por isso a migration `create_planta_model` foi escrita no mesmo formato que o Prisma gera (igual à do usuário) e conferida aplicando o SQL num PostgreSQL de verdade. O client foi gerado com `prisma generate --no-engine`, só para rodar o `yarn typecheck`.
- **Testes:** pelo mesmo motivo, os testes da parte 4 rodaram com os controllers e as rotas reais, trocando só o repository por uma versão em memória. Todos os casos deram o status esperado, inclusive a conta do valor total, que conferi na mão (`9990×10 + 4590×0 + 1000×5 = 104900`).
- **Armadilhas do enunciado:** a principal foi lembrar que `!0` e `!false` são verdadeiros. Também prestei atenção à ordem das rotas e ao `return` antes de cada `res.status` dentro de `if`.

## 4. Uso de IA

Usei IA (Claude, da Anthropic) para gerar a maior parte do código e deste relatório, a partir do enunciado e do CRUD de usuário do repositório. Conferi o resultado assim:
- `yarn typecheck` sem erros;
- rodei a tabela de testes da parte 4, conferindo status e mensagens;
- li cada handler comparando com o roteiro do enunciado (ler → validar → regras → repository → responder) e com o `UserController`.

O que aprendi: a diferença entre validar presença (`=== undefined`) e conteúdo (tipo e regra), como o Prisma ignora `undefined` no `where` (o que permite uma consulta só para todos os filtros) e como resolver a venda concorrente com uma condição no próprio update, em vez de confiar numa checagem feita antes.

## Como rodar

```bash
cp .env.example .env
yarn
docker compose up -d --build
yarn migration
yarn seed        # opcional: plantas de exemplo
```
