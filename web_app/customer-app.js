/**
 * PawBandhan customer portal — Amazon / Flipkart style live tracking
 */
(function () {
    let myCases = [];
    let currentUid = null;
    let activeCaseCode = null;
    let openTrackingCode = null;
    let socket = null;
    let pollTimer = null;
    let pbTrackMap = null;
    let pbRiderMarker = null;
    let pbDestMarker = null;
    let pbMapAnim = null;
    let pbRoutePath = null;

    async function loadDashboardStats() {
        try {
            const stats = window.PAW_SITE
                ? await PAW_SITE.fetchJson('/api/stats')
                : await (await fetch('/api/stats')).json();
            const fmt = (n) => {
                const x = Number(n) || 0;
                return x >= 1000 ? (x / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(x);
            };
            const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = fmt(v); };
            set('cdStatRescues', stats.totalRescues);
            set('cdStatNgos', stats.totalNGOs);
            set('cdStatHeroes', stats.totalRiders);
            set('cdStatVets', stats.totalDoctors);
        } catch (e) { /* optional */ }
    }

    window.initCustomerPortal = function (uid) {
        currentUid = uid;
        loadCustomerProfile();
        loadNotifications();
        loadMyCases();
        loadDashboardStats();
        setupRealtime();
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(() => {
            loadMyCases(true);
            if (activeCaseCode) refreshActiveTracking(activeCaseCode);
            if (openTrackingCode) openCaseTracking(openTrackingCode, true);
        }, 12000);
    };

    function setupRealtime() {
        if (!currentUid || currentUid === 'demo') return;
        try {
            if (typeof io !== 'undefined') {
                socket = io({ transports: ['websocket', 'polling'] });
                socket.on('connect', () => socket.emit('join-customer', currentUid));
                socket.on('case-update', (p) => {
                    loadMyCases(true);
                    if (p?.incidentCode) {
                        if (activeCaseCode === p.incidentCode) refreshActiveTracking(p.incidentCode);
                        if (openTrackingCode === p.incidentCode) openCaseTracking(p.incidentCode, true);
                    }
                });
                socket.on('rep-location', (p) => {
                    if (p?.incidentCode && openTrackingCode === p.incidentCode) {
                        refreshActiveTracking(p.incidentCode);
                        openCaseTracking(p.incidentCode, true);
                    }
                });
                socket.on('customer-notification', (n) => {
                    pushLocalNotification(n);
                    loadNotifications();
                    loadMyCases(true);
                });
            }
        } catch (e) { console.warn('Socket unavailable'); }
    }

    function pushLocalNotification(n) {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            new Notification(n.title || 'PawBandhan', { body: n.message || '' });
        }
    }

    async function loadCustomerProfile() {
        if (!currentUid || currentUid === 'demo') return;
        try {
            const p = await PawApi.fetchJson('/api/customers/' + encodeURIComponent(currentUid) + '/profile');
            if (p.name) {
                sessionStorage.setItem('portal_customer_name', p.name);
                if (typeof setUserName === 'function') setUserName(p.name);
            }
            if (p.phone) sessionStorage.setItem('user_phone', p.phone);
            if (p.email) sessionStorage.setItem('user_email', p.email);
            if (p.gender) sessionStorage.setItem('user_gender', p.gender);
        } catch (e) { /* ignore */ }
    }

    window.loadNotifications = async function () {
        const list = document.getElementById('notifList');
        const badge = document.getElementById('notifBadge');
        if (!list) return;

        if (!currentUid || currentUid === 'demo') {
            list.innerHTML = '<p style="padding:20px;color:var(--pb-muted);">Sign in for notifications.</p>';
            return;
        }

        try {
            const items = await (await fetch('/api/users/' + currentUid + '/notifications')).json();
            const unread = items.filter(n => !n.is_read).length;
            if (badge) {
                badge.textContent = unread > 9 ? '9+' : unread;
                badge.classList.toggle('show', unread > 0);
            }
            if (!items.length) {
                list.innerHTML = '<p style="padding:24px;text-align:center;color:var(--pb-muted);"><i class="fas fa-bell-slash"></i><br>No notifications yet</p>';
                return;
            }
            list.innerHTML = items.map(n => `
                <div class="pb-notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotifRead(${n.id})">
                    <strong>${escapeHtml(n.title || 'Update')}</strong>
                    <p>${escapeHtml(n.message || '')}</p>
                    <time>${n.created_at ? new Date(n.created_at).toLocaleString() : ''}</time>
                </div>`).join('');
        } catch (e) {
            list.innerHTML = '<p style="padding:20px;">Could not load notifications.</p>';
        }
    };

    window.markNotifRead = async function (id) {
        await fetch('/api/notifications/' + id + '/read', { method: 'PATCH' }).catch(() => {});
        loadNotifications();
    };

    window.toggleNotifDrawer = function () {
        const d = document.getElementById('notifDrawer');
        if (d) {
            d.classList.toggle('open');
            if (d.classList.contains('open')) loadNotifications();
        }
    };

    function buildDemoFullCase() {
        const now = Date.now();
        const ago = (m) => new Date(now - m * 60000).toISOString();
        return {
            incident_code: 'PB-DEMO-001',
            animal_type: 'Dog',
            location: 'Andheri West, Mumbai',
            workflow_status: 'rep_accepted',
            status_label: 'Hero on the way',
            progress_percent: 28,
            eta_minutes: 12,
            injury_type: 'Minor wound',
            latitude: 19.1340,
            longitude: 72.8260,
            ngo: {
                name: 'Rescue Foundation Mumbai',
                phone: '9876543210',
                location_label: 'Versova, Andheri West, Mumbai',
                latitude: 19.1280,
                longitude: 72.8200
            },
            representative: {
                name: 'Demo Hero',
                rep_id: 'PB-REP-DEMO',
                phone: '9999999999',
                vehicle_type: 'Two Wheeler',
                is_online: true,
                last_lat: 19.1250,
                last_lng: 72.8150
            },
            show_doctor_section: false,
            doctor: {
                name: 'Dr. Ananya Rao',
                hospital_name: 'Paws Care Clinic',
                specialization: 'Emergency vet',
                prn: 'VET-2041'
            },
            treatment_report: null,
            track_steps: [
                { key: 'reported', label: 'Rescue requested', sub: 'Your alert is registered', done: true, active: false, at: ago(45), note: null },
                { key: 'ngo_assigned', label: 'NGO confirmed', sub: 'Partner shelter assigned', done: true, active: false, at: ago(40), note: null },
                { key: 'rep_assigned', label: 'Hero assigned', sub: 'Field responder matched', done: true, active: false, at: ago(25), note: null },
                { key: 'rep_accepted', label: 'On the way', sub: 'Heading to the animal', done: false, active: true, at: ago(8), note: null },
                { key: 'rep_arrived_incident', label: 'Arrived at location', sub: 'At rescue spot', done: false, active: false, pending: true, at: null },
                { key: 'photo_incident_verified', label: 'Animal located', sub: 'Verified on site', done: false, active: false, pending: true, at: null },
                { key: 'doctor_assigned', label: 'Vet assigned', sub: 'Clinic notified', done: false, active: false, pending: true, at: null },
                { key: 'doctor_approved', label: 'Vet approved', sub: 'Ready for transport', done: false, active: false, pending: true, at: null },
                { key: 'treatment_in_progress', label: 'Treatment ongoing', sub: 'Under veterinary care', done: false, active: false, pending: true, at: null },
                { key: 'resolved', label: 'Rescue complete', sub: 'Animal is safe', done: false, active: false, pending: true, at: null }
            ],
            case_photos: [],
            report_images: []
        };
    }

    async function loadMyCases(silent) {
        const listArea = document.getElementById('caseListArea');
        if (!listArea) return;

        if (sessionStorage.getItem('demo_session') === 'true' && !sessionStorage.getItem('customer_uid')) {
            myCases = [{
                incident_code: 'PB-DEMO-001',
                animal_type: 'Dog',
                location: 'Andheri West, Mumbai',
                workflow_status: 'rep_accepted',
                status_label: 'Hero on the way',
                progress_percent: 28,
                created_at: new Date().toISOString()
            }];
            renderCaseList();
            showLiveHero(myCases[0]);
            updateLiveHeroProgress(buildDemoFullCase());
            return;
        }

        if (!currentUid) {
            listArea.innerHTML = '<p class="empty-cases">Sign in to track rescues.</p>';
            return;
        }

        try {
            const res = await fetch('/api/users/' + currentUid + '/cases-track?_=' + Date.now());
            myCases = await res.json();
            renderCaseList();
            const active = myCases.find(c => c.workflow_status && c.workflow_status !== 'resolved') || myCases[0];
            if (active) {
                showLiveHero(active);
                refreshActiveTracking(active.incident_code);
            } else hideLiveHero();
        } catch (e) {
            if (!silent) listArea.innerHTML = '<p class="empty-cases">Could not load cases. Start the server.</p>';
        }
    }
    window.loadMyCases = loadMyCases;

    function showLiveHero(c) {
        const hero = document.getElementById('liveHero');
        if (!hero || !c) return;
        activeCaseCode = c.incident_code;
        window.activeCaseCode = activeCaseCode;
        hero.classList.add('visible');
        document.getElementById('liveHeroTitle').textContent = (c.animal_type || 'Animal') + ' rescue';
        document.getElementById('liveHeroStatus').innerHTML = '<span class="pulse-dot"></span> ' + escapeHtml(c.status_label || c.workflow_status || 'In progress');
        document.getElementById('liveHeroCode').textContent = c.incident_code;
        const repAssigned = ['rep_accepted', 'rep_assigned', 'rep_arrived_incident', 'en_route_doctor', 'ringing_rep', 'assigned_rep'].includes(c.workflow_status);
        document.getElementById('liveRepSection').style.display = repAssigned ? 'block' : 'none';
        if (c.ngo_name && document.getElementById('liveMapHint')) {
            document.getElementById('liveMapHint').textContent = 'NGO partner: ' + c.ngo_name;
        }
        document.getElementById('liveMapHint').textContent = repAssigned
            ? 'Your rescue hero is on the way — map updates when GPS is shared'
            : 'We are matching the nearest NGO and field hero';
    }

    function hideLiveHero() {
        const hero = document.getElementById('liveHero');
        if (hero) hero.classList.remove('visible');
        activeCaseCode = null;
        const mini = document.getElementById('liveHeroProgress');
        if (mini) mini.innerHTML = '';
    }

    function updateLiveHeroProgress(data) {
        const el = document.getElementById('liveHeroProgress');
        if (!el || !data?.track_steps) return;
        const pct = data.progress_percent != null ? data.progress_percent : (typeof PawTracker !== 'undefined' ? PawTracker.calcProgress(data.track_steps) : 0);
        if (typeof PawTracker !== 'undefined') { el.innerHTML = PawTracker.renderMini(data.track_steps, pct); return; }
        const active = data.track_steps.find(s => s.active);
        el.innerHTML = `
            <p class="fk-mini-label">${escapeHtml(active?.label || 'Tracking')}</p>
            <div class="fk-track fk-track-mini">
                <div class="fk-track-rail"><div class="fk-track-fill" style="width:${pct}%"></div></div>
                <div class="fk-track-dots">${data.track_steps.filter((_, i) => i % 3 === 0 || i === data.track_steps.length - 1).map(s =>
            `<span class="fk-dot ${s.done ? 'done' : ''} ${s.active ? 'active' : ''}"></span>`
        ).join('')}</div>
            </div>`;
    }

    window.updateLiveHeroFromTrack = function (full) {
        updateLiveHeroProgress(full);
        if (full.ngo && document.getElementById('liveMapHint')) {
            document.getElementById('liveMapHint').textContent = 'NGO: ' + (full.ngo.location_label || full.ngo.name || 'Partner assigned');
        }
        if (full.representative) {
            document.getElementById('liveRepName').textContent = full.representative.name || 'Field rep';
            const ph = full.representative.phone || '';
            document.getElementById('liveRepMeta').textContent = (full.representative.rep_id || '') + (ph ? ' • ' + ph : '') + ' • ' + (full.representative.vehicle_type || 'Rescue vehicle');
            document.getElementById('liveRepSection').style.display = 'block';
        }
        if (full.eta_minutes) document.getElementById('liveEta').textContent = full.eta_minutes + ' min';
        const heroStatus = document.getElementById('liveHeroStatus');
        if (heroStatus && full.track_steps) {
            const active = full.track_steps.find(function (s) { return s.active; });
            if (active) heroStatus.innerHTML = '<span class="pulse-dot"></span> ' + escapeHtml(active.label);
        }
    };

    async function refreshActiveTracking(code) {
        if (!code) return;
        if (sessionStorage.getItem('demo_session') === 'true' && !sessionStorage.getItem('customer_uid')) {
            const demo = buildDemoFullCase();
            updateLiveHeroProgress(demo);
            if (demo.representative) {
                document.getElementById('liveRepName').textContent = demo.representative.name;
                document.getElementById('liveRepMeta').textContent = (demo.representative.rep_id || '') + ' • ' + (demo.representative.vehicle_type || '');
            }
            document.getElementById('liveEta').textContent = demo.eta_minutes ? demo.eta_minutes + ' min' : '—';
            return;
        }
        try {
            if (typeof PawTracker === 'undefined') return;
            const trackCode = PawTracker.normalizeCode(code);
            const full = await PawTracker.fetchFull(trackCode);
            if (typeof window.updateLiveHeroFromTrack === 'function') window.updateLiveHeroFromTrack(full);
        } catch (e) { /* ignore */ }
    }

    function renderCaseList() {
        const listArea = document.getElementById('caseListArea');
        if (!myCases.length) {
            listArea.innerHTML = `
                <div class="empty-cases-card">
                    <i class="fas fa-paw"></i>
                    <h3>No rescues yet</h3>
                    <p>Report an injured animal to see live tracking with date and time on every step.</p>
                    <button type="button" class="btn-track-primary" onclick="typeof openCamera==='function'?openCamera():null">Report emergency</button>
                </div>`;
            return;
        }

        const icons = { Dog: 'fa-dog', Cat: 'fa-cat', Bird: 'fa-dove', Cattle: 'fa-cow' };
        listArea.innerHTML = myCases.map(c => {
            const code = (typeof PawTracker !== 'undefined' ? PawTracker.normalizeCode(c.incident_code || c.incident_id || c.id) : (c.incident_code || c.id));
            const icon = icons[c.animal_type] || 'fa-paw';
            const resolved = (c.workflow_status || c.status) === 'resolved';
            const pill = resolved ? 'pill-green' : 'pill-amber';
            const live = !resolved && c.workflow_status;
            const pct = c.progress_percent != null ? c.progress_percent : '';
            const statusClass = resolved ? 'done' : 'live';
            return `
                <article class="cd-case-card track-card" onclick="openCaseTracking('${code}')">
                    <div class="cd-case-icon"><i class="fas ${icon}"></i></div>
                    <div class="cd-case-body">
                        <h4>${escapeHtml(c.animal_type || 'Animal')} rescue ${live ? '<span class="live-tag">● LIVE</span>' : ''}</h4>
                        <p>${escapeHtml(c.location || c.description || 'Location pending')}</p>
                        <div class="cd-case-meta"><i class="fas fa-hashtag"></i> ${code}${pct !== '' ? ` · ${pct}% complete` : ''}</div>
                    </div>
                    <span class="cd-status-pill ${statusClass}">${escapeHtml(c.status_label || c.workflow_status || 'Active')}</span>
                </article>`;
        }).join('');
    }

    window.openCaseTracking = async function (incidentCode, silent) {
        if (typeof PawTracker === 'undefined') return;
        const code = PawTracker.normalizeCode(incidentCode);
        openTrackingCode = code;
        if (socket) socket.emit('join-case', code);
        const opts = {
            silent: !!silent,
            onData: function (full) {
                if (PawTracker.normalizeCode(activeCaseCode) === code) window.updateLiveHeroFromTrack && window.updateLiveHeroFromTrack(full);
            }
        };
        if (sessionStorage.getItem('demo_session') === 'true' && !sessionStorage.getItem('customer_uid') && code === 'PB-DEMO-001') {
            opts.demoData = buildDemoFullCase();
        }
        await PawTracker.open(code, opts);
    };

    function formatStepTime(iso) {
        if (!iso) return null;
        const d = new Date(iso);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return {
            day: days[d.getDay()],
            date: d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear(),
            time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
    }

    function renderProgressTracker(steps, progressPercent) {
        const pct = Math.min(100, Math.max(0, progressPercent || 0));
        const stepsHtml = (steps || []).map((s, i) => {
            const t = formatStepTime(s.at);
            const timeHtml = t
                ? `<div class="fk-step-time"><span class="fk-day">${escapeHtml(t.day)}</span><span class="fk-date">${escapeHtml(t.date)}</span><span class="fk-clock">${escapeHtml(t.time)}</span></div>`
                : (s.pending || (!s.done && !s.active) ? '<div class="fk-step-time fk-pending">Expected soon</div>' : '');
            const noteHtml = s.note ? `<p class="fk-step-note">${escapeHtml(String(s.note).slice(0, 120))}</p>` : '';
            return `
                <li class="fk-step ${s.done ? 'done' : ''} ${s.active ? 'active' : ''} ${s.pending ? 'pending' : ''}" style="--i:${i}">
                    <div class="fk-step-marker">${s.done ? '<i class="fas fa-check"></i>' : s.active ? '<i class="fas fa-truck-fast"></i>' : '<i class="fas fa-circle"></i>'}</div>
                    <div class="fk-step-body">
                        <strong>${escapeHtml(s.label)}</strong>
                        <small>${escapeHtml(s.sub || '')}</small>
                        ${noteHtml}
                        ${timeHtml}
                    </div>
                </li>`;
        }).join('');

        return `
            <div class="fk-track-wrap">
                <div class="fk-track-head">
                    <span>Rescue progress</span>
                    <strong>${pct}%</strong>
                </div>
                <ul class="fk-steps-list">${stepsHtml}</ul>
                <div class="fk-track-rail-vertical" aria-hidden="true">
                    <div class="fk-track-fill-vertical" style="height:${pct}%"></div>
                </div>
            </div>`;
    }

    function buildNgoSection(ngo) {
        if (!ngo) return '';
        const loc = ngo.location_label || [ngo.address, ngo.city].filter(Boolean).join(', ');
        const mapsUrl = ngo.latitude && ngo.longitude
            ? `https://www.google.com/maps?q=${ngo.latitude},${ngo.longitude}`
            : (loc ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}` : '');
        return `
            <section class="fk-partner-card fk-ngo-card">
                <h3><i class="fas fa-hand-holding-heart"></i> NGO partner</h3>
                <strong>${escapeHtml(ngo.name || 'Shelter partner')}</strong>
                ${loc ? `<p><i class="fas fa-location-dot"></i> ${escapeHtml(loc)}</p>` : ''}
                ${ngo.phone ? `<p><a href="tel:${escapeHtml(ngo.phone)}"><i class="fas fa-phone"></i> ${escapeHtml(ngo.phone)}</a></p>` : ''}
                ${mapsUrl ? `<a class="fk-map-link" href="${mapsUrl}" target="_blank" rel="noopener">Open shelter on map</a>` : ''}
            </section>`;
    }

    function buildRepSection(rep, eta) {
        if (!rep) return '';
        const phone = rep.phone || rep.phone_display;
        return `
            <section class="fk-partner-card fk-rep-card-live">
                <h3><i class="fas fa-motorcycle"></i> Rescue hero</h3>
                <div class="fk-rep-row">
                    <div class="fk-rep-bike"><i class="fas fa-motorcycle"></i></div>
                    <div>
                        <strong>${escapeHtml(rep.name || 'Field rep')}</strong>
                        <p>${escapeHtml(rep.rep_id || '')} · ${escapeHtml(rep.vehicle_type || 'Rescue vehicle')}</p>
                        ${phone ? `<p><a href="tel:${escapeHtml(phone)}"><i class="fas fa-phone"></i> ${escapeHtml(phone)}</a></p>` : ''}
                        <p class="fk-meta">${rep.is_online ? '🟢 Live on map' : 'Last seen ' + (rep.last_location_at ? new Date(rep.last_location_at).toLocaleTimeString('en-IN') : 'recently')}</p>
                        ${eta ? `<p class="fk-eta-live"><i class="fas fa-clock"></i> <strong>${eta} min</strong> estimated arrival</p>` : ''}
                    </div>
                </div>
            </section>`;
    }

    function buildDoctorSection(data) {
        if (!data.show_doctor_section) return '';
        const doc = data.doctor;
        if (!doc && !data.treatment_report && !data.injury_type) return '';

        const photos = (data.doctor_photos || []).map(p => {
            const url = p.file_url || p.url;
            const src = url && url.startsWith('http') ? url : (url?.startsWith('/') ? url : '/uploads/' + url);
            return `<img src="${src}" alt="Clinical photo">`;
        }).join('');

        return `
            <section class="fk-doctor-card">
                <h3><i class="fas fa-user-doctor"></i> Veterinary care</h3>
                ${doc ? `
                    <div class="fk-doctor-row">
                        <div class="fk-doctor-avatar"><i class="fas fa-stethoscope"></i></div>
                        <div>
                            <strong>${escapeHtml(doc.name || 'Veterinarian')}</strong>
                            <p>${escapeHtml(doc.hospital_name || 'Clinic')} · ${escapeHtml(doc.specialization || 'Vet')}</p>
                            ${doc.prn ? `<p class="fk-meta">PRN ${escapeHtml(doc.prn)}</p>` : ''}
                        </div>
                    </div>` : ''}
                ${data.injury_type ? `<p class="fk-injury"><i class="fas fa-kit-medical"></i> Injury noted: <strong>${escapeHtml(data.injury_type)}</strong></p>` : ''}
                ${data.treatment_report ? `
                    <div class="fk-treatment-report">
                        <h4>Treatment report</h4>
                        <p>${escapeHtml(data.treatment_report)}</p>
                    </div>` : '<p class="fk-meta">Treatment report will appear when the vet completes care.</p>'}
                ${photos ? `<div class="track-photos fk-doctor-photos">${photos}</div>` : ''}
            </section>`;
    }

    function buildTrackingHtml(data) {
        const code = data.incident_code || '—';
        const ws = data.workflow_status || 'reported';
        const steps = data.track_steps || defaultSteps(ws);
        const pct = data.progress_percent != null ? data.progress_percent : calcProgress(steps);
        const photos = [
            ...(data.report_images || []),
            ...(data.case_photos || []).map(p => p.file_url || p.url).filter(Boolean)
        ];
        const rep = data.representative;
        const showMap = rep && (rep.last_lat != null || (data.latitude != null && data.longitude != null));
        const showEta = data.eta_minutes != null && rep;

        const photosHtml = photos.length
            ? `<div class="track-photos">${photos.slice(0, 12).map(u => {
                const s = String(u);
                const src = s.startsWith('http') ? s : (s.startsWith('/') ? s : '/uploads/' + s);
                return `<img src="${src}" alt="Rescue photo">`;
            }).join('')}</div>`
            : '<p class="fk-empty-photos">Field photos appear when your rescue team uploads them.</p>';

        return `
            <div class="track-sheet-handle"></div>
            <div class="track-header">
                <span class="track-id">${escapeHtml(code)}</span>
                <h2>${escapeHtml(data.animal_type || 'Rescue')} · Live tracking</h2>
                <p class="track-loc">${escapeHtml(data.location || data.description || '')}</p>
                <p class="track-updated">Updated ${new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            ${buildNgoSection(data.ngo)}
            ${buildRepSection(rep, showEta ? data.eta_minutes : null)}
            ${showMap ? `<div class="pb-track-map-wrap"><div id="pbTrackMap" class="pb-track-map"></div><p class="fk-map-hint"><i class="fas fa-motorcycle"></i> Bike moves as your hero shares live GPS</p></div>` : ''}
            ${renderProgressTracker(steps, pct)}
            ${buildDoctorSection(data)}
            <h3 class="fk-section-title">Rescue photos</h3>
            ${photosHtml}`;
    }


    function clearPbTrackMap() {
        if (pbMapAnim) clearInterval(pbMapAnim);
        pbMapAnim = null;
        pbRoutePath = null;
        pbTrackMap = null;
        pbRiderMarker = null;
        pbDestMarker = null;
    }

    function bikeMarkerIcon() {
        return { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#E86B3A', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 };
    }

    function initPbLiveMap(data, containerId) {
        if (typeof google === 'undefined' || !google.maps) return;
        const el = document.getElementById(containerId);
        if (!el) return;
        clearPbTrackMap();
        const destLat = data.latitude != null ? Number(data.latitude) : null;
        const destLng = data.longitude != null ? Number(data.longitude) : null;
        const rep = data.representative;
        const repLat = rep?.last_lat != null ? Number(rep.last_lat) : null;
        const repLng = rep?.last_lng != null ? Number(rep.last_lng) : null;
        const finish = (center, destination) => {
            pbTrackMap = new google.maps.Map(el, { zoom: 14, center, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
            if (destination) {
                pbDestMarker = new google.maps.Marker({ position: destination, map: pbTrackMap, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#ef4444', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
            }
            const start = repLat != null && repLng != null ? { lat: repLat, lng: repLng } : null;
            if (start) {
                pbRiderMarker = new google.maps.Marker({ position: start, map: pbTrackMap, icon: bikeMarkerIcon(), zIndex: 999 });
                if (destination) {
                    const ds = new google.maps.DirectionsService();
                    const dr = new google.maps.DirectionsRenderer({ suppressMarkers: true, polylineOptions: { strokeColor: '#2D8F5B', strokeWeight: 5 } });
                    dr.setMap(pbTrackMap);
                    ds.route({ origin: start, destination, travelMode: google.maps.TravelMode.DRIVING }, (res, status) => {
                        if (status === 'OK' && res.routes[0]) {
                            dr.setDirections(res);
                            pbRoutePath = res.routes[0].overview_path;
                            let i = 0;
                            pbMapAnim = setInterval(() => {
                                if (!pbRiderMarker || !pbRoutePath?.length) return;
                                pbRiderMarker.setPosition(pbRoutePath[i]);
                                i = (i + 1) % pbRoutePath.length;
                            }, 800);
                        }
                    });
                }
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(start);
                if (destination) bounds.extend(destination);
                pbTrackMap.fitBounds(bounds, 48);
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
    }

    function calcProgress(steps) {
        if (!steps?.length) return 0;
        const activeIdx = steps.findIndex(s => s.active);
        const idx = activeIdx >= 0 ? activeIdx : steps.filter(s => s.done).length;
        return steps.length > 1 ? Math.round((idx / (steps.length - 1)) * 100) : 0;
    }

    function defaultSteps(ws) {
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
    }

    window.closeTrackModal = function () { if (typeof PawTracker !== 'undefined') PawTracker.close(); openTrackingCode = null; };

    function escapeHtml(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
})();
