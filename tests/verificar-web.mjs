/**
 * Teste de ponta a ponta do app real no navegador.
 *
 * Os outros scripts rodam sobre `node:sqlite` no lugar da ponte nativa, entao
 * nao veem diferencas do expo-sqlite por plataforma. Foi este teste que pegou a
 * migracao chamando `withExclusiveTransactionAsync`, que nao existe na web e
 * travava o app inteiro na tela de erro do banco - com o `expo export` passando.
 *
 * Precisa do Chromium. Informe o caminho em CHROMIUM_PATH, ou instale com
 * `npx playwright install chromium` e deixe o playwright-core encontra-lo.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let chromium;
try {
    ({ chromium } = await import('playwright-core'));
} catch {
    console.error('playwright-core nao instalado. Rode: npm install -D playwright-core');
    process.exit(1);
}

const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'cuidadovital-web-'));

console.log('gerando o build web...');
const expoCli = fileURLToPath(new URL('../node_modules/expo/bin/cli', import.meta.url));
execFileSync(process.execPath, [expoCli, 'export', '--platform', 'web', '--output-dir', saida, '--clear'], {
    stdio: 'ignore',
    env: { ...process.env, EXPO_NO_TELEMETRY: '1' },
});

// O SQLite em WebAssembly usa SharedArrayBuffer e OPFS, que o navegador so
// libera com estes cabecalhos. O metro.config.js faz o mesmo no servidor de dev.
const TIPOS = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.wasm': 'application/wasm',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
};

const servidor = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let arquivo = path.join(saida, url === '/' ? 'index.html' : url);
    if (!fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) {
        arquivo = path.join(saida, 'index.html');
    }
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', TIPOS[path.extname(arquivo)] ?? 'application/octet-stream');
    fs.createReadStream(arquivo).pipe(res);
});
// Porta 0 deixa o sistema escolher uma livre, para o teste nao esbarrar em
// outro processo ocupando uma porta fixa.
await new Promise((resolve) => servidor.listen(0, resolve));
const PORTA = servidor.address().port;

const chromiumLocal = process.env.CHROMIUM_PATH ?? [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((arquivo) => fs.existsSync(arquivo));
const navegador = await chromium.launch(chromiumLocal ? { executablePath: chromiumLocal } : {});
const pagina = await navegador.newPage({ viewport: { width: 420, height: 900 } });

const errosDoNavegador = [];
pagina.on('pageerror', (e) => errosDoNavegador.push(`pageerror: ${e.message}`));
pagina.on('console', (m) => {
    if (m.type() === 'error') errosDoNavegador.push(`console: ${m.text()}`);
});

let falhas = 0;
async function passo(nome, fn) {
    try {
        await fn();
        console.log(`ok   ${nome}`);
    } catch (erro) {
        falhas += 1;
        console.log(`FAIL ${nome} -> ${String(erro.message).split('\n')[0]}`);
    }
}

await pagina.goto(`http://localhost:${PORTA}`, { waitUntil: 'networkidle' });

// O cadastro deriva a senha com 40.000 iteracoes de PBKDF2 em JavaScript, entao
// as esperas depois de "Cadastrar" e "Entrar" sao propositalmente longas.
const ESPERA_SENHA = 30000;

await passo('tela de login carrega (banco abriu)', () =>
    pagina.getByText('Bem-vindo de volta').waitFor({ timeout: 20000 }),
);
await passo('navega para o cadastro', async () => {
    await pagina.getByText('Cadastre-se').click();
    await pagina.getByText('Crie Sua Conta').waitFor({ timeout: 5000 });
});
await passo('preenche o cadastro', async () => {
    await pagina.getByPlaceholder('Nome Completo').fill('Maria Silva Santos');
    await pagina.getByPlaceholder('CPF').fill('52998224725');
    await pagina.getByPlaceholder('E-mail').fill('maria@exemplo.com');
    await pagina.getByPlaceholder('Senha', { exact: true }).fill('senha1234');
    await pagina.getByPlaceholder('Confirmação de Senha').fill('senha1234');
});
await passo('termos sao obrigatorios', async () => {
    await pagina.getByText('Cadastrar').click();
    await pagina.getByText(/Termos e Condições para criar a conta/).waitFor({ timeout: 5000 });
});
await passo('cadastro grava no banco e ja loga', async () => {
    await pagina.getByText('Aceito os').click();
    await pagina.getByText('Cadastrar').click();
    await pagina.getByText(/Maria/).first().waitFor({ timeout: ESPERA_SENHA });
});
await passo('sessao sobrevive ao recarregar', async () => {
    await pagina.reload({ waitUntil: 'networkidle' });
    await pagina.getByText(/Maria/).first().waitFor({ timeout: ESPERA_SENHA });
});
await passo('perfil original da main foi preservado', async () => {
    await pagina.getByText('Meu Perfil', { exact: true }).waitFor();
    await pagina.getByText('CRM não informado', { exact: true }).waitFor();
    await pagina.getByText('VER AGENDA COMPLETA', { exact: true }).waitFor();
    if (process.env.SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
        await pagina.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'perfil-original-preservado.png'), fullPage: true });
    }
});
await passo('somente Criar Alerta abre a tela nova', async () => {
    await pagina.getByText('Criar Alerta', { exact: true }).click();
    await pagina.getByText('AGENDAR MEDICAÇÃO', { exact: true }).waitFor();
    if (process.env.SCREENSHOT_DIR) await pagina.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'agendar-medicacao-corrigida.png'), fullPage: true });
    await pagina.getByRole('button', { name: 'Confirmar agendamento' }).click();
    await pagina.getByText('Informe o nome do medicamento.').waitFor();
    await pagina.getByLabel('Nome do medicamento', { exact: true }).fill('Medicamento fictício');
    await pagina.getByLabel('Nome do paciente', { exact: true }).fill('Paciente teste');
    await pagina.getByLabel('Quantidade da dosagem').fill('1 unidade');
    await pagina.getByLabel('Horário 1', { exact: true }).fill('2500');
    await pagina.getByRole('button', { name: 'Confirmar agendamento' }).click();
    await pagina.getByText(/Informe horários válidos/).waitFor();
    await pagina.getByLabel('Horário 1', { exact: true }).fill('0800');
    await pagina.getByRole('button', { name: 'Confirmar agendamento' }).click();
    await pagina.getByText('Agendamento confirmado!', { exact: true }).waitFor();
});
await passo('agenda exibe o paciente e o agendamento confirmado', async () => {
    await pagina.getByRole('button', { name: 'Agenda de pacientes', exact: true }).click();
    // A agenda compoe medicamento, paciente e horario num mesmo no de texto, em
    // dois formatos: "<medicamento> · <paciente>" no bloco da dose do momento e
    // "<medicamento> - <hora> · <paciente> (<dia>)" nos proximos agendamentos.
    // Por isso a correspondencia e por expressao regular, e nao exata.
    await pagina.getByText(/Medicamento fictício/).first().waitFor();
    await pagina.getByText(/Paciente teste/).first().waitFor();
    await pagina.getByText(/08:00/).first().waitFor();
    if (process.env.SCREENSHOT_DIR) await pagina.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'agenda-com-agendamento.png'), fullPage: true });
});
await passo('agenda mantem o paciente apos recarregar', async () => {
    await pagina.reload({ waitUntil: 'networkidle' });
    await pagina.getByRole('button', { name: 'Agenda de pacientes', exact: true }).click();
    await pagina.getByText(/Paciente teste/).first().waitFor();
    // A linha dos proximos agendamentos tem formato proprio (traco e horario),
    // que nao colide com o bloco da dose do momento. Se o recarregamento tivesse
    // gravado o agendamento de novo, apareceria mais de uma.
    const linhas = pagina.getByText(/Medicamento fictício - \d{2}:\d{2} · Paciente teste/);
    if ((await linhas.count()) !== 1) throw new Error('Agendamento duplicado apos recarregar');
    await pagina.getByRole('button', { name: 'Perfil', exact: true }).click();
    await pagina.getByText('Meu Perfil', { exact: true }).waitFor();
});
await passo('sair volta para o login', async () => {
    await pagina.getByText(/Sair/i).click();
    await pagina.getByText('Bem-vindo de volta').waitFor({ timeout: 10000 });
});
await passo('senha errada e recusada', async () => {
    await pagina.getByPlaceholder(/E-mail ou CPF/).fill('maria@exemplo.com');
    await pagina.getByPlaceholder('Digite sua senha').fill('senhaErrada9');
    await pagina.getByText('Entrar', { exact: true }).click();
    await pagina.getByText('E-mail, CPF ou senha incorretos.').waitFor({ timeout: ESPERA_SENHA });
});
await passo('senha certa entra', async () => {
    await pagina.getByPlaceholder('Digite sua senha').fill('senha1234');
    await pagina.getByText('Entrar', { exact: true }).click();
    await pagina.getByText(/Maria/).first().waitFor({ timeout: ESPERA_SENHA });
});

await navegador.close();
servidor.close();
fs.rmSync(saida, { recursive: true, force: true });

if (errosDoNavegador.length > 0) {
    falhas += 1;
    console.log('\nERROS DO NAVEGADOR:');
    for (const erro of errosDoNavegador) console.log(`  ${erro}`);
}

console.log(falhas === 0 ? '\nTODOS OS TESTES DA WEB PASSARAM' : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
