# Agrarium — Perguntas para o agrônomo

> **Objetivo desta reunião:** eu (dev, pouco conhecimento de campo) preciso alinhar
> as premissas do modelo de custo/benchmark com o sócio agrônomo antes de
> modelar o backend e o wizard do app.
>
> **Como usar este documento:** cada pergunta vem com um bloco de **Contexto**
> (de onde ela saiu / por que estou perguntando) e **Por que importa**
> (que decisão de produto/código ela destrava). O campo **Resposta** é para
> preenchermos juntos durante a conversa.

---

## Glossário rápido (só para nós dois falarmos a mesma língua)

| Sigla / termo | Significado | O que representa na prática |
|---|---|---|
| **ATR** | Açúcar Total Recuperável | Quantos kg de açúcar dá para extrair de 1 tonelada de cana. É a base do preço pago pela usina (kg de ATR × preço do kg de ATR). Medido em **kg de ATR / t de cana**. |
| **TCH** | Toneladas de Cana por Hectare | Produtividade do canavial. Um TCH de 78 significa 78 toneladas colhidas em 1 hectare. |
| **CONSECANA** | Conselho dos Produtores de Cana, Açúcar e Álcool (SP) | Órgão que define a fórmula oficial de pagamento da cana em SP, baseada em ATR. Fora de SP, cada estado tem seu arranjo. |
| **PECEGE** | Programa de Educação Continuada em Economia e Gestão (ESALQ/USP) | Publica a "Expedição Custos Cana", principal referência de custo do setor. Relatório completo é pago. |
| **CNA** | Confederação da Agricultura e Pecuária do Brasil | Publica resumos e painéis de custo agrícola públicos. |
| **CCT** | Corte, Carregamento e Transporte | O bloco "colheita" — leva a cana do campo até a usina. Costuma ser cobrado em **R$/tonelada**. |
| **COE** | Custo Operacional Efetivo | Só o dinheiro que **saiu do bolso** no ano-safra (insumos, mão de obra, operações, arrendamento). É o que o pequeno produtor consegue medir. |
| **COT** | Custo Operacional Total | COE **+ depreciação** de máquinas e canavial. Já entra em contabilidade "de verdade". |
| **CT** | Custo Total | COT **+ custo de oportunidade do capital** e pró-labore. É o custo econômico completo. |
| **Formação** | Custo do canavial de 1º corte | Inclui preparo do solo, plantio e tratos até a 1ª colheita. É diluído nos 5–6 cortes seguintes. |
| **Soca** | Rebrota da cana após o corte | Cada canavial dá ~5–6 socas antes de precisar ser reformado. Custo por soca é bem menor que o de formação. |
| **Arrendamento** | Aluguel da terra | Cobrado em R$/ha **ou** em equivalente de kg de ATR/ha (cana equivalente). |

---

## A. Validação do modelo de custos

### 1. A estrutura de custos em 4 blocos (Formação R$/ha · Tratos soca R$/ha · Colheita/CCT R$/t · Arrendamento) cobre o que o pequeno produtor realmente controla? Falta algo?

- **Contexto:** essa divisão em 4 blocos veio da "Estrutura de cálculo" da PECEGE
  que peguei como base. É como o setor grande organiza custo.
- **Por que importa:** define os **grupos de campos** do wizard de entrada.
  Se faltar um bloco (ex.: transporte externo, ITR, seguro), o cálculo de
  R$/t vai sair subestimado e o benchmark fica injusto.
- **Resposta:** _______________________________________________________

### 2. Na v0 focamos em COE (custo desembolsado). Concorda em deixar depreciação, custo de oportunidade do capital e pró-labore (COT/CT) para depois?

- **Contexto:** COE = só o que saiu do bolso; COT/CT incluem depreciação de
  trator, canavial etc. Pequeno produtor raramente sabe depreciar.
- **Por que importa:** se entrarmos em COT/CT no v0, precisamos pedir vida
  útil de máquinas, valor de reposição etc. — provavelmente derruba a
  conversão do wizard.
- **Resposta:** _______________________________________________________

### 3. O produtor pequeno costuma saber separar custo por fase (preparo / plantio / tratos / colheita), ou pensa só em "gastei X no ano"?

- **Contexto:** a metodologia PECEGE separa por fase agronômica.
- **Por que importa:** muda o nível de detalhe do wizard. Se ele só sabe
  o total anual, a gente pede o total e **rateia por defaults regionais**.
  Se ele sabe por fase, pedimos por fase e o diagnóstico fica mais fino.
- **Resposta:** _______________________________________________________

### 4. Insumos vs operações vs mão de obra: vale abrir esse detalhe no wizard, ou começamos só com os 4 blocos agregados? Onde está o maior valor para o diagnóstico?

- **Contexto:** dentro de "Tratos soca", por exemplo, tem adubo (insumo),
  aplicação (operação) e o tratorista (mão de obra). Abrir isso triplica
  o número de campos.
- **Por que importa:** quanto mais fino, mais recomendação a gente
  consegue dar ("seu gasto com adubo está X% acima do benchmark"). Mas
  também mais fricção. Preciso da sua leitura de onde está o **maior valor
  agronômico**.
- **Resposta:** _______________________________________________________

### 5. Arrendamento: é mais comum cobrar em R$/ha ou em kg de ATR/ha (cana equivalente/ha)? Devo pedir os dois?

- **Contexto:** vi as duas modalidades em contratos.
- **Por que importa:** se for kg de ATR, o custo de arrendamento **varia
  com o preço da cana** — muda a lógica de cálculo (não é uma constante
  em R$/ha). Precisa virar um campo do tipo "modalidade" no formulário.
- **Resposta:** _______________________________________________________

---

## B. Dados que o produtor realmente tem

### 6. O produtor típico sabe o ATR da própria cana, ou só a usina informa? Se não souber, ok usarmos um valor de referência da região?

- **Contexto:** o ATR sai do laboratório da usina no momento da entrega.
  Pequeno produtor pode não guardar essa informação.
- **Por que importa:** ATR é o **numerador do indicador R$/kg ATR**, que
  é a métrica-chave do app. Se ele não souber, precisamos de um default
  regional razoável ou o número vai sair errado.
- **Resposta:** _______________________________________________________

### 7. Ele costuma saber a produtividade (TCH) com precisão, ou estima? Pedimos produção total (t) e calculamos, ou pedimos t/ha direto?

- **Contexto:** TCH pode vir do romaneio da usina (t entregues ÷ ha
  colhidos) ou de estimativa do próprio produtor.
- **Por que importa:** decide se o wizard pede "quanto você produziu no
  total?" ou "quanto por hectare?". Para o pequeno produtor, "total" costuma
  ser mais fácil (é o número da nota).
- **Resposta:** _______________________________________________________

### 8. Qual a unidade que ele entende melhor no dia a dia: R$/ha, R$/t ou sacas? (a Bússola do Agronegócio fala em "sacas por hectare" — vale usar essa linguagem na UI?)

- **Contexto:** vi que outras culturas (soja, milho) usam "saca"; em cana
  é menos comum, mas alguns produtores pensam nessa unidade.
- **Por que importa:** afeta a **linguagem da UI** e como apresentamos o
  resultado. Errar aqui faz o app parecer "de fora".
- **Resposta:** _______________________________________________________

### 9. Que dados ele provavelmente NÃO terá e vamos precisar estimar / sugerir default?

- **Contexto:** preciso montar uma tabela de "defaults por região" para
  o wizard não travar quando o produtor não souber responder.
- **Por que importa:** define quais campos são **obrigatórios vs
  opcionais** e onde pré-preencho sugestões. Sem isso, o wizard vai
  parar no meio.
- **Resposta:** _______________________________________________________

---

## C. Tipos de produtor e contrato

### 10. A classificação Básico / Intermediário / Integral / Completo / Spot faz sentido para segmentar o nosso público? O pequeno produtor sabe em qual se encaixa?

- **Contexto:** essa classificação (nível de serviço embutido no contrato
  com a usina) apareceu em referências do setor.
- **Por que importa:** pode virar uma pergunta do wizard que muda o
  cálculo (o "Completo" já inclui CCT no preço, o "Spot" não). Mas se o
  produtor não sabe se identificar, é uma pergunta ruim.
- **Resposta:** _______________________________________________________

### 11. Modalidade de entrega (cana em pé / embarcada / na esteira): o produtor sabe responder isso facilmente? Como perguntar de forma simples?

- **Contexto:** define **quem paga o CCT** (Corte, Carregamento e Transporte).
- **Por que importa:** se for "em pé", o custo de CCT nem entra no bolso do
  produtor; se for "na esteira", entra tudo. Isso muda o R$/t reportado
  em uns 30–40%.
- **Resposta:** _______________________________________________________

### 12. Fora de SP (sem CONSECANA), como o produtor é remunerado? Precisamos tratar esses estados de forma diferente?

- **Contexto:** CONSECANA rege apenas São Paulo. Outros estados têm
  fórmulas próprias (PR, MG, GO, AL, PE etc.).
- **Por que importa:** se o modelo do app assume ATR × preço CONSECANA,
  ele **não funciona** para um produtor de Alagoas. Precisa virar
  configuração por região ou entramos só em SP no v0.
- **Resposta:** _______________________________________________________

---

## D. Benchmark e score

### 13. Qual o indicador que mais importa para o produtor decidir: R$/kg ATR, R$/t, margem ou break-even? Por onde começamos o "score"?

- **Contexto:** temos várias métricas possíveis; a Bússola destaca R$/kg
  ATR mas não sei se é isso que o produtor **realmente olha**.
- **Por que importa:** o "número grande" da tela de resultado precisa
  ser o que ele já usa mentalmente, senão o app parece abstrato.
- **Resposta:** _______________________________________________________

### 14. Como ponderar o score 0–100? (eficiência de custo vs produtividade vs margem) — quais pesos fazem sentido agronomicamente?

- **Contexto:** vou implementar um score único (tipo "nota Enem" do
  canavial). Preciso definir os pesos.
- **Por que importa:** score mal ponderado gera recomendações erradas
  (ex.: elogiar produtividade alta ignorando margem negativa).
- **Resposta:** _______________________________________________________

### 15. O benchmark deve ser por região, por porte, ou os dois? Qual recorte é mais justo para comparar um pequeno produtor?

- **Contexto:** comparar um produtor de 50 ha em Sertãozinho com a média
  nacional é injusto.
- **Por que importa:** define como **fatiar a base de benchmark**
  (região × faixa de área). Se a base for pequena, talvez a gente só
  consiga fatiar por uma dimensão.
- **Resposta:** _______________________________________________________

### 16. Quais recomendações práticas o produtor valoriza? (ex.: "reduza raio de transporte", "reforme o canavial", "renegocie arrendamento") — preciso de uma lista das alavancas reais.

- **Contexto:** o app vai gerar recomendações automáticas a partir do
  diagnóstico. Preciso de um catálogo curado por você.
- **Por que importa:** recomendação genérica ("melhore a produtividade")
  não move a agulha. Preciso das **alavancas concretas** que um pequeno
  produtor efetivamente consegue puxar.
- **Resposta:** _______________________________________________________

---

## E. Dados de mercado / fontes

### 17. PECEGE: você tem acesso ao relatório completo da "Expedição Custos Cana" (é pago)? Ou usamos só os resumos públicos da CNA como referência inicial?

- **Contexto:** o relatório completo tem custo detalhado por região e por
  fase — é a base de benchmark mais rica do setor.
- **Por que importa:** se temos o completo, o benchmark do app fica
  MUITO mais forte. Se não, começamos com os números públicos e
  documentamos a limitação.
- **Resposta:** _______________________________________________________

### 18. Os benchmarks que levantei (custo R$159–175/t, TCH ~75–78, ATR ~135–145 kg/t, preço ATR ~R$1,12–1,19/kg) batem com a sua realidade de campo? O que ajustar?

- **Contexto:** são números que compilei de fontes públicas 2024/25.
- **Por que importa:** se estiverem desatualizados ou fora da realidade
  do pequeno produtor, o app vai dar diagnóstico enviesado desde o
  primeiro uso.
- **Resposta:** _______________________________________________________

### 19. Vale buscar números regionais (cada estado/região tem custo bem diferente)?

- **Contexto:** custo em SP ≠ custo em AL ≠ custo em GO.
- **Por que importa:** decide se investimos tempo em coletar/curar
  benchmarks regionais agora ou começamos com uma média nacional e
  refinamos depois.
- **Resposta:** _______________________________________________________

### 20. Tem alguma planilha/base sua (ou de clientes) que possamos usar para validar o cálculo além da "Estrutura de cálculo" que já temos?

- **Contexto:** validar contra dados reais antes de lançar evita
  "número bonito, número errado".
- **Por que importa:** conseguimos calibrar defaults, testar
  edge cases e ganhar confiança no motor de cálculo antes do piloto.
- **Resposta:** _______________________________________________________

---

## F. Produto e go-to-market

### 21. Quem é o primeiro produtor que conseguimos colocar usando (piloto)? Dá pra sentar junto e ver ele preencher o wizard?

- **Contexto:** teste com usuário real é o filtro mais barato contra
  suposições erradas.
- **Por que importa:** define o **piloto** — se em 2 semanas conseguimos
  esse encontro, a gente inverte a prioridade e otimiza o wizard antes
  de qualquer outra coisa.
- **Resposta:** _______________________________________________________

### 22. Qual a dor nº 1 que ele quer resolver — saber se está no lucro, comparar com vizinhos, ou planejar a próxima safra?

- **Contexto:** são três "jobs to be done" bem diferentes.
- **Por que importa:** cada dor pede uma tela de resultado diferente
  (indicador de lucro, gráfico comparativo, projeção de safra). Não
  dá pra atacar as três no v0.
- **Resposta:** _______________________________________________________

### 23. O que faria ele confiar no número que o app mostra? (transparência do cálculo, fonte do benchmark, etc.)

- **Contexto:** produtor tende a desconfiar de "caixa preta digital".
- **Por que importa:** define se precisamos de uma tela "como
  calculamos" com fórmulas expostas, fontes citadas, etc. Isso é
  trabalho de UX real que precisa entrar no v0.
- **Resposta:** _______________________________________________________

### 24. Para o marketing (LinkedIn/landing): qual mensagem ressoa? "Quem não mede, aposta"? "Descubra seu custo por kg de ATR"?

- **Contexto:** copy da landing e do LinkedIn precisa falar a língua do
  produtor.
- **Por que importa:** primeira impressão. Se a mensagem parece "coisa de
  consultor", perdemos o produtor logo no primeiro clique.
- **Resposta:** _______________________________________________________

---

## G. Decisões em aberto (técnicas, mas precisam do seu input)

### 25. Quanto detalhe é "demais" no wizard antes do produtor desistir? (mínimo viável de campos que ainda gera um diagnóstico útil)

- **Contexto:** wizards longos matam conversão. Wizards curtos geram
  diagnóstico raso.
- **Por que importa:** preciso saber onde é o **ponto ótimo** —
  quantos campos você acha que ele topa preencher em uma sentada?
- **Resposta:** _______________________________________________________

### 26. Faz sentido um modo simplificado (3 perguntas → estimativa) e um modo completo?

- **Contexto:** padrão comum em apps de finanças pessoais / seguros.
- **Por que importa:** se sim, o wizard vira 2 fluxos e o modelo de
  dados precisa suportar "análise rápida" e "análise detalhada"
  como entidades diferentes desde o início.
- **Resposta:** _______________________________________________________

---

## Respostas / decisões consolidadas

> _(preencher aqui as decisões de alto nível que saírem da conversa —
> um resumo executivo para não perder o fio depois)_

- **Escopo do v0:** _______________________________________________________
- **Campos obrigatórios do wizard:** _____________________________________
- **Métrica principal na tela de resultado:** ____________________________
- **Fonte de benchmark inicial:** ________________________________________
- **Piloto (quem / quando):** ____________________________________________
- **Próximos passos:** ___________________________________________________
