// ============================================================
//              BASE BOT DE WHATSAPP - BAILEYS
//         Código completo em um único arquivo index.js
// ============================================================
// NÃO RETIRA OS CREDITOS - 🇲🇦⃟𒄆𝗧𝗵

// ─── CONFIGURAÇÕES (edite aqui) ─────────────────────────────
const CONFIG = {
  prefixo: '!',                        // Prefixo dos comandos
  numeroDono: '5515981535755',         // Número do dono (só números, com DDI)
  nomeDono: '🇲🇦⃟𒄆𝗧𝗵',             // Nome exibido no comando !dono
  nomeBot: 'Base Bot Scorpion',                   // Nome do bot
};
// ─────────────────────────────────────────────────────────────

// ─── IMPORTS ─────────────────────────────────────────────────
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const pino     = require('pino');
const qrcode   = require('qrcode-terminal');
const readline = require('readline'); // Nativo do Node.js, sem instalar
// ─────────────────────────────────────────────────────────────

// ─── UTILITÁRIO: ler input do terminal ───────────────────────
function pergunta(texto) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(texto, (resposta) => {
      rl.close();
      resolve(resposta.trim());
    });
  });
}
// ─────────────────────────────────────────────────────────────

// ─── MENU DE ESCOLHA DO MÉTODO DE CONEXÃO ────────────────────
async function escolherMetodo() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log(`║   🤖  ${CONFIG.nomeBot} - Método de Conexão    ║`);
  console.log('╔══════════════════════════════════════╗');
console.log('║         🦂⃟Th - BaseBotScorpion        ║');
console.log('║   Criado por: 🦂⃟Th                    ║');
console.log('║   WhatsApp: +55 15 98153-5755         ║');
console.log('║   Todos os direitos reservados ©      ║');
console.log('╚══════════════════════════════════════╝');
console.log('');
  console.log('  [1] QR Code  → Escanear com a câmera do celular');
  console.log('  [2] Código   → Digitar código de 8 dígitos no WhatsApp\n');

  let escolha = '';
  while (escolha !== '1' && escolha !== '2') {
    escolha = await pergunta('  Digite 1 ou 2 e pressione Enter: ');
    if (escolha !== '1' && escolha !== '2') {
      console.log('  ⚠️  Opção inválida. Digite apenas 1 ou 2.\n');
    }
  }

  console.log(''); // linha em branco para separar o visual
  return escolha === '2' ? 'codigo' : 'qrcode';
}
// ─────────────────────────────────────────────────────────────

// ─── FUNÇÃO PRINCIPAL ─────────────────────────────────────────
async function iniciarBot(metodo) {
  // Na primeira execução, pergunta o método; nas reconexões, reutiliza
  if (!metodo) {
    metodo = await escolherMetodo();
  }

  // Carrega (ou cria) as credenciais de sessão na pasta "auth_info"
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  // Busca a versão mais recente do Baileys
  const { version } = await fetchLatestBaileysVersion();
  console.log(`🤖 ${CONFIG.nomeBot} iniciando com Baileys v${version.join('.')}`);
  console.log(`🔌 Método: ${metodo === 'codigo' ? 'Código de Pareamento' : 'QR Code'}\n`);

  // Cria a conexão com o WhatsApp
  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false, // Controlamos manualmente abaixo
  });

  // ─── MÉTODO: CÓDIGO DE PAREAMENTO ───────────────────────────
  // Só solicita o código se a sessão ainda não estiver registrada
  if (metodo === 'codigo' && !sock.authState.creds.registered) {
    // Aguarda o socket inicializar antes de pedir o código
    await new Promise((r) => setTimeout(r, 2000));

    try {
      // Remove caracteres não numéricos do número do dono
      const numero = await pergunta('  Digite o número que vai conectar (com DDI, só números, ex: 5511999999999): ');
      const codigo = await sock.requestPairingCode(numero);

      // Formata como XXXX-XXXX para facilitar a leitura
      const codigoFormatado = codigo?.match(/.{1,4}/g)?.join('-') ?? codigo;

      console.log('┌──────────────────────────────────────────┐');
      console.log('│  📲 SEU CÓDIGO DE PAREAMENTO:            │');
      console.log('│                                          │');
      console.log(`│          ➤   ${codigoFormatado}   ◄             │`);
      console.log('│                                          │');
      console.log('│  Como usar no WhatsApp:                  │');
      console.log('│  Configurações → Aparelhos Conectados    │');
      console.log('│  → Conectar com número de telefone       │');
      console.log('│  → Digite o código acima                 │');
      console.log('└──────────────────────────────────────────┘\n');
    } catch (err) {
      console.error('❌ Erro ao solicitar código de pareamento:', err.message);
    }
  }

  // ─── EVENTO: CONEXÃO / QR CODE ──────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Exibe QR code apenas se o método escolhido for qrcode
    if (qr && metodo === 'qrcode') {
      console.log('📱 Escaneie o QR Code abaixo com seu WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log('\n  No WhatsApp: Configurações → Aparelhos Conectados → Conectar um aparelho\n');
    }

    // Bot conectado com sucesso
    if (connection === 'open') {
      console.log(`✅ ${CONFIG.nomeBot} conectado com sucesso!\n`);
    }

    // Conexão encerrada: tenta reconectar automaticamente
    if (connection === 'close') {
      const motivo = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const deveReconectar = motivo !== DisconnectReason.loggedOut;

      if (deveReconectar) {
        console.log('🔄 Reconectando...');
        iniciarBot(metodo); // Reutiliza o mesmo método escolhido
      } else {
        console.log('❌ Sessão encerrada. Delete a pasta auth_info e reinicie.');
      }
    }
  });

  // ─── EVENTO: SALVAR CREDENCIAIS ──────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ─── EVENTO: MENSAGENS RECEBIDAS ────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Processa apenas mensagens novas
    if (type !== 'notify') return;

    for (const msg of messages) {
      // Ignora mensagens do próprio bot
      if (msg.key.fromMe) return;

      // Extrai o texto da mensagem (suporta texto simples e legendas de mídia)
      const textoMensagem =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        '';

      // Se não há texto, ignora
      if (!textoMensagem) return;

      // Verifica se começa com o prefixo configurado
      if (!textoMensagem.startsWith(CONFIG.prefixo)) return;

      // ─── EXTRAÇÃO DO COMANDO E ARGUMENTOS ───────────────
      // Remove o prefixo, divide por espaços
      const partes  = textoMensagem.slice(CONFIG.prefixo.length).trim().split(/\s+/);
      const comando = partes[0].toLowerCase(); // Ex: "ping"
      const args    = partes.slice(1);         // Ex: ["argumento1", "argumento2"]

      // ID do remetente (grupo ou privado)
      const remetente = msg.key.remoteJid;

      // Log no console com informações da mensagem
      console.log(`📩 Comando recebido: ${CONFIG.prefixo}${comando} | De: ${remetente}`);

      // ─── FUNÇÃO AUXILIAR: responder ──────────────────────
      // Atalho para enviar mensagem de texto de volta, citando o original
      const responder = (texto) =>
        sock.sendMessage(remetente, { text: texto }, { quoted: msg });

      // ─── SISTEMA DE COMANDOS (switch/case) ───────────────
      // ✏️  Para adicionar novos comandos, consulte o LEIA-ME.txt
      switch (comando) {

        // ── !menu ──────────────────────────────────────────
        case 'menu': {
  await sock.sendMessage(remetente, {
    image: { url: 'https://storageblack.cloud/midia/1779064790438.jpg' }, // cole o link da sua imagem aqui
    caption:
      `╔══════════════════════╗\n` +
      `║   🤖 ${CONFIG.nomeBot} - Menu   ║\n` +
      `╚══════════════════════╝\n\n` +
      `${CONFIG.prefixo}menu  → Mostra este menu\n` +
      `${CONFIG.prefixo}ping  → Testa a velocidade\n` +
      `${CONFIG.prefixo}dono  → Info do dono\n\n` +
      `_Prefixo atual: *${CONFIG.prefixo}*_`
  }, { quoted: msg });
  break;
}

        // ── !ping ──────────────────────────────────────────
        case 'ping': {
          const inicio = Date.now();
          await responder('🏓 Calculando...');
          const tempo = Date.now() - inicio;
          await responder(`🏓 Pong! Tempo de resposta: *${tempo}ms*`);
          break;
        }

        // ── !dono ──────────────────────────────────────────
        case 'dono':
          await responder(
            `👑 *Dono do Bot*\n\n` +
            `Nome: ${CONFIG.nomeDono}\n` +
            `Número: +${CONFIG.numeroDono}`
          );
          break;

        // ── Comando desconhecido ───────────────────────────
        default:
          await responder(
            `❓ Comando *${CONFIG.prefixo}${comando}* não encontrado.\n` +
            `Digite *${CONFIG.prefixo}menu* para ver os comandos disponíveis.`
          );
          break;
      }
      // ─────────────────────────────────────────────────────
    }
  });
}
// ─────────────────────────────────────────────────────────────

// ─── INICIALIZA O BOT ─────────────────────────────────────────
iniciarBot().catch((err) => {
  console.error('❌ Erro ao iniciar o bot:', err);
});
