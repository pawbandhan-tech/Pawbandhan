/**
 * Shared live rescue tracking (customer, NGO, admin)
 */
window.PawTracker = {
    _openCode: null,
    _map: null,
    _rider: null,
    _dest: null,
    _anim: null,
    _route: null,
    _socket: null,

    normalizeCode(raw) {
        let c = String(raw || '').trim().replace(/\s+/g, '');
        if (!c) return '';
        if (!/^PB/i.test(c)) c = 'PB' + c;
        return c.toUpperCase();
    },

    ensureModal() {
        let modal = document.getElementById('trackModal') || document.getElementById('pawTrackModal');
        if (!modal) {
            const wrap = document.createElement('div');
            wrap.innerHTML =
                '<div id="pawTrackModal" class="modal-bg paw-track-modal" onclick="if(event.target===this)PawTracker.close()">' +
                '<div class="track-panel" onclick="event.stopPropagation()">' +
                '<button class="track-close" type="button" onclick="PawTracker.close()" aria-label="Close">&times;</button>' +
                '<div id="pawTrackModalBody"></div></div></div>';
            document.body.appendChild(wrap.firstElementChild);
            modal = document.getElementById('pawTrackModal');
        }
        this._modal = modal;
        this._body = document.getElementById('trackModalBody') || document.getElementById('pawTrackModalBody');
        return modal;
    },

    close() {
        if (this._anim) clearInterval(this._anim);
        this._anim = null;
        this._map = this._rider = this._dest = this._route = null;
        this._openCode = null;
        const modal = this._modal || document.getElementById('trackModal') || document.getElementById('pawTrackModal');
        if (modal) modal.classList.remove('open');
        document.body.style.overflow = '';
    },

    async fetchFull(incidentCode) {
        const code = this.normalizeCode(incidentCode);
        const api = window.PawApi;
        if (!api) throw new Error('PawApi not loaded. Refresh the page.');
        return api.fetchJson('/api/workflow/case/' + encodeURIComponent(code) + '/full?_=' + Date.now());
    },

    async loadTrackerPanel(opts) {
        const api = window.PawApi;
        if (!api) throw new Error('PawApi not loaded');
        const portal = opts.isAdmin || opts.mode === 'admin' ? 'admin' : 'ngo';
        const q = 'portal=' + portal + (opts.ngoUid ? '&ngoUid=' + encodeURIComponent(opts.ngoUid) : '');
        return api.fetchJson('/api/workflow/tracker-panel?' + q);
    },

    statusSelectHtml(options, current, id) {
        const opts = (options || []).map(function (o) {
            return '<option value="' + o.value + '"' + (o.value === current ? ' selected' : '') + '>' + o.label + '</option>';
        }).join('');
        return '<select id="' + id + '" class="paw-status-select">' + opts + '</select>';
    },

    ngoSelectHtml(ngos, currentNgoId, id) {
        const opts = (ngos || []).map(function (n) {
            return '<option value="' + n.id + '"' + (String(n.id) === String(currentNgoId) ? ' selected' : '') + '>' + n.name + '</option>';
        }).join('');
        return '<select id="' + id + '" class="paw-ngo-select"><option value="">— Change NGO —</option>' + opts + '</select>';
    },

    calcProgress(steps) {
        if (!steps?.length) return 0;
        const activeIdx = steps.findIndex(s => s.active);
        const idx = activeIdx >= 0 ? activeIdx : steps.filter(s => s.done).length;
        return steps.length > 1 ? Math.round((idx / (steps.length - 1)) * 100) : 0;
    },

    defaultSteps(ws) {
        const labels = [
            { key: 'reported', label: 'Rescue requested', sub: 'Alert registered' },
            { key: 'ngo_assigned', label: 'NGO confirmed', sub: 'Partner assigned' },
            { key: 'rep_assigned', label: 'Hero assigned', sub: 'Field rep matched' },
            { key: 'rep_accepted', label: 'On the way', sub: 'Heading to animal' },
            { key: 'rep_arrived_incident', label: 'Arrived', sub: 'At location' },
            { key: 'doctor_approved', label: 'Vet ready', sub: 'Medical support' },
            { key: 'treatment_complete', label: 'Treatment done', sub: 'Vet report' },
            { key: 'resolved', label: 'Rescue complete', sub: 'Animal safe' }
        ];
        let idx = labels.findIndex(l => l.key === ws);
        if (idx < 0) idx = 0;
        return labels.map((l, i) => ({ ...l, done: i < idx, active: i === idx, pending: i > idx, at: null }));
    },

    renderMini(steps, progressPercent) {
        const pct = progressPercent != null ? progressPercent : this.calcProgress(steps);
        const active = (steps || []).find(s => s.active);
        const dots = (steps || []).filter((_, i) => i % 3 === 0 || i === steps.length - 1);
        return (
            '<p class="fk-mini-label">' + this.esc(active?.label || 'Tracking') + '</p>' +
            '<div class="fk-track fk-track-mini">' +
            '<div class="fk-track-rail"><div class="fk-track-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="fk-track-dots">' + dots.map(s =>
                '<span class="fk-dot ' + (s.done ? 'done' : '') + ' ' + (s.active ? 'active' : '') + '"></span>'
            ).join('') + '</div></div>'
        );
    },

    formatStepTime(iso) {
        if (!iso) return null;
        const d = new Date(iso);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return {
            day: days[d.getDay()],
            date: d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear(),
            time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
    },

    esc(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    renderProgressTracker(steps, progressPercent) {
        const pct = Math.min(100, Math.max(0, progressPercent || 0));
        const stepsHtml = (steps || []).map((s, i) => {
            const t = this.formatStepTime(s.at);
            const timeHtml = t
                ? '<div class="fk-step-time"><span class="fk-day">' + this.esc(t.day) + '</span><span class="fk-date">' + this.esc(t.date) + '</span><span class="fk-clock">' + this.esc(t.time) + '</span></div>'
                : (s.pending || (!s.done && !s.active) ? '<div class="fk-step-time fk-pending">Expected soon</div>' : '');
            const noteHtml = s.note ? '<p class="fk-step-note">' + this.esc(String(s.note).slice(0, 120)) + '</p>' : '';
            const icon = s.done ? 'fa-check' : (s.active ? 'fa-truck-fast' : 'fa-circle');
            return (
                '<li class="fk-step ' + (s.done ? 'done' : '') + ' ' + (s.active ? 'active' : '') + ' ' + (s.pending ? 'pending' : '') + '" style="--i:' + i + '">' +
                '<div class="fk-step-marker"><i class="fas ' + icon + '"></i></div>' +
                '<div class="fk-step-body"><strong>' + this.esc(s.label) + '</strong><small>' + this.esc(s.sub || '') + '</small>' +
                noteHtml + timeHtml + '</div></li>'
            );
        }).join('');
        return (
            '<div class="fk-track-wrap">' +
            '<div class="fk-track-head"><span>Rescue progress</span><strong>' + pct + '%</strong></div>' +
            '<ul class="fk-steps-list">' + stepsHtml + '</ul>' +
            '<div class="fk-track-rail-vertical" aria-hidden="true"><div class="fk-track-fill-vertical" style="height:' + pct + '%"></div></div>' +
            '</div>'
        );
    },

    buildNgoSection(ngo) {
        if (!ngo) return '';
        const loc = ngo.location_label || [ngo.address, ngo.city].filter(Boolean).join(', ');
        const mapsUrl = ngo.latitude && ngo.longitude
            ? 'https://www.google.com/maps?q=' + ngo.latitude + ',' + ngo.longitude
            : (loc ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(loc) : '');
        return (
            '<section class="fk-partner-card fk-ngo-card"><h3><i class="fas fa-hand-holding-heart"></i> NGO partner</h3>' +
            '<strong>' + this.esc(ngo.name || 'Shelter partner') + '</strong>' +
            (loc ? '<p><i class="fas fa-location-dot"></i> ' + this.esc(loc) + '</p>' : '') +
            (ngo.phone ? '<p><a href="tel:' + this.esc(ngo.phone) + '"><i class="fas fa-phone"></i> ' + this.esc(ngo.phone) + '</a></p>' : '') +
            (mapsUrl ? '<a class="fk-map-link" href="' + mapsUrl + '" target="_blank" rel="noopener">Open shelter on map</a>' : '') +
            '</section>'
        );
    },

    buildRepSection(rep, eta) {
        if (!rep) return '';
        const phone = rep.phone || rep.phone_display;
        return (
            '<section class="fk-partner-card fk-rep-card-live"><h3><i class="fas fa-motorcycle"></i> Rescue hero</h3>' +
            '<div class="fk-rep-row"><div class="fk-rep-bike"><i class="fas fa-motorcycle"></i></div><div>' +
            '<strong>' + this.esc(rep.name || 'Field rep') + '</strong>' +
            '<p>' + this.esc(rep.rep_id || '') + ' · ' + this.esc(rep.vehicle_type || 'Rescue vehicle') + '</p>' +
            (phone ? '<p><a href="tel:' + this.esc(phone) + '"><i class="fas fa-phone"></i> ' + this.esc(phone) + '</a></p>' : '') +
            '<p class="fk-meta">' + (rep.is_online ? '🟢 Live on map' : 'Last seen ' + (rep.last_location_at ? new Date(rep.last_location_at).toLocaleTimeString('en-IN') : 'recently')) + '</p>' +
            (eta ? '<p class="fk-eta-live"><i class="fas fa-clock"></i> <strong>' + eta + ' min</strong> estimated arrival</p>' : '') +
            '</div></div></section>'
        );
    },

    buildDoctorSection(data) {
        if (!data.show_doctor_section) return '';
        const doc = data.doctor;
        if (!doc && !data.treatment_report && !data.injury_type) return '';
        const photos = (data.doctor_photos || []).map(p => {
            const url = p.file_url || p.url;
            const src = url && url.startsWith('http') ? url : (url?.startsWith('/') ? url : '/uploads/' + url);
            return '<img src="' + src + '" alt="Clinical photo">';
        }).join('');
        return (
            '<section class="fk-doctor-card"><h3><i class="fas fa-user-doctor"></i> Veterinary care</h3>' +
            (doc ? '<div class="fk-doctor-row"><div class="fk-doctor-avatar"><i class="fas fa-stethoscope"></i></div><div><strong>' +
                this.esc(doc.name || 'Veterinarian') + '</strong><p>' + this.esc(doc.hospital_name || 'Clinic') + ' · ' +
                this.esc(doc.specialization || 'Vet') + '</p>' + (doc.prn ? '<p class="fk-meta">PRN ' + this.esc(doc.prn) + '</p>' : '') +
                '</div></div>' : '') +
            (data.injury_type ? '<p class="fk-injury"><i class="fas fa-kit-medical"></i> Injury: <strong>' + this.esc(data.injury_type) + '</strong></p>' : '') +
            (data.treatment_report ? '<div class="fk-treatment-report"><h4>Treatment report</h4><p>' + this.esc(data.treatment_report) + '</p></div>' :
                '<p class="fk-meta">Treatment report appears when the vet completes care.</p>') +
            (photos ? '<div class="track-photos fk-doctor-photos">' + photos + '</div>' : '') +
            '</section>'
        );
    },

    async buildNgoAcceptBanner(data, opts) {
        if (opts.isAdmin || opts.mode === 'admin') return '';
        if (!data.ngo_acceptance_pending || !opts.ngoUid) return '';
        const code = data.incident_code;
        const self = this;
        setTimeout(function () {
            var a = document.getElementById('pawTrackAcceptBtn');
            var d = document.getElementById('pawTrackDeclineBtn');
            if (a) a.onclick = function () { self.acceptNgoCase(code, opts); };
            if (d) d.onclick = function () { self.declineNgoCase(code, opts); };
        }, 0);
        return (
            '<section class="pch-accept-banner">' +
            '<h4><i class="fas fa-inbox"></i> New assignment for your NGO</h4>' +
            '<p>Accept this case to add it to your active rescue desk. You can preview tracking first, but dispatch is available only after acceptance.</p>' +
            '<div class="pch-actions">' +
            '<button type="button" class="pch-btn pch-btn-primary" id="pawTrackAcceptBtn">Accept case</button>' +
            '<button type="button" class="pch-btn pch-btn-ghost" id="pawTrackDeclineBtn">Decline</button>' +
            '</div></section>'
        );
    },

    async acceptNgoCase(code, opts) {
        if (!opts.ngoUid) return alert('NGO session missing');
        try {
            await window.PawApi.postJson('/api/ngos/' + encodeURIComponent(opts.ngoUid) + '/cases/' + encodeURIComponent(code) + '/accept', {});
            if (opts.onUpdated) opts.onUpdated();
            await this.open(code, { ...opts, silent: true });
        } catch (e) { alert(e.message); }
    },

    async declineNgoCase(code, opts) {
        const reason = prompt('Reason for declining (optional):');
        if (reason === null) return;
        try {
            await window.PawApi.postJson('/api/ngos/' + encodeURIComponent(opts.ngoUid) + '/cases/' + encodeURIComponent(code) + '/decline', { reason: reason || '' });
            this.close();
            if (opts.onUpdated) opts.onUpdated();
        } catch (e) { alert(e.message); }
    },

    async buildStaffPanel(data, opts) {
        opts = opts || {};
        if (opts.mode !== 'admin' && opts.mode !== 'ngo' && !opts.isAdmin) return '';
        if (!opts.isAdmin && data.ngo_acceptance_pending) {
            return await this.buildNgoAcceptBanner(data, opts);
        }
        const code = data.incident_code;
        const statusId = 'pawTrackStatusSel';
        const ngoSelId = 'pawTrackNgoSel';
        const repSelId = 'pawTrackRepSel';
        let ngoVal = data.ngo_id;
        let panel;
        try {
            panel = await this.loadTrackerPanel(opts);
        } catch (e) {
            return '<section class="paw-staff-panel"><p class="paw-muted">' + this.esc(e.message) + '</p></section>';
        }
        let reps = panel.reps || [];
        if (opts.isAdmin && ngoVal) {
            reps = reps.filter(function (r) { return !r.ngo_id || String(r.ngo_id) === String(ngoVal); });
        }
        const self = this;
        setTimeout(function () {
            var s = document.getElementById('pawTrackSaveBtn');
            var a = document.getElementById('pawTrackAutoNgo');
            var r = document.getElementById('pawTrackAssignRep');
            if (s) s.onclick = function () { self.saveStaffStatus(code, opts); };
            if (a) a.onclick = function () { self.autoAssignNgo(code, opts); };
            if (r) r.onclick = function () { self.assignRep(code, opts); };
        }, 0);
        const sourceBadge = data.incident_source_label
            ? '<p class="paw-case-source"><i class="fas fa-tag"></i> ' + this.esc(data.incident_source_label) + '</p>' : '';
        return (
            '<section class="paw-staff-panel"><h3><i class="fas fa-sliders"></i> Case management</h3>' + sourceBadge +
            '<label>Workflow status</label>' + this.statusSelectHtml(panel.statusOptions, data.workflow_status, statusId) +
            (opts.isAdmin ? '<label style="margin-top:10px">Assigned NGO</label>' + this.ngoSelectHtml(panel.ngos, ngoVal, ngoSelId) : '') +
            '<label style="margin-top:10px">Assign rescue hero</label>' + this.repSelectHtml(reps, data.rep_id, repSelId) +
            '<div class="paw-staff-btns">' +
            '<button type="button" class="btn-pill" id="pawTrackSaveBtn">Save status</button>' +
            '<button type="button" class="btn-pill btn-ghost" id="pawTrackAssignRep">Dispatch hero</button>' +
            (opts.isAdmin ? '<button type="button" class="btn-pill btn-ghost" id="pawTrackAutoNgo">Auto-assign NGO</button>' : '') +
            '</div></section>'
        );
    },

    repSelectHtml(reps, currentId, id) {
        const opts = (reps || []).map(function (r) {
            return '<option value="' + r.id + '"' + (String(r.id) === String(currentId) ? ' selected' : '') + '>' + r.name + '</option>';
        }).join('');
        return '<select id="' + id + '" class="paw-status-select"><option value="">— Select hero —</option>' + opts + '</select>';
    },

    async assignRep(code, opts) {
        const repEl = document.getElementById('pawTrackRepSel');
        if (!repEl || !repEl.value) return alert('Select a representative');
        const ngoEl = document.getElementById('pawTrackNgoSel');
        const body = { repId: repEl.value, actor_type: opts.isAdmin ? 'admin' : 'ngo', isAdmin: !!opts.isAdmin };
        if (opts.ngoUid) body.ngoUid = opts.ngoUid;
        if (opts.isAdmin && ngoEl && ngoEl.value) body.ngoId = ngoEl.value;
        try {
            await window.PawApi.postJson('/api/workflow/' + encodeURIComponent(code) + '/assign-rep', body);
        } catch (e) { return alert(e.message); }
        alert('Representative alerted on their app');
        if (opts.onUpdated) opts.onUpdated();
        await this.open(code, { ...opts, silent: true });
    },

    async saveStaffStatus(code, opts) {
        const statusEl = document.getElementById('pawTrackStatusSel');
        if (!statusEl) return;
        const payload = { workflow_status: statusEl.value, actor_type: opts.isAdmin ? 'admin' : 'ngo' };
        const ngoEl = document.getElementById('pawTrackNgoSel');
        if (opts.isAdmin && ngoEl && ngoEl.value) payload.ngo_id = ngoEl.value;
        try {
            await window.PawApi.postJson('/api/workflow/case/' + encodeURIComponent(code) + '/update', payload);
        } catch (e) { return alert(e.message); }
        if (opts.onUpdated) opts.onUpdated();
        await this.open(code, { ...opts, silent: true });
    },

    async autoAssignNgo(code, opts) {
        try {
            const d = await window.PawApi.postJson('/api/workflow/auto-assign-ngo/' + encodeURIComponent(code), {});
            alert(d.ngo_name ? 'Assigned: ' + d.ngo_name : 'NGO updated');
        } catch (e) { return alert(e.message); }
        if (opts.onUpdated) opts.onUpdated();
        await this.open(code, { ...opts, silent: true });
    },

    async buildHtml(data, opts) {
        const code = data.incident_code || '—';
        const ws = data.workflow_status || 'reported';
        const steps = data.track_steps || this.defaultSteps(ws);
        const pct = data.progress_percent != null ? data.progress_percent : this.calcProgress(steps);
        const photos = [
            ...(data.report_images || []),
            ...(data.case_photos || []).map(p => p.file_url || p.url).filter(Boolean)
        ];
        const rep = data.representative;
        const showMap = rep && (rep.last_lat != null || (data.latitude != null && data.longitude != null));
        const showEta = data.eta_minutes != null && rep;
        const photosHtml = photos.length
            ? '<div class="track-photos">' + photos.slice(0, 12).map(u => {
                const s = String(u);
                const src = s.startsWith('http') ? s : (s.startsWith('/') ? s : '/uploads/' + s);
                return '<img src="' + src + '" alt="Rescue photo">';
            }).join('') + '</div>'
            : '<p class="fk-empty-photos">Field photos appear when your rescue team uploads them.</p>';
        const staff = await this.buildStaffPanel(data, opts);
        return (
            '<div class="track-sheet-handle"></div>' +
            '<div class="track-header track-hero">' +
            '<span class="track-id"><i class="fas fa-paw"></i> ' + this.esc(code) + '</span>' +
            '<h2>' + this.esc(data.animal_type || 'Rescue') + '</h2>' +
            '<p class="track-loc">' + this.esc(data.location || data.description || '') + '</p>' +
            '<p class="track-updated">Updated ' + new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</p>' +
            '<div class="track-progress-ring"><span class="ring-val">' + pct + '%</span><span style="font-size:0.85rem;opacity:0.9;">Rescue progress · ' + this.esc(data.status_label || ws) + '</span></div></div>' +
            staff +
            this.buildNgoSection(data.ngo) +
            this.buildRepSection(rep, showEta ? data.eta_minutes : null) +
            (showMap ? '<div class="pb-track-map-wrap"><div id="pbTrackMap" class="pb-track-map"></div><p class="fk-map-hint"><i class="fas fa-motorcycle"></i> Live GPS on map</p></div>' : '') +
            this.renderProgressTracker(steps, pct) +
            this.buildDoctorSection(data) +
            '<h3 class="fk-section-title">Rescue photos</h3>' + photosHtml
        );
    },

    initMap(data) {
        if (typeof google === 'undefined' || !google.maps) return;
        const el = document.getElementById('pbTrackMap');
        if (!el) return;
        if (this._anim) clearInterval(this._anim);
        this._anim = null;
        const destLat = data.latitude != null ? Number(data.latitude) : null;
        const destLng = data.longitude != null ? Number(data.longitude) : null;
        const rep = data.representative;
        const repLat = rep?.last_lat != null ? Number(rep.last_lat) : null;
        const repLng = rep?.last_lng != null ? Number(rep.last_lng) : null;
        const self = this;
        const finish = (center, destination) => {
            self._map = new google.maps.Map(el, { zoom: 14, center, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
            if (destination) {
                self._dest = new google.maps.Marker({
                    position: destination, map: self._map,
                    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#ef4444', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }
                });
            }
            const start = repLat != null && repLng != null ? { lat: repLat, lng: repLng } : null;
            if (start) {
                self._rider = new google.maps.Marker({
                    position: start, map: self._map, zIndex: 999,
                    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#E86B3A', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 }
                });
                if (destination) {
                    const ds = new google.maps.DirectionsService();
                    const dr = new google.maps.DirectionsRenderer({ suppressMarkers: true, polylineOptions: { strokeColor: '#2D8F5B', strokeWeight: 5 } });
                    dr.setMap(self._map);
                    ds.route({ origin: start, destination, travelMode: google.maps.TravelMode.DRIVING }, (res, status) => {
                        if (status === 'OK' && res.routes[0]) {
                            dr.setDirections(res);
                            self._route = res.routes[0].overview_path;
                            let i = 0;
                            self._anim = setInterval(() => {
                                if (!self._rider || !self._route?.length) return;
                                self._rider.setPosition(self._route[i]);
                                i = (i + 1) % self._route.length;
                            }, 800);
                        }
                    });
                }
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(start);
                if (destination) bounds.extend(destination);
                self._map.fitBounds(bounds, 48);
            }
        };
        if (destLat != null && destLng != null) finish({ lat: destLat, lng: destLng }, { lat: destLat, lng: destLng });
        else if (data.location) {
            new google.maps.Geocoder().geocode({ address: data.location }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const loc = results[0].geometry.location;
                    finish(loc, { lat: loc.lat(), lng: loc.lng() });
                }
            });
        } else if (repLat != null && repLng != null) finish({ lat: repLat, lng: repLng }, null);
    },

    joinCaseSocket(code) {
        try {
            if (typeof io !== 'undefined') {
                if (!this._socket) this._socket = io({ transports: ['websocket', 'polling'] });
                this._socket.emit('join-case', code);
            }
        } catch (e) { /* ignore */ }
    },

    async open(incidentCode, opts) {
        opts = opts || {};
        const code = this.normalizeCode(incidentCode);
        if (!code) return;
        this.ensureModal();
        this._openCode = code;
        this.joinCaseSocket(code);
        const silent = !!opts.silent;
        if (!silent) {
            this._modal.classList.add('open');
            document.body.style.overflow = 'hidden';
            this._body.innerHTML = '<div class="track-loading"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Loading live tracking…</p></div>';
        }
        try {
            let full = opts.demoData;
            if (!full) full = await this.fetchFull(code);
            this._body.innerHTML = await this.buildHtml(full, opts);
            if (opts.onData) opts.onData(full);
            setTimeout(() => this.initMap(full), 200);
        } catch (e) {
            this._body.innerHTML = '<div class="track-loading"><p>' + this.esc(e.message || 'Could not load tracking') + '</p>' +
                '<button type="button" class="btn-pill" onclick="PawTracker.open(\'' + code + '\')">Retry</button></div>';
        }
    }
};

if (!window.openCaseTracking) {
    window.openCaseTracking = function (code, silent) {
        return PawTracker.open(code, { silent, onData: function (full) {
            if (typeof window.updateLiveHeroFromTrack === 'function') window.updateLiveHeroFromTrack(full);
        }});
    };
}
if (!window.closeTrackModal) window.closeTrackModal = function () { PawTracker.close(); };
