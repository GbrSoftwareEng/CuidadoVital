# CuidadoVital: aplicativo móvel para agendamento e acompanhamento de medicação com persistência local

## 1 Introdução

### 1.1 Problema de pesquisa

A não adesão ao tratamento medicamentoso é um problema de saúde pública de
escala global. A Organização Mundial da Saúde (OMS, 2003) estimou que, em países
desenvolvidos, a adesão a terapias de longo prazo entre portadores de doenças
crônicas gira em torno de 50%, sendo ainda menor em países em desenvolvimento. O
relatório registra variações expressivas entre contextos: a adesão a
medicamentos anti-hipertensivos foi de 27% na Gâmbia, 43% na China e 51% nos
Estados Unidos.

Parte dessa falha é organizacional, não clínica. O profissional de saúde que
prescreve não dispõe, no momento do atendimento, de um registro acessível do que
foi prescrito a cada paciente, em quais horários e se as doses anteriores foram
efetivamente administradas. O acompanhamento, quando existe, costuma apoiar-se
em anotações em papel ou na memória do paciente.

Aplicações móveis são candidatas naturais a ocupar esse espaço, mas esbarram em
duas restrições concretas no contexto brasileiro de ensino e de pequenas
clínicas. A primeira é de infraestrutura: soluções que dependem de servidor
exigem hospedagem, manutenção e custo recorrente. A segunda é regulatória: dados
de saúde são classificados como dados pessoais sensíveis pelo art. 5º, II, da
Lei nº 13.709/2018 — a Lei Geral de Proteção de Dados Pessoais (BRASIL, 2018) —
e seu tratamento está sujeito a bases legais específicas previstas no art. 11 da
mesma lei.

Disso decorre o problema que orienta este trabalho: **como desenvolver um
aplicativo móvel capaz de registrar prescrições e acompanhar a administração de
doses, com autenticação de usuário e persistência confiável de dados, sem
depender de servidor e sem que a ausência de infraestrutura remota comprometa a
integridade dos dados nem a verificabilidade do software?**

### 1.2 Objetivo geral

Desenvolver um aplicativo móvel multiplataforma para agendamento e
acompanhamento de medicação, com autenticação de usuário e persistência local de
dados, verificado por testes automatizados em três níveis.

### 1.3 Objetivos específicos

Os objetivos específicos detalham o objetivo geral em uma sequência
metodológica:

**a)** **Caracterizar** os requisitos funcionais do acompanhamento de medicação a
partir da rotina do profissional de saúde, delimitando o que é viável sem
servidor;

**b)** **Projetar** uma arquitetura em camadas que isole a persistência da
interface, de modo que a substituição futura do armazenamento local por uma API
remota não exija reescrever as telas;

**c)** **Implementar** mecanismo de autenticação com derivação de chave a partir
de senha, armazenando o custo computacional junto ao registro para permitir
elevação posterior sem invalidar contas existentes;

**d)** **Modelar** o esquema do banco de dados relacional local com versionamento
incremental de migrações e integridade referencial explícita;

**e)** **Verificar** o comportamento do sistema por meio de testes automatizados
em três níveis — unitário, de integração e de interface — executados
continuamente a cada alteração;

**f)** **Avaliar** as limitações de segurança e de conformidade da solução
resultante, explicitando os riscos residuais e as condições sob as quais a
arquitetura adotada deixa de ser adequada.

## 2 Justificativa

### 2.1 Relevância do problema

A magnitude do problema da adesão medicamentosa está documentada, ainda que o
número mais citado mereça ressalva. A estimativa de 50% divulgada pela OMS
(2003) tornou-se referência corrente na literatura, mas análises posteriores que
rastrearam os estudos citados no relatório concluíram tratar-se de uma
generalização, e não de uma taxa medida: os trabalhos examinados apresentavam
adesão entre 33% e 94%. A ressalva não diminui a relevância do problema —
nenhuma das faixas relatadas é satisfatória —, mas recomenda cautela com o número
isolado.

### 2.2 Evidência de eficácia da intervenção proposta

A relevância de intervir por meio de aplicativo móvel é sustentada por evidência
experimental agregada.

Armitage, Kassavou e Sutton (2020) conduziram revisão sistemática com
metanálise de ensaios clínicos randomizados sobre aplicativos de apoio à adesão
medicamentosa. A partir de nove ensaios, com 1.159 participantes recrutados, os
autores encontraram razão de chances combinada de 2,12 (IC 95%: 1,635–2,747) a
favor dos pacientes que utilizaram aplicativos. Os próprios autores ressalvam
que o efeito variou entre estudos — em cinco deles a intervenção teve efeito
pequeno e não significativo — e que a adesão foi autorrelatada, o que limita a
força da evidência.

Al-Arkee *et al.* (2021), em revisão sistemática com metanálise restrita a
pacientes com doença cardiovascular, incluíram dezesseis ensaios randomizados e
relataram melhora média de aproximadamente 11% nas taxas de adesão em comparação
com o cuidado usual. Os autores observam que as intervenções variaram
amplamente em desenho, conteúdo e forma de entrega, e recomendam que estudos
futuros identifiquem quais componentes são efetivamente ativos.

A convergência entre as duas revisões sustenta a premissa do trabalho: o tipo de
intervenção aqui proposto tem efeito mensurável, embora moderado e heterogêneo.

### 2.3 Pertinência da arquitetura sem servidor

A opção por persistência local responde a duas restrições simultâneas.

Do ponto de vista econômico e operacional, dispensar servidor elimina custo de
hospedagem, administração de banco remoto e disponibilidade de rede — condições
frequentemente indisponíveis em projetos acadêmicos e em consultórios de pequeno
porte. O aplicativo funciona integralmente sem conexão.

Do ponto de vista regulatório, a decisão tem efeito ambíguo e merece registro
honesto. Dados que não trafegam nem são centralizados reduzem a superfície de
exposição. Por outro lado, a LGPD não é afastada pelo armazenamento local, e o
banco de dados do aplicativo **não é criptografado em repouso**. A OWASP, em sua
lista de riscos para aplicações móveis, classifica o armazenamento inseguro de
dados entre as categorias principais, observando que desenvolvedores
frequentemente presumem, de forma equivocada, que o sistema de arquivos do
dispositivo está fora de alcance, quando ferramentas especializadas bastam para
inspecionar os dados de uma aplicação, e que rooting ou jailbreak contornam as
proteções existentes.

A justificativa da arquitetura, portanto, é de adequação à fase do projeto — não
de suficiência para produção com dados reais de pacientes. Essa delimitação é
parte do objetivo específico (f).

### 2.4 Pertinência da verificação automatizada

A escolha de verificar o sistema por testes automatizados em três níveis não é
ornamental. Durante o desenvolvimento, dois defeitos de consequência relevante
foram encontrados exatamente por esse mecanismo, e nenhum deles seria detectado
por compilação bem-sucedida:

**(i)** A rotina de migração do banco utilizava uma primitiva de transação
exclusiva inexistente na plataforma web, o que impedia a abertura do banco e
inutilizava o aplicativo naquele alvo. O empacotamento para as três plataformas
concluía sem erro, e os testes executados fora do aplicativo também passavam,
porque substituem a ponte nativa por um equivalente que implementa a primitiva.
Somente o teste que dirige o aplicativo em navegador real detectou a falha.

**(ii)** A rotina de autenticação respondia com mensagem idêntica para conta
inexistente e para senha incorreta, conforme a boa prática de não revelar quais
contas existem. O tempo de resposta, contudo, diferia: aproximadamente 0,1 ms no
primeiro caso contra 625 ms no segundo, pois apenas o segundo executava a
derivação de chave. A diferença é mensurável e suficiente para enumerar contas,
anulando a proteção pretendida.

O segundo caso ilustra que a conformidade aparente com uma recomendação de
segurança pode conviver com sua violação efetiva por canal lateral — situação
que apenas a verificação empírica revela.

## 3 Revisão de Literatura

O referencial a seguir organiza-se em quatro áreas temáticas, correspondentes
aos objetivos específicos: adesão medicamentosa e saúde móvel (objetivo a);
proteção de dados sensíveis em saúde (objetivos a e f); armazenamento seguro de
credenciais (objetivo c); e verificação e teste de software (objetivo e).

### 3.1 Adesão ao tratamento medicamentoso e saúde móvel

O marco de referência da área é o relatório *Adherence to long-term therapies:
evidence for action*, da Organização Mundial da Saúde (OMS, 2003), que
consolidou a adesão como problema de política de saúde e não como falha
individual do paciente. O documento abrange condições como asma, hipertensão,
depressão, diabetes, HIV/aids, tuberculose e dependência de tabaco, e é a origem
da estimativa de 50% largamente reproduzida na literatura subsequente.

Essa estimativa, contudo, foi objeto de revisão crítica. Análises que
rastrearam as referências que sustentam a afirmação concluíram tratar-se de uma
estimativa generalizada e não fundamentada em evidência direta, observando que
os estudos subjacentes reportavam adesão entre 33% e 94%. A divergência entre a
fonte original e sua crítica é relevante metodologicamente: demonstra que um
número amplamente citado pode consolidar-se por repetição, e recomenda que
trabalhos que dele se valham apresentem a faixa, e não apenas a média.

Quanto à eficácia da intervenção por aplicativo, Armitage, Kassavou e Sutton
(2020) e Al-Arkee *et al.* (2021) convergem em direção, embora com magnitudes e
populações distintas. Armitage, Kassavou e Sutton (2020) reportam razão de
chances combinada de 2,12 (IC 95%: 1,635–2,747) em nove ensaios randomizados com
1.159 participantes, ressalvando que em cinco deles o efeito não foi
estatisticamente significativo e que a adesão foi autorrelatada. Al-Arkee *et
al.* (2021), restringindo-se a doença cardiovascular, encontram melhora média
próxima a 11% em dezesseis ensaios, e atribuem a heterogeneidade dos resultados
à variação de desenho e de conteúdo entre as intervenções.

A leitura conjunta dos três conjuntos de evidência sugere que o efeito existe,
é moderado, e que a literatura ainda não isolou quais componentes de um
aplicativo o produzem — ponto que Al-Arkee *et al.* (2021) colocam
explicitamente como agenda de pesquisa.

### 3.2 Proteção de dados pessoais sensíveis em saúde

No ordenamento brasileiro, o tratamento de dados de saúde é regido pela Lei nº
13.709/2018 (BRASIL, 2018). O art. 5º, II, classifica o dado referente à saúde
como dado pessoal sensível, ao lado de origem racial, convicção religiosa,
opinião política e dados genéticos ou biométricos. A consequência prática é que
o tratamento desses dados não se apoia nas bases legais gerais do art. 7º, mas
nas bases específicas do art. 11. O art. 11, §4º, veda a comunicação ou o uso
compartilhado de dados sensíveis de saúde entre controladores com objetivo de
obter vantagem econômica, ressalvadas as hipóteses relativas à prestação de
serviços de saúde e de assistência farmacêutica.

Cabe notar que a própria lei não define o que constitui dado de saúde: o art.
5º, II, arrola a categoria sem conceituá-la, o que transfere a delimitação para
a interpretação doutrinária e para a atuação da Autoridade Nacional de Proteção
de Dados. A lacuna é relevante para aplicações que, como a aqui descrita,
registram prescrições e administração de doses.

No plano técnico, Carvalho, Rezende e Rabelo ([2026?]) propõem abordagem de
modelagem de ameaças à privacidade e à segurança em aplicativos móveis orientada
especificamente à LGPD, estruturada em quatro etapas que ligam escopo, ativos,
fluxos de dados pessoais, ameaças, controles técnicos e exigências legais. Os
autores avaliam a proposta de forma conceitual em cenário de saúde. A
contribuição é pertinente porque a maior parte do ferramental de modelagem de
ameaças foi concebida sob regimes regulatórios distintos do brasileiro.

Do ponto de vista de controles técnicos, a OWASP, em sua lista de riscos para
aplicações móveis, trata o armazenamento inseguro de dados como categoria
própria. A entidade observa que a suposição de inacessibilidade do sistema de
arquivos do dispositivo é equivocada, que ferramentas de análise bastam para
inspecionar dados de aplicação, e que rooting ou jailbreak contornam proteções.
A recomendação central é de minimização — não armazenar o que não for necessário
— e, quando o armazenamento for inevitável, o uso dos mecanismos de gerenciamento
de chaves da própria plataforma.

Cabe registrar divergência de numeração entre edições da lista OWASP: o
armazenamento inseguro de dados figura como M2 na edição de 2016 e recebe
identificador distinto em outras edições. Trabalhos que citem a categoria devem
indicar a edição utilizada.

### 3.3 Armazenamento seguro de credenciais

O consenso técnico sobre armazenamento de senhas rejeita o uso de funções de
resumo criptográfico simples e exige funções de derivação de chave com custo
computacional ajustável.

A OWASP, em seu *Password Storage Cheat Sheet*, estabelece hierarquia explícita
de algoritmos. Recomenda Argon2id como primeira escolha, com configuração mínima
de 19 MiB de memória, contagem de iterações 2 e grau de paralelismo 1; scrypt
como alternativa quando Argon2id não estiver disponível; bcrypt apenas para
sistemas legados; e PBKDF2 para contextos que exijam conformidade com FIPS-140.
Para PBKDF2, a recomendação é de **600.000 iterações com HMAC-SHA-256**, e de
220.000 iterações para HMAC-SHA-512.

Dois pontos do mesmo documento são diretamente aplicáveis a decisões de projeto.
O primeiro é que o fator de custo deve ser elevado ao longo do tempo,
acompanhando a evolução do hardware, e que a prática mais comum é regerar o
resumo na próxima autenticação bem-sucedida do usuário — com a ressalva de que
contas inativas podem nunca ser atualizadas. O segundo é que o fator de custo
deve ser armazenado junto ao resumo, tipicamente em formato padronizado, de modo
a viabilizar a migração de algoritmo. A OWASP determina ainda que um *salt*
único e aleatório seja adicionado a cada senha, de forma a inviabilizar tabelas
pré-computadas.

O PBKDF2 foi especificado por Kaliski (2000) na RFC 2898, que define a função de
derivação a partir de senha com três parâmetros: o *salt*, a contagem de
iterações e o comprimento da chave derivada. A contagem de iterações é o
mecanismo pelo qual o custo do ataque por força bruta é elevado de forma
ajustável — é esse parâmetro que a recomendação da OWASP quantifica. Cabe
registrar que a RFC 2898 tem caráter informativo e foi tornada obsoleta pela RFC
8018.

A preferência atual por Argon2id tem base formal: Biryukov, Dinu, Khovratovich e
Josefsson (2021) especificam a função na RFC 9106, caracterizando-a como função
de custo de memória. Essa propriedade eleva o custo de ataques paralelos em
hardware dedicado — limitação reconhecida do PBKDF2, cujo custo é essencialmente
computacional e, portanto, mais facilmente amortizado por GPUs e circuitos
dedicados. A distância entre a especificação de Kaliski (2000) e a de Biryukov
*et al.* (2021) expressa a evolução do modelo de ameaça considerado adequado
para armazenamento de senhas.

A tensão entre a recomendação e a viabilidade de implementação é o ponto
relevante para projetos móveis que não dispõem de módulo nativo de derivação de
chave, e será retomada na discussão das limitações.

### 3.4 Verificação e teste de software

Delamaro, Maldonado e Jino (2016) sistematizam, na referência brasileira
consolidada da área, a distinção entre técnicas de teste segundo a origem dos
critérios de seleção de casos: o teste funcional, ou de caixa preta, deriva os
casos da especificação, sem conhecimento da implementação; o teste estrutural,
ou de caixa branca, deriva-os do código, exercitando elementos como comandos,
desvios e caminhos.

Myers, Sandler e Badgett (2011) sustentam que o teste é um processo de execução
com a intenção de encontrar defeitos, e não de demonstrar sua ausência — posição
que tem consequência metodológica direta: um conjunto de testes que apenas
confirma o comportamento esperado é, nesse enquadramento, de baixo valor.

Pressman e Maxim (2016) e Sommerville (2018) situam a atividade de teste no
ciclo de vida, tratando-a como elemento de verificação e validação e não como
etapa terminal. Sommerville (2018) distingue verificação — construir o produto
corretamente — de validação — construir o produto correto —, distinção
pertinente a este trabalho, em que a verificação automatizada do comportamento é
extensa, enquanto a validação junto a profissionais de saúde não foi realizada.

A literatura é convergente quanto à insuficiência de uma técnica isolada.
Delamaro, Maldonado e Jino (2016) argumentam que as técnicas são complementares,
pois nenhuma é capaz, isoladamente, de revelar todas as classes de defeito. A
experiência descrita na seção 2.4 fornece ilustração concreta: um defeito
dependente de plataforma passou despercebido por testes executados fora do
aplicativo e exigiu execução em ambiente real, enquanto um defeito de canal
lateral temporal exigiu medição, não verificação de valor de retorno.

## 4 Desenvolvimento

### 4.1 Metodologia

#### 4.1.1 Tipo de pesquisa

Quanto à natureza, trata-se de **pesquisa aplicada**: o resultado esperado não é
a formulação de teoria, mas um artefato de software funcional que responda ao
problema enunciado na seção 1.1.

Quanto aos objetivos, a pesquisa combina duas abordagens, em coerência com os
objetivos específicos. É **exploratória** nos objetivos (a) e (f) — caracterizar
requisitos e identificar limitações exige levantamento prévio do que é viável
sem servidor. É **descritiva** nos objetivos (b) a (e), que descrevem e
verificam o comportamento do artefato construído.

Quanto ao procedimento, o trabalho articula três estratégias:

| Estratégia | Aplicação |
|---|---|
| Pesquisa bibliográfica | Construção do referencial teórico (seção 3) |
| Pesquisa documental | Análise de legislação e de especificações técnicas normativas |
| Pesquisa experimental | Medição do comportamento do software construído |

A presença da terceira estratégia é o que distingue este trabalho de uma
revisão: parte das afirmações da seção 5 decorre de medição direta sobre o
artefato, não de leitura.

#### 4.1.2 Fontes e instrumentos de coleta

Não houve coleta junto a seres humanos. Não foram aplicados questionários,
entrevistas ou formulários, e o trabalho não envolveu participantes — razão
pela qual não houve submissão a comitê de ética. As fontes utilizadas foram
documentais e instrumentais.

**Fontes documentais.** Três classes de documento foram consultadas:

| Classe | Exemplos utilizados |
|---|---|
| Legislação | Lei nº 13.709/2018 (LGPD), art. 5º, II e art. 11 |
| Especificações técnicas normativas | RFC 2898 (PBKDF2), RFC 9106 (Argon2) |
| Recomendações de entidade técnica | OWASP *Password Storage Cheat Sheet*; OWASP Mobile Top 10 |

**Fontes bibliográficas.** Relatório da Organização Mundial da Saúde, revisões
sistemáticas com metanálise publicadas em periódicos revisados por pares,
literatura técnica brasileira sobre teste de software e artigo de evento
científico nacional sobre modelagem de ameaças orientada à LGPD.

**Instrumentos de coleta de dados experimentais.** Os dados empíricos relatados
na seção 5 foram coletados por instrumentos construídos para este fim, descritos
em 4.1.4.

#### 4.1.3 Procedimento de seleção bibliográfica

A seleção seguiu os seguintes critérios, nesta ordem:

**a)** **Delimitação por área temática.** As quatro áreas do referencial foram
derivadas dos objetivos específicos, e não o contrário — cada área responde a um
objetivo ou grupo de objetivos.

**b)** **Preferência por fonte primária.** Quando a informação estava disponível
tanto em fonte secundária quanto na fonte original, utilizou-se a original. Os
parâmetros atribuídos à OWASP foram extraídos da leitura direta do documento
mantido pela entidade, e não de artigos que o citam; o mesmo vale para os RFC.

**c)** **Verificação de autoria e de dados bibliográficos.** Toda referência
teve autoria, ano, título e veículo conferidos em fonte acessível antes da
inclusão. Uma referência cujo ano não pôde ser confirmado é apresentada com a
notação de data provável prevista na norma, em vez de receber ano presumido.

**d)** **Registro de divergência entre fontes.** Quando fontes divergiram, a
divergência foi registrada no texto em lugar de arbitrada em silêncio. Dois
casos ocorreram: a crítica à estimativa de adesão da OMS (seção 3.1) e a
variação de numeração da categoria de armazenamento inseguro entre edições da
lista OWASP (seção 3.2).

#### 4.1.4 Procedimento de coleta de dados experimentais

Os dados experimentais foram coletados pela execução de quatro suítes de
verificação construídas sobre o próprio artefato:

| Instrumento | Natureza | Procedimento |
|---|---|---|
| `verificar-crypto.mts` | Teste estrutural | Compara a saída das primitivas com a biblioteca criptográfica do Node, varrendo todos os tamanhos de mensagem de 0 a 200 bytes |
| `verificar-auth.mts` | Teste de integração | Executa migrações, cadastro, login, perfil, redefinição de senha e sessão sobre banco SQLite real, inspecionando o estado gravado |
| `verificar-agendamento.mts` | Teste de integração | Exercita agendamento de medicação e registro de doses, incluindo integridade referencial e exclusão em cascata |
| `verificar-web.mjs` | Teste funcional | Dirige o aplicativo compilado em navegador Chromium real, registrando também erros de console |

A medição do canal lateral temporal (seção 5.3) utilizou procedimento
específico: cinco execuções de tentativa de autenticação para cada condição
— conta existente com senha incorreta e identificador inexistente —, adotando-se
a **mediana** como estatística de posição, por ser menos sensível a picos de
escalonamento do sistema operacional do que a média.

### 4.2 Desenvolvimento

#### 4.2.1 Tecnologias adotadas

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | React Native com Expo (SDK 57) | Um código-fonte para Android, iOS e web; dispensa cadeia de ferramentas nativa |
| Linguagem | TypeScript | Verificação de tipos antes da execução |
| Persistência | SQLite via `expo-sqlite` | Banco relacional local, sem servidor |
| Aleatoriedade e resumo | `expo-crypto` | Geração de bytes aleatórios e UUID |
| Estado global | Context API | Estado único (a sessão) não justifica biblioteca externa |

#### 4.2.2 Arquitetura implementada

A arquitetura segue separação em camadas, com a regra de que **nenhuma tela
contém SQL**. A tela invoca uma função de serviço; o serviço aplica a regra de
negócio e delega a persistência a um repositório.

```
App.tsx                      seleciona a tela conforme a sessão
  └── src/pages/             telas
        └── src/contexts/    AuthContext: estado da sessão
              └── src/services/    regras de negócio
                    ├── src/security/    derivação de chave
                    └── src/database/    repositórios e migrações
                          └── expo-sqlite
```

A distribuição do código entre as camadas, medida no estado atual do
repositório, é a seguinte:

| Camada | Arquivos | Linhas |
|---|---|---|
| `src/pages` | 9 | 1.878 |
| `src/database` | 7 | 519 |
| `src/security` | 4 | 365 |
| `src/services` | 2 | 362 |
| `src/contexts` | 1 | 172 |
| `src/components` | 2 | 169 |
| `src/utils` | 1 | 92 |
| `src/global` | 1 | 12 |
| **Total** | **27** | **3.569** |

O isolamento da persistência atende ao objetivo específico (b): a substituição
futura do SQLite local por uma interface remota recai sobre `src/database/` e
`src/services/`, sem alcançar as telas.

#### 4.2.3 Modelagem e versionamento do banco de dados

O esquema é versionado por `PRAGMA user_version`, atributo que o próprio SQLite
armazena no arquivo do banco. Cada migração é aplicada uma única vez, em ordem,
dentro de transação. O estado atual compreende quatro migrações:

| Versão | Conteúdo |
|---|---|
| 1 | Tabelas `usuarios` e `sessoes`, com índice em `sessoes.usuario_id` |
| 2 | Colunas de dados profissionais (`crm`, `especialidade`) e tabelas `pacientes` e `prescricoes` |
| 3 | Tabela `agendamentos`, com restrição de verificação sobre a duração |
| 4 | Tabela `doses_registradas`, com restrição de unicidade sobre agendamento, data e horário |

A regra adotada é que **migração publicada não se altera**: a evolução ocorre por
acréscimo ao final da lista, pois dispositivos que já executaram a versão
anterior não reexecutariam uma migração modificada.

A integridade referencial é explícita. Como o SQLite mantém a verificação de
chaves estrangeiras desativada por padrão, a conexão a habilita na abertura, e as
tabelas dependentes declaram remoção em cascata.

#### 4.2.4 Implementação do armazenamento de credenciais

O objetivo específico (c) foi implementado com derivação de chave a partir de
senha. O resumo é armazenado no formato
`pbkdf2-sha256$<iterações>$<salt>$<hash>`:

```typescript
export async function hashPassword(plainPassword: string): Promise<string> {
    const salt = await Crypto.getRandomBytesAsync(SALT_LENGTH);
    const derived = pbkdf2Sha256(utf8ToBytes(plainPassword), salt, ITERATIONS, KEY_LENGTH);

    return `${ALGORITHM}$${ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(derived)}`;
}
```

Três decisões de projeto estão materializadas nessas quatro linhas, todas
alinhadas às recomendações descritas na seção 3.3:

**a)** O *salt* é gerado aleatoriamente **por conta**, de modo que duas contas
com a mesma senha produzem resumos distintos.

**b)** A contagem de iterações é **gravada junto ao resumo**, e não fixada em
código. Isso permite elevar o custo computacional no futuro sem invalidar contas
existentes: uma função de verificação identifica resumos gerados com custo
inferior ao corrente e a rotina de autenticação os regenera na próxima entrada
bem-sucedida — exatamente a estratégia recomendada pela OWASP.

**c)** O identificador do algoritmo integra o formato armazenado, viabilizando
migração futura para outro algoritmo sem ambiguidade na leitura dos registros
antigos.

A implementação das primitivas em TypeScript decorre de restrição de plataforma
discutida na seção 5.4.

#### 4.2.5 Tratamento da divergência entre plataformas

A rotina de migração encontrou obstáculo não previsto: a primitiva de transação
exclusiva utilizada não existe na implementação web do `expo-sqlite`, pois o
SQLite compilado para WebAssembly não a oferece. A solução adotada testa o
suporte uma única vez, antes de executar qualquer comando, e recorre à transação
comum quando ele está ausente:

```typescript
let suportaTransacaoExclusiva: boolean | null = null;

async function emTransacao(db, tarefa) {
    if (suportaTransacaoExclusiva === null) {
        try {
            await db.withExclusiveTransactionAsync(async () => undefined);
            suportaTransacaoExclusiva = true;
        } catch {
            suportaTransacaoExclusiva = false;
        }
    }

    if (suportaTransacaoExclusiva) {
        await db.withExclusiveTransactionAsync(tarefa);
        return;
    }

    await db.withTransactionAsync(() => tarefa(db));
}
```

A verificação do suporte é feita com transação vazia **antes** da execução de
qualquer comando de migração. A alternativa — capturar a exceção no meio da
migração — arriscaria deixar uma migração parcialmente aplicada e repeti-la em
seguida. A perda da exclusividade não acarreta risco neste contexto, porque a
abertura do banco compartilha uma única promessa, impedindo execução concorrente
das migrações.

#### 4.2.6 Processo de desenvolvimento e controle de versão

O desenvolvimento ocorreu entre setembro e novembro de 2026, em repositório
Git público, totalizando quinze registros de alteração na linha principal.

Adotou-se fluxo de ramificação com branch de produção, branch de integração e
branches de funcionalidade, sendo a incorporação feita por solicitação de
integração revisada. A automação de verificação executa, a cada envio e a cada
solicitação de integração, três trabalhos independentes:

| Trabalho | Conteúdo |
|---|---|
| Testes e tipos | Verificação de tipos do aplicativo e das suítes, testes unitários e de integração |
| Teste de interface | Instalação de navegador e execução do aplicativo real |
| Compilação | Empacotamento para Android, iOS e web |

## 5 Descrição dos Resultados

Esta seção combina o referencial da seção 3 com os dados obtidos pela aplicação
da metodologia descrita na seção 4, e encerra resgatando os objetivos
específicos enunciados em 1.3.

### 5.1 Resultado da verificação automatizada

A execução das quatro suítes produziu os seguintes quantitativos, obtidos por
contagem das verificações efetivamente executadas:

| Suíte | Técnica | Verificações |
|---|---|---|
| `verificar-crypto.mts` | Teste estrutural | 39 |
| `verificar-auth.mts` | Teste de integração | 63 |
| `verificar-agendamento.mts` | Teste de integração | 4 (com 13 asserções internas) |
| `verificar-web.mjs` | Teste funcional | 13 |
| **Total** | | **119** |

A distribuição corresponde à complementaridade entre técnicas sustentada por
Delamaro, Maldonado e Jino (2016). As asserções estruturais concentram-se nas
primitivas criptográficas; as de integração, nas regras de negócio e no estado
do banco; as funcionais, no fluxo percorrido pelo usuário.

O resultado mais relevante, porém, não é o quantitativo: é que **duas classes de
defeito escaparam a duas das três técnicas**, e foram detectadas apenas pela
terceira. Os dois casos são descritos em 5.2 e 5.3.

### 5.2 Defeito dependente de plataforma

A primeira suíte funcional executada sobre o aplicativo compilado para web
acusou dez falhas, acompanhadas de registro de erro no console do navegador
indicando que a primitiva de transação exclusiva não é suportada naquela
plataforma. O banco não era aberto e a aplicação permanecia na tela de erro.

O achado é metodologicamente significativo por aquilo que **não** o detectou:

| Verificação | Resultado antes da correção |
|---|---|
| Compilação para Android, iOS e web | Concluída sem erro |
| Verificação de tipos | Sem apontamentos |
| Suíte estrutural | Aprovada |
| Suíte de integração | Aprovada |
| Suíte funcional em navegador real | **10 falhas** |

As duas primeiras suítes não detectaram o defeito por uma razão identificável:
elas substituem a ponte nativa por um equivalente do ambiente Node que
implementa a primitiva ausente. O substituto é, simultaneamente, a condição que
permite executá-las fora do emulador e a causa de sua cegueira a diferenças
entre plataformas.

Após a correção descrita em 4.2.5, a suíte passou a ser aprovada integralmente.
A reintrodução deliberada do defeito reproduziu as dez falhas, confirmando o
poder de detecção do instrumento.

Este resultado confirma empiricamente a posição de Myers, Sandler e Badgett
(2011) quanto à finalidade do teste: um conjunto de verificações que apenas
confirma o comportamento esperado — como faziam a compilação e a verificação de
tipos — tem valor limitado diante de um defeito que inutiliza o produto.

### 5.3 Identificação de canal lateral temporal na autenticação

A rotina de autenticação retornava mensagem idêntica para identificador
inexistente e para senha incorreta, em conformidade com a prática de não revelar
quais contas existem. A medição descrita em 4.1.4 revelou que a conformidade era
apenas aparente:

| Condição | Mediana do tempo de resposta |
|---|---|
| Conta existente, senha incorreta | 625,2 ms |
| Identificador inexistente | 0,1 ms |
| **Razão** | **≈ 5.665×** |

A causa é estrutural: apenas a primeira condição executava a derivação de chave,
cujo custo é, por projeto, elevado. A segunda retornava imediatamente após a
consulta ao banco não encontrar registro.

A consequência prática é que a proteção pretendida não existia: bastaria medir o
tempo de resposta para enumerar quais contas estão cadastradas no dispositivo. A
correção consistiu em executar, na condição de conta inexistente, uma
verificação contra um resumo descartável de custo equivalente, igualando os
tempos. Após a correção, a razão entre as medianas passou a situar-se abaixo de
2×, limiar adotado como critério de aprovação da asserção correspondente.

O resultado tem alcance que ultrapassa o caso particular: demonstra que a
adoção de uma recomendação de segurança — mensagens de erro indistintas — pode
conviver com sua violação efetiva por canal lateral, e que a diferença entre as
duas situações só é observável por medição.

### 5.4 Confronto entre a implementação e o referencial normativo

O confronto entre o implementado (seção 4.2.4) e o recomendado (seção 3.3)
produz resultado parcialmente desfavorável, registrado aqui sem atenuação:

| Parâmetro | Recomendação OWASP | Implementado | Situação |
|---|---|---|---|
| Algoritmo preferencial | Argon2id | PBKDF2-HMAC-SHA256 | Divergente |
| Iterações (PBKDF2-SHA256) | 600.000 | 40.000 | **15× abaixo** |
| *Salt* único por conta | Exigido | Implementado | Conforme |
| Custo armazenado com o resumo | Recomendado | Implementado | Conforme |
| Regeneração do resumo ao elevar o custo | Recomendado | Implementado | Conforme |

A divergência nos dois primeiros itens não decorre de desconhecimento da
recomendação, mas de restrição de plataforma identificada durante o
desenvolvimento: o módulo criptográfico do framework expõe apenas funções de
resumo e geração de aleatoriedade, **sem função de derivação de chave**. As
alternativas disponíveis eram três, todas com custo:

| Alternativa | Impedimento |
|---|---|
| Uma chamada nativa por iteração | Tempo de resposta na ordem de segundos |
| Biblioteca nativa de derivação | Exige compilação própria, inviabilizando o uso do aplicativo interpretador durante o desenvolvimento |
| Implementar as primitivas em código interpretado | Adotada; limita a contagem de iterações viável |

A medição do custo da terceira alternativa fundamenta o parâmetro escolhido:
40.000 iterações correspondem a aproximadamente 625 ms de espera no
dispositivo, conforme registrado em 5.3. Elevar o parâmetro às 600.000
iterações recomendadas implicaria espera superior a nove segundos por
autenticação, inviável para a interação pretendida.

Registra-se que, embora o parâmetro esteja abaixo do recomendado, a decisão de
armazenar o custo junto ao resumo — conforme a OWASP — mantém aberto o caminho
para sua elevação futura sem invalidar contas existentes. A limitação é de
grandeza, não de arquitetura.

### 5.5 Resultado quanto à conformidade regulatória

O confronto entre o artefato e o referencial da seção 3.2 produz resultado
igualmente explícito. A aplicação registra prescrições, agendamentos e
administração de doses — informações que se enquadram como dados referentes à
saúde e, portanto, como dados pessoais sensíveis nos termos do art. 5º, II, da
Lei nº 13.709/2018 (BRASIL, 2018).

O banco de dados local **não é criptografado em repouso**. Conforme a
caracterização da OWASP quanto ao armazenamento inseguro de dados, discutida em
3.2, a suposição de que o sistema de arquivos do dispositivo é inacessível não
se sustenta, e dispositivos com privilégio administrativo obtido pelo usuário
contornam as proteções existentes.

O resultado, portanto, é que **o artefato em seu estado atual não está apto ao
tratamento de dados reais de pacientes**. Essa constatação não invalida o
trabalho: ela é, precisamente, o produto esperado do objetivo específico (f).

### 5.6 Cumprimento dos objetivos específicos

| Objetivo | Situação | Evidência |
|---|---|---|
| **(a)** Caracterizar requisitos viáveis sem servidor | Cumprido | Seções 1.1 e 4.2.1; escopo delimitado e justificado |
| **(b)** Projetar arquitetura em camadas | Cumprido | Seção 4.2.2; SQL restrito a `src/database/`, nenhuma tela o contém |
| **(c)** Implementar derivação de chave com custo armazenado | Cumprido com ressalva | Seção 4.2.4; formato e regeneração conformes, contagem de iterações abaixo do recomendado (5.4) |
| **(d)** Modelar esquema com versionamento e integridade referencial | Cumprido | Seção 4.2.3; quatro migrações versionadas, chaves estrangeiras habilitadas e remoção em cascata verificada |
| **(e)** Verificar por testes automatizados em três níveis | Cumprido | Seções 4.1.4 e 5.1; 119 verificações em execução contínua |
| **(f)** Avaliar limitações e riscos residuais | Cumprido | Seções 5.4, 5.5 e 6 |

Cinco dos seis objetivos específicos foram integralmente cumpridos. O objetivo
(c) foi cumprido com ressalva explícita: o mecanismo está implementado e suas
propriedades estruturais — *salt* por conta, custo armazenado, regeneração
automática — atendem à recomendação, mas o parâmetro de custo situa-se quinze
vezes abaixo do valor recomendado, por restrição de plataforma documentada e
mensurada.

Cabe distinguir, na acepção de Sommerville (2018), aquilo que foi alcançado
daquilo que não foi: o trabalho realizou **verificação** extensa — o produto foi
construído corretamente segundo as especificações adotadas — e **não realizou
validação**, pois o sistema não foi submetido a profissionais de saúde em uso
real. A validação permanece como etapa necessária e não cumprida.

## 6 Limitações conhecidas

Em coerência com o objetivo específico (f) e consolidando o discutido em 5.4 e
5.5, registram-se as limitações conhecidas da solução desenvolvida até o
momento.

**Derivação de chave abaixo da recomendação.** A implementação utiliza PBKDF2-
HMAC-SHA256 com 40.000 iterações, contra as 600.000 recomendadas pela OWASP para
o mesmo algoritmo, e o algoritmo adotado não é o de primeira escolha da entidade.
A restrição é de plataforma: o módulo criptográfico do framework utilizado expõe
apenas funções de resumo e geração de aleatoriedade, sem derivação de chave, o
que levou à implementação das primitivas em código interpretado. Em conformidade
com a recomendação da OWASP, o fator de custo é armazenado junto ao resumo, de
modo que sua elevação futura não invalida contas existentes.

**Banco de dados não criptografado em repouso.** Conforme discutido na seção
3.2, a ausência de criptografia em repouso é incompatível com o tratamento de
dados reais de pacientes.

**Recuperação de senha baseada em CPF.** O mecanismo implementado autoriza a
redefinição de senha mediante correspondência entre e-mail e CPF cadastrados. O
CPF não constitui informação secreta, de modo que o controle oferece garantia
limitada de identidade.

**Inconsistência no modelo de dados.** A tabela de agendamentos registra o
paciente como texto livre, embora exista tabela própria de pacientes, o que
impede integridade referencial entre as duas entidades.

**Validação não realizada.** Na distinção de Sommerville (2018), o trabalho
apresenta verificação extensa e nenhuma validação: o sistema não foi submetido a
profissionais de saúde em uso real.

## Referências

AL-ARKEE, S.; MASON, J.; LANE, D. A.; FABRITZ, L.; CHUA, W.; HAQUE, M. S.;
JALAL, Z. Mobile Apps to Improve Medication Adherence in Cardiovascular Disease:
Systematic Review and Meta-analysis. **Journal of Medical Internet Research**,
v. 23, n. 5, e24190, maio 2021. Disponível em:
https://www.jmir.org/2021/5/e24190. Acesso em: 19 nov. 2026.

ARMITAGE, L. C.; KASSAVOU, A.; SUTTON, S. Do mobile device apps designed to
support medication adherence demonstrate efficacy? A systematic review of
randomised controlled trials, with meta-analysis. **BMJ Open**, v. 10, n. 1,
e032045, jan. 2020. Disponível em:
https://bmjopen.bmj.com/content/10/1/e032045. Acesso em: 19 nov. 2026.

BIRYUKOV, A.; DINU, D.; KHOVRATOVICH, D.; JOSEFSSON, S. **RFC 9106**: Argon2
Memory-Hard Function for Password Hashing and Proof-of-Work Applications.
Internet Research Task Force, set. 2021. Disponível em:
https://www.rfc-editor.org/rfc/rfc9106. Acesso em: 19 nov. 2026.

BRASIL. **Lei nº 13.709, de 14 de agosto de 2018**. Lei Geral de Proteção de
Dados Pessoais (LGPD). Brasília, DF: Presidência da República, 2018. Disponível
em: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm.
Acesso em: 19 nov. 2026.

CARVALHO, L. de C.; REZENDE, J. da C. V.; RABELO, A. Modelagem de ameaças à
privacidade e à segurança em aplicativos móveis: uma abordagem orientada à LGPD.
In: **Simpósio Brasileiro de Segurança da Informação e de Sistemas
Computacionais (SBSeg)**. Porto Alegre: Sociedade Brasileira de Computação,
[2026?]. Disponível em: https://sol.sbc.org.br/index.php/sbseg/article/view/44326.
Acesso em: 19 nov. 2026.

DELAMARO, M. E.; MALDONADO, J. C.; JINO, M. **Introdução ao teste de software**.
2. ed. Rio de Janeiro: Elsevier, 2016.

KALISKI, B. **RFC 2898**: PKCS #5: Password-Based Cryptography Specification
Version 2.0. RSA Laboratories; Network Working Group, set. 2000. Obsoleta pela
RFC 8018. Disponível em: https://www.rfc-editor.org/rfc/rfc2898. Acesso em: 19
nov. 2026.

MYERS, G. J.; SANDLER, C.; BADGETT, T. **The art of software testing**. 3. ed.
Hoboken: John Wiley & Sons, 2011.

ORGANIZAÇÃO MUNDIAL DA SAÚDE. **Adherence to long-term therapies**: evidence for
action. Genebra: OMS, 2003. Disponível em:
https://www.paho.org/sites/default/files/WHO-Adherence-Long-Term-Therapies-Eng-2003.pdf.
Acesso em: 19 nov. 2026.

OWASP FOUNDATION. **Password Storage Cheat Sheet**. OWASP Cheat Sheet Series.
Disponível em:
https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html.
Acesso em: 19 nov. 2026.

OWASP FOUNDATION. **OWASP Mobile Top 10**. Disponível em:
https://owasp.org/www-project-mobile-top-10/. Acesso em: 19 nov. 2026.

PRESSMAN, R. S.; MAXIM, B. R. **Engenharia de software**: uma abordagem
profissional. 8. ed. Porto Alegre: AMGH, 2016.

SOMMERVILLE, I. **Engenharia de software**. 10. ed. São Paulo: Pearson, 2018.
