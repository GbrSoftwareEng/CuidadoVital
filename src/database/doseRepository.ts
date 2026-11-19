import type { SQLiteDatabase } from 'expo-sqlite';

export type DoseRegistrada = {
    id: string;
    usuarioId: string;
    agendamentoId: string;
    /** Dia da dose, no formato AAAA-MM-DD. */
    data: string;
    /** Horario previsto no agendamento, ex.: "22:00". */
    horario: string;
    /** Momento real do registro (ISO). */
    registradaEm: string;
};

/**
 * Grava a dose como tomada. `INSERT OR IGNORE` + UNIQUE(agendamento_id, data, horario)
 * impedem registrar duas vezes a mesma dose (ex.: duplo toque no botao).
 */
export async function registrarDose(db: SQLiteDatabase, dose: DoseRegistrada): Promise<void> {
    await db.runAsync(
        `INSERT OR IGNORE INTO doses_registradas
         (id, usuario_id, agendamento_id, data, horario, registrada_em)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [dose.id, dose.usuarioId, dose.agendamentoId, dose.data, dose.horario, dose.registradaEm],
    );
}

/** Doses ja registradas nas datas informadas (AAAA-MM-DD). */
export async function listarDoses(
    db: SQLiteDatabase,
    usuarioId: string,
    datas: string[],
): Promise<Pick<DoseRegistrada, 'agendamentoId' | 'data' | 'horario'>[]> {
    if (datas.length === 0) {
        return [];
    }
    const marcadores = datas.map(() => '?').join(', ');
    return db.getAllAsync<Pick<DoseRegistrada, 'agendamentoId' | 'data' | 'horario'>>(
        `SELECT agendamento_id AS agendamentoId, data, horario
         FROM doses_registradas
         WHERE usuario_id = ? AND data IN (${marcadores});`,
        [usuarioId, ...datas],
    );
}