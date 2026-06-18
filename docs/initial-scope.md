# Agrarium — Escopo inicial (App)

> Documento de trabalho entre nós (dev + agrônomo). Foco do **app**: produto, telas e
> experiência. O domínio/custos/dados está em `../../agrarium-backend/docs/initial-scope.md`.
> _Este é o único lugar em português — o código é todo em inglês. A interface do app também
> é em português, porque o usuário é o produtor brasileiro._

---

## 1. Visão do produto

App onde o **pequeno/médio produtor de cana** insere os dados da sua safra e recebe, de
forma simples, **quanto custa produzir** (por hectare, por tonelada e por kg de ATR), **como
ele se compara ao mercado** e **onde pode melhorar**. Fase 1 é **exploratória**: quanto mais
produtores usando, melhor fica a nossa base de comparação.

**Princípio técnico:** o app é "burro" — só coleta dados e mostra o resultado. Toda a conta
(custo, comparação, score) é feita no backend. Isso mantém o app simples e a regra num lugar só.

**Público:** pequeno e médio produtor, ≤ 2.000 ha. **Marketing:** LinkedIn, landing page, redes.

---

## 2. Fluxo macro

```
1. INPUT            2. CÁLCULO          3. COMPARAÇÃO          4. RECOMENDAÇÃO
   dados da     →    custo R$/t,    →    vs mercado        →    score 0–100
   safra             R$/ha, R$/kg ATR    (região/safra)         + onde melhorar
```

Cada dado que o produtor insere melhora a base de comparação de todos.

---

## 3. Telas e fluxos

### 3.1 Cadastro / login (✅ já feito)
Campos do cadastro: nome · data de nascimento · e-mail · telefone · tamanho da propriedade
(ha) · cidade/estado.

### 3.2 Entrada dos dados da safra (a desenhar)
Métodos previstos:
1. **Formulário em passos (wizard)** — principal, simples, no celular.
2. **Upload de planilha** (.xlsx/.csv) — para quem já controla em planilha.
3. **Voz e texto com IA** — _futuro, não na v0_ (o produtor fala/escreve e a IA estrutura os custos).

O que o formulário coleta (alinhado ao custo **detalhado** — ver doc do backend):
- Safra, área de cana, produção (t) ou produtividade (t/ha), qualidade (ATR kg/t).
- Perfil de contrato (tipo de produtor, modalidade de entrega) — liga/desliga custos de CCT.
- Custos por categoria e fase (formação, tratos, CCT, arrendamento, insumos, operações, mão de obra…).

> ⚠️ **Para alinharmos (UX):** quanto detalhe é "demais" antes do produtor desistir?
> Faz sentido um **modo simplificado** (poucas perguntas → estimativa) e um **modo completo**?

### 3.3 Dashboard
Hoje: só uma tela de **boas-vindas**. Vai virar a lista das safras analisadas + score atual,
com botão para lançar uma nova safra.

### 3.4 Resultado da análise (a desenhar)
- Indicadores: **R$/t, R$/ha e R$/kg ATR** (destaque para o R$/kg ATR).
- **Score 0–100** + receita/margem/ponto de equilíbrio.
- **Decomposição do custo** (gráfico: onde está gastando mais).
- **Comparação com o benchmark** da região/porte.
- **Recomendações** práticas (ex.: "seu transporte está acima da referência", "margem apertada").

### 3.5 Landing page (fora do app)
Página web de marketing/captação (LinkedIn/redes), com CTA para baixar o app. Projeto à parte.

---

## 4. O que existe hoje vs roadmap

**Pronto (v0 atual):**
- Login e cadastro.
- Tela de boas-vindas após entrar.
- Roda em **web, iOS e Android** com um só código.

**Próximo (desenhar juntos):**
- Formulário de lançamento da safra (com base no modelo de custo detalhado).
- Tela de resultado (indicadores, score, recomendações).
- Dashboard com histórico de safras.

**Futuro:**
- Input por voz/texto com IA.
- DRE, fluxo de caixa, balanço, orçamento (ferramentas de gestão mais completas).
- App publicado nas lojas (App Store / Play Store).

---

## 5. Linguagem e tom

- Interface **em português**, linguagem de produtor — evitar jargão financeiro pesado.
- Mensagem de marketing candidata: _"Quem não mede, aposta"_ / _"Descubra seu custo por kg de ATR"_.

> ⚠️ **Para alinharmos:** qual a dor nº 1 do produtor — saber se está no lucro, comparar com
> vizinhos, ou planejar a próxima safra? E o que faria ele **confiar** no número do app
> (transparência do cálculo, fonte do benchmark)?

---

## 6. Métricas de sucesso da fase 1

- Nº de produtores cadastrados e de safras com dados completos (tamanho da base).
- Taxa de conclusão do formulário (anti-abandono).
- Qualidade/consistência dos dados coletados (para validar nosso benchmark).
