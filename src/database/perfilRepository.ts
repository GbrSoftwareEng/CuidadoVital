import type { SQLiteDatabase } from 'expo-sqlite';

export type EstatisticasPerfil = {
    pacientes: number;
    prescricoes: number;
};

export async function buscarEstatisticasPerfil(
    db: SQLiteDatabase,
    usuarioId: string,
): Promise<EstatisticasPerfil> {
    const [pacientes, prescricoes] = await Promise.all([
        db.getFirstAsync<{ total: number }>(
            'SELECT COUNT(*) AS total FROM pacientes WHERE usuario_id = ?;',
            [usuarioId],
        ),
        db.getFirstAsync<{ total: number }>(
            'SELECT COUNT(*) AS total FROM prescricoes WHERE usuario_id = ?;',
            [usuarioId],
        ),
    ]);

    return {
        pacientes: pacientes?.total ?? 0,
        prescricoes: prescricoes?.total ?? 0,
    };
}
