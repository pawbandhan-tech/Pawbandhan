/**
 * API base — same origin on Vercel when /api is rewritten to Render; localhost uses port 5000.
 */
(function () {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || window.location.protocol === 'file:';
    window.PAW_API_BASE = isLocal ? 'http://localhost:5000' : '';
    /** Prefix for /uploads/… paths (same origin on Vercel via rewrite) */
    window.PAW_MEDIA_BASE = window.PAW_API_BASE;
    window.PAW_SITE = {
        api: function (path) {
            const p = path.startsWith('/') ? path : '/' + path;
            return window.PAW_API_BASE + p;
        },
        fetchJson: async function (path, options) {
            const res = await fetch(this.api(path), options);
            const text = await res.text();
            let data = {};
            try { data = text ? JSON.parse(text) : {}; } catch (e) {
                throw new Error('Invalid response from API. Check deployment API URL.');
            }
            if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
            return data;
        }
    };

    /* Route /api/* to Render on Vercel static hosting */
    if (!window.__pawFetchPatched) {
        window.__pawFetchPatched = true;
        const nativeFetch = window.fetch.bind(window);
        window.fetch = function (input, init) {
            let url = typeof input === 'string' ? input : (input && input.url) || '';
            if (url.startsWith('/') && !url.startsWith('//') && url.indexOf('/api/') === 0) {
                url = (window.PAW_API_BASE || '') + url;
                return nativeFetch(url, init);
            }
            return nativeFetch(input, init);
        };
    }
})();
