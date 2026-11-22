import type { SQLiteDatabase } from 'expo-sqlite';
import type { Agendamento } from '../services/agendamento';

export async function inserirAgendamento(db: SQLiteDatabase, dados: Agendamento): Promise<void> {
    await db.runAsync(
        `INSERT INTO agendamentos
         (id, usuario_id, medicamento, paciente, quantidade, via, inicio, dias, horarios, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [dados.id, dados.usuarioId, dados.medicamento, dados.paciente, dados.quantidade,
            dados.via, dados.inicio, dados.dias, JSON.stringify(dados.horarios), dados.criadoEm],
    );
}

export async function listarAgendamentos(db: SQLiteDatabase, usuarioId: string): Promise<Agendamento[]> {
    const rows = await db.getAllAsync<Omit<Agendamento, 'horarios'> & { horarios: string }>(
        `SELECT id, usuario_id AS usuarioId, medicamento, paciente, quantidade, via,
                inicio, dias, horarios, criado_em AS criadoEm
         FROM agendamentos WHERE usuario_id = ? ORDER BY criado_em DESC, id;`, [usuarioId],
    );
    return rows.map((row) => ({ ...row, horarios: JSON.parse(row.horarios) as string[] }));
}
