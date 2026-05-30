/**
 * Admin session — JWT from POST /api/admin/login, sent on all /api/admin/* requests.
 */
(function () {
    const TOKEN_KEY = 'paw_admin_token';
    const ADMIN_KEY = 'paw_admin_profile';

    function apiBase(path) {
        if (window.PawApi && PawApi.url) return PawApi.url(path);
        if (window.PAW_API_BASE) return String(window.PAW_API_BASE).replace(/\/$/, '') + path;
        return path;
    }

    window.PawAdminAuth = {
        getToken() {
            return sessionStorage.getItem(TOKEN_KEY);
        },
        getProfile() {
            try {
                return JSON.parse(sessionStorage.getItem(ADMIN_KEY) || 'null');
            } catch (e) {
                return null;
            }
        },
        setSession(token, admin) {
            sessionStorage.setItem(TOKEN_KEY, token);
            if (admin) sessionStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
        },
        clear() {
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(ADMIN_KEY);
        },
        isAuthenticated() {
            return Boolean(this.getToken());
        },
        authHeaders(extra) {
            const headers = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
            const token = this.getToken();
            if (token) headers.Authorization = 'Bearer ' + token;
            return headers;
        },
        async login(email, password) {
            const res = await fetch(apiBase('/api/admin/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const text = await res.text();
            let data = {};
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                throw new Error('Invalid response from server. Is the API running?');
            }
            if (!res.ok) throw new Error(data.error || 'Login failed');
            this.setSession(data.token, data.admin);
            return data;
        },
        async verifySession() {
            if (!this.getToken()) return false;
            try {
                const res = await fetch(apiBase('/api/admin/me'), { headers: this.authHeaders() });
                if (!res.ok) {
                    this.clear();
                    return false;
                }
                const data = await res.json();
                if (data.admin) this.setSession(this.getToken(), data.admin);
                return true;
            } catch (e) {
                this.clear();
                return false;
            }
        },
        requireSession() {
            if (!this.isAuthenticated()) {
                window.location.href = 'admin_auth.html';
                return false;
            }
            return true;
        },
        logout() {
            this.clear();
            window.location.href = 'admin_auth.html';
        }
    };

    const nativeFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
        init = init || {};
        let url = typeof input === 'string' ? input : (input && input.url) || '';
        if (url.startsWith('/') && !url.startsWith('//')) {
            url = apiBase(url);
        }
        const isAdminApi = url.indexOf('/api/admin/') !== -1 && url.indexOf('/api/admin/login') === -1;
        if (isAdminApi && window.PawAdminAuth.getToken()) {
            const headers = new Headers(init.headers || {});
            if (!headers.has('Authorization')) {
                headers.set('Authorization', 'Bearer ' + window.PawAdminAuth.getToken());
            }
            init.headers = headers;
        }
        return nativeFetch(input, init).then(function (response) {
            if (response.status === 401 && isAdminApi) {
                window.PawAdminAuth.clear();
                if (!window.location.pathname.endsWith('admin_auth.html')) {
                    window.location.href = 'admin_auth.html';
                }
            }
            return response;
        });
    };
})();
