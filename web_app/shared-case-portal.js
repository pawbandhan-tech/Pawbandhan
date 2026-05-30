/**
 * Case details + workflow status updates (admin & NGO portals)
 */
window.PawCasePortal = {
    _statusOptions: null,
    _ngos: null,

    async loadStatusOptions() {
        if (this._statusOptions) return this._statusOptions;
        if (window.PawApi) {
            const panel = await PawApi.fetchJson('/api/workflow/tracker-panel?portal=admin');
            this._statusOptions = panel.statusOptions || [];
            return this._statusOptions;
        }
        const res = await fetch('/api/workflow/status-options');
        this._statusOptions = await res.json();
        return this._statusOptions;
    },

    async loadNgos() {
        if (this._ngos) return this._ngos;
        if (window.PawApi) {
            const panel = await PawApi.fetchJson('/api/workflow/tracker-panel?portal=admin');
            this._ngos = panel.ngos || [];
            return this._ngos;
        }
        const res = await fetch('/api/admin/verified-ngos');
        this._ngos = await res.json();
        return this._ngos;
    },

    statusSelectHtml(current, id) {
        const opts = (this._statusOptions || []).map((o) =>
            '<option value="' + o.value + '"' + (o.value === current ? ' selected' : '') + '>' + o.label + '</option>'
        ).join('');
        return '<select id="' + id + '" class="paw-status-select">' + opts + '</select>';
    },

    ngoSelectHtml(currentNgoId, id) {
        const opts = (this._ngos || []).map((n) =>
            '<option value="' + n.id + '"' + (String(n.id) === String(currentNgoId) ? ' selected' : '') + '>' + n.name + '</option>'
        ).join('');
        return '<select id="' + id + '" class="paw-ngo-select"><option value="">— Change NGO —</option>' + opts + '</select>';
    },

    ensureDetailModal() {
        if (document.getElementById('pawCaseDetailModal')) return;
        const el = document.createElement('div');
        el.innerHTML =
            '<div id="pawCaseDetailModal" class="modal-bg paw-case-detail-modal" style="display:none;">' +
            '<div class="modal-panel" style="max-width:900px;max-height:90vh;overflow-y:auto;position:relative;">' +
            '<button type="button" class="close-modal" onclick="PawCasePortal.closeDetail()">&times;</button>' +
            '<h2 id="pawCaseDetailTitle" style="margin-bottom:16px;">Case details</h2>' +
            '<div id="pawCaseDetailBody"></div></div></div>';
        document.body.appendChild(el.firstElementChild);
    },

    closeDetail() {
        const m = document.getElementById('pawCaseDetailModal');
        if (m) {
            m.classList.remove('open', 'active');
            m.style.display = 'none';
        }
    },

    openDetailModal() {
        this.ensureDetailModal();
        const m = document.getElementById('pawCaseDetailModal');
        m.style.display = 'flex';
        m.classList.add('open', 'active');
    },

    renderPhotos(photos, reportImages) {
        const all = [];
        (reportImages || []).forEach((url) => all.push({ url: url.startsWith('http') || url.startsWith('/') ? url : '/uploads/' + url, type: 'Report' }));
        (photos || []).forEach((p) => all.push({ url: p.file_url, type: p.photo_type || 'Photo' }));
        if (!all.length) return '<p class="paw-muted">No photos uploaded yet.</p>';
        return '<div class="paw-photo-grid">' + all.map((p) =>
            '<a href="' + p.url + '" target="_blank" rel="noopener"><img src="' + p.url + '" alt=""><span>' + p.type + '</span></a>'
        ).join('') + '</div>';
    },

    renderTimeline(timeline) {
        if (!timeline || !timeline.length) return '<p class="paw-muted">No timeline events yet.</p>';
        return '<ul class="paw-timeline">' + timeline.map((t) =>
            '<li><strong>' + (t.status || '') + '</strong><span>' + (t.note || '') + '</span><small>' +
            (t.created_at ? new Date(t.created_at).toLocaleString() : '') + '</small></li>'
        ).join('') + '</ul>';
    },

    async showCaseDetail(incidentCode, options) {
        options = options || {};
        if (typeof PawTracker === 'undefined') {
            alert('Tracking module not loaded. Refresh the page.');
            return;
        }
        const code = PawTracker.normalizeCode(incidentCode);
        await PawTracker.open(code, {
            mode: options.isAdmin ? 'admin' : 'ngo',
            isAdmin: !!options.isAdmin,
            ngoUid: options.ngoUid || null,
            onUpdated: options.onUpdated
        });
    }
};
