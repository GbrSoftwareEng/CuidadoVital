import assert from 'node:assert/strict';
import { openDatabaseAsync } from './shims/expo-sqlite.ts';
import { configureDatabase } from '../src/database';
import { MIGRATIONS, migrate } from '../src/database/migrations';
import { inserirUsuario } from '../src/database/usuarioRepository';
import { listarAgendamentos } from '../src/database/agendamentoRepository';
import { agendar, validarAgendamento, type DadosAgendamento } from '../src/services/agendamento';

const db = await openDatabaseAsync(':memory:');
// Simula um aparelho na versao 2 da main, com perfil cadastrado.
await db.execAsync('PRAGMA foreign_keys = ON;');
for (const migration of MIGRATIONS.slice(0, 2)) {
    for (const sql of migration.statements) await db.execAsync(sql);
}
await db.execAsync('PRAGMA user_version = 2;');
for (const id of ['usuario-1', 'usuario-2']) {
    await inserirUsuario(db, { id, nome: id, cpf: id, email: `${id}@teste.com`, crm: '12345', especialidade: 'Clínica', senhaHash: 'hash-teste' });
}
await configureDatabase(db);
await migrate(db);
assert.equal((await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM usuarios'))?.total, 2);
assert.equal((await db.getFirstAsync<{ crm: string }>('SELECT crm FROM usuarios LIMIT 1'))?.crm, '12345');
console.log('ok   migracao preserva contas existentes e pode ser repetida');

const dados: DadosAgendamento = {
    medicamento: ' Medicamento fictício ', paciente: ' Paciente teste ', quantidade: '1 unidade',
    via: 'Oral', inicio: '29/02/2028', continuo: false, dias: '10', horarios: ['20:00', '', '08:00'],
};
for (const alteracao of [
    { medicamento: ' ' }, { paciente: '' }, { quantidade: '' }, { via: 'inexistente' },
    { inicio: '29/02/2027' }, { inicio: '31/04/2028' }, { inicio: '1/1/2028' },
    { dias: '0' }, { dias: '1.5' }, { dias: '10000' }, { horarios: [''] },
    { horarios: ['24:00'] }, { horarios: ['12:60'] }, { horarios: ['08:00', '08:00'] },
]) assert.ok(validarAgendamento({ ...dados, ...alteracao }), JSON.stringify(alteracao));
assert.equal(validarAgendamento(dados), null);
assert.equal(validarAgendamento({ ...dados, horarios: ['00:00', '23:59'] }), null);
assert.equal(validarAgendamento({ ...dados, continuo: true, dias: '' }), null);
console.log('ok   campos obrigatorios, datas reais, duracao e horarios validados');

await assert.rejects(() => agendar(db, 'usuario-1', { ...dados, horarios: ['25:00'] }));
assert.equal((await listarAgendamentos(db, 'usuario-1')).length, 0);
const salvo = await agendar(db, 'usuario-1', dados);
assert.equal(salvo.medicamento, 'Medicamento fictício');
assert.deepEqual(salvo.horarios, ['08:00', '20:00']);
assert.equal(salvo.dias, 10);
assert.deepEqual(await listarAgendamentos(db, 'usuario-1'), [salvo]);
assert.deepEqual(await listarAgendamentos(db, 'usuario-2'), []);
console.log('ok   gravacao real no SQLite, normalizacao e isolamento por usuario');

const continuo = await agendar(db, 'usuario-1', { ...dados, continuo: true, dias: '', horarios: ['00:00'] });
assert.equal(continuo.dias, null);
await assert.rejects(() => agendar(db, 'usuario-inexistente', dados));
await db.runAsync('DELETE FROM usuarios WHERE id = ?', ['usuario-1']);
assert.deepEqual(await listarAgendamentos(db, 'usuario-1'), []);
console.log('ok   uso continuo, chave estrangeira e exclusao em cascata');
await db.closeAsync();
console.log('\nTODOS OS TESTES DE AGENDAMENTO PASSARAM');
