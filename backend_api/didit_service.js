const https = require('https');

class DIDITService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://verification.didit.me/v3';
        this.authUrl = 'https://apx.didit.me/auth/v2';
    }

    // Register organization to get API key
    async registerOrganization(email, password) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({ email, password });
            const options = {
                hostname: 'apx.didit.me',
                path: '/auth/v2/programmatic/register/',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            };
            const req = https.request(options, (res) => {
                let response = '';
                res.on('data', chunk => response += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(response);
                        console.log('DIDIT Registration Response:', parsed);
                        resolve(parsed);
                    } catch(e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    // Login to get access token
    async login(email, password) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({ email, password });
            const options = {
                hostname: 'apx.didit.me',
                path: '/auth/v2/programmatic/login/',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            };
            const req = https.request(options, (res) => {
                let response = '';
                res.on('data', chunk => response += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(response);
                        console.log('DIDIT Login Response:', parsed);
                        resolve(parsed);
                    } catch(e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    // Create verification workflow
    async createWorkflow(workflowName, apiKey) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                name: workflowName,
                features: {
                    id_verification: true,
                    passive_liveness: true,
                    face_match: true,
                    aml_screening: false,
                    nfc: false,
                    ip_analysis: true,
                    phone_verification: false,
                    email_verification: false
                }
            });
            const options = {
                hostname: 'verification.didit.me',
                path: '/v3/workflows/',
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                }
            };
            const req = https.request(options, (res) => {
                let response = '';
                res.on('data', chunk => response += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(response);
                        console.log('DIDIT Workflow Created:', parsed);
                        resolve(parsed);
                    } catch(e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    // Create verification session
    async createSession(workflowId, vendorData, callbackUrl, apiKey) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                workflow_id: workflowId,
                vendor_data: vendorData,
                callback: callbackUrl,
                redirect_url: 'https://pawbandhan.com/verification-complete'
            });
            const options = {
                hostname: 'verification.didit.me',
                path: '/v3/sessions/',
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                }
            };
            const req = https.request(options, (res) => {
                let response = '';
                res.on('data', chunk => response += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(response);
                        console.log('DIDIT Session Created:', parsed);
                        resolve(parsed);
                    } catch(e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    // Get session status
    async getSessionStatus(sessionId, apiKey) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'verification.didit.me',
                path: `/v3/sessions/${sessionId}/`,
                method: 'GET',
                headers: { 'x-api-key': apiKey }
            };
            const req = https.request(options, (res) => {
                let response = '';
                res.on('data', chunk => response += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(response);
                        resolve(parsed);
                    } catch(e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.end();
        });
    }

    // Submit document for verification
    async verifyDocument(imageBase64, documentType, apiKey) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                document_image: imageBase64,
                document_type: documentType
            });
            const options = {
                hostname: 'verification.didit.me',
                path: '/v3/id-verification/',
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                }
            };
            const req = https.request(options, (res) => {
                let response = '';
                res.on('data', chunk => response += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(response);
                        resolve(parsed);
                    } catch(e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    // Submit liveness/selfie check
    async verifyLiveness(selfieBase64, apiKey) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                selfie_image: selfieBase64
            });
            const options = {
                hostname: 'verification.didit.me',
                path: '/v3/passive-liveness/',
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                }
            };
            const req = https.request(options, (res) => {
                let response = '';
                res.on('data', chunk => response += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(response);
                        console.log('DIDIT Liveness Response:', parsed);
                        resolve(parsed);
                    } catch(e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    // Face match between document and selfie
    async faceMatch(documentImage, selfieImage, apiKey) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                image1: documentImage,
                image2: selfieImage
            });
            const options = {
                hostname: 'verification.didit.me',
                path: '/v3/face-match/',
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                }
            };
            const req = https.request(options, (res) => {
                let response = '';
                res.on('data', chunk => response += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(response);
                        resolve(parsed);
                    } catch(e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }
}

module.exports = { DIDITService };
