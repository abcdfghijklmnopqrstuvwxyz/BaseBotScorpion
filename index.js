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
  nomeBot: 'Base Bot Scorpion',        // Nome do bot
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
const readline = require('readline');
const fs       = require('fs');
// ─────────────────────────────────────────────────────────────

// ─── UTILITÁRIOS ─────────────────────────────────────────────
function normalizarJid(jid) {
  return jid?.replace(/:\d+@/, '@') || '';
}

function pergunta(texto) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(texto, (resposta) => { rl.close(); resolve(resposta.trim()); });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function contemUrl(texto) {
  return /https?:\/\/[^\s]+|www\.[^\s]+/i.test(texto);
}

function contemLinkGrupoWA(texto) {
  return /chat\.whatsapp\.com\//i.test(texto);
}
// ─────────────────────────────────────────────────────────────

// ─── SISTEMA DE CONFIGURAÇÃO DE GRUPOS (antilink) ────────────
const GRUPO_CONFIG_FILE = 'grupo_config.json';
let grupoConfig = {};

function carregarGrupoConfig() {
  try {
    if (fs.existsSync(GRUPO_CONFIG_FILE)) {
      grupoConfig = JSON.parse(fs.readFileSync(GRUPO_CONFIG_FILE, 'utf8'));
    }
  } catch (e) { grupoConfig = {}; }
}

function salvarGrupoConfig() {
  fs.writeFileSync(GRUPO_CONFIG_FILE, JSON.stringify(grupoConfig, null, 2));
}

function getGrupoConfig(groupId) {
  if (!grupoConfig[groupId]) {
    grupoConfig[groupId] = { antilinkgp: false, antilinkhard: false, advertencias: {} };
  }
  return grupoConfig[groupId];
}

function addAdvertencia(groupId, userId) {
  const cfg = getGrupoConfig(groupId);
  if (!cfg.advertencias[userId]) cfg.advertencias[userId] = 0;
  cfg.advertencias[userId] += 1;
  salvarGrupoConfig();
  return cfg.advertencias[userId];
}

function resetAdvertencias(groupId, userId) {
  const cfg = getGrupoConfig(groupId);
  if (cfg.advertencias[userId]) {
    delete cfg.advertencias[userId];
    salvarGrupoConfig();
  }
}

carregarGrupoConfig();
// ─────────────────────────────────────────────────────────────

// ─── SISTEMA DE MUTE ─────────────────────────────────────────
const MUTE_FILE = 'mute.json';
let muteData = [];

function carregarMute() {
  try {
    if (fs.existsSync(MUTE_FILE)) {
      muteData = JSON.parse(fs.readFileSync(MUTE_FILE, 'utf8'));
    }
  } catch (e) { muteData = []; }
}

function salvarMute() {
  fs.writeFileSync(MUTE_FILE, JSON.stringify(muteData, null, 2));
}

function getGrupoMute(groupId) {
  return muteData.find(i => i.gpid === groupId) || null;
}

function isMutado(groupId, userId) {
  const gp = getGrupoMute(groupId);
  return gp ? gp.mutados.some(m => m.id === userId) : false;
}

function addMute(groupId, userId) {
  const idx = muteData.findIndex(i => i.gpid === groupId);
  if (idx >= 0) {
    muteData[idx].mutados.push({ id: userId });
  } else {
    muteData.push({ gpid: groupId, mutados: [{ id: userId }] });
  }
  salvarMute();
}

function removeMute(groupId, userId) {
  const idx = muteData.findIndex(i => i.gpid === groupId);
  if (idx < 0) return false;
  const antes = muteData[idx].mutados.length;
  muteData[idx].mutados = muteData[idx].mutados.filter(m => m.id !== userId);
  salvarMute();
  return muteData[idx].mutados.length < antes;
}

carregarMute();
// ─────────────────────────────────────────────────────────────

// ─── MENU DE CONEXÃO ─────────────────────────────────────────
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
    if (escolha !== '1' && escolha !== '2') console.log('  ⚠️  Opção inválida. Digite apenas 1 ou 2.\n');
  }
  console.log('');
  return escolha === '2' ? 'codigo' : 'qrcode';
}
// ─────────────────────────────────────────────────────────────

// ─── FUNÇÃO PRINCIPAL ────────────────────────────────────────
async function iniciarBot(metodo) {
  if (!metodo) metodo = await escolherMetodo();

  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();
  console.log(`🤖 ${CONFIG.nomeBot} iniciando com Baileys v${version.join('.')}`);
  console.log(`🔌 Método: ${metodo === 'codigo' ? 'Código de Pareamento' : 'QR Code'}\n`);

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  // ─── CÓDIGO DE PAREAMENTO ────────────────────────────────────
  if (metodo === 'codigo' && !sock.authState.creds.registered) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const numero = await pergunta('  Digite o número que vai conectar (com DDI, só números, ex: 5511999999999): ');
      const codigo = await sock.requestPairingCode(numero);
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

  // ─── EVENTO: CONEXÃO / QR CODE ───────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr && metodo === 'qrcode') {
      console.log('📱 Escaneie o QR Code abaixo com seu WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log('\n  No WhatsApp: Configurações → Aparelhos Conectados → Conectar um aparelho\n');
    }
    if (connection === 'open') console.log(`✅ ${CONFIG.nomeBot} conectado com sucesso!\n`);
    if (connection === 'close') {
      const motivo = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (motivo !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconectando...');
        iniciarBot(metodo);
      } else {
        console.log('❌ Sessão encerrada. Delete a pasta auth_info e reinicie.');
      }
    }
  });

  // ─── EVENTO: SALVAR CREDENCIAIS ──────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ─── EVENTO: MENSAGENS RECEBIDAS ─────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const from     = msg.key.remoteJid;
      const isGroup  = from.endsWith('@g.us');
      const pushname = msg.pushName || 'usuário';
      const sender   = normalizarJid(msg.key.participant || from);

      // Extrai o texto da mensagem
      const textoMensagem =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        '';

      if (!textoMensagem) continue;

      // ─── VERIFICAÇÕES DE GRUPO ────────────────────────────────
      let groupMeta        = null;
      let isBotGroupAdmins = false;
      let isGroupAdmins    = false;

      if (isGroup) {
        try {
          groupMeta = await sock.groupMetadata(from);

          const botId     = normalizarJid(sock.user.id);
          const botLid    = sock.user.lid ? normalizarJid(sock.user.lid) : null;
          const senderLid = msg.key.participantLid ? normalizarJid(msg.key.participantLid) : null;

          const botParticipant = groupMeta.participants.find(p => {
            const pid = normalizarJid(p.id);
            return pid === botId || (botLid && pid === botLid);
          });

          const senderParticipant = groupMeta.participants.find(p => {
            const pid = normalizarJid(p.id);
            return pid === sender || (senderLid && pid === senderLid);
          });

          isBotGroupAdmins = !!botParticipant?.admin;
          isGroupAdmins    = !!senderParticipant?.admin;
        } catch (e) { console.log('Erro groupMetadata:', e.message); }
      }

      // Dono tem bypass em todas as checagens de admin
      const isDono = sender === `${CONFIG.numeroDono}@s.whatsapp.net`;

      // ─── FUNÇÕES AUXILIARES ──────────────────────────────────
      const reply = (texto) =>
        sock.sendMessage(from, { text: texto }, { quoted: msg });

      const deletarMsg = () =>
        sock.sendMessage(from, {
          delete: { remoteJid: from, fromMe: false, id: msg.key.id, participant: sender }
        });

      const remover = (alvo) =>
        sock.groupParticipantsUpdate(from, [alvo || sender], 'remove');

      const mencionar = (texto, alvo) =>
        sock.sendMessage(from, { text: texto, mentions: [alvo || sender] });

      // ══════════════════════════════════════════════════════════
      //   PROTEÇÕES AUTOMÁTICAS (rodam em toda mensagem do grupo)
      // ══════════════════════════════════════════════════════════
      if (isGroup && groupMeta && isBotGroupAdmins && !isGroupAdmins && !isDono) {

        // ── MUTE: apaga mensagem de usuário mutado ─────────────
        if (isMutado(from, sender)) {
          try {
            await deletarMsg();
          } catch (e) { console.log('Erro mute:', e.message); }
          continue;
        }

        const cfg = getGrupoConfig(from);

        // ── ANTILINK GP: só links de grupos WhatsApp ───────────
        if (cfg.antilinkgp && contemLinkGrupoWA(textoMensagem)) {
          try {
            const linkProprio = await sock.groupInviteCode(from);
            if (textoMensagem.includes(linkProprio)) {
              await reply('Como esse é o link do nosso grupo, não irei remover... Você deu sorte dessa vez 😰');
            } else {
              await deletarMsg();
              await sleep(100);
              const adv = addAdvertencia(from, sender);
              if (adv >= 3) {
                resetAdvertencias(from, sender);
                await mencionar(`[❗] Você não me deu escolha @${sender.split('@')[0]}... Por envio de link de grupo, você foi removido 💢`);
                await sleep(200);
                await remover(sender);
              } else {
                await mencionar(`[❗] Atenção @${sender.split('@')[0]}, links de grupos externos são proibidos! Advertência *${adv}/3* 💢`);
              }
            }
          } catch (e) { console.log('Erro antilink gp:', e.message); }
          continue;
        }

        // ── ANTILINK HARD: qualquer URL ────────────────────────
        if (cfg.antilinkhard && contemUrl(textoMensagem)) {
          if (contemLinkGrupoWA(textoMensagem)) {
            try {
              const linkProprio = await sock.groupInviteCode(from);
              if (textoMensagem.includes(linkProprio)) {
                await reply('Link do nosso grupo, não irei remover..');
                continue;
              }
            } catch (e) { /* ignora */ }
          }
          try {
            await deletarMsg();
            await sleep(100);
            const adv = addAdvertencia(from, sender);
            if (adv >= 3) {
              resetAdvertencias(from, sender);
              await mencionar(`[❗] Eu avisei que era proibido qualquer link aqui @${sender.split('@')[0]}... Você foi removido 💢`);
              await sleep(200);
              await remover(sender);
            } else {
              await mencionar(`[❗] Atenção @${sender.split('@')[0]}, qualquer tipo de link é proibido aqui! Advertência *${adv}/3* 💢`);
            }
          } catch (e) { console.log('Erro antilink hard:', e.message); }
          continue;
        }
      }
      // ══════════════════════════════════════════════════════════

      // Ignora mensagens sem prefixo
      if (!textoMensagem.startsWith(CONFIG.prefixo)) continue;

      // ─── EXTRAÇÃO DO COMANDO E ARGUMENTOS ────────────────────
      const partes  = textoMensagem.slice(CONFIG.prefixo.length).trim().split(/\s+/);
      const comando = partes[0].toLowerCase();
      const args    = partes.slice(1);

      console.log(`📩 Comando: ${CONFIG.prefixo}${comando} | De: ${from} | Remetente: ${sender}`);

      // ─── SISTEMA DE COMANDOS ──────────────────────────────────
      switch (comando) {

        // ── !menu ─────────────────────────────────────────────
        case 'menu': {
          const hora = new Date().getHours();
          const saudacao = hora < 12 ? '🌅 Bom dia' : hora < 18 ? '☀️ Boa tarde' : '🌙 Boa noite';

          const menu =
            `╔═══════════════════════╗\n` +
            `║  🦂 ${CONFIG.nomeBot}  ║\n` +
            `╚═══════════════════════╝\n` +
            `\n` +
            `${saudacao}, *${pushname}*!\n` +
            `\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🤖 *GERAL*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `› ${CONFIG.prefixo}menu   → Abre este menu\n` +
            `› ${CONFIG.prefixo}ping   → Velocidade do bot\n` +
            `› ${CONFIG.prefixo}dono   → Info do dono\n` +
            `\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🔗 *ANTILINK*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `› ${CONFIG.prefixo}antilinkgp 1/0\n` +
            `  └ Bloqueia links de grupos WA\n` +
            `› ${CONFIG.prefixo}antilinkhard 1/0\n` +
            `  └ Bloqueia qualquer tipo de URL\n` +
            `\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🔨 *MODERAÇÃO*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `› ${CONFIG.prefixo}ban   → Bane um membro\n` +
            `  └ Responda ou marque o @\n` +
            `› ${CONFIG.prefixo}band  → Bane + apaga mensagem\n` +
            `  └ Responda a mensagem dele\n` +
            `› ${CONFIG.prefixo}mute  → Muta um membro\n` +
            `  └ Responda ou marque o @\n` +
            `› ${CONFIG.prefixo}desmute → Desmuta um membro\n` +
            `  └ Responda ou marque o @\n` +
            `› ${CONFIG.prefixo}mutelist → Lista os mutados\n` +
            `\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `_Prefixo: *${CONFIG.prefixo}*  |  By 🦂⃟Th_`;

          await sock.sendMessage(from, {
            image: { url: 'https://storageblack.cloud/midia/1779064790438.jpg' },
            caption: menu
          }, { quoted: msg });
          break;
        }

        // ── !ping ─────────────────────────────────────────────
        case 'ping': {
          const inicio = Date.now();
          await reply('🏓 Calculando...');
          await reply(`🏓 Pong! Tempo de resposta: *${Date.now() - inicio}ms*`);
          break;
        }

        // ── !dono ─────────────────────────────────────────────
        case 'dono':
          await reply(
            `👑 *Dono do Bot*\n\n` +
            `Nome: ${CONFIG.nomeDono}\n` +
            `Número: +${CONFIG.numeroDono}`
          );
          break;

        // ── !ban / !banir / !kick / !band ─────────────────────
        case 'ban':
        case 'banir':
        case 'kick':
        case 'band': {
          if (!isGroup)                  { await reply('❌ Este comando só funciona em grupos!'); break; }
          if (!isGroupAdmins && !isDono) { await reply('❌ Apenas administradores podem usar este comando!'); break; }
          if (!isBotGroupAdmins)         { await reply('❌ Preciso ser administrador do grupo para funcionar!'); break; }

          const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant
            ? normalizarJid(msg.message.extendedTextMessage.contextInfo.participant)
            : null;
          const mencoesBan = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const alvo       = quotedParticipant || (mencoesBan.length > 0 ? normalizarJid(mencoesBan[0]) : null);

          if (!alvo) { await reply('❌ Marque o usuário que deseja banir ou responda à mensagem dele!'); break; }

          const noGrupo = groupMeta.participants.some(p => normalizarJid(p.id) === alvo);
          if (!noGrupo) { await reply('❌ Esse usuário não está mais no grupo...'); break; }

          // Proteção: tentou banir o bot
          if (alvo === normalizarJid(sock.user.id)) {
            if (!isDono) {
              await reply('😂 Tentou me banir? Que ousadia... Você que vai sair!');
              await sleep(1000);
              await remover(sender);
            } else {
              await reply('Qual foi patrão? 😅');
            }
            break;
          }

          // Proteção: tentou banir o dono
          if (alvo === `${CONFIG.numeroDono}@s.whatsapp.net`) {
            if (!isDono) {
              await reply('🤨 Tá achando que vai banir meu dono na minha frente?? Você que vai sair!');
              await sleep(1000);
              await remover(sender);
            } else {
              await reply('Não vou te banir patrão 😢');
            }
            break;
          }

          const motivo = args.join(' ').replace(/@\d+/g, '').trim() || null;

          await sock.sendMessage(from, {
            text: `✅ *Usuário @${alvo.split('@')[0]} foi removido do grupo!*${motivo ? `\n📋 Motivo: _${motivo}_` : ''}`,
            mentions: [alvo]
          });
          await sleep(800);
          await remover(alvo);

          // Deleta a mensagem respondida (só no !band)
          if (comando === 'band' && quotedParticipant) {
            const quotedId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
            if (quotedId) {
              await sleep(1000);
              await sock.sendMessage(from, {
                delete: { remoteJid: from, fromMe: false, id: quotedId, participant: quotedParticipant }
              });
            }
          }

          // Avisa o banido no privado se tiver motivo
          if (motivo) {
            await sleep(1500);
            await sock.sendMessage(alvo, {
              text: `⚠️ Você foi banido do grupo por um administrador.\n📋 Motivo: _"${motivo}"_`
            }).catch(() => {});
          }
          break;
        }

        // ── !mute ─────────────────────────────────────────────
        case 'mute': {
          if (!isGroup)                  { await reply('❌ Este comando só funciona em grupos!'); break; }
          if (!isGroupAdmins && !isDono) { await reply('❌ Apenas administradores podem usar este comando!'); break; }
          if (!isBotGroupAdmins)         { await reply('❌ Preciso ser administrador do grupo para funcionar!'); break; }

          const quotedP  = msg.message?.extendedTextMessage?.contextInfo?.participant
            ? normalizarJid(msg.message.extendedTextMessage.contextInfo.participant)
            : null;
          const mencoesMute = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const alvo = quotedP || (mencoesMute.length > 0 ? normalizarJid(mencoesMute[0]) : null);

          if (!alvo)                                           { await reply('❌ Marque o usuário que deseja mutar ou responda à mensagem dele!'); break; }
          if (alvo === sender)                                 { await reply('❌ Não é possível mutar a si mesmo...'); break; }
          if (alvo === `${CONFIG.numeroDono}@s.whatsapp.net`) { await reply('❌ Não é possível mutar meu dono...'); break; }
          if (alvo === normalizarJid(sock.user.id))            { await reply('❌ Não é possível me mutar...'); break; }

          const alvoParticipant = groupMeta.participants.find(p => normalizarJid(p.id) === alvo);
          if (alvoParticipant?.admin) { await reply('❌ Não é possível mutar um administrador...'); break; }
          if (isMutado(from, alvo))   { await reply('❌ Este usuário já está mutado...'); break; }

          addMute(from, alvo);
          await sock.sendMessage(from, {
            text: `🤫 *@${alvo.split('@')[0]} foi mutado com sucesso!*\nAs mensagens dele serão apagadas automaticamente.`,
            mentions: [alvo]
          });
          break;
        }

        // ── !desmute ──────────────────────────────────────────
        case 'desmute': {
          if (!isGroup)                  { await reply('❌ Este comando só funciona em grupos!'); break; }
          if (!isGroupAdmins && !isDono) { await reply('❌ Apenas administradores podem usar este comando!'); break; }
          if (!isBotGroupAdmins)         { await reply('❌ Preciso ser administrador do grupo para funcionar!'); break; }

          const quotedP  = msg.message?.extendedTextMessage?.contextInfo?.participant
            ? normalizarJid(msg.message.extendedTextMessage.contextInfo.participant)
            : null;
          const mencoesDesmute = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const alvo = quotedP || (mencoesDesmute.length > 0 ? normalizarJid(mencoesDesmute[0]) : null);

          if (!alvo) { await reply('❌ Marque o usuário que deseja desmutar ou responda à mensagem dele!'); break; }

          const removeu = removeMute(from, alvo);
          if (!removeu) { await reply('❌ Este usuário não está mutado...'); break; }

          await sock.sendMessage(from, {
            text: `🔊 *@${alvo.split('@')[0]} foi desmutado com sucesso!*`,
            mentions: [alvo]
          });
          break;
        }

        // ── !mutelist ─────────────────────────────────────────
        case 'mutelist': {
          if (!isGroup)                  { await reply('❌ Este comando só funciona em grupos!'); break; }
          if (!isGroupAdmins && !isDono) { await reply('❌ Apenas administradores podem usar este comando!'); break; }

          const gp = getGrupoMute(from);
          if (!gp || gp.mutados.length === 0) { await reply('✅ Não há usuários mutados neste grupo.'); break; }

          const lista = gp.mutados.map(m => `• @${m.id.split('@')[0]}`).join('\n');
          await sock.sendMessage(from, {
            text: `🤫 *Usuários mutados do grupo:*\n📟 Total: ${gp.mutados.length}\n\n${lista}`,
            mentions: gp.mutados.map(m => m.id)
          });
          break;
        }

        // ── !antilinkgp 1/0 ───────────────────────────────────
        case 'antilinkgp': {
          if (!isGroup)                  { await reply('❌ Este comando só funciona em grupos!'); break; }
          if (!isGroupAdmins && !isDono) { await reply('❌ Apenas administradores podem usar este comando!'); break; }
          if (!isBotGroupAdmins)         { await reply('❌ Preciso ser administrador do grupo para funcionar!'); break; }
          if (args.length < 1)           { await reply(`ℹ️ Use: *${CONFIG.prefixo}antilinkgp 1* pra ligar / *${CONFIG.prefixo}antilinkgp 0* pra desligar`); break; }

          const cfg = getGrupoConfig(from);
          if (Number(args[0]) === 1) {
            if (cfg.antilinkgp) { await reply('✅ Anti link GP já está ativo!'); break; }
            cfg.antilinkgp = true;
            salvarGrupoConfig();
            await reply('🌀 *Anti link GP ativado* com sucesso! 📝\n\nLinks de grupos externos serão deletados.\nAo acumular 3 advertências o membro é removido.');
          } else if (Number(args[0]) === 0) {
            if (!cfg.antilinkgp) { await reply('✅ Anti link GP já está desativado!'); break; }
            cfg.antilinkgp = false;
            salvarGrupoConfig();
            await reply('‼️ *Anti link GP desativado* com sucesso! ✔️');
          } else {
            await reply('ℹ️ Use *1* para ativar ou *0* para desativar.');
          }
          break;
        }

        // ── !antilinkhard / !antilink 1/0 ─────────────────────
        case 'antilinkhard':
        case 'antilink': {
          if (!isGroup)                  { await reply('❌ Este comando só funciona em grupos!'); break; }
          if (!isGroupAdmins && !isDono) { await reply('❌ Apenas administradores podem usar este comando!'); break; }
          if (!isBotGroupAdmins)         { await reply('❌ Preciso ser administrador do grupo para funcionar!'); break; }
          if (args.length < 1)           { await reply(`ℹ️ Use: *${CONFIG.prefixo}antilinkhard 1* pra ligar / *${CONFIG.prefixo}antilinkhard 0* pra desligar`); break; }

          const cfg = getGrupoConfig(from);
          if (Number(args[0]) === 1) {
            if (cfg.antilinkhard) { await reply('✅ Anti link Hard já está ativo!'); break; }
            cfg.antilinkhard = true;
            salvarGrupoConfig();
            await reply('🌀 *Anti link Hard ativado* com sucesso! 📝\n\nQualquer URL será deletada.\nAo acumular 3 advertências o membro é removido.');
          } else if (Number(args[0]) === 0) {
            if (!cfg.antilinkhard) { await reply('✅ Anti link Hard já está desativado!'); break; }
            cfg.antilinkhard = false;
            salvarGrupoConfig();
            await reply('‼️ *Anti link Hard desativado* com sucesso! ✔️');
          } else {
            await reply('ℹ️ Use *1* para ativar ou *0* para desativar.');
          }
          break;
        }

        // ── Comando desconhecido ───────────────────────────────
        default:
          await reply(
            `❓ Comando *${CONFIG.prefixo}${comando}* não encontrado.\n` +
            `Digite *${CONFIG.prefixo}menu* para ver os comandos disponíveis.`
          );
          break;
      }
    }
  });
}
// ─────────────────────────────────────────────────────────────

// ─── INICIALIZA O BOT ─────────────────────────────────────────
iniciarBot().catch((err) => {
  console.error('❌ Erro ao iniciar o bot:', err);
});
