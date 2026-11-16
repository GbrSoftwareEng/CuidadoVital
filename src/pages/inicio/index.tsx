import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { mdiAccountOutline, mdiFileDocumentOutline } from '@mdi/js';

import Logo from '../../assets/Logo.png';
import { useAuth } from '../../contexts/AuthContext';
import type { EstatisticasPerfil } from '../../database/perfilRepository';
import { formatarCpf } from '../../utils/validacao';
import { styles } from './styles';
import AgendamentoMedicacao from '../agendamento';
import Agenda from './Agenda';

type Aba = 'alertas' | 'agenda' | 'perfil';

function Icone({ caminho }: { caminho: string }) {
    return (
        <Svg width={25} height={25} viewBox="0 0 24 24">
            <Path d={caminho} fill="#FFFFFF" />
        </Svg>
    );
}

export default function Inicio() {
    const { usuario, fazerLogout, buscarEstatisticasPerfil } = useAuth();
    const [aba, setAba] = useState<Aba>('perfil');
    const [estatisticas, setEstatisticas] = useState<EstatisticasPerfil | null>(null);
    const [carregandoEstatisticas, setCarregandoEstatisticas] = useState(true);
    const [erroEstatisticas, setErroEstatisticas] = useState<string | null>(null);
    const [saindo, setSaindo] = useState(false);
    const [erroSaida, setErroSaida] = useState<string | null>(null);

    useEffect(() => {
        if (!usuario) {
            return;
        }

        let ativo = true;
        setCarregandoEstatisticas(true);
        setErroEstatisticas(null);

        buscarEstatisticasPerfil(usuario.id)
            .then((resultado) => {
                if (ativo) {
                    setEstatisticas(resultado);
                }
            })
            .catch((erro: unknown) => {
                console.error('Falha ao carregar estatisticas do perfil', erro);
                if (ativo) {
                    setErroEstatisticas('Não foi possível carregar as estatísticas.');
                }
            })
            .finally(() => {
                if (ativo) {
                    setCarregandoEstatisticas(false);
                }
            });

        return () => {
            ativo = false;
        };
    }, [usuario, buscarEstatisticasPerfil]);

    if (!usuario) {
        return null;
    }

    const usuarioLogado = usuario;

    async function aoSair() {
        setSaindo(true);
        setErroSaida(null);
        try {
            await fazerLogout();
        } catch (erro) {
            console.error('Falha ao encerrar sessao', erro);
            setErroSaida('Não foi possível sair. Tente novamente.');
        } finally {
            setSaindo(false);
        }
    }

    function renderizarPerfil() {
        const iniciais = usuarioLogado.nome
            .split(/\s+/)
            .slice(0, 2)
            .map((parte) => parte[0])
            .join('')
            .toUpperCase();

        return (
            <>
                <View style={styles.cabecalho}>
                    <Image source={Logo} style={styles.logo} resizeMode="contain" />
                    <Pressable
                        style={styles.botaoSair}
                        onPress={aoSair}
                        disabled={saindo}
                        accessibilityRole="button"
                        accessibilityLabel="Sair da conta"
                    >
                        {saindo ? (
                            <ActivityIndicator color="#365E7C" />
                        ) : (
                            <Text style={styles.botaoSairTexto}>Sair</Text>
                        )}
                    </Pressable>
                </View>

                <Text style={styles.titulo}>Meu Perfil</Text>

                <View style={styles.avatar}>
                    <Text style={styles.iniciais}>{iniciais}</Text>
                </View>

                <Text style={styles.nome}>{usuarioLogado.nome}</Text>
                <Text style={styles.crm}>
                    {usuarioLogado.crm ? `CRM ${usuarioLogado.crm}` : 'CRM não informado'}
                </Text>
                <Text style={styles.especialidade}>
                    {usuarioLogado.especialidade
                        ? `Especialidade: ${usuarioLogado.especialidade}`
                        : 'Especialidade não informada'}
                </Text>

                <View style={styles.dadosPessoais}>
                    <Text style={styles.dado}>{usuarioLogado.email}</Text>
                    <Text style={styles.dado}>CPF {formatarCpf(usuarioLogado.cpf)}</Text>
                </View>

                <View style={styles.cartaoEstatisticas}>
                    <View style={styles.linhaEstatistica}>
                        <View style={styles.iconeEstatistica}>
                            <Icone caminho={mdiAccountOutline} />
                        </View>
                        <Text style={styles.textoEstatistica}>
                            Pacientes atendidos:{' '}
                            {carregandoEstatisticas
                                ? '...'
                                : estatisticas?.pacientes ?? (erroEstatisticas ? '—' : 0)}
                        </Text>
                    </View>
                    <View style={styles.divisor} />
                    <View style={styles.linhaEstatistica}>
                        <View style={styles.iconeEstatistica}>
                            <Icone caminho={mdiFileDocumentOutline} />
                        </View>
                        <Text style={styles.textoEstatistica}>
                            Prescrições:{' '}
                            {carregandoEstatisticas
                                ? '...'
                                : estatisticas?.prescricoes ?? (erroEstatisticas ? '—' : 0)}
                        </Text>
                    </View>
                </View>
                {erroEstatisticas ? (
                    <Text style={styles.erro}>{erroEstatisticas}</Text>
                ) : null}
                {erroSaida ? <Text style={styles.erro}>{erroSaida}</Text> : null}

                <Pressable
                    style={styles.botaoAgenda}
                    onPress={() => setAba('agenda')}
                    accessibilityRole="button"
                >
                    <Text style={styles.botaoAgendaTexto}>VER AGENDA COMPLETA</Text>
                </Pressable>
            </>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.conteudo}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {aba === 'perfil' ? renderizarPerfil() : aba === 'alertas' ? <AgendamentoMedicacao /> : <Agenda usuarioId={usuarioLogado.id} />}
            </ScrollView>

            <View style={styles.navegacao}>
                <Pressable
                    style={styles.itemNavegacao}
                    onPress={() => setAba('alertas')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: aba === 'alertas' }}
                >
                    <Text style={styles.maisIcone}>+</Text>
                    <Text style={styles.textoNavegacao}>Criar Alerta</Text>
                </Pressable>
                <Pressable
                    style={styles.itemNavegacao}
                    onPress={() => setAba('agenda')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: aba === 'agenda' }}
                >
                    <Icone caminho={mdiFileDocumentOutline} />
                    <Text style={styles.textoNavegacao}>Agenda de pacientes</Text>
                </Pressable>
                <Pressable
                    style={styles.itemNavegacao}
                    onPress={() => setAba('perfil')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: aba === 'perfil' }}
                >
                    <Icone caminho={mdiAccountOutline} />
                    <Text style={styles.textoNavegacao}>Perfil</Text>
                </Pressable>
            </View>
        </View>
    );
}
