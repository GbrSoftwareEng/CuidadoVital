import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { mdiFileDocumentOutline } from '@mdi/js';
import { randomUUID } from 'expo-crypto';

import Logo from '../../assets/Logo.png';
import { getDatabase } from '../../database';
import { listarAgendamentos } from '../../database/agendamentoRepository';
import { listarDoses, registrarDose } from '../../database/doseRepository';
import { theme } from '../../global/themes';
import type { Agendamento } from '../../services/agendamento';
import { styles } from './styles';

/** Um horário de um agendamento, em um dia específico (hoje ou amanhã). */
type Ocorrencia = {
    chave: string;
    agendamentoId: string;
    paciente: string;
    medicamento: string;
    data: string; // AAAA-MM-DD
    horario: string; // "22:00"
    momento: Date;
    amanha: boolean;
};

/** Um medicamento com pelo menos uma dose tomada hoje, e todos os seus horários do dia. */
type GrupoTomado = {
    agendamentoId: string;
    medicamento: string;
    paciente: string;
    doses: { horario: string; tomada: boolean }[];
};

const COR_AGENDADO = '#E67E22';

function dois(n: number): string {
    return String(n).padStart(2, '0');
}

/** AAAA-MM-DD, no fuso do aparelho. */
function chaveData(d: Date): string {
    return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

function chaveDose(agendamentoId: string, data: string, horario: string): string {
    return `${agendamentoId}|${data}|${horario}`;
}

/** Lê "DD/MM/AAAA" (formato gravado em `inicio`). */
function lerInicio(texto: string): Date | null {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
    if (!m) {
        return null;
    }
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function lerHorario(texto: string): { h: number; min: number } | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec(texto.trim());
    if (!m) {
        return null;
    }
    const h = Number(m[1]);
    const min = Number(m[2]);
    return h < 24 && min < 60 ? { h, min } : null;
}

/** O agendamento vale neste dia? (já começou e a duração não acabou) */
function ativoNoDia(registro: Agendamento, dia: Date): boolean {
    const inicio = lerInicio(registro.inicio);
    if (!inicio || dia < inicio) {
        return false;
    }
    if (registro.dias === null) {
        return true; // uso contínuo
    }
    const fim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + registro.dias);
    return dia < fim;
}

/** Todos os horários de hoje e de amanhã, em ordem de horário. */
function montarOcorrencias(registros: Agendamento[], agora: Date): Ocorrencia[] {
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
    const dias = [
        { dia: hoje, ehAmanha: false },
        { dia: amanha, ehAmanha: true },
    ];

    const lista: Ocorrencia[] = [];
    for (const registro of registros) {
        for (const { dia, ehAmanha } of dias) {
            if (!ativoNoDia(registro, dia)) {
                continue;
            }
            const data = chaveData(dia);
            for (const horario of registro.horarios) {
                const hora = lerHorario(horario);
                if (!hora) {
                    continue;
                }
                lista.push({
                    chave: chaveDose(registro.id, data, horario),
                    agendamentoId: registro.id,
                    paciente: registro.paciente.trim(),
                    medicamento: registro.medicamento.trim(),
                    data,
                    horario,
                    momento: new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), hora.h, hora.min),
                    amanha: ehAmanha,
                });
            }
        }
    }
    return lista.sort((a, b) => a.momento.getTime() - b.momento.getTime());
}

/**
 * Medicamentos com pelo menos uma dose tomada hoje. Cada um traz todos os seus
 * horários do dia; os já registrados ficam marcados como tomados (OK).
 */
function montarTomadas(ocorrenciasHoje: Ocorrencia[], tomadas: Set<string>): GrupoTomado[] {
    const grupos = new Map<string, GrupoTomado>();
    for (const o of ocorrenciasHoje) {
        let grupo = grupos.get(o.agendamentoId);
        if (!grupo) {
            grupo = {
                agendamentoId: o.agendamentoId,
                medicamento: o.medicamento,
                paciente: o.paciente,
                doses: [],
            };
            grupos.set(o.agendamentoId, grupo);
        }
        grupo.doses.push({ horario: o.horario, tomada: tomadas.has(o.chave) });
    }
    return Array.from(grupos.values()).filter((g) => g.doses.some((d) => d.tomada));
}

export default function Agenda({ usuarioId }: { usuarioId: string }) {
    const [registros, setRegistros] = useState<Agendamento[]>([]);
    const [tomadas, setTomadas] = useState<Set<string>>(new Set());
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [tentativa, setTentativa] = useState(0);
    const [agora, setAgora] = useState(() => new Date());
    const [registrando, setRegistrando] = useState(false);
    const [erroRegistro, setErroRegistro] = useState<string | null>(null);
    const trava = useRef(false);

    // A aba monta novamente a cada abertura: traz os agendamentos e as doses de hoje
    // já registradas, sem recriar registros nem alterar o banco do aparelho.
    useEffect(() => {
        let ativo = true;
        setCarregando(true);
        setErro(null);
        getDatabase()
            .then((db) =>
                Promise.all([
                    listarAgendamentos(db, usuarioId),
                    listarDoses(db, usuarioId, [chaveData(new Date())]),
                ]),
            )
            .then(([lista, doses]) => {
                if (!ativo) {
                    return;
                }
                setRegistros(lista);
                setTomadas(new Set(doses.map((d) => chaveDose(d.agendamentoId, d.data, d.horario))));
            })
            .catch(() => { if (ativo) setErro('Não foi possível carregar a agenda. Tente novamente.'); })
            .finally(() => { if (ativo) setCarregando(false); });
        return () => { ativo = false; };
    }, [usuarioId, tentativa]);

    // Atualiza o "agora" a cada minuto, para a dose mais próxima acompanhar o relógio.
    useEffect(() => {
        const intervalo = setInterval(() => setAgora(new Date()), 60000);
        return () => clearInterval(intervalo);
    }, []);

    const ocorrencias = useMemo(() => montarOcorrencias(registros, agora), [registros, agora]);
    const ocorrenciasHoje = useMemo(() => ocorrencias.filter((o) => !o.amanha), [ocorrencias]);

    // Dose mais próxima: entre as de hoje ainda não tomadas, a de horário mais perto
    // de agora (um pouco antes ou um pouco depois).
    const doseMaisProxima = useMemo(() => {
        let escolhida: Ocorrencia | null = null;
        let menorDistancia = Infinity;
        for (const item of ocorrenciasHoje) {
            if (tomadas.has(item.chave)) {
                continue;
            }
            const distancia = Math.abs(item.momento.getTime() - agora.getTime());
            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                escolhida = item;
            }
        }
        return escolhida;
    }, [ocorrenciasHoje, tomadas, agora]);

    // Doses cujo horário ainda vai chegar (hoje e amanhã), sem as já tomadas
    // e sem repetir a dose do botão.
    const proximas = useMemo(
        () =>
            ocorrencias.filter(
                (item) =>
                    item.momento.getTime() > agora.getTime() &&
                    !tomadas.has(item.chave) &&
                    item.chave !== doseMaisProxima?.chave,
            ),
        [ocorrencias, tomadas, agora, doseMaisProxima],
    );

    const tomadasHoje = useMemo(
        () => montarTomadas(ocorrenciasHoje, tomadas),
        [ocorrenciasHoje, tomadas],
    );

    async function aoRegistrar() {
        const dose = doseMaisProxima;
        if (!dose || trava.current) {
            return;
        }
        trava.current = true;
        setRegistrando(true);
        setErroRegistro(null);
        try {
            const db = await getDatabase();
            await registrarDose(db, {
                id: randomUUID(),
                usuarioId,
                agendamentoId: dose.agendamentoId,
                data: dose.data,
                horario: dose.horario,
                registradaEm: new Date().toISOString(),
            });
            setTomadas((anterior) => new Set(anterior).add(dose.chave));
        } catch (e) {
            console.error('Falha ao registrar a dose', e);
            setErroRegistro('Não foi possível registrar a dose. Tente novamente.');
        } finally {
            trava.current = false;
            setRegistrando(false);
        }
    }

    if (carregando) {
        return <View style={styles.estadoVazio}><ActivityIndicator accessibilityLabel="Carregando agenda" /></View>;
    }

    if (erro) {
        return (
            <View style={styles.estadoVazio}>
                <Text accessibilityRole="alert" style={styles.erro}>{erro}</Text>
                <Pressable style={styles.botaoAgenda} accessibilityRole="button" onPress={() => setTentativa((atual) => atual + 1)}>
                    <Text style={styles.botaoAgendaTexto}>TENTAR NOVAMENTE</Text>
                </Pressable>
            </View>
        );
    }

    if (registros.length === 0) {
        return (
            <View style={styles.estadoVazio}>
                <View style={styles.iconeVazio}>
                    <Svg width={25} height={25} viewBox="0 0 24 24"><Path d={mdiFileDocumentOutline} fill="#FFFFFF" /></Svg>
                </View>
                <Text style={styles.tituloVazio}>Agenda de pacientes</Text>
                <Text style={styles.descricaoVazia}>Sua agenda ainda está vazia. Os compromissos aparecerão aqui quando forem cadastrados.</Text>
            </View>
        );
    }

    const semDose = !doseMaisProxima;

    return (
        <View style={local.container}>
            <Image source={Logo} style={styles.logo} resizeMode="contain" />
            <Text accessibilityRole="header" style={styles.titulo}>Agenda de pacientes</Text>

            <View style={local.cartaoDose}>
                <Text style={local.doseTexto}>
                    Dose do Momento: {doseMaisProxima ? doseMaisProxima.horario : '—'}
                </Text>
                <Text style={local.doseDetalhe}>
                    {doseMaisProxima
                        ? `${doseMaisProxima.medicamento} · ${doseMaisProxima.paciente}`
                        : ocorrenciasHoje.length > 0
                            ? 'Todas as doses de hoje já foram registradas.'
                            : 'Nenhuma dose prevista para hoje.'}
                </Text>
                <Pressable
                    style={[local.botaoRegistrar, (semDose || registrando) && local.botaoDesabilitado]}
                    accessibilityRole="button"
                    accessibilityLabel="Registrar dose agora"
                    accessibilityState={{ disabled: semDose || registrando, busy: registrando }}
                    disabled={semDose || registrando}
                    onPress={aoRegistrar}
                >
                    {registrando ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={local.botaoRegistrarTexto}>Registrar Agora</Text>
                    )}
                </Pressable>
                {erroRegistro ? (
                    <Text accessibilityRole="alert" style={local.erroRegistro}>{erroRegistro}</Text>
                ) : null}
            </View>

            <View style={local.secao}>
                <Text style={local.secaoTitulo}>DOSES TOMADAS HOJE</Text>
                <View style={local.listaCartao}>
                    {tomadasHoje.length === 0 ? (
                        <Text style={local.vazio}>Nenhuma dose registrada hoje.</Text>
                    ) : (
                        tomadasHoje.map((grupo, indice) => (
                            <View
                                key={grupo.agendamentoId}
                                style={[local.bloco, indice > 0 && local.blocoDivisor]}
                            >
                                <Text style={local.blocoTitulo}>
                                    {grupo.medicamento} · {grupo.paciente}
                                </Text>
                                {grupo.doses.map((dose, i) => (
                                    <Text key={`${dose.horario}-${i}`} style={local.linhaTexto}>
                                        Dose das {dose.horario} -{' '}
                                        <Text style={dose.tomada ? local.textoOk : local.textoAguardando}>
                                            {dose.tomada ? 'OK' : 'aguardando'}
                                        </Text>
                                    </Text>
                                ))}
                            </View>
                        ))
                    )}
                </View>
            </View>

            <View style={local.secao}>
                <Text style={local.secaoTitulo}>PRÓXIMOS AGENDAMENTOS</Text>
                <View style={local.listaCartao}>
                    {proximas.length === 0 ? (
                        <Text style={local.vazio}>Não há mais doses previstas para hoje nem para amanhã.</Text>
                    ) : (
                        proximas.map((item, indice) => (
                            <View
                                key={item.chave}
                                style={[local.linha, indice === 0 && { borderTopWidth: 0 }]}
                            >
                                <Text style={local.linhaTexto}>
                                    {item.medicamento} - {item.horario} · {item.paciente}{' '}
                                    <Text style={{ color: item.amanha ? theme.colors.sucesso : COR_AGENDADO }}>
                                        ({item.amanha ? 'Amanhã' : 'Agendado'})
                                    </Text>
                                </Text>
                            </View>
                        ))
                    )}
                </View>
            </View>
        </View>
    );
}

const local = StyleSheet.create({
    container: {
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
    },
    cartaoDose: {
        width: '100%',
        marginTop: 20,
        paddingHorizontal: 16,
        paddingVertical: 20,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
    },
    doseTexto: {
        color: theme.colors.titulo,
        fontSize: 17,
        fontWeight: '700',
    },
    doseDetalhe: {
        marginTop: 4,
        color: theme.colors.links,
        fontSize: 14,
        textAlign: 'center',
    },
    botaoRegistrar: {
        width: '100%',
        minHeight: 44,
        marginTop: 14,
        borderRadius: 24,
        backgroundColor: theme.colors.botao,
        alignItems: 'center',
        justifyContent: 'center',
    },
    botaoDesabilitado: {
        backgroundColor: theme.colors.botaoDesabilitado,
    },
    botaoRegistrarTexto: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    erroRegistro: {
        marginTop: 10,
        color: theme.colors.erro,
        fontSize: 13,
        textAlign: 'center',
    },
    secao: {
        width: '100%',
        marginTop: 28,
    },
    secaoTitulo: {
        marginBottom: 8,
        color: theme.colors.titulo,
        fontSize: 13,
        letterSpacing: 0.4,
    },
    listaCartao: {
        width: '100%',
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
    },
    bloco: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    blocoDivisor: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.cinza,
    },
    blocoTitulo: {
        marginBottom: 4,
        color: theme.colors.titulo,
        fontSize: 15,
        fontWeight: '700',
    },
    linha: {
        minHeight: 46,
        paddingHorizontal: 16,
        paddingVertical: 8,
        justifyContent: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.colors.cinza,
    },
    linhaTexto: {
        color: theme.colors.titulo,
        fontSize: 14,
        lineHeight: 20,
    },
    textoOk: {
        color: theme.colors.sucesso,
        fontWeight: '700',
    },
    textoAguardando: {
        color: theme.colors.links,
    },
    vazio: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        color: theme.colors.links,
        fontSize: 14,
    },
});