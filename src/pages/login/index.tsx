import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

import Input from '../../components/Input';
import Logo from '../../assets/Logo.png';
import { mensagemDeErro, useAuth } from '../../contexts/AuthContext';
import { AuthError } from '../../services/autenticacao';
import { formatarCpf, pareceCpf } from '../../utils/validacao';
import { styles } from './styles';
import { theme } from '../../global/themes';

type LoginProps = {
    onCadastroPress: () => void;
};

export default function Login({ onCadastroPress }: LoginProps) {
    const { fazerLogin, redefinirSenha } = useAuth();

    /** Alterna entre digitar e-mail e digitar CPF (com mascara). */
    const [modoCpf, setModoCpf] = useState(false);
    const [modoRecuperacao, setModoRecuperacao] = useState(false);
    const [identificador, setIdentificador] = useState('');
    const [senha, setSenha] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [emailRecuperacao, setEmailRecuperacao] = useState('');
    const [cpfRecuperacao, setCpfRecuperacao] = useState('');
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmacaoNovaSenha, setConfirmacaoNovaSenha] = useState('');
    const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
    const [mostrarConfirmacaoNovaSenha, setMostrarConfirmacaoNovaSenha] = useState(false);
    const [recuperacaoConcluida, setRecuperacaoConcluida] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [campoComErro, setCampoComErro] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);

    function aoDigitarIdentificador(valor: string) {
        // Aplica a mascara quando o campo esta em modo CPF ou quando o usuario
        // claramente digitou um CPF no campo de e-mail.
        setIdentificador(modoCpf || pareceCpf(valor) ? formatarCpf(valor) : valor);
        setErro(null);
        setCampoComErro(null);
    }

    function alternarModo() {
        setModoCpf((atual) => !atual);
        setIdentificador('');
        setErro(null);
        setCampoComErro(null);
    }

    function abrirRecuperacao() {
        setEmailRecuperacao(identificador.includes('@') ? identificador.trim() : '');
        setModoRecuperacao(true);
        setRecuperacaoConcluida(false);
        setErro(null);
        setCampoComErro(null);
    }

    function voltarParaLogin() {
        setModoRecuperacao(false);
        setRecuperacaoConcluida(false);
        setCpfRecuperacao('');
        setNovaSenha('');
        setConfirmacaoNovaSenha('');
        setErro(null);
        setCampoComErro(null);
    }

    async function aoEntrar() {
        if (enviando) {
            return;
        }

        setEnviando(true);
        setErro(null);
        setCampoComErro(null);

        try {
            await fazerLogin(identificador, senha);
            // Em caso de sucesso o App troca de tela sozinho, observando a sessao.
        } catch (falha) {
            setErro(mensagemDeErro(falha));
            setCampoComErro(falha instanceof AuthError ? (falha.campo ?? null) : null);
        } finally {
            setEnviando(false);
        }
    }

    async function aoRedefinirSenha() {
        if (enviando) {
            return;
        }

        setEnviando(true);
        setErro(null);
        setCampoComErro(null);

        try {
            await redefinirSenha({
                email: emailRecuperacao,
                cpf: cpfRecuperacao,
                senha: novaSenha,
                confirmacaoSenha: confirmacaoNovaSenha,
            });
            setRecuperacaoConcluida(true);
            setCpfRecuperacao('');
            setNovaSenha('');
            setConfirmacaoNovaSenha('');
        } catch (falha) {
            setErro(mensagemDeErro(falha));
            setCampoComErro(falha instanceof AuthError ? (falha.campo ?? null) : null);
        } finally {
            setEnviando(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.logoContainer}>
                    <Image source={Logo} style={styles.boxImage} />
                    <Text style={styles.logoText}>
                        {modoRecuperacao ? 'Recupere sua senha' : 'Bem-vindo de volta'}
                    </Text>
                </View>

                <View style={styles.box}>
                    {modoRecuperacao ? (
                        <>
                            <Text style={styles.avisoRecuperacao}>
                                Protótipo local neste aparelho: não enviamos código por e-mail.
                                E-mail e CPF não comprovam sua identidade; não use este fluxo em
                                produção.
                            </Text>

                            {recuperacaoConcluida ? (
                                <Text style={styles.sucesso}>
                                    Senha redefinida. Você já pode entrar com a nova senha.
                                </Text>
                            ) : (
                                <>
                                    <Input
                                        placeholder="E-mail cadastrado"
                                        value={emailRecuperacao}
                                        onChangeText={(valor) => {
                                            setEmailRecuperacao(valor);
                                            setErro(null);
                                            setCampoComErro(null);
                                        }}
                                        iconLeftName="email-outline"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!enviando}
                                        erro={campoComErro === 'email' ? erro : null}
                                    />
                                    <Input
                                        placeholder="CPF cadastrado"
                                        value={cpfRecuperacao}
                                        onChangeText={(valor) => {
                                            setCpfRecuperacao(formatarCpf(valor));
                                            setErro(null);
                                            setCampoComErro(null);
                                        }}
                                        iconLeftName="file-document-outline"
                                        keyboardType="number-pad"
                                        maxLength={14}
                                        editable={!enviando}
                                        erro={campoComErro === 'cpf' ? erro : null}
                                    />
                                    <Input
                                        placeholder="Nova senha"
                                        value={novaSenha}
                                        onChangeText={(valor) => {
                                            setNovaSenha(valor);
                                            setErro(null);
                                            setCampoComErro(null);
                                        }}
                                        secureTextEntry={!mostrarNovaSenha}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!enviando}
                                        iconLeftName="lock-outline"
                                        iconRightName={
                                            mostrarNovaSenha ? 'eye-off-outline' : 'eye-outline'
                                        }
                                        iconRightPress={() =>
                                            setMostrarNovaSenha((visivel) => !visivel)
                                        }
                                        erro={campoComErro === 'senha' ? erro : null}
                                    />
                                    <Input
                                        placeholder="Confirme a nova senha"
                                        value={confirmacaoNovaSenha}
                                        onChangeText={(valor) => {
                                            setConfirmacaoNovaSenha(valor);
                                            setErro(null);
                                            setCampoComErro(null);
                                        }}
                                        secureTextEntry={!mostrarConfirmacaoNovaSenha}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!enviando}
                                        onSubmitEditing={aoRedefinirSenha}
                                        returnKeyType="go"
                                        iconLeftName="lock-outline"
                                        iconRightName={
                                            mostrarConfirmacaoNovaSenha
                                                ? 'eye-off-outline'
                                                : 'eye-outline'
                                        }
                                        iconRightPress={() =>
                                            setMostrarConfirmacaoNovaSenha((visivel) => !visivel)
                                        }
                                        erro={
                                            campoComErro === 'confirmacaoSenha' ? erro : null
                                        }
                                    />

                                    {erro && !campoComErro ? (
                                        <Text style={styles.erro}>{erro}</Text>
                                    ) : null}

                                    <Pressable
                                        style={[
                                            styles.button,
                                            enviando && styles.buttonDisabled,
                                        ]}
                                        onPress={aoRedefinirSenha}
                                        disabled={enviando}
                                        accessibilityRole="button"
                                        accessibilityState={{
                                            disabled: enviando,
                                            busy: enviando,
                                        }}
                                    >
                                        {enviando ? (
                                            <ActivityIndicator color="#FFFFFF" />
                                        ) : (
                                            <Text style={styles.buttonText}>Redefinir senha</Text>
                                        )}
                                    </Pressable>
                                </>
                            )}

                            <Text style={styles.link} onPress={voltarParaLogin}>
                                Voltar para o login
                            </Text>
                        </>
                    ) : (
                        <>
                            <Input
                                placeholder={
                                    modoCpf ? 'Digite seu CPF' : 'Digite seu E-mail ou CPF'
                                }
                                value={identificador}
                                onChangeText={aoDigitarIdentificador}
                                iconLeftName="account-outline"
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType={modoCpf ? 'number-pad' : 'email-address'}
                                textContentType="username"
                                editable={!enviando}
                                erro={campoComErro === 'identificador' ? erro : null}
                            />

                            <Input
                                value={senha}
                                onChangeText={(valor) => {
                                    setSenha(valor);
                                    setErro(null);
                                    setCampoComErro(null);
                                }}
                                placeholder="Digite sua senha"
                                secureTextEntry={!mostrarSenha}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!enviando}
                                onSubmitEditing={aoEntrar}
                                returnKeyType="go"
                                iconLeftName="lock-outline"
                                iconRightName={
                                    mostrarSenha ? 'eye-off-outline' : 'eye-outline'
                                }
                                iconRightPress={() => setMostrarSenha((visivel) => !visivel)}
                                erro={campoComErro === 'senha' ? erro : null}
                            />

                            <Pressable
                                onPress={abrirRecuperacao}
                                disabled={enviando}
                                accessibilityRole="button"
                            >
                                <Text style={styles.esqueceuSenha}>Esqueceu a senha?</Text>
                            </Pressable>

                            {erro && !campoComErro ? <Text style={styles.erro}>{erro}</Text> : null}

                            <Pressable
                                style={[styles.button, enviando && styles.buttonDisabled]}
                                onPress={aoEntrar}
                                disabled={enviando}
                                accessibilityRole="button"
                                accessibilityState={{ disabled: enviando, busy: enviando }}
                            >
                                {enviando ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>Entrar</Text>
                                )}
                            </Pressable>

                            <Text style={styles.link} onPress={alternarModo}>
                                {modoCpf ? 'Entrar com e-mail' : 'Entrar com CPF'}
                            </Text>

                            <Text style={styles.link}>
                                Não possui uma conta?{' '}
                                <Text style={styles.linkForte} onPress={onCadastroPress}>
                                    Cadastre-se
                                </Text>
                            </Text>
                        </>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
