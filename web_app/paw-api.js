/**
 * Safe API helper — avoids "Unexpected token '<'" when server returns HTML (404 page).
 */
window.PawApi = {
    base() {
        if (window.PAW_API_BASE) return String(window.PAW_API_BASE).replace(/\/$/, '');
        if (window.location.protocol === 'file:') return 'http://localhost:5000';
        const port = window.location.port;
        if (port && port !== '5000') return 'http://localhost:5000';
        return '';
    },

    url(path) {
        if (!path) return this.base() || '/';
        if (path.startsWith('http')) return path;
        return this.base() + path;
    },

    async fetchJson(path, options) {
        options = options || {};
        const res = await fetch(this.url(path), options);
        const text = await res.text();
        let data = {};
        if (text) {
            try {
                data = JSON.parse(text);
            } catch (e) {
                const hint = text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')
                    ? ' Got an HTML page instead of JSON. Open admin/NGO portals at http://localhost:5000 (not Live Server) and ensure the API is running.'
                    : ' Invalid JSON from server.';
                throw new Error(hint);
            }
        }
        if (!res.ok) throw new Error(data.error || data.message || ('Request failed (' + res.status + ')'));
        return data;
    },

    async postJson(path, body) {
        return this.fetchJson(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {})
        });
    }
};
