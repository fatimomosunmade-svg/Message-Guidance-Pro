// FIX: Add crypto polyfill at the very top
globalThis.crypto = require('crypto').webcrypto;

const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const fs = require('fs');
const http = require('http');

console.log('🔥 AGGRESSIVE RENDER BOT ACTIVATED!');

// Store messages in memory
const messageStore = new Map();

// 🔥 AGGRESSIVE CONNECTION SETTINGS
let connectionAttempts = 0;
const MAX_RETRIES = 8;
let isConnecting = false;

class MessageGuidancePro {
    constructor() {
        this.sock = null;
        this.clientNumber = "2348104721497@s.whatsapp.net";
        this.isConnected = false;
        this.pairingCode = null;
    }

    async initialize() {
        if (isConnecting) return;
        isConnecting = true;
        
        console.log(`🚀 Attempt ${connectionAttempts + 1}/${MAX_RETRIES} - Starting Message Guidance Pro...`);
        
        if (!fs.existsSync('auth_info')) {
            fs.mkdirSync('auth_info');
        }
        
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        
        // 🔥 AGGRESSIVE SOCKET CONFIG
        this.sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            generatePairingCode: true,
            
            // 🔥 STEALTH MODE ACTIVATED
            connectTimeoutMs: 45000,
            keepAliveIntervalMs: 20000,
            maxRetries: 10,
            browser: ["Windows", "Chrome", "115.0"],
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            syncFullHistory: false,
            markOnlineOnConnect: false,
            });

        this.sock.ev.on('creds.update', saveCreds);

        this.sock.ev.on('connection.update', async (update) => {
            console.log('🔍 CONNECTION UPDATE:', JSON.stringify(update));
            
            const { connection, pairingCode, qr, lastDisconnect } = update;
            
            // 🔥 EXTENSIVE LOGGING
            if (lastDisconnect) {
                console.log('💀 Last disconnect error:', lastDisconnect.error);
            }
            
            if (pairingCode) {
                this.pairingCode = pairingCode;
                console.log('🎯 ╔══════════════════════════════════╗');
                console.log('🎯 ║        8-DIGIT CODE FOUND!       ║');
                console.log('🎯 ║    CODE:', pairingCode, '   ║');
                console.log('🎯 ╚══════════════════════════════════╝');
                
                // Backup QR code
                if (qr) {
                    console.log('📱 QR Code backup available');
                }
            }
            
            if (connection === 'open') {
                console.log('✅ CONNECTION ESTABLISHED!');
                this.isConnected = true;
                connectionAttempts = 0; // Reset counter
                isConnecting = false;
                await this.sendWelcomeMessage();
                await this.startMonitoring();
            }
            
            if (connection === 'close') {
                console.log('❌ Connection closed, aggressive reconnecting...');
                this.isConnected = false;
                isConnecting = false;
                connectionAttempts++;
                
                if (connectionAttempts < MAX_RETRIES) {
                    setTimeout(() => this.initialize(), 5000);
                } else {
                    console.log('💀 Max retries reached, forcing service restart...');
                    process.exit(1);
                }
            }
        });

        this.sock.ev.on('messages.upsert', async (data) => {
            await this.saveMessages(data);
        });

        this.sock.ev.on('messages.update', async (updates) => {
            await this.handleDeletedMessages(updates);
        });

        // 🔥 FORCEFUL TIMEOUT RESTART
        setTimeout(() => {
            if (!this.isConnected && !isConnecting) {
                console.log('💀 Stuck too long, forcing restart...');
                process.exit(1);
            }
        }, 120000); // 2 minutes
    }

    async sendWelcomeMessage() {
        try {
            const welcomeMessage = 
`🔒 *Message Guidance Pro - Activated*

Your 24/7 message protection is now LIVE!

✅ All messages are being protected
✅ Deleted messages will be restored automatically
✅ Works in all chats & groups

📞 Support: +234 812 345 6789

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

// 🔥 AGGRESSIVE STARTUP STRATEGY
const bot = new MessageGuidancePro();

async function nuclearStartup() {
    try {
        await bot.initialize();
    } catch (error) {
        console.log('💥 Initialization failed:', error.message);
        connectionAttempts++;
        
        if (connectionAttempts < MAX_RETRIES) {
            console.log(`🔄 Retrying nuclear startup... (${connectionAttempts}/${MAX_RETRIES})`);
            setTimeout(nuclearStartup, 3000);
        } else {
            console.log('💀 Max startup retries reached. Service restarting...');
            process.exit(1);
        }
    }
}

// Start the aggressive connection
nuclearStartup();

// Simple HTTP server for ping
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    
    if (req.url === '/ping') {
        res.end(JSON.stringify({ 
            status: 'pong', 
            timestamp: new Date().toISOString(),
            message: 'Bot is awake!',
            connectionAttempts: connectionAttempts
        }));
    } else {
        res.end(JSON.stringify({ 
            status: 'Message Guidance Pro is running...',
            timestamp: new Date().toISOString(),
            attempts: connectionAttempts
        }));
    }
});

server.listen(3000, () => {
    console.log('🟢 HTTP server running on port 3000');
});

// 🔥 NUCLEAR PING STRATEGY
const PING_INTERVAL = 4 * 60 * 1000; // 4 minutes (Render timeout: 5min)

// Ping multiple endpoints
const pingEndpoints = [
    `http://localhost:3000/ping`,
    `http://localhost:3000/`,
    `http://localhost:3000/health`
];

async function nuclearPing() {
    pingEndpoints.forEach(async (endpoint) => {
        try {
            await axios.get(endpoint, { timeout: 5000 });
            console.log('💥 Nuclear ping successful');
        } catch (error) {
            // Silent fail
        }
    });
}

// Start aggressive pinging
setTimeout(() => {
    setInterval(nuclearPing, PING_INTERVAL);
    console.log(`💥 Nuclear ping activated every 4 minutes`);
}, 30000);

console.log('🎯 AGGRESSIVE Message Guidance Pro initialized!');
