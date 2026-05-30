/**
 * Full profile viewer for representatives, NGOs, and veterinarians
 */
window.PawEntityProfile = {
    ensureModal() {
        if (document.getElementById('pawEntityProfileModal')) return;
        const wrap = document.createElement('div');
        wrap.innerHTML =
            '<div id="pawEntityProfileModal" class="modal-bg paw-entity-profile-modal" style="display:none;z-index:9000;">' +
            '<div class="modal-panel paw-entity-panel" onclick="event.stopPropagation()">' +
            '<button type="button" class="close-modal" onclick="PawEntityProfile.close()">&times;</button>' +
            '<h2 id="pawEntityProfileTitle">Profile</h2>' +
            '<div id="pawEntityProfileBody" class="paw-entity-body"></div></div></div>';
        document.body.appendChild(wrap.firstElementChild);
        document.getElementById('pawEntityProfileModal').addEventListener('click', function (e) {
            if (e.target.id === 'pawEntityProfileModal') PawEntityProfile.close();
        });
    },

    open() {
        this.ensureModal();
        const m = document.getElementById('pawEntityProfileModal');
        m.style.display = 'flex';
        m.classList.add('open', 'active');
        document.body.style.overflow = 'hidden';
    },

    close() {
        const m = document.getElementById('pawEntityProfileModal');
        if (m) {
            m.style.display = 'none';
            m.classList.remove('open', 'active');
        }
        document.body.style.overflow = '';
    },

    esc(s) {
        if (s == null || s === '') return '—';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    fmtDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    },

    docGrid(kyc) {
        if (!kyc) return '';
        const keys = [
            ['selfie', 'Selfie'], ['selfie_url', 'Selfie'], ['aadhaar', 'Aadhaar'], ['aadhaarFile', 'Aadhaar'],
            ['pan', 'PAN'], ['panFile', 'PAN'], ['dl', 'Driving licence'], ['dlFile', 'DL'],
            ['address_proof', 'Address proof'], ['addressProof', 'Address proof']
        ];
        const seen = new Set();
        let html = '<div class="paw-doc-grid">';
        keys.forEach(([k, label]) => {
            const url = kyc[k];
            if (!url || seen.has(url)) return;
            seen.add(url);
            const src = String(url).startsWith('http') || String(url).startsWith('/') ? url : '/uploads/' + url;
            html += '<a href="' + src + '" target="_blank" rel="noopener"><img src="' + src + '" alt="' + label + '"><span>' + label + '</span></a>';
        });
        html += '</div>';
        return seen.size ? html : '<p class="paw-muted">No documents uploaded.</p>';
    },

    statCards(stats) {
        return '<div class="paw-stat-row">' + stats.map(s =>
            '<div class="paw-stat-card"><strong>' + this.esc(s.value) + '</strong><span>' + this.esc(s.label) + '</span></div>'
        ).join('') + '</div>';
    },

    timelineList(items, mapFn) {
        if (!items || !items.length) return '<p class="paw-muted">No activity yet.</p>';
        return '<ul class="paw-activity-list">' + items.map(mapFn).join('') + '</ul>';
    },

    async openRep(id, options) {
        options = options || {};
        const url = options.ngoUid
            ? '/api/ngos/' + encodeURIComponent(options.ngoUid) + '/representatives/' + id + '/full-profile'
            : '/api/admin/representatives/' + id + '/full-profile';
        const d = window.PawApi ? await PawApi.fetchJson(url) : await (async function () {
            const res = await fetch(url); const j = await res.json(); if (!res.ok) throw new Error(j.error); return j;
        })();
        this.open();
        document.getElementById('pawEntityProfileTitle').textContent = d.name + ' — Rescue hero';
        const kyc = d.kyc_data || {};
        document.getElementById('pawEntityProfileBody').innerHTML =
            this.statCards([
                { label: 'Cases handled', value: d.cases_total || 0 },
                { label: 'Cases resolved', value: d.cases_resolved || 0 },
                { label: 'Status', value: d.status },
                { label: 'Online', value: d.is_online ? 'Yes' : 'No' }
            ]) +
            '<section class="paw-entity-section"><h4>Account</h4><p><strong>Email:</strong> ' + this.esc(d.email) +
            '<br><strong>Phone:</strong> ' + this.esc(d.phone) +
            '<br><strong>Rep ID:</strong> ' + this.esc(d.rep_id) +
            '<br><strong>NGO:</strong> ' + this.esc(d.ngo_name) +
            '<br><strong>Vehicle:</strong> ' + this.esc(d.vehicle_type) + ' ' + this.esc(d.vehicle_number) +
            '<br><strong>License:</strong> ' + this.esc(d.license_number) +
            '<br><strong>Tracking ID:</strong> ' + this.esc(d.tracking_id) + '</p></section>' +
            '<section class="paw-entity-section"><h4>Check-ins (field attendance)</h4>' +
            this.timelineList(d.checkins, (c) =>
                '<li><strong>' + this.fmtDate(c.created_at) + '</strong>' +
                (c.lat != null ? '<span>GPS: ' + c.lat + ', ' + c.lng + '</span>' : '') +
                (c.selfie_url ? '<a href="' + (c.selfie_url.startsWith('/') ? c.selfie_url : '/uploads/' + c.selfie_url) + '" target="_blank">View selfie</a>' : '') +
                '</li>') + '</section>' +
            '<section class="paw-entity-section"><h4>Availability</h4>' +
            (d.timeslots && d.timeslots.length
                ? '<ul class="paw-activity-list">' + d.timeslots.map(t =>
                    '<li>Day ' + t.day_of_week + ': ' + t.start_time + ' – ' + t.end_time + '</li>').join('') + '</ul>'
                : '<p class="paw-muted">No timeslots set.</p>') +
            '</section>' +
            '<section class="paw-entity-section"><h4>Recent cases</h4>' +
            this.timelineList(d.recent_cases, (c) =>
                '<li><strong>' + this.esc(c.incident_code) + '</strong> · ' + this.esc(c.animal_type) +
                ' · <em>' + this.esc(c.workflow_status) + '</em></li>') +
            '</section>' +
            '<section class="paw-entity-section"><h4>Activity log</h4>' +
            this.timelineList(d.timeline, (t) =>
                '<li><strong>' + this.esc(t.status) + '</strong><span>' + this.esc(t.note) + '</span><small>' + this.fmtDate(t.created_at) + '</small></li>') +
            '</section>' +
            '<section class="paw-entity-section"><h4>Reviews</h4>' +
            this.timelineList(d.reviews, (r) =>
                '<li><strong>' + (r.rating || 5) + '★</strong> ' + this.esc(r.comment) + '<small>' + this.fmtDate(r.created_at) + '</small></li>') +
            '</section>' +
            '<section class="paw-entity-section"><h4>KYC & documents</h4>' + this.docGrid(kyc) +
            (kyc.address ? '<p><strong>Address:</strong> ' + this.esc(kyc.address) + '</p>' : '') +
            (kyc.aadhaar ? '<p><strong>Aadhaar:</strong> ' + this.esc(kyc.aadhaar) + '</p>' : '') +
            '</section>';
    },

    async openNgo(id, options) {
        const url = options && options.selfUid
            ? '/api/ngos/' + encodeURIComponent(options.selfUid) + '/full-profile'
            : '/api/admin/ngos/' + id + '/full-profile';
        let d;
        try {
            d = window.PawApi ? await PawApi.fetchJson(url) : await (async function () {
                const res = await fetch(url); const j = await res.json(); if (!res.ok) throw new Error(j.error); return j;
            })();
        } catch (e) { return alert(e.message || 'Could not load NGO'); }
        this.open();
        document.getElementById('pawEntityProfileTitle').textContent = d.name + ' — NGO partner';
        const kyc = d.kyc_data || {};
        document.getElementById('pawEntityProfileBody').innerHTML =
            this.statCards([
                { label: 'Total cases', value: d.cases_total || (d.recent_cases || []).length },
                { label: 'Status', value: d.status },
                { label: 'PRN', value: d.prn || '—' }
            ]) +
            '<section class="paw-entity-section"><h4>Contact</h4><p>' + this.esc(d.email) + '<br>' + this.esc(d.phone) +
            '<br>' + this.esc([d.address, d.city, d.state].filter(Boolean).join(', ')) + '</p></section>' +
            '<section class="paw-entity-section"><h4>Representatives</h4>' +
            this.timelineList(d.representatives, (r) =>
                '<li><strong>' + this.esc(r.name) + '</strong> · ' + this.esc(r.status) + ' · ' + this.esc(r.rep_id) + '</li>') +
            '</section>' +
            '<section class="paw-entity-section"><h4>Recent cases</h4>' +
            this.timelineList(d.recent_cases, (c) =>
                '<li><strong>' + this.esc(c.incident_code) + '</strong> · ' + this.esc(c.workflow_status) + '</li>') +
            '</section>' +
            '<section class="paw-entity-section"><h4>Registration documents</h4>' + this.docGrid(kyc) + '</section>';
    },

    async openDoctor(id) {
        let d;
        try {
            d = window.PawApi
                ? await PawApi.fetchJson('/api/admin/doctors/' + id + '/full-profile')
                : await (async function () {
                    const res = await fetch('/api/admin/doctors/' + id + '/full-profile');
                    const j = await res.json(); if (!res.ok) throw new Error(j.error); return j;
                })();
        } catch (e) { return alert(e.message || 'Could not load vet profile'); }
        this.open();
        document.getElementById('pawEntityProfileTitle').textContent = d.name + ' — Veterinarian';
        const kyc = d.kyc_data || {};
        document.getElementById('pawEntityProfileBody').innerHTML =
            this.statCards([
                { label: 'Cases', value: d.cases_total || 0 },
                { label: 'Status', value: d.status },
                { label: 'PRN', value: d.prn || '—' }
            ]) +
            '<section class="paw-entity-section"><h4>Clinic</h4><p><strong>' + this.esc(d.hospital_name) + '</strong><br>' +
            this.esc(d.specialization) + '<br>' + this.esc(d.email) + '<br>' + this.esc(d.phone) +
            '<br>License: ' + this.esc(d.license_number) + '</p></section>' +
            '<section class="paw-entity-section"><h4>Recent treatments</h4>' +
            this.timelineList(d.recent_cases, (c) =>
                '<li><strong>' + this.esc(c.incident_code) + '</strong> · ' + this.esc(c.injury_type) +
                ' · ' + this.esc(c.workflow_status) + '</li>') +
            '</section>' +
            '<section class="paw-entity-section"><h4>Activity</h4>' +
            this.timelineList(d.activity, (t) =>
                '<li><strong>' + this.esc(t.status) + '</strong><span>' + this.esc(t.note) + '</span><small>' + this.fmtDate(t.created_at) + '</small></li>') +
            '</section>' +
            '<section class="paw-entity-section"><h4>Credentials</h4>' + this.docGrid(kyc) + '</section>';
    }
};
