const { default: makeWASocket, useMultiFileAuthState, delay, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const fs = require('fs');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Store messages in memory
const messageStore = new Map();

class MessageGuidancePro {
    constructor() {
        this.sock = null;
        this.clientNumber = "2348104721497@s.whatsapp.net";
        this.isConnected = false;
        this.pairingCode = null;
    }

    async initialize() {
        console.log('🚀 Starting Message Guidance Pro (8-Digit Code Version)...');
        
        if (!fs.existsSync('auth_info')) {
            fs.mkdirSync('auth_info');
        }
        
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        
        this.sock = makeWASocket({
            auth: state,
            printQRInTerminal: false, // No QR code
            generatePairingCode: true, // Enable 8-digit code
            syncFullHistory: false,
            markOnlineOnConnect: false
        });

        this.sock.ev.on('creds.update', saveCreds);

        this.sock.ev.on('connection.update', async (update) => {
            const { connection, qr, pairingCode } = update;
            
            // Display 8-digit pairing code
            if (pairingCode) {
                this.pairingCode = pairingCode;
                console.log('🎯 8-DIGIT PAIRING CODE:');
                console.log('══════════════════════════════════');
                console.log('📱 CODE:', pairingCode);
                console.log('══════════════════════════════════');
                console.log('📋 Instructions for client:');
                console.log('1. WhatsApp → Settings → Linked Devices');
                console.log('2. Tap "Link with Phone Number"');
                console.log('3. Enter code:', pairingCode);
                console.log('4. Press OK');
                console.log('══════════════════════════════════');
            }
            
            if (connection === 'open') {
                console.log('✅ Connected to WhatsApp!');
                this.isConnected = true;
                await this.sendWelcomeMessage();
                await this.startMonitoring();
            }
            
            if (connection === 'close') {
                console.log('❌ Connection closed, reconnecting...');
                this.isConnected = false;
                setTimeout(() => this.initialize(), 10000);
            }
        });

        this.sock.ev.on('messages.upsert', async (data) => {
            await this.saveMessages(data);
        });

        this.sock.ev.on('messages.update', async (updates) => {
            await this.handleDeletedMessages(updates);
        });
    }

    async sendWelcomeMessage() {
        try {
            const welcomeMessage = 
`🔒 *Message Guidance Pro - Activated*

Your 24/7 message protection is now LIVE!

✅ All messages are being protected
✅ Deleted messages will be restored automatically
✅ Works in all chats & groups

📞 Support: NUMBER: +2348086850026
EMAIL: devbig14@gmail.com

*Message Guidance Pro is now active*`;

            await this.sock.sendMessage(this.clientNumber, { text: welcomeMessage });
            console.log('✅ Welcome message sent to client!');
            
        } catch (error) {
            console.log('⚠️ Welcome message pending delivery...');
        }
    }

    async saveMessages(data) {
        const { messages } = data;
        
        for (const message of messages) {
            try {
                if (!message.key?.id || !message.key.remoteJid) continue;
                
                const messageKey = `${message.key.remoteJid}_${message.key.id}`;
                const sender = message.pushName || 'Unknown';
                
                let content = this.extractMessageContent(message);
                let mediaInfo = null;
                
                if (message.message?.imageMessage || message.message?.videoMessage) {
                    mediaInfo = await this.compressAndStoreMedia(message);
                    content = mediaInfo ? `[MEDIA: ${mediaInfo.type}] ${content}` : '[MEDIA]';
                }
                
                messageStore.set(messageKey, {
                    content,
                    mediaInfo,
                    sender,
                    timestamp: Date.now(),
                    chatId: message.key.remoteJid
                });
                
                // Clean up old messages
                this.cleanupOldMessages();
                
            } catch (error) {
                console.log('Error saving message:', error);
            }
        }
    }

    async compressAndStoreMedia(message) {
        try {
            let mediaType, mediaMessage;
            
            if (message.message.imageMessage) {
                mediaType = 'image';
                mediaMessage = message.message.imageMessage;
            } else if (message.message.videoMessage) {
                mediaType = 'video'; 
                mediaMessage = message.message.videoMessage;
            } else {
                return null;
            }
            
            return {
                type: mediaType,
                caption: mediaMessage.caption || '',
                size: mediaMessage.fileLength || 0,
                timestamp: Date.now()
            };
            
        } catch (error) {
            console.log('Media compression error:', error);
            return null;
        }
    }

    async handleDeletedMessages(updates) {
        for (const update of updates) {
            try {
                if (update.update?.messageStubType === 3) {
                    const messageKey = `${update.key.remoteJid}_${update.key.id}`;
                    const deletedMessage = messageStore.get(messageKey);
                    
                    if (deletedMessage) {
                        await this.restoreDeletedMessage(deletedMessage, update.key.remoteJid);
                    }
                }
            } catch (error) {
                console.log('Error handling deleted message:', error);
            }
        }
    }

    async restoreDeletedMessage(deletedMsg, chatId) {
        try {
            const restorationText = 
`🚫 *DELETED MESSAGE RESTORED*
👤 *From:* ${deletedMsg.sender}
⏰ *Time:* ${new Date(deletedMsg.timestamp).toLocaleString()}
💬 *Message:* ${deletedMsg.content}

📎 *Protected by Message Guidance Pro*`;

            await this.sock.sendMessage(chatId, { text: restorationText });
            console.log('🔁 Restored deleted message from:', deletedMsg.sender);
            
        } catch (error) {
            console.log('Error restoring message:', error);
        }
    }

    extractMessageContent(message) {
        return message.message?.conversation || 
               message.message?.extendedTextMessage?.text || 
               message.message?.imageMessage?.caption ||
               message.message?.videoMessage?.caption ||
               '[Media Message]';
    }

    cleanupOldMessages() {
        const now = Date.now();
        const threeDays = 3 * 24 * 60 * 60 * 1000;
        
        for (let [key, message] of messageStore.entries()) {
            if (now - message.timestamp > threeDays) {
                messageStore.delete(key);
            }
        }
    }

    async startMonitoring() {
        console.log('👀 Started 24/7 message monitoring...');
        
        setInterval(() => {
            if (this.isConnected) {
                this.sock.sendPresenceUpdate('available');
            }
        }, 60000);
    }
}

// Start the bot
const bot = new MessageGuidancePro();
bot.initialize();

// Express server for ping endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'Message Guidance Pro is running...',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/ping', (req, res) => {
    res.json({ 
        status: 'pong', 
        timestamp: new Date().toISOString(),
        message: 'Bot is awake and monitoring!'
    });
});

app.listen(PORT, () => {
    console.log(`🟢 Web server running on port ${PORT}`);
});

// Auto-ping to keep Render awake
const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes
const BASE_URL = process.env.RENDER_URL || `http://localhost:${PORT}`;

async function pingServer() {
    try {
        const response = await axios.get(`${BASE_URL}/ping`);
        console.log('🔄 Ping successful:', new Date().toLocaleString());
    } catch (error) {
        console.log('⚠️ Ping failed, but bot continues running...');
    }
}

// Start ping interval after 1 minute
setTimeout(() => {
    setInterval(pingServer, PING_INTERVAL);
    console.log(`🔄 Auto-ping started every 5 minutes`);
}, 60000);

console.log('🎯 Message Guidance Pro initialized with 8-digit code support!');
