/**
 * PawBandhan veterinarian portal — live profile & cases
 */
(function () {
    let doctorUid = null;

    function api(path, options) {
        const url = (window.PawApi && PawApi.url) ? PawApi.url(path) : path;
        return fetch(url, options);
    }

    async function loadProfile(uid) {
        const info = document.getElementById('doctorInfo');
        const overlay = document.getElementById('verificationOverlay');
        try {
            const res = await api('/api/doctors/' + encodeURIComponent(uid) + '/full-profile');
            if (!res.ok) {
                if (overlay) overlay.style.display = 'flex';
                return;
            }
            const doc = await res.json();
            if (info) info.textContent = 'Dr. ' + (doc.name || 'Veterinarian') + (doc.specialization ? ' • ' + doc.specialization : '');
            if (doc.status === 'pending') {
                if (overlay) overlay.style.display = 'flex';
                updateTracker('pending', !!(doc.kyc_data && Object.keys(doc.kyc_data).length));
            } else if (doc.status === 'active') {
                if (overlay) overlay.style.display = 'none';
                updateTracker('active', true);
            } else if (overlay) overlay.style.display = 'flex';

            const statEl = document.getElementById('docStatCases');
            if (statEl) statEl.textContent = String(doc.cases_total || (doc.recent_cases || []).length || 0);
        } catch (e) {
            if (overlay) overlay.style.display = 'flex';
        }
    }

    function updateTracker(status, submitted) {
        const progress = document.getElementById('statusProgress');
        if (!progress) return;
        if (submitted) {
            progress.style.width = '66%';
            document.getElementById('stepKyc')?.classList.add('completed');
            document.getElementById('stepReview')?.classList.add('active');
        }
        if (status === 'active') {
            progress.style.width = '100%';
            document.getElementById('stepReview')?.classList.add('completed');
            document.getElementById('stepApproved')?.classList.add('completed');
        }
    }

    async function loadDoctorCases() {
        if (!doctorUid) return;
        const el = document.getElementById('doctorCasesList');
        if (!el) return;
        el.innerHTML = '<p class="pp-empty"><i class="fas fa-spinner fa-spin"></i> Loading cases…</p>';
        try {
            const res = await api('/api/doctors/' + encodeURIComponent(doctorUid) + '/cases');
            const cases = await res.json();
            if (!cases.length) {
                el.innerHTML = '<div class="pp-empty"><i class="fas fa-paw"></i><p>No rescue cases assigned yet.</p></div>';
                return;
            }
            el.innerHTML = cases.map((c) => {
                const photos = (c.photos || []).map((p) =>
                    `<img src="${p.file_url}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px;margin:4px;">`
                ).join('');
                let actions = '';
                if (c.workflow_status === 'doctor_assigned') {
                    actions = `<button class="pp-btn pp-btn-teal" onclick="DoctorPortal.approve('${c.incident_code}')">Approve case</button>`;
                }
                if (c.workflow_status === 'handover_otp_pending') {
                    actions = `<p style="margin-top:8px;">Handover OTP: <b id="otp_${c.incident_code}">…</b>
                        <button class="pp-btn pp-btn-ghost" onclick="DoctorPortal.showOtp('${c.incident_code}')">Show OTP</button></p>`;
                }
                if (c.workflow_status === 'at_doctor' || c.workflow_status === 'doctor_approved') {
                    actions = `<button class="pp-btn pp-btn-teal" onclick="DoctorPortal.startTreatment('${c.incident_code}')">Start treatment</button>`;
                }
                if (c.workflow_status === 'treatment_in_progress') {
                    actions = `<textarea id="tr_${c.incident_code}" placeholder="Treatment report" style="width:100%;margin-top:8px;padding:10px;border-radius:10px;border:1px solid #e2e8f0;"></textarea>
                        <button class="pp-btn pp-btn-primary" style="margin-top:8px;background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;border:none;" onclick="DoctorPortal.completeTreatment('${c.incident_code}')">Complete treatment</button>`;
                }
                return `<div class="pp-case-card">
                    <h4>${c.incident_code} · ${c.animal_type || 'Animal'}</h4>
                    <p style="color:var(--pp-muted);font-size:0.85rem;">${c.status_label || c.workflow_status} · ${c.injury_type || '—'}</p>
                    ${c.description ? '<p style="font-size:0.85rem;margin:8px 0;">' + c.description + '</p>' : ''}
                    <div>${photos}</div>
                    <div style="margin-top:12px;">${actions}</div>
                </div>`;
            }).join('');
        } catch (e) {
            el.innerHTML = '<div class="pp-empty"><p>Could not load cases. Check API connection.</p></div>';
        }
    }

    async function approve(code) {
        await api('/api/workflow/' + encodeURIComponent(code) + '/doctor-approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctorUid })
        });
        loadDoctorCases();
    }

    async function showOtp(code) {
        const d = await (await api('/api/workflow/' + encodeURIComponent(code) + '/handover-otp')).json();
        const el = document.getElementById('otp_' + code);
        if (el) el.textContent = d.otp || 'N/A';
    }

    async function startTreatment(code) {
        await api('/api/workflow/' + encodeURIComponent(code) + '/treatment-start', { method: 'POST' });
        loadDoctorCases();
    }

    async function completeTreatment(code) {
        const report = document.getElementById('tr_' + code)?.value || '';
        await api('/api/workflow/' + encodeURIComponent(code) + '/treatment-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ treatmentReport: report })
        });
        loadDoctorCases();
    }

    function init(auth) {
        auth.onAuthStateChanged(async (user) => {
            const isDemo = sessionStorage.getItem('demo_session') === 'true';
            if (!user && !isDemo) {
                window.location.href = 'doctor_auth.html';
                return;
            }
            doctorUid = user ? user.uid : 'demo-doc-id';
            await loadProfile(doctorUid);
            loadDoctorCases();
        });
    }

    window.DoctorPortal = {
        init,
        loadDoctorCases,
        approve,
        showOtp,
        startTreatment,
        completeTreatment
    };
})();
