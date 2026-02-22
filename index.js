import express from 'express';
import fs from 'fs';
import ws from 'ws';
import expressWs from 'express-ws';
import {job} from './keep_alive.js';
import {GroqOperations} from './groq_operations.js';  // ← CHANGÉ
import {TwitchBot} from './twitch_bot.js';

// Start keep alive cron job
job.start();
console.log(process.env);

// Setup express app
const app = express();
const expressWsInstance = expressWs(app);

// Set the view engine to ejs
app.set('view engine', 'ejs');

// Load environment variables
const GPT_MODE = process.env.GPT_MODE || 'CHAT';
const HISTORY_LENGTH = process.env.HISTORY_LENGTH || 5;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';  // ← CHANGÉ
const MODEL_NAME = process.env.MODEL_NAME || 'llama3-8b-8192';  // ← Modèle gratuit Groq
const TWITCH_USER = process.env.TWITCH_USER || 'oSetinhasBot';
const TWITCH_AUTH = process.env.TWITCH_AUTH || 'oauth:vgvx55j6qzz1lkt3cwggxki1lv53c2';
const COMMAND_NAME = process.env.COMMAND_NAME || '!gpt';
const CHANNELS = process.env.CHANNELS || 'oSetinhas,jones88';
const SEND_USERNAME = process.env.SEND_USERNAME || 'true';
const ENABLE_TTS = process.env.ENABLE_TTS || 'false';
const ENABLE_CHANNEL_POINTS = process.env.ENABLE_CHANNEL_POINTS || 'false';
const COOLDOWN_DURATION = parseInt(process.env.COOLDOWN_DURATION, 10) || 10;

if (!GROQ_API_KEY) {
    console.error('No GROQ_API_KEY found. Please set it as an environment variable.');
}

const commandNames = COMMAND_NAME.split(',').map(cmd => cmd.trim().toLowerCase());
const channels = CHANNELS.split(',').map(channel => channel.trim());
const maxLength = 399;
let fileContext = 'You are a helpful Twitch Chatbot.';
let lastUserMessage = '';
let lastResponseTime = 0;

// Setup Twitch bot
console.log('Channels: ', channels);
const bot = new TwitchBot(TWITCH_USER, TWITCH_AUTH, channels, GROQ_API_KEY, ENABLE_TTS);  // ← Pass Groq key

// Setup Groq operations
fileContext = fs.readFileSync('./file_context.txt', 'utf8');
const groqOps = new GroqOperations(fileContext, GROQ_API_KEY, MODEL_NAME, HISTORY_LENGTH);  // ← CHANGÉ

// RESTE IDENTIQUE (copie tout le reste du fichier original jusqu'à la fin)
bot.onConnected((addr, port) => {
    console.log(`* Connected to ${addr}:${port}`);
    channels.forEach(channel => {
        console.log(`* Joining ${channel}`);
        console.log(`* Saying hello in ${channel}`);
    });
});

bot.onDisconnected(reason => {
    console.log(`Disconnected: ${reason}`);
});

bot.connect(
    () => {
        console.log('Bot connected!');
    },
    error => {
        console.error("Bot couldn't connect!", error);
    }
);

bot.onMessage(async (channel, user, message, self) => {
    if (self) return;

    const currentTime = Date.now();
    const elapsedTime = (currentTime - lastResponseTime) / 1000;

    if (ENABLE_CHANNEL_POINTS === 'true' && user['msg-id'] === 'highlighted-message') {
        console.log(`Highlighted message: ${message}`);
        if (elapsedTime < COOLDOWN_DURATION) {
            bot.say(channel, `Cooldown active. Please wait ${COOLDOWN_DURATION - elapsedTime.toFixed(1)} seconds before sending another message.`);
            return
