import { authenticate, XSAPIClient } from '@xboxreplay/xboxlive-auth';

/**
 * Verifica una cuenta de Xbox y busca suscripciones activas.
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>} Resultado de la verificación
 */
export async function verifyXboxAccount(email, password) {
    try {
        // 1. Intentar autenticar con las credenciales
        const authData = await authenticate(email, password).catch(err => {
            if (err.message && (err.message.includes('LCID') || err.message.includes('credentials'))) {
                throw new Error('Credenciales inválidas');
            }
            throw err;
        });

        if (!authData || !authData.xsts_token) {
            return { email, status: 'invalid', message: 'No se pudo obtener el token XSTS' };
        }

        // 2. Verificar suscripciones usando la API de Xbox
        // Nota: La URL de suscripciones requiere el UserHash y el Token XSTS
        const userHash = authData.user_hash;
        const xstsToken = authData.xsts_token;

        // Intentamos obtener información de suscripciones
        // Endpoint: https://storeedgefd.dsx.mp.microsoft.com/v8.0/users/me/subscriptions
        // O alternativamente consultar el perfil para ver si es Gold/GamePass
        
        let subscriptions = [];
        let hasGamePass = false;
        let gamePassType = 'Ninguno';

        try {
            // Usamos el XSAPIClient para hacer peticiones autenticadas
            // Intentamos obtener las suscripciones del usuario
            const subResponse = await XSAPIClient.get('https://purchase.mp.microsoft.com/v8.0/users/me/subscriptions', {
                options: {
                    userHash: userHash,
                    XSTSToken: xstsToken
                }
            });

            if (subResponse && subResponse.items) {
                subscriptions = subResponse.items.map(item => ({
                    name: item.productName,
                    active: item.status === 'Active',
                    expiry: item.expiryDate
                }));

                const activeGP = subscriptions.find(s => 
                    s.active && 
                    (s.name.toLowerCase().includes('game pass') || s.name.toLowerCase().includes('ultimate'))
                );

                if (activeGP) {
                    hasGamePass = true;
                    gamePassType = activeGP.name;
                }
            }
        } catch (subErr) {
            // Si falla la consulta de suscripciones, al menos sabemos que la cuenta es válida
            console.error(`Error consultando suscripciones para ${email}:`, subErr.message);
            gamePassType = 'Error al consultar (Cuenta Válida)';
        }

        return {
            email,
            status: 'valid',
            hasGamePass,
            gamePassType,
            gamertag: authData.display_claims?.gtg || 'Desconocido'
        };

    } catch (error) {
        let msg = error.message || 'Error desconocido';
        if (msg.includes('MFA') || msg.includes('two-factor')) {
            return { email, status: 'mfa', message: 'Requiere verificación en dos pasos (2FA)' };
        }
        return { email, status: 'invalid', message: msg };
    }
}
