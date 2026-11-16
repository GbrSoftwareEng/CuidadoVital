import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { mdiFileDocumentOutline } from '@mdi/js';
import { getDatabase } from '../../database';
import { listarAgendamentos } from '../../database/agendamentoRepository';
import type { Agendamento } from '../../services/agendamento';
import { styles } from './styles';

export default function Agenda({ usuarioId }: { usuarioId: string }) {
    const [registros, setRegistros] = useState<Agendamento[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [tentativa, setTentativa] = useState(0);

    // A aba monta novamente a cada abertura: inclui os agendamentos recem-salvos
    // e os anteriores, sem recriar registros nem alterar o banco do aparelho.
    useEffect(() => {
        let ativo = true;
        setCarregando(true);
        setErro(null);
        getDatabase()
            .then((db) => listarAgendamentos(db, usuarioId))
            .then((lista) => { if (ativo) setRegistros(lista); })
            .catch(() => { if (ativo) setErro('Não foi possível carregar a agenda. Tente novamente.'); })
            .finally(() => { if (ativo) setCarregando(false); });
        return () => { ativo = false; };
    }, [usuarioId, tentativa]);

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

    return (
        <View style={styles.agendaLista}>
            <Text accessibilityRole="header" style={styles.titulo}>Agenda de pacientes</Text>
            {registros.map((item) => (
                <View key={item.id} style={styles.agendaCartao}>
                    <Text style={styles.agendaPaciente}>{item.paciente}</Text>
                    <Text style={styles.agendaMedicacao}>{item.medicamento}</Text>
                    <Text style={styles.agendaDetalhe}>{item.quantidade} · {item.via}</Text>
                    <Text style={styles.agendaDetalhe}>Início: {item.inicio}</Text>
                    <Text style={styles.agendaDetalhe}>Duração: {item.dias === null ? 'Uso contínuo' : `${item.dias} dias`}</Text>
                    <Text style={styles.agendaDetalhe}>Horários: {item.horarios.join(' · ')}</Text>
                </View>
            ))}
        </View>
    );
}
