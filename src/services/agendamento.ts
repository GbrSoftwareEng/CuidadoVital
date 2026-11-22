import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { inserirAgendamento } from '../database/agendamentoRepository';

export const VIAS = ['Oral', 'Sublingual', 'Tópica', 'Inalatória', 'Injetável', 'Outra'] as const;
export type DadosAgendamento = {
    medicamento: string;
    paciente: string;
    quantidade: string;
    via: string;
    inicio: string;
    continuo: boolean;
    dias: string;
    horarios: string[];
};
export type Agendamento = {
    id: string;
    usuarioId: string;
    medicamento: string;
    paciente: string;
    quantidade: string;
    via: string;
    inicio: string;
    dias: number | null;
    horarios: string[];
    criadoEm: string;
};

export function dataHoje(): string {
    const hoje = new Date();
    return `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
}

export function formatarData(valor: string): string {
    const digitos = valor.replace(/\D/g, '').slice(0, 8);
    return digitos.length <= 2 ? digitos : digitos.length <= 4
        ? `${digitos.slice(0, 2)}/${digitos.slice(2)}`
        : `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

export function formatarHorario(valor: string): string {
    const digitos = valor.replace(/\D/g, '').slice(0, 4);
    return digitos.length <= 2 ? digitos : `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
}

/** Valida antes de gravar; horarios vazios sao espacos opcionais do formulario. */
export function validarAgendamento(dados: DadosAgendamento): string | null {
    if (!dados.medicamento.trim()) return 'Informe o nome do medicamento.';
    if (!dados.paciente.trim()) return 'Informe o nome do paciente.';
    if (!dados.quantidade.trim()) return 'Informe a quantidade da dosagem.';
    if (!VIAS.some((via) => via === dados.via)) return 'Selecione a via de administração.';
    const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dados.inicio);
    if (!partes) return 'Informe a data de início no formato DD/MM/AAAA.';
    const [, dia, mes, ano] = partes.map(Number);
    const data = new Date(ano, mes - 1, dia);
    if (ano < 1900 || data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
        return 'Informe uma data de início válida.';
    }
    if (!dados.continuo && (!/^\d{1,4}$/.test(dados.dias) || Number(dados.dias) < 1)) {
        return 'Informe uma duração entre 1 e 9999 dias.';
    }
    const horarios = dados.horarios.filter((hora) => hora.trim());
    if (!horarios.length) return 'Adicione pelo menos um horário.';
    if (horarios.length > 6) return 'Adicione no máximo seis horários.';
    if (horarios.some((hora) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora))) {
        return 'Informe horários válidos no formato HH:MM (00:00 a 23:59).';
    }
    if (new Set(horarios).size !== horarios.length) return 'Os horários não podem se repetir.';
    return null;
}

export async function agendar(db: SQLiteDatabase, usuarioId: string, dados: DadosAgendamento): Promise<Agendamento> {
    const erro = validarAgendamento(dados);
    if (erro) throw new Error(erro);
    const agendamento: Agendamento = {
        id: Crypto.randomUUID(), usuarioId,
        medicamento: dados.medicamento.trim(), paciente: dados.paciente.trim(),
        quantidade: dados.quantidade.trim(), via: dados.via, inicio: dados.inicio,
        dias: dados.continuo ? null : Number(dados.dias),
        horarios: dados.horarios.filter((hora) => hora.trim()).sort(),
        criadoEm: new Date().toISOString(),
    };
    await inserirAgendamento(db, agendamento);
    return agendamento;
}
