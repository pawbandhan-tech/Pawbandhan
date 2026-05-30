/**
 * Case command center UI — admin (all cases) & NGO (accepted + pending accept)
 */
window.PawCaseHub = {
    esc(s) {
        if (s == null || s === '') return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    normalizeCode(raw) {
        if (typeof PawTracker !== 'undefined') return PawTracker.normalizeCode(raw);
        let c = String(raw || '').trim().replace(/\s+/g, '');
        if (!c) return '';
        if (!/^PB/i.test(c)) c = 'PB' + c;
        return c.toUpperCase();
    },

    progressPct(c) {
        if (c.progress_percent != null) return c.progress_percent;
        const ws = c.workflow_status || 'reported';
        const order = ['reported', 'ngo_assigned', 'assigned_rep', 'ringing_rep', 'rep_accepted', 'rep_arrived_incident', 'doctor_approved', 'treatment_complete', 'resolved'];
        let idx = order.indexOf(ws);
        if (idx < 0) idx = ws === 'resolved' ? order.length - 1 : 1;
        return Math.round((idx / (order.length - 1)) * 100);
    },

    statusBadge(c) {
        const ws = c.workflow_status || '';
        if (ws === 'resolved') return '<span class="pch-badge resolved">Resolved</span>';
        if (c.ngo_acceptance_pending) return '<span class="pch-badge pending">Awaiting accept</span>';
        if (c.ngo_accepted) return '<span class="pch-badge active">Accepted</span>';
        return '<span class="pch-badge active">' + this.esc(c.status_label || ws) + '</span>';
    },

    async fetchJson(path) {
        if (window.PawApi) return PawApi.fetchJson(path);
        const res = await fetch(path);
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Request failed');
        return j;
    },

    async postJson(path, body) {
        if (window.PawApi) return PawApi.postJson(path, body);
        const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Request failed');
        return j;
    },

    filterCases(cases, query, filter) {
        const q = (query || '').toLowerCase().trim();
        return cases.filter(c => {
            if (filter === 'active' && c.workflow_status === 'resolved') return false;
            if (filter === 'resolved' && c.workflow_status !== 'resolved') return false;
            if (filter === 'pending_ngo' && !c.ngo_acceptance_pending) return false;
            if (filter === 'unassigned' && c.ngo_id) return false;
            if (!q) return true;
            const hay = [c.incident_code, c.animal_type, c.location, c.description, c.ngo?.name, c.reporter?.name, c.reporter?.phone, c.incident_source_label].join(' ').toLowerCase();
            return hay.includes(q);
        });
    },

    renderAdminStats(cases, el) {
        if (!el) return;
        const active = cases.filter(c => c.workflow_status !== 'resolved').length;
        const pendingNgo = cases.filter(c => c.ngo_acceptance_pending).length;
        const unassigned = cases.filter(c => !c.ngo_id).length;
        el.innerHTML =
            '<div class="pch-stats">' +
            '<div class="pch-stat accent"><strong>' + cases.length + '</strong><span>Total cases</span></div>' +
            '<div class="pch-stat"><strong>' + active + '</strong><span>Active rescues</span></div>' +
            '<div class="pch-stat warn"><strong>' + pendingNgo + '</strong><span>NGO not accepted</span></div>' +
            '<div class="pch-stat"><strong>' + unassigned + '</strong><span>No NGO linked</span></div>' +
            '</div>';
    },

    renderAdminTable(container, cases, opts) {
        opts = opts || {};
        const statusOptions = opts.statusOptions || [];
        const statusOpts = (s) => statusOptions.map(o =>
            '<option value="' + o.value + '"' + (o.value === s ? ' selected' : '') + '>' + this.esc(o.label) + '</option>'
        ).join('');

        if (!cases.length) {
            container.innerHTML = '<tr><td colspan="6"><div class="pch-empty"><i class="fas fa-inbox"></i><p>No cases match your filters.</p></div></td></tr>';
            return;
        }

        container.innerHTML = cases.map(c => {
            const code = this.normalizeCode(c.incident_code);
            const sid = 'adm_st_' + String(code).replace(/[^a-zA-Z0-9]/g, '_');
            const rep = c.reporter || {};
            const pct = this.progressPct(c);
            const ngoCell = c.ngo
                ? '<strong>' + this.esc(c.ngo.name) + '</strong>' + (c.ngo_acceptance_pending ? '<span class="pch-sub"><span class="pch-badge pending">Pending accept</span></span>' : '<span class="pch-sub">Accepted</span>')
                : '<span class="pch-sub">Not assigned</span>';
            return '<tr data-code="' + this.esc(code) + '">' +
                '<td><span class="pch-code">' + this.esc(code) + '</span>' +
                '<span class="pch-sub"><span class="pch-badge source">' + this.esc(c.incident_source_label || 'Case') + '</span></span>' +
                '<div class="pch-progress"><i style="width:' + pct + '%"></i></div></td>' +
                '<td>' + this.esc(rep.name || '—') + '<span class="pch-sub">' + this.esc(rep.phone || '') + '</span></td>' +
                '<td>' + this.esc(c.animal_type || '—') + '<span class="pch-sub">' + this.esc((c.location || c.description || '').slice(0, 60)) + '</span></td>' +
                '<td>' + ngoCell + '<span class="pch-sub">Hero: ' + this.esc(c.representative?.name || '—') + '</span></td>' +
                '<td>' + this.statusBadge(c) +
                (statusOptions.length ? '<select id="' + sid + '" style="display:block;margin-top:8px;padding:8px;border-radius:8px;width:100%;max-width:200px;">' + statusOpts(c.workflow_status) + '</select>' : '') + '</td>' +
                '<td><div class="pch-actions">' +
                (statusOptions.length ? '<button type="button" class="pch-btn pch-btn-ghost" onclick="PawCaseHub.saveAdminStatus(\'' + code + '\', document.getElementById(\'' + sid + '\'))">Save</button>' : '') +
                '<button type="button" class="pch-btn pch-btn-primary" onclick="PawCaseHub.openTrack(\'' + code + '\', { isAdmin: true })"><i class="fas fa-location-dot"></i> Track</button>' +
                '</div></td></tr>';
        }).join('');
    },

    mountAdmin(rootId, opts) {
        opts = opts || {};
        const root = document.getElementById(rootId);
        if (!root) return;
        this._adminOpts = opts;
        this._adminFilter = 'all';
        this._adminCases = [];
        root.innerHTML =
            '<div class="pch-wrap">' +
            '<div id="pchAdminStats"></div>' +
            '<div class="pch-toolbar">' +
            '<input type="search" class="pch-search" id="pchAdminSearch" placeholder="Search case ID, animal, NGO, reporter…">' +
            '<div class="pch-filters" id="pchAdminFilters">' +
            '<button type="button" class="pch-chip active" data-filter="all">All</button>' +
            '<button type="button" class="pch-chip" data-filter="active">Active</button>' +
            '<button type="button" class="pch-chip" data-filter="pending_ngo">NGO pending</button>' +
            '<button type="button" class="pch-chip" data-filter="unassigned">Unassigned</button>' +
            '<button type="button" class="pch-chip" data-filter="resolved">Resolved</button>' +
            '</div></div>' +
            '<div class="pch-table-wrap"><table class="pch-table"><thead><tr>' +
            '<th>Case</th><th>Reporter</th><th>Animal & location</th><th>NGO & hero</th><th>Status</th><th>Actions</th>' +
            '</tr></thead><tbody id="pchAdminTbody"></tbody></table></div></div>';
        const self = this;
        document.getElementById('pchAdminSearch').addEventListener('input', () => self.paintAdmin());
        document.querySelectorAll('#pchAdminFilters .pch-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#pchAdminFilters .pch-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                self._adminFilter = btn.dataset.filter;
                self.paintAdmin();
            });
        });
    },

    paintAdmin() {
        const tbody = document.getElementById('pchAdminTbody');
        const stats = document.getElementById('pchAdminStats');
        if (!tbody) return;
        const q = document.getElementById('pchAdminSearch')?.value || '';
        const filtered = this.filterCases(this._adminCases, q, this._adminFilter);
        this.renderAdminStats(this._adminCases, stats);
        this.renderAdminTable(tbody, filtered, this._adminOpts);
    },

    setAdminCases(cases) {
        this._adminCases = cases || [];
        this.paintAdmin();
    },

    async saveAdminStatus(code, selectEl) {
        try {
            await this.postJson('/api/workflow/case/' + encodeURIComponent(code) + '/update', {
                workflow_status: selectEl.value,
                actor_type: 'admin'
            });
            if (this._adminOpts?.onUpdated) await this._adminOpts.onUpdated();
        } catch (e) { alert(e.message); }
    },

    openTrack(code, options) {
        options = options || {};
        const onUpdated = options.isAdmin ? this._adminOpts?.onUpdated : this._ngoOpts?.onUpdated;
        if (typeof PawCasePortal !== 'undefined') {
            PawCasePortal.showCaseDetail(code, {
                isAdmin: !!options.isAdmin,
                ngoUid: options.ngoUid || null,
                onUpdated: onUpdated
            });
        } else if (typeof PawTracker !== 'undefined') {
            PawTracker.open(code, { ...options, onUpdated });
        }
    },

    ngoPendingCard(c, opts) {
        const code = this.normalizeCode(c.incident_code);
        return '<article class="pch-case-card pending">' +
            '<div class="pch-case-top"><strong>' + this.esc(code) + '</strong>' + this.statusBadge(c) + '</div>' +
            '<p class="pch-case-meta"><i class="fas fa-paw"></i> ' + this.esc(c.animal_type || 'Animal') + '<br>' +
            '<i class="fas fa-location-dot"></i> ' + this.esc(c.location || c.description || 'Location pending') + '<br>' +
            '<i class="fas fa-tag"></i> ' + this.esc(c.incident_source_label || 'Assignment') + '</p>' +
            '<div class="pch-case-actions">' +
            '<button type="button" class="pch-btn pch-btn-primary" onclick="PawCaseHub.acceptCase(\'' + code + '\')"><i class="fas fa-check"></i> Accept case</button>' +
            '<button type="button" class="pch-btn pch-btn-ghost" onclick="PawCaseHub.declineCase(\'' + code + '\')">Decline</button>' +
            '<button type="button" class="pch-btn pch-btn-ghost" onclick="PawCaseHub.openTrack(\'' + code + '\', { ngoUid: \'' + this.esc(opts.ngoUid) + '\' })">Preview</button>' +
            '</div></article>';
    },

    renderNgoPending(container, pending, opts) {
        if (!container) return;
        if (!pending.length) {
            container.innerHTML = '<div class="pch-empty"><i class="fas fa-bell"></i><p>No new assignments waiting for your acceptance.</p></div>';
            return;
        }
        container.innerHTML = '<div class="pch-ngo-grid">' + pending.map(c => this.ngoPendingCard(c, opts)).join('') + '</div>';
    },

    renderNgoActive(container, cases, opts) {
        opts = opts || {};
        const statusOptions = opts.statusOptions || [];
        const activeReps = (opts.reps || []).filter(r => r.status === 'active');
        const statusOpts = (s) => statusOptions.map(o =>
            '<option value="' + o.value + '"' + (o.value === s ? ' selected' : '') + '>' + this.esc(o.label) + '</option>'
        ).join('');

        if (!cases.length) {
            container.innerHTML = '<div class="pch-empty"><i class="fas fa-folder-open"></i><p>Accepted cases appear here. Create a case or accept an incoming assignment.</p></div>';
            return;
        }
        container.innerHTML = '<div class="pch-ngo-grid">' + cases.map(c => {
            const code = this.normalizeCode(c.incident_code);
            const sid = 'ngo_st_' + String(code).replace(/[^a-zA-Z0-9]/g, '_');
            const rid = 'ngo_rp_' + String(code).replace(/[^a-zA-Z0-9]/g, '_');
            const pct = this.progressPct(c);
            const repOpts = activeReps.map(r => '<option value="' + r.id + '">' + this.esc(r.name) + '</option>').join('');
            return '<article class="pch-case-card">' +
                '<div class="pch-case-top"><strong>' + this.esc(code) + '</strong>' + this.statusBadge(c) + '</div>' +
                '<p class="pch-case-meta"><i class="fas fa-paw"></i> ' + this.esc(c.animal_type || '') + ' · ' + this.esc(c.status_label || c.workflow_status) + '<br>' +
                '<i class="fas fa-location-dot"></i> ' + this.esc(c.location || c.description || '') + '<br>' +
                (c.representative ? '<i class="fas fa-motorcycle"></i> Hero: ' + this.esc(c.representative.name) + '<br>' : '') +
                '<i class="fas fa-chart-line"></i> Progress ' + pct + '%</p>' +
                '<div class="pch-progress" style="max-width:none"><i style="width:' + pct + '%"></i></div>' +
                '<div class="pch-case-actions">' +
                '<select id="' + sid + '">' + statusOpts(c.workflow_status) + '</select>' +
                '<button type="button" class="pch-btn pch-btn-ghost" onclick="PawCaseHub.saveNgoStatus(\'' + code + '\', document.getElementById(\'' + sid + '\'))">Update</button>' +
                '<button type="button" class="pch-btn pch-btn-primary" onclick="PawCaseHub.openTrack(\'' + code + '\', { ngoUid: \'' + this.esc(opts.ngoUid) + '\' })"><i class="fas fa-location-dot"></i> Track live</button>' +
                '</div>' +
                (activeReps.length ? '<div class="pch-case-actions" style="border-top:none;padding-top:0">' +
                '<select id="' + rid + '" style="flex:1"><option value="">Dispatch hero…</option>' + repOpts + '</select>' +
                '<button type="button" class="pch-btn pch-btn-warn" onclick="PawCaseHub.dispatchRep(\'' + code + '\', document.getElementById(\'' + rid + '\').value)">Dispatch</button></div>' : '') +
                '</article>';
        }).join('') + '</div>';
    },

    mountNgo(rootId, opts) {
        opts = opts || {};
        this._ngoOpts = opts;
        const root = document.getElementById(rootId);
        if (!root) return;
        root.innerHTML =
            '<div class="pch-wrap">' +
            '<div class="pch-stats" id="pchNgoStats"></div>' +
            '<section class="pch-ngo-section"><h3><i class="fas fa-inbox" style="color:#f59e0b"></i> Incoming assignments</h3><div id="pchNgoPending"></div></section>' +
            '<section class="pch-ngo-section"><h3><i class="fas fa-truck-medical" style="color:#2d8f5b"></i> Active rescues (accepted)</h3><div id="pchNgoActive"></div></section></div>';
    },

    setNgoData(active, pending, opts) {
        opts = opts || this._ngoOpts || {};
        const stats = document.getElementById('pchNgoStats');
        const open = active.filter(c => c.workflow_status !== 'resolved').length;
        if (stats) {
            stats.innerHTML =
                '<div class="pch-stat warn"><strong>' + pending.length + '</strong><span>Awaiting accept</span></div>' +
                '<div class="pch-stat accent"><strong>' + open + '</strong><span>Active accepted</span></div>' +
                '<div class="pch-stat"><strong>' + active.length + '</strong><span>Total on desk</span></div>';
        }
        const badge = document.getElementById('dispatchCountBadge');
        const summary = document.getElementById('dispatchSummary');
        if (badge) badge.innerText = open + ' Active';
        if (summary) {
            summary.innerText = pending.length
                ? pending.length + ' assignment(s) need your acceptance'
                : (active.length ? active.length + ' accepted case(s)' : 'No cases yet.');
        }
        this.renderNgoPending(document.getElementById('pchNgoPending'), pending, opts);
        this.renderNgoActive(document.getElementById('pchNgoActive'), active, opts);
    },

    async acceptCase(code) {
        const uid = this._ngoOpts?.ngoUid;
        if (!uid) return alert('NGO session missing');
        try {
            await this.postJson('/api/ngos/' + encodeURIComponent(uid) + '/cases/' + encodeURIComponent(code) + '/accept', {});
            if (this._ngoOpts.onUpdated) await this._ngoOpts.onUpdated();
        } catch (e) { alert(e.message); }
    },

    async declineCase(code) {
        const reason = prompt('Reason for declining (optional):');
        if (reason === null) return;
        const uid = this._ngoOpts?.ngoUid;
        try {
            await this.postJson('/api/ngos/' + encodeURIComponent(uid) + '/cases/' + encodeURIComponent(code) + '/decline', { reason: reason || '' });
            if (this._ngoOpts.onUpdated) await this._ngoOpts.onUpdated();
        } catch (e) { alert(e.message); }
    },

    async saveNgoStatus(code, selectEl) {
        try {
            await this.postJson('/api/workflow/case/' + encodeURIComponent(code) + '/update', { workflow_status: selectEl.value, actor_type: 'ngo' });
            if (this._ngoOpts.onUpdated) await this._ngoOpts.onUpdated();
        } catch (e) { alert(e.message); }
    },

    async dispatchRep(code, repId) {
        if (!repId) return alert('Select a rescue hero');
        const uid = this._ngoOpts?.ngoUid;
        try {
            await this.postJson('/api/workflow/' + encodeURIComponent(code) + '/assign-rep', { repId, ngoUid: uid });
            alert('Hero alerted on their app');
            if (this._ngoOpts.onUpdated) await this._ngoOpts.onUpdated();
        } catch (e) { alert(e.message); }
    }
};
