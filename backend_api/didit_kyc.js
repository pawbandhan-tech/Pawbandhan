const https = require('https');

class DiditKYC {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://verification.didit.me/v3';
        this.authUrl = 'https://apx.didit.me/auth/v2';
    }

    async createWorkflow(workflowName) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                name: workflowName,
                features: {
                    id_verification: true,
                    passive_liveness: true,
                    face_match: true,
                    aml_screening: false,
                    nfc: false,
                    ip_analysis: true
                }
            });

            const options = {
                hostname: 'verification.didit.me',
                path: '/v3/workflows/',
                method: 'POST',
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => responseData += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(responseData));
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    async createSession(workflowId, vendorData, callbackUrl) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                workflow_id: workflowId,
                vendor_data: vendorData,
                callback: callbackUrl
            });

            const options = {
                hostname: 'verification.didit.me',
                path: '/v3/sessions/',
                method: 'POST',
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => responseData += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(responseData));
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    async getSessionStatus(sessionId) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'verification.didit.me',
                path: `/v3/sessions/${sessionId}/`,
                method: 'GET',
                headers: { 'x-api-key': this.apiKey }
            };

            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => responseData += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(responseData));
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });
    }

    async submitIdVerification(imageBase64, documentType) {
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
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => responseData += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(responseData));
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    async submitLivenessCheck(selfieBase64) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                selfie_image: selfieBase64
            });

            const options = {
                hostname: 'verification.didit.me',
                path: '/v3/passive-liveness/',
                method: 'POST',
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => responseData += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(responseData));
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }
}

module.exports = { DiditKYC };
