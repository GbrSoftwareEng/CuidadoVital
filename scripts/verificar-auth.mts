import { openDatabaseAsync, type SQLiteDatabase } from './shims/expo-sqlite.ts';
import { configureDatabase } from '../src/database';
import { migrate, LATEST_VERSION } from '../src/database/migrations';
import { cadastrar, entrar, recuperarSessao, sair, AuthError } from '../src/services/autenticacao';
import { buscarEstatisticasPerfil } from '../src/database/perfilRepository';
import { contarUsuarios, buscarPorEmail } from '../src/database/usuarioRepository';
import { cpfValido, emailValido, formatarCpf, validarSenha, nomeValido, pareceCpf } from '../src/utils/validacao';

let falhas = 0;
function ok(nome: string, cond: boolean, detalhe = '') {
  if (cond) console.log(`ok   ${nome}`);
  else { falhas++; console.log(`FAIL ${nome} ${detalhe}`); }
}
async function esperaErro(nome: string, fn: () => Promise<unknown>, codigo: string, campo?: string) {
  try { await fn(); falhas++; console.log(`FAIL ${nome} (nao lancou erro)`); }
  catch (e) {
    if (e instanceof AuthError && e.code === codigo && (!campo || e.campo === campo)) console.log(`ok   ${nome} -> "${e.message}"`);
    else { falhas++; console.log(`FAIL ${nome} (erro inesperado: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)})`); }
  }
}

// ---------- validacao ----------
ok('CPF valido aceito', cpfValido('529.982.247-25'));
ok('CPF valido aceito (2)', cpfValido('111.444.777-35'));
ok('CPF com DV errado rejeitado', !cpfValido('529.982.247-24'));
ok('CPF repetido rejeitado', !cpfValido('111.111.111-11'));
ok('CPF curto rejeitado', !cpfValido('1234567890'));
ok('mascara CPF', formatarCpf('52998224725') === '529.982.247-25', formatarCpf('52998224725'));
ok('mascara CPF parcial', formatarCpf('5299') === '529.9', formatarCpf('5299'));
ok('mascara ignora excesso', formatarCpf('529982247259999') === '529.982.247-25');
ok('email valido', emailValido('Maria.Silva@Exemplo.com.br'));
ok('email sem dominio rejeitado', !emailValido('maria@exemplo'));
ok('email sem arroba rejeitado', !emailValido('mariaexemplo.com'));
ok('senha curta rejeitada', validarSenha('Ab1') !== null);
ok('senha sem numero rejeitada', validarSenha('somenteletras') !== null);
ok('senha sem letra rejeitada', validarSenha('12345678') !== null);
ok('senha boa aceita', validarSenha('senha1234') === null);
ok('nome completo exigido', !nomeValido('Maria'));
ok('nome completo aceito', nomeValido('Maria Silva'));
ok('pareceCpf so com 11 digitos', pareceCpf('529.982.247-25') && !pareceCpf('a@b.com'));

// ---------- banco ----------
const db: SQLiteDatabase = await openDatabaseAsync(':memory:');
await configureDatabase(db);
const versao = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
ok('migracao aplicou versao', versao?.user_version === LATEST_VERSION, `versao=${versao?.user_version}`);

const tabelas = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
const nomes = tabelas.map((t) => t.name);
ok(
  'tabelas de autenticacao e perfil criadas',
  nomes.includes('usuarios') && nomes.includes('sessoes') &&
    nomes.includes('pacientes') && nomes.includes('prescricoes'),
  JSON.stringify(nomes),
);

// migrar de novo deve ser inofensivo
await migrate(db);
ok('migracao e idempotente', (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version === LATEST_VERSION);

const bancoLegado = await openDatabaseAsync(':memory:');
await bancoLegado.execAsync(`
  CREATE TABLE usuarios (
    id TEXT PRIMARY KEY NOT NULL,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  );
  INSERT INTO usuarios VALUES
    ('legado', 'Ana Lima', '11144477735', 'ana@exemplo.com', 'hash', '2025-01-01', '2025-01-01');
  PRAGMA user_version = 1;
`);
await migrate(bancoLegado);
const usuarioLegado = await bancoLegado.getFirstAsync<{ crm: string; especialidade: string }>(
  'SELECT crm, especialidade FROM usuarios WHERE id = ?;',
  ['legado'],
);
ok('migracao preserva contas existentes', usuarioLegado?.crm === '' &&
  usuarioLegado.especialidade === '');
await bancoLegado.closeAsync();

// ---------- cadastro ----------
const t0 = Date.now();
const sessao = await cadastrar(db, {
  nome: '  Maria   da Silva ', cpf: '529.982.247-25', email: '  Maria.Silva@Exemplo.COM  ',
  crm: '123456-DF', especialidade: 'Cardiologia',
  senha: 'senha1234', confirmacaoSenha: 'senha1234',
});
console.log(`     (cadastro levou ${Date.now() - t0}ms, inclui a derivacao da senha)`);
ok('cadastro retorna usuario', sessao.usuario.nome === 'Maria da Silva', sessao.usuario.nome);
ok('email normalizado', sessao.usuario.email === 'maria.silva@exemplo.com', sessao.usuario.email);
ok('cpf guardado so com digitos', sessao.usuario.cpf === '52998224725', sessao.usuario.cpf);
ok('dados profissionais persistidos', sessao.usuario.crm === '123456-DF' &&
  sessao.usuario.especialidade === 'Cardiologia');
ok('usuario persistido', (await contarUsuarios(db)) === 1);
const estatisticasVazias = await buscarEstatisticasPerfil(db, sessao.usuario.id);
ok('estatisticas iniciam em zero', estatisticasVazias.pacientes === 0 &&
  estatisticasVazias.prescricoes === 0, JSON.stringify(estatisticasVazias));
await db.runAsync(
  'INSERT INTO pacientes (id, usuario_id, nome, criado_em) VALUES (?, ?, ?, ?);',
  ['paciente-maria', sessao.usuario.id, 'Paciente Maria', new Date().toISOString()],
);
await db.runAsync(
  'INSERT INTO prescricoes (id, usuario_id, paciente_id, criado_em) VALUES (?, ?, ?, ?);',
  ['prescricao-maria', sessao.usuario.id, 'paciente-maria', new Date().toISOString()],
);
const estatisticasComDados = await buscarEstatisticasPerfil(db, sessao.usuario.id);
const estatisticasJoao = await buscarEstatisticasPerfil(db, 'outro-usuario');
ok('estatisticas contam registros do usuario', estatisticasComDados.pacientes === 1 &&
  estatisticasComDados.prescricoes === 1, JSON.stringify(estatisticasComDados));
ok('estatisticas isoladas por usuario', estatisticasJoao.pacientes === 0 &&
  estatisticasJoao.prescricoes === 0, JSON.stringify(estatisticasJoao));

const linha = await buscarPorEmail(db, 'maria.silva@exemplo.com');
ok('senha NAO guardada em claro', !!linha && !linha.senha_hash.includes('senha1234'), linha?.senha_hash);
ok('hash no formato esperado', !!linha && /^pbkdf2-sha256\$40000\$[0-9a-f]{32}\$[0-9a-f]{64}$/.test(linha.senha_hash), linha?.senha_hash);

// salt diferente por usuario -> hashes diferentes para a mesma senha
const sessaoJoao = await cadastrar(db, {
  nome: 'Joao Souza', cpf: '111.444.777-35', email: 'joao@exemplo.com',
  senha: 'senha1234', confirmacaoSenha: 'senha1234',
});
ok('dados profissionais opcionais', sessaoJoao.usuario.crm === '' &&
  sessaoJoao.usuario.especialidade === '');
const joao = await buscarPorEmail(db, 'joao@exemplo.com');
ok('salt unico por usuario', !!joao && !!linha && joao.senha_hash !== linha.senha_hash);

// ---------- duplicidade e validacao no cadastro ----------
await esperaErro('email duplicado barrado', () => cadastrar(db, { nome: 'Outra Pessoa', cpf: '111.444.777-35', email: 'MARIA.SILVA@exemplo.com', senha: 'senha1234', confirmacaoSenha: 'senha1234' }), 'email_em_uso', 'email');
await esperaErro('cpf duplicado barrado', () => cadastrar(db, { nome: 'Outra Pessoa', cpf: '52998224725', email: 'nova@exemplo.com', senha: 'senha1234', confirmacaoSenha: 'senha1234' }), 'cpf_em_uso', 'cpf');
await esperaErro('nome incompleto barrado', () => cadastrar(db, { nome: 'Ana', cpf: '111.444.777-35', email: 'a@b.com', senha: 'senha1234', confirmacaoSenha: 'senha1234' }), 'dados_invalidos', 'nome');
await esperaErro('cpf invalido barrado', () => cadastrar(db, { nome: 'Ana Lima', cpf: '123.456.789-00', email: 'a@b.com', senha: 'senha1234', confirmacaoSenha: 'senha1234' }), 'dados_invalidos', 'cpf');
await esperaErro('email invalido barrado', () => cadastrar(db, { nome: 'Ana Lima', cpf: '168.995.350-09', email: 'invalido', senha: 'senha1234', confirmacaoSenha: 'senha1234' }), 'dados_invalidos', 'email');
await esperaErro('senha fraca barrada', () => cadastrar(db, { nome: 'Ana Lima', cpf: '168.995.350-09', email: 'ana@b.com', senha: '123', confirmacaoSenha: '123' }), 'dados_invalidos', 'senha');
await esperaErro('confirmacao divergente barrada', () => cadastrar(db, { nome: 'Ana Lima', cpf: '168.995.350-09', email: 'ana@b.com', senha: 'senha1234', confirmacaoSenha: 'senha4321' }), 'dados_invalidos', 'confirmacaoSenha');
ok('nenhum usuario extra criado', (await contarUsuarios(db)) === 2, String(await contarUsuarios(db)));

// ---------- login ----------
const porEmail = await entrar(db, 'MARIA.SILVA@Exemplo.com ', 'senha1234');
ok('login por email (case/espaco)', porEmail.usuario.id === sessao.usuario.id);
const porCpfMascara = await entrar(db, '529.982.247-25', 'senha1234');
ok('login por CPF com mascara', porCpfMascara.usuario.id === sessao.usuario.id);
const porCpfLimpo = await entrar(db, '52998224725', 'senha1234');
ok('login por CPF sem mascara', porCpfLimpo.usuario.id === sessao.usuario.id);

await esperaErro('senha errada barrada', () => entrar(db, 'maria.silva@exemplo.com', 'senhaErrada1'), 'credenciais_invalidas');
await esperaErro('usuario inexistente barrado', () => entrar(db, 'ninguem@exemplo.com', 'senha1234'), 'credenciais_invalidas');
await esperaErro('identificador vazio barrado', () => entrar(db, '   ', 'senha1234'), 'dados_invalidos', 'identificador');
await esperaErro('senha vazia barrada', () => entrar(db, 'maria.silva@exemplo.com', ''), 'dados_invalidos', 'senha');

// mensagem identica evita enumerar contas
try { await entrar(db, 'maria.silva@exemplo.com', 'errada123'); } catch (a) {
  try { await entrar(db, 'naoexiste@exemplo.com', 'errada123'); } catch (b) {
    const msgA = a instanceof Error ? a.message : String(a);
    const msgB = b instanceof Error ? b.message : String(b);
    ok('mesma mensagem p/ conta inexistente e senha errada', msgA === msgB, `${msgA} != ${msgB}`);
  }
}

// ---------- sessao ----------
const recuperada = await recuperarSessao(db);
ok('sessao recuperada apos reabrir', recuperada?.usuario.id === sessao.usuario.id);
await sair(db, recuperada!.id);
const restantes = await db.getAllAsync<{ id: string }>('SELECT * FROM sessoes;');
ok('sair remove so a sessao usada', restantes.length > 0);
for (const s of restantes) await sair(db, s.id);
ok('sem sessao apos sair de todas', (await recuperarSessao(db)) === null);

// sessao expirada nao vale
await db.runAsync('INSERT INTO sessoes (id, usuario_id, criada_em, expira_em) VALUES (?,?,?,?);',
  ['expirada', sessao.usuario.id, new Date(Date.now() - 86400000).toISOString(), new Date(Date.now() - 1000).toISOString()]);
ok('sessao expirada ignorada', (await recuperarSessao(db)) === null);
ok('sessao expirada removida do banco', (await db.getAllAsync('SELECT * FROM sessoes;')).length === 0);

// ---------- enumeracao por tempo ----------
// A mensagem de erro ja e a mesma nos dois casos. Aqui conferimos o outro canal:
// o tempo de resposta. Antes da correcao, conta inexistente voltava em ~0,1ms e
// senha errada em ~625ms - uma diferenca de milhares de vezes, suficiente para
// descobrir quais e-mails e CPFs estao cadastrados no aparelho.
async function tempoMedioDeLoginFalho(identificador: string): Promise<number> {
  const amostras: number[] = [];
  for (let i = 0; i < 5; i += 1) {
    const inicio = performance.now();
    try { await entrar(db, identificador, 'senhaDefinitivamenteErrada9'); } catch { /* esperado */ }
    amostras.push(performance.now() - inicio);
  }
  amostras.sort((a, b) => a - b);
  return amostras[Math.floor(amostras.length / 2)]; // mediana, menos sensivel a picos
}

const tContaExiste = await tempoMedioDeLoginFalho('joao@exemplo.com');
const tContaNaoExiste = await tempoMedioDeLoginFalho('ninguem-aqui@exemplo.com');
const razao = tContaExiste / Math.max(tContaNaoExiste, 0.001);
ok(
  'tempo de login nao revela se a conta existe',
  razao < 2 && 1 / razao < 2,
  `existe=${tContaExiste.toFixed(1)}ms inexistente=${tContaNaoExiste.toFixed(1)}ms razao=${razao.toFixed(2)}x`,
);

// ---------- integridade ----------
const fk = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys;');
ok('foreign keys ligadas', fk?.foreign_keys === 1, String(fk?.foreign_keys));
const nova = await entrar(db, 'joao@exemplo.com', 'senha1234');
await db.runAsync('DELETE FROM usuarios WHERE id = ?;', [nova.usuario.id]);
ok('ON DELETE CASCADE apaga sessoes', (await db.getAllAsync('SELECT * FROM sessoes;')).length === 0);

console.log(falhas === 0 ? '\nTODOS OS TESTES DE AUTENTICACAO PASSARAM' : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
