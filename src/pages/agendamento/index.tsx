import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { mdiCalendarMonth, mdiChevronDown, mdiClockOutline, mdiFileDocument, mdiPlus, mdiMinus } from '@mdi/js';
import Logo from '../../assets/Logo.png';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database';
import { agendar, dataHoje, formatarData, formatarHorario, validarAgendamento, VIAS } from '../../services/agendamento';
import { styles as s } from './styles';

function Icone({ path, cor = '#A8B3B8', size = 20 }: { path: string; cor?: string; size?: number }) {
    return <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden><Path d={path} fill={cor} /></Svg>;
}

export default function AgendamentoMedicacao() {
    const { usuario } = useAuth();
    const [medicamento, setMedicamento] = useState('');
    const [paciente, setPaciente] = useState('');
    const [quantidade, setQuantidade] = useState('');
    const [via, setVia] = useState<string>('Oral');
    const [viasAbertas, setViasAbertas] = useState(false);
    const [inicio, setInicio] = useState(dataHoje);
    const [continuo, setContinuo] = useState(true);
    const [dias, setDias] = useState('10');
    const [horarios, setHorarios] = useState(['', '', '', '', '', '']);
    const [erro, setErro] = useState<string | null>(null);
    const [sucesso, setSucesso] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);
    const trava = useRef(false);
    const camposHorario = useRef<(TextInput | null)[]>([]);
    function editar<T>(setter: (valor: T) => void) {
        return (valor: T) => { setter(valor); setErro(null); setSucesso(null); };
    }

    async function confirmar() {
        if (trava.current || !usuario) return;
        const dados = { medicamento, paciente, quantidade, via, inicio, continuo, dias, horarios };
        const problema = validarAgendamento(dados);
        setSucesso(null);
        if (problema) { setErro(problema); return; }
        trava.current = true;
        setSalvando(true);
        setErro(null);
        try {
            await agendar(await getDatabase(), usuario.id, dados);
            setMedicamento(''); setPaciente(''); setQuantidade(''); setHorarios(['', '', '', '', '', '']);
            setSucesso('Agendamento confirmado!');
        } catch {
            setErro('Não foi possível salvar o agendamento. Tente novamente.');
        } finally { trava.current = false; setSalvando(false); }
    }

    return (
        <View style={s.conteudo}>
                    <View style={s.marca}>
                        <View style={s.logoRecorte}><Image source={Logo} style={s.logo} accessibilityLabel="Logo Cuidado Vital" /></View>
                        <Text style={s.marcaTexto}>CUIDADO <Text style={s.marcaVerde}>VITAL</Text></Text>
                    </View>
                    <Text accessibilityRole="header" style={s.titulo}>AGENDAR MEDICAÇÃO</Text>
                        <View style={s.formulario}>
                            <View style={s.card}>
                                <View>
                                    <Text style={s.rotulo}>MEDICAÇÃO</Text>
                                    <View style={s.campoLinha}>
                                        <TextInput style={s.campo} accessibilityLabel="Nome do medicamento" placeholder="Nome do Medicamento" placeholderTextColor="#8A969C" value={medicamento} onChangeText={editar(setMedicamento)} editable={!salvando} maxLength={120} />
                                        <Icone path={mdiFileDocument} />
                                    </View>
                                </View>
                                <View>
                                    <Text style={s.rotulo}>PACIENTE</Text>
                                    <View style={s.campoLinha}>
                                        <TextInput style={s.campo} accessibilityLabel="Nome do paciente" placeholder="Nome do Paciente" placeholderTextColor="#8A969C" value={paciente} onChangeText={editar(setPaciente)} editable={!salvando} maxLength={120} />
                                        <Icone path={mdiFileDocument} />
                                    </View>
                                </View>
                                <View>
                                    <Text style={s.rotulo}>DOSAGEM</Text>
                                    <View style={s.linha}>
                                        <View style={s.coluna}>
                                            <Text style={s.pequeno}>Quantidade</Text>
                                            <TextInput style={s.campo} accessibilityLabel="Quantidade da dosagem" placeholder="1 comprimido" placeholderTextColor="#8A969C" value={quantidade} onChangeText={editar(setQuantidade)} editable={!salvando} maxLength={80} />
                                        </View>
                                        <View style={s.coluna}>
                                            <Text style={s.pequeno}>Via de administração</Text>
                                            <Pressable style={s.seletor} accessibilityRole="button" accessibilityLabel={`Via de administração: ${via}`} accessibilityState={{ expanded: viasAbertas }} onPress={() => setViasAbertas(!viasAbertas)} disabled={salvando}>
                                                <Text style={s.seletorTexto}>{via}</Text><Icone path={mdiChevronDown} size={16} cor="#43565D" />
                                            </Pressable>
                                        </View>
                                    </View>
                                    {viasAbertas && <View style={s.opcoes}>{VIAS.map((item) => <Pressable key={item} style={s.opcao} accessibilityRole="button" onPress={() => { editar(setVia)(item); setViasAbertas(false); }}><Text style={s.opcaoTexto}>{item}</Text></Pressable>)}</View>}
                                </View>
                            </View>
                            <View style={[s.card, s.frequencia]}>
                                <Text style={s.rotulo}>HORÁRIO E FREQUÊNCIA</Text>
                                <View style={s.linha}>
                                    <View style={s.coluna}>
                                        <Text style={s.pequeno}>Início</Text>
                                        <View style={s.campoLinha}>
                                            <TextInput style={s.campo} accessibilityLabel="Data de início" placeholder="DD/MM/AAAA" value={inicio} onChangeText={editar((v: string) => setInicio(formatarData(v)))} keyboardType="number-pad" maxLength={10} editable={!salvando} />
                                            <Icone path={mdiCalendarMonth} size={16} cor="#658091" />
                                        </View>
                                    </View>
                                    <View style={[s.coluna, s.duracao]}>
                                        <Text style={s.pequeno}>Duração</Text>
                                        <View style={s.escolha}>
                                            <Pressable style={[s.chip, continuo && s.chipAtivo]} accessibilityRole="radio" accessibilityState={{ checked: continuo }} accessibilityLabel="Uso contínuo" onPress={() => editar(setContinuo)(true)} disabled={salvando}><Text style={s.chipTexto}>Contínuo</Text></Pressable>
                                            <Pressable style={[s.chip, !continuo && s.chipAtivo]} accessibilityRole="radio" accessibilityState={{ checked: !continuo }} accessibilityLabel="Duração em dias" onPress={() => editar(setContinuo)(false)} disabled={salvando}><Text style={s.chipTexto}>Por dias</Text></Pressable>
                                        </View>
                                    </View>
                                </View>
                                {!continuo && <View><Text style={s.pequeno}>Quantidade de dias</Text><TextInput style={s.campo} accessibilityLabel="Quantidade de dias" value={dias} onChangeText={editar(setDias)} keyboardType="number-pad" maxLength={4} editable={!salvando} /></View>}
                                <Text style={s.rotulo}>ADICIONAR HORÁRIOS</Text>
                                <View style={s.horarios}>
                                    {horarios.map((hora, i) => (
                                        <View key={i} style={s.horario}>
                                            <Pressable style={s.botaoIcone} accessibilityRole="button" accessibilityLabel={hora ? `Remover horário ${i + 1}` : `Adicionar horário ${i + 1}`} disabled={salvando} onPress={() => { if (hora) editar(setHorarios)(horarios.map((h, j) => j === i ? '' : h)); else camposHorario.current[i]?.focus(); }}>
                                                <Icone path={hora ? mdiMinus : mdiPlus} size={17} />
                                            </Pressable>
                                            <TextInput ref={(ref) => { camposHorario.current[i] = ref; }} style={s.horaInput} accessibilityLabel={`Horário ${i + 1}`} placeholder="00:00" placeholderTextColor="#8A969C" value={hora} onChangeText={(v) => editar(setHorarios)(horarios.map((h, j) => j === i ? formatarHorario(v) : h))} keyboardType="number-pad" maxLength={5} editable={!salvando} />
                                            <Icone path={mdiClockOutline} size={15} />
                                        </View>
                                    ))}
                                </View>
                            </View>
                            {erro && <Text accessibilityRole="alert" style={s.erro}>{erro}</Text>}
                            {sucesso && <Text accessibilityRole="alert" style={s.sucesso}>{sucesso}</Text>}
                            <Pressable style={[s.botao, salvando && s.desabilitado]} accessibilityRole="button" accessibilityLabel="Confirmar agendamento" accessibilityState={{ disabled: salvando, busy: salvando }} onPress={confirmar} disabled={salvando}>
                                {salvando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.botaoTexto}>CONFIRMAR AGENDAMENTO</Text>}
                            </Pressable>
                        </View>
        </View>
    );
}
