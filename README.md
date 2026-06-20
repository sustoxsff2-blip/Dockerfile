# Xbox WhatsApp Checker Bot 🎮

Este bot de WhatsApp permite verificar cuentas de Xbox de forma masiva enviando un archivo `.txt`. Detecta si las credenciales son válidas y si la cuenta tiene una suscripción activa de **Game Pass**.

## Características
- **Verificación Rápida**: Utiliza la API de Microsoft (OAuth2) en lugar de un navegador lento.
- **Detección de Game Pass**: Identifica el tipo de suscripción (Ultimate, PC, Core).
- **Manejo de 2FA**: Detecta cuentas que requieren verificación en dos pasos.
- **Multitarea**: Procesa múltiples cuentas en paralelo para mayor velocidad.

## Requisitos
- Node.js v18 o superior.
- Una cuenta de WhatsApp para vincular (vía código QR).

## Instalación

1. Clona o descarga este proyecto.
2. Abre una terminal en la carpeta del proyecto.
3. Instala las dependencias:
   ```bash
   npm install
   ```

## Uso

1. Inicia el bot:
   ```bash
   npm start
   ```
2. Escanea el código QR que aparecerá en la terminal con tu aplicación de WhatsApp (Dispositivos vinculados).
3. Envía un archivo `.txt` al chat del bot con el formato:
   ```text
   usuario1@outlook.com:contraseña1
   usuario2@hotmail.com:contraseña2
   ```
4. El bot responderá con un resumen y un archivo de las cuentas válidas.

## Notas Legales
Este bot es para fines educativos y de gestión personal de cuentas. El uso masivo de cuentas de terceros puede violar los términos de servicio de Microsoft.
