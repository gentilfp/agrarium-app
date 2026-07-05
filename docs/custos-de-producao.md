# Agrarium — Modelo de Custo de Produção da Cana

> **Para que serve este documento:** consolidar, num lugar só, **como se calcula o custo
> de produzir cana** — para eu (dev) modelar o backend e o wizard, e para o sócio agrônomo
> validar as premissas. É a "fonte da verdade" do motor de cálculo do app.
>
> **De onde saiu:** da planilha **"Estrutura de cálculo" (PECEGE, Aula 05 — Fluxo)** — que é o
> nosso exemplo de referência ponta a ponta — cruzada com o módulo **"Gestão Econômica da Cana"
> (PECEGE / Academia Corporativa da Cana, Prof. Haroldo Torres)**, de onde vêm a metodologia,
> as fórmulas de ATR/CONSECANA e os benchmarks do setor.
>
> **Como ler junto:** as **perguntas em aberto** para o agrônomo estão em [`questions.md`](./questions.md);
> o **escopo de produto/telas** em [`initial-scope.md`](./initial-scope.md). Este doc é o "motor";
> aqueles dois são o "o quê" e o "para quem".
>
> _Português de propósito: o domínio é intrinsecamente PT-BR (CONSECANA, ATR…) e este doc é
> lido com o agrônomo. O **código** continua em inglês._

---

## 0. Ideia central em uma frase

> A unidade final da cana **não** é a tonelada nem o hectare — é o **açúcar por hectare**.
> Por isso o indicador que manda é o **custo por kg de ATR (R$/kg ATR)**, não o R$/t nem o R$/ha.

O módulo demonstra isso com um exemplo que precisa virar o "porquê" da tela de resultado:

| Parâmetro | Produtor A | Produtor B | Leitura |
|---|---|---|---|
| Produtividade (t/ha) | 78 | 85 | B produz mais cana… |
| Custo (R$/ha) | 6.300 | 7.000 | …e gasta mais por ha |
| Custo (R$/t) | 80,77 | 82,35 | pelo R$/t, **A parece melhor** |
| Qualidade (kg ATR/t) | 128 | 136 | mas B tem cana mais rica |
| **Custo (R$/kg ATR)** | **0,6310** | **0,6055** | **B é o mais eficiente** ✅ |

Olhar só R$/t ou R$/ha **engana**. O app existe para mostrar o R$/kg ATR — e explicar como chegou nele.

---

## 1. O ciclo da cana (por que o custo é plurianual)

A cana é **semiperene**: planta-se uma vez e colhe-se **por vários anos** (ciclo de ~5–7 anos).

- **Cana-planta (corte 1):** primeira colheita, ~12–18 meses após o plantio.
- **Cana-soca (socas):** rebrotas colhidas nos anos seguintes. Cada corte rende **menos** que o anterior.
- **Reforma:** depois de ~5–6 cortes a produtividade cai demais e o canavial é **replantado** (novo custo de formação).

Consequência para o modelo: **o custo de formação é pago uma vez e diluído em todos os cortes.**
Calcular o custo de um único ano isolado superestima (no ano do plantio) ou subestima (nas socas)
o custo real. O correto é raciocinar **sobre o ciclo inteiro** (é o que a planilha faz).

### Curva de produtividade por corte (planilha de referência, 80 ha)

| Safra | 14/15 | 15/16 | 16/17 | 17/18 | 18/19 | 19/20 | 20/21 | **Média** |
|---|---|---|---|---|---|---|---|---|
| **Corte (n)** | 0 | 1 | 2 | 3 | 4 | 5 | 6 | — |
| Produtividade (t/ha) | — | 121,95 | 109,95 | 98,69 | 86,19 | 74,54 | 61,20 | **92,09** |
| ATR (kg/t) | — | 132,96 | 131,93 | 131,70 | 134,61 | 135,25 | 135,10 | **133,33** |

> Corte 0 = ano do plantio (só custo de **formação**, sem colheita). A produtividade cai de forma
> quase linear a cada soca (~10–12 t/ha por corte neste exemplo). A **qualidade (ATR)** varia pouco.
> Ordem de grandeza do setor (módulo): TCH médio Centro-Sul **~75 t/ha**; simulações padrão usam
> **80 t/ha e 5 cortes**; ATR médio nacional **~144 kg/t (20/21)**.

---

## 2. A estrutura de custos (os blocos)

O modelo organiza o custo em **fases agronômicas**. A planilha de referência agrega em **4 blocos**;
o módulo detalha as fases por dentro. É esta estrutura que define os **grupos de campos do wizard**.

| Bloco (planilha) | Fases por dentro (módulo) | Unidade natural | Quando ocorre |
|---|---|---|---|
| **Formação do canavial** | Preparo de solo + Plantio (inclui **mudas**) + Tratos da cana-planta | **R$/ha** | só no corte 0 |
| **Tratos soca** | Tratos culturais das socas (adubação, defensivos, royalties, fertirrigação…) | **R$/ha** | a cada corte 1..n |
| **Colheita / CCT** | Corte + Carregamento/Transbordo + Transporte + Apoio + Administrativo | **R$/t** | a cada corte 1..n |
| **Arrendamento** | Aluguel da terra (ver §5) | **R$/ha** ou **t/ha equiv.** | todo ano |

Dentro de cada fase, o custo é sempre **operação (máquina/mão de obra) + insumos + administrativo**.
Insumos típicos: fertilizantes, corretivos, defensivos, mudas, serviços de plantio/colheita.

> **Decisão de wizard em aberto** (Q1, Q3, Q4 em `questions.md`): começamos só com os **4 blocos agregados**
> ou abrimos insumos × operações × mão de obra? Quanto mais fino, melhor a recomendação — mais fricção no
> preenchimento. Alinhar com o agrônomo onde está o **maior valor de diagnóstico**.

### Blocos que a planilha NÃO tem e podem faltar (validar com o agrônomo)

Transporte externo além do raio contratado, ITR, seguro agrícola, e os custos "econômicos"
(depreciação, custo de oportunidade do capital, pró-labore — ver §4). Na v0 provavelmente ficam de fora,
mas precisam estar **listados** para não subestimar o R$/t.

---

## 3. A conta, passo a passo (o que o backend precisa implementar)

### 3.1 Produção

```
Produção (t)        = Área (ha) × Produtividade (t/ha)          [por corte]
ATR total (kg)      = Produção (t) × ATR (kg/t)                 [por corte]
```

Se o produtor não souber a produtividade por ha, pedimos a **produção total (t)** e a área, e derivamos
o TCH (é o número que ele tem na nota/romaneio da usina — ver Q7).

### 3.2 Receita — fórmula CONSECANA (a base do preço da cana)

O produtor é pago **pelo açúcar da cana**, não pela cana em si:

```
Preço da tonelada (R$/t)  =  ATR (kg/t) × Preço do ATR (R$/kg)
Receita (R$)              =  Produção (t) × Preço da tonelada
                          =  ATR total (kg) × Preço do ATR (R$/kg)
```

- **ATR (Açúcar Total Recuperável)** = kg de açúcar recuperável por tonelada de cana, já **descontadas as
  perdas industriais** (hoje **8,5%**). Relação prática: `ATR ≈ 0,915 × ART`.
  Fórmula técnica (laboratório da usina): `ATR = 9,6316 × PC + 9,15 × ARC`, a partir de Pol, Brix, Pureza e Fibra.
  → **No app não recalculamos ATR**; ele é um **input** (o produtor pega da usina) ou um **default regional** (Q6).
- **Preço do ATR (R$/kg)** é definido pela **CONSECANA-SP** a partir dos preços de mercado de **9 produtos**
  (açúcar e etanol, mercado interno e externo), do **mix de produção** e da **participação da matéria-prima (PMP)**
  na receita da usina (**açúcar 59,5% / etanol 62,1%**). O produtor recebe ~**60%** do valor gerado; a usina ~40%.
  → **No app o preço do ATR também é input/parâmetro** (vem da usina/CONSECANA), não algo que calculamos do zero.

> ⚠️ **CONSECANA só rege SP** (e, com variações, PR/MG/GO/AL/PE/PB…). Fora de SP a remuneração muda.
> Decisão de escopo (Q12): **v0 assume lógica CONSECANA-SP** e tratamos outras regiões como configuração futura.

### 3.3 Custo operacional por corte → custo do ciclo

Para cada corte `n`:

```
Custo operacional (R$/ha)_n =
      Formação (R$/ha)         [só se n = 0]
    + Tratos soca (R$/ha)      [se n ≥ 1]
    + Colheita (R$/t) × Produtividade (t/ha)
    + Arrendamento (R$/ha)
```

Somando o ciclo inteiro e as áreas, chega-se aos **três indicadores** (é o que a planilha faz):

```
Custo total (R$)   = Σ custos de todos os cortes × área
Custo (R$/ha)      = Custo total ÷ (área × nº de anos)      → visão "por terra"
Custo (R$/t)       = Custo total ÷ Σ produção (t)           → visão "por cana"
Custo (R$/kg ATR)  = Custo total ÷ Σ ATR (kg)               → ⭐ indicador-chave
Margem (R$/kg ATR) = Preço do ATR − Custo (R$/kg ATR)
```

### 3.4 Amortização da formação

A **formação** entra uma vez (corte 0) mas é **diluída pela produção de todos os cortes**. Não somamos a
formação "no ano 1" — ela vira um **R$/t médio** ao longo do ciclo. Na planilha, os R$ 6.235/ha de formação
viram **R$ 11,28/t** depois de diluídos nos ~44 mil t produzidos no ciclo.

---

## 4. Níveis de custo: COE → COT → CT

O setor mede custo em três "profundidades". Importa porque define **o que perguntamos no wizard**:

| Sigla | O que é | Inclui a mais | O pequeno produtor sabe medir? |
|---|---|---|---|
| **COE** — Custo Operacional Efetivo | só o dinheiro que **saiu do bolso** no ano | insumos, operações, mão de obra, arrendamento | ✅ sim |
| **COT** — Custo Operacional Total | COE **+ depreciação** de máquinas e canavial | vida útil, valor de reposição | ⚠️ raramente |
| **CT** — Custo Total | COT **+ custo de oportunidade do capital + pró-labore** | remuneração do capital investido | ❌ quase nunca |

> **Decisão v0 (Q2):** o app calcula **COE** (o que o produtor consegue informar). Depreciação, custo de
> capital e pró-labore ficam para depois — pedi-los agora derrubaria a conversão do wizard.
> _Referência do módulo:_ no modelo por tonelada, o "sub-total" operacional recebe **depreciação + juros**
> por cima para chegar ao custo total (ex.: agrícola sub-total 36,99 → +depreciação 1,91 +juros 3,25 = 42,15 R$/t).

---

## 5. Arrendamento (dois jeitos de cobrar)

O aluguel da terra é cobrado de **duas formas** — e isso muda a lógica de cálculo:

1. **R$/ha fixo** — uma constante por hectare (faixa do setor: **~R$ 670 a R$ 2.200/ha**).
2. **Cana equivalente (t/ha ou kg ATR/ha)** — o mais comum em contrato de fornecimento/parceria: o dono da
   terra recebe o **equivalente a X t/ha de cana**. Aí o **custo varia com o preço da cana** (não é constante!).

A planilha de referência usa o modo (2): **18 t/ha equivalentes**, a **121,97 kg ATR/t**, remunerados ao preço
do ATR de cada safra — por isso o arrendamento em R$/ha **oscila** ano a ano (R$ 1.045 → R$ 1.708) mesmo com a
área fixa. Regra de bolso do módulo: **cada +1 t/ha negociado no arrendamento ≈ +1 R$/t no custo**.

> **Implicação para o wizard (Q5):** arrendamento precisa de um campo **"modalidade"** (R$/ha fixo **ou**
> t/ha equivalente). Se for cana equivalente, o valor entra no cálculo **atrelado ao preço do ATR**, não como
> número fixo. No setor, ~**25% da produção** costuma ir só para pagar a terra (~15% do custo total).

---

## 6. Exemplo de referência completo (a planilha "Estrutura de cálculo")

Este é o **caso-teste canônico** do motor de cálculo — o backend deve reproduzir estes números.
Cenário: **80 ha, ciclo de 6 cortes**, arrendamento em cana equivalente (18 t/ha a 121,97 kg ATR/t).

**Custos por hectare, por safra (R$/ha, exceto colheita em R$/t):**

| | 14/15 (c0) | 15/16 (c1) | 16/17 (c2) | 17/18 (c3) | 18/19 (c4) | 19/20 (c5) | 20/21 (c6) |
|---|---|---|---|---|---|---|---|
| Formação (R$/ha) | 6.235 | — | — | — | — | — | — |
| Tratos soca (R$/ha) | — | 1.618 | 1.691 | 1.752 | 1.885 | 1.926 | — |
| Colheita (R$/t) | — | 27,58 | 30,16 | 31,28 | 33,21 | 33,45 | 34,00 |
| Arrendamento (R$/ha) | 1.045,70 | 1.218,92 | 1.501,48 | 1.295,54 | 1.279,07 | 1.444,39 | 1.708,73 |
| **Custo operacional (R$/ha)** | **7.280,70** | **6.200,93** | **6.508,30** | **6.135,04** | **6.026,32** | **5.864,09** | **3.789,62** |
| Preço Consecana (R$/kg ATR) | 0,4763 | 0,5552 | 0,6839 | 0,5901 | 0,5826 | 0,6579 | 0,7783 |

**Resultado consolidado do ciclo:**

| Indicador | Valor |
|---|---|
| Custo total (R$) | 3.344.400,12 |
| Custo (R$/t) | **75,66** |
| Custo (R$/ha) | 6.967,50 |
| **Custo (R$/kg ATR)** | **0,5674** ⭐ |

**Decomposição do custo (R$/t)** — é o gráfico "onde você está gastando mais" da tela de resultado:

| Bloco | R$/t | % |
|---|---|---|
| Formação | 11,28 | 15% |
| Tratos soca | 16,06 | 21% |
| Colheita (CCT) | 31,14 | 41% |
| Arrendamento | 17,18 | 23% |
| **Total** | **75,66** | 100% |

> A **colheita (CCT) é o maior bloco** — coerente com o módulo (waterfall do setor: CCT ~28% do custo). É a
> primeira alavanca de recomendação ("seu transporte/raio está acima da referência").

---

## 7. Tipos de produtor e modalidade de entrega (liga/desliga o CCT)

**Quem paga o CCT (Corte, Carregamento e Transporte) muda o custo do produtor em 30–40%.** Depende do contrato:

**Por escopo do serviço** (o que o produtor faz vs. a usina/terceiro):

| Tipo | O produtor faz | Quem faz colheita/transporte |
|---|---|---|
| **Básico** | só tratos culturais | usina/terceiro |
| **Intermediário** | tratos + plantio | usina/terceiro |
| **Integral** | tratos + plantio + corte + transbordo | usina faz transporte |
| **Completo** | tratos + plantio + corte + transbordo + transporte | contrato usina/terceiro |
| **Spot** | tudo, vendendo no **mercado** | — |

**Por ponto de entrega:**

| Modalidade | Produtor paga | Impacto no R$/t reportado |
|---|---|---|
| **Cana em pé** | só preparo/plantio/tratos | CCT **não** entra no bolso do produtor |
| **Cana embarcada** | + corte e carregamento | CCT parcial |
| **Cana na esteira** | + transporte até a usina | CCT **completo** entra |

> **Público-alvo:** ~**92% dos produtores do Centro-Sul são "Pequenos"** (≤ ~160 ha), tipicamente **Básico/Intermediário**
> — ou seja, muitos **não pagam CCT completo**. Perguntar a modalidade no wizard é o que evita comparar peras com maçãs.
> **Aberto (Q10, Q11):** o pequeno produtor sabe se identificar nessa classificação? Como perguntar de forma simples?

---

## 8. Benchmarks do setor (para o "vs. mercado" e o score)

Números do módulo (PECEGE) e das fontes públicas, para calibrar o comparativo. **Validar com o agrônomo** (Q18).

| Métrica | Referência | Safra/fonte |
|---|---|---|
| Custo total | **~111 R$/t** (waterfall) · **~108 R$/t** (índice PMP) | 19/20–20/21, PECEGE |
| Custo "na esteira" | orçado ~123 R$/t · real 101–115 R$/t | módulo |
| Produtividade (TCH) | **~75 t/ha** médio Centro-Sul; simulação-padrão **80 t/ha** | 20/21 |
| Nº de cortes por ciclo | **5** (padrão); intervalo 3–7 | módulo |
| ATR (qualidade) | **~144 kg/t** nacional; ~135 kg/t simulação | 20/21 |
| Preço do ATR | **0,6579 R$/kg** (simulação) · até 0,778 acumulado | 20/21 |
| Formação do canavial | **7.910 R$/ha** (simulação) · 9.634→10.395 (detalhado) | 19/20–20/21 |
| Tratos soca | **1.956 R$/ha** | 20/21 |
| CCT (CTTA) | **~33 R$/t** | 20/21 |
| Arrendamento | 19 t/ha equiv. · faixa 670–2.200 R$/ha | 20/21 |
| PMP (participação do produtor) | açúcar **59,5%** / etanol **62,1%** | CONSECANA |
| Perdas industriais CONSECANA | **8,5%** | desde 2011 |

> **Produtividade de equilíbrio (break-even):** no cenário CONSECANA "seco", a cana só cobre todos os custos a
> partir de **~90 t/ha**; com arrendamento de 18 t/ha, 80 t/ha ainda dá **prejuízo (~R$ 20/t)**. Rentabilidade
> plena só ≥120 t/ha. → esse tipo de leitura ("você está X t/ha abaixo do break-even") é ouro para a recomendação.
>
> **Fonte de benchmark (Q17, Q19):** o relatório completo da "Expedição Custos Cana" (PECEGE) é pago e tem custo
> por região/fase — ideal. Na falta, começamos com os resumos públicos + estes números e **documentamos a limitação**.
> Recorte de comparação (Q15): idealmente **região × faixa de área** (comparar pequeno com pequeno).

---

## 9. Como isso vira o app

### 9.1 Campos do wizard (mínimo viável, alinhado ao COE)

**Identificação da safra**
- Safra (ano) · Área de cana (ha) · Nº de cortes / idade do canavial

**Produção e qualidade**
- Produção total (t) **ou** produtividade (t/ha)
- ATR (kg/t) — input da usina **ou** default regional
- Preço do ATR (R$/kg) — input **ou** default CONSECANA da safra

**Perfil de contrato** (liga/desliga blocos de custo)
- Tipo de produtor (Básico … Spot) · Modalidade de entrega (em pé / embarcada / na esteira)

**Custos (4 blocos, COE)** — modo simples: totais agregados; modo completo: por fase/insumo
- Formação (R$/ha) · Tratos soca (R$/ha) · Colheita/CCT (R$/t) · Arrendamento (modalidade + valor)

> Onde o produtor não souber, **pré-preencher com default regional** e deixar o campo opcional (Q9) — o wizard
> nunca deve travar. Provável necessidade de **modo simplificado (3–5 perguntas → estimativa)** + **modo completo** (Q25, Q26).

### 9.2 Tela de resultado

- **Número grande:** custo em **R$/kg ATR** (+ R$/t e R$/ha como secundários).
- **Margem / break-even:** preço do ATR − custo por kg ATR; produtividade de equilíbrio.
- **Decomposição do custo** (gráfico dos 4 blocos — ver §6).
- **Comparação com benchmark** da região/porte (§8).
- **Recomendações** a partir das alavancas reais: raio/CCT, reforma do canavial, renegociar arrendamento, adubação (Q16).

### 9.3 Score 0–100

Combinar **eficiência de custo (R$/kg ATR)**, **produtividade (TCH)** e **margem**. Pesos a definir com o agrônomo
(Q13, Q14) — cuidado para não elogiar produtividade alta ignorando margem negativa.

---

## 10. Fronteiras do modelo v0 (decisões a fechar com o agrônomo)

| # | Decisão | Direção provável | Pergunta |
|---|---|---|---|
| 1 | Nível de custo | **COE** (só desembolso) | Q2 |
| 2 | Granularidade | 4 blocos agregados na v0 | Q1, Q3, Q4 |
| 3 | Região | **CONSECANA-SP** primeiro | Q12 |
| 4 | ATR e preço do ATR | **input/default**, não recalculados | Q6 |
| 5 | Arrendamento | campo "modalidade" (R$/ha ou t/ha equiv.) | Q5 |
| 6 | Indicador principal | **R$/kg ATR** | Q13 |
| 7 | Benchmark | público + PECEGE se disponível; recorte região × porte | Q15, Q17, Q19 |

> **Nada aqui é lei ainda.** Este documento reflete a metodologia PECEGE + a planilha de referência; os números
> e as decisões precisam do aval do agrônomo (`questions.md`). Depois de fechados, viram os **defaults e as
> fórmulas do backend** (lembrando: **frontend burro, cálculo no backend**).

---

## Fontes

- **PECEGE — "Estrutura de cálculo" (Aula 05, aba Fluxo):** planilha de custo por ciclo (exemplo de referência do §6).
- **PECEGE / Academia Corporativa da Cana — Módulo VIII "Gestão Econômica da Cana"** (Prof. Dr. Haroldo J. Torres da Silva):
  metodologia de custo por fase, fórmula do ATR, mecânica da CONSECANA-SP, benchmarks e simulações (safras 18/19–20/21).
- Glossário e perguntas de validação: [`questions.md`](./questions.md). Escopo de produto: [`initial-scope.md`](./initial-scope.md).
