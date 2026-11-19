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

## 4 Considerações sobre o estado atual

Em coerência com o objetivo específico (f), registram-se as limitações
conhecidas da solução desenvolvida até o momento.

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
