/**
 * PawBandhan Admin Portal — live API, JWT session via paw-admin-auth.js
 */
(function () {
    const api = (path) => (window.PawApi && PawApi.url ? PawApi.url(path) : (window.PAW_API_BASE || '') + path);

    async function fetchJson(path, options) {
        const res = await fetch(api(path), options);
        const text = await res.text();
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (e) {
            throw new Error('Invalid response from API. Is the backend running?');
        }
        if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
        return data;
    }

    async function postJson(path, body) {
        return fetchJson(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }

    let pchAdminMounted = false;
    let adminStatusOptions = [];

    function toast(msg, ok) {
        const el = document.getElementById('apToast');
        if (!el) return;
        el.textContent = msg;
        el.className = 'ap-toast show ' + (ok ? 'ok' : 'err');
        clearTimeout(el._t);
        el._t = setTimeout(() => { el.classList.remove('show'); }, 4000);
    }

    function loading(on) {
        const el = document.getElementById('apLoading');
        if (el) el.classList.toggle('show', !!on);
    }

    function closeModal(id) {
        const el = document.getElementById(id || 'detailsModal');
        if (el) el.classList.remove('open');
    }

    function openModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('open');
    }

    function showTab(name, navEl) {
        document.querySelectorAll('.ap-tab').forEach((t) => t.classList.remove('active'));
        const tab = document.getElementById(name + 'Tab');
        if (tab) tab.classList.add('active');
        document.querySelectorAll('.ap-nav a').forEach((a) => a.classList.remove('active'));
        if (navEl) navEl.classList.add('active');
        const loaders = {
            verify: loadPendingApplications,
            cms: loadSiteConfig,
            settings: loadSettings,
            entities: loadEntities,
            reps: loadAllReps,
            cases: loadCases,
            customers: loadCustomers,
            dash: refreshDashboard
        };
        if (loaders[name]) loaders[name]();
    }

    async function refreshDashboard() {
        try {
            const stats = await fetchJson('/api/stats');
            const set = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = Number(val || 0).toLocaleString('en-IN');
            };
            set('totalRescues', stats.totalRescues);
            set('totalNGOs', stats.totalNGOs);
            set('totalRiders', stats.totalRiders);
            set('totalDoctors', stats.totalDoctors);

            const pending = await fetchJson('/api/admin/pending-applications');
            const n = (pending.ngos?.length || 0) + (pending.doctors?.length || 0) +
                (pending.riders?.length || 0) + (pending.representatives?.length || 0);
            const badge = document.getElementById('navPendingBadge');
            if (badge) {
                badge.textContent = n;
                badge.style.display = n ? 'inline-block' : 'none';
            }
            const queue = document.getElementById('dashPendingQueue');
            if (queue) {
                const items = [];
                (pending.ngos || []).forEach((x) => items.push({ type: 'NGO', name: x.name, id: x.id, t: 'ngo' }));
                (pending.doctors || []).forEach((x) => items.push({ type: 'Doctor', name: x.name, id: x.id, t: 'doctor' }));
                (pending.representatives || []).forEach((x) => items.push({ type: 'Representative', name: x.name, id: x.id, t: 'representative' }));
                if (!items.length) {
                    queue.innerHTML = '<p style="color:var(--ap-muted);font-size:0.9rem;">No pending verifications.</p>';
                } else {
                    queue.innerHTML = items.slice(0, 8).map((it) => `
                        <div class="ap-queue-item">
                            <span><strong>${it.type}</strong> — ${escapeHtml(it.name)}</span>
                            <button type="button" class="ap-btn ap-btn-ghost ap-btn-sm" data-review="${it.t}" data-id="${it.id}">Review</button>
                        </div>`).join('');
                    queue.querySelectorAll('[data-review]').forEach((btn) => {
                        btn.addEventListener('click', () => {
                            const t = btn.getAttribute('data-review');
                            const id = btn.getAttribute('data-id');
                            showTab('verify', document.querySelector('.ap-nav a[data-tab="verify"]'));
                            if (t === 'representative' && typeof PawEntityProfile !== 'undefined') PawEntityProfile.openRep(id);
                            else viewApplicationDetails(t, id);
                        });
                    });
                }
            }
            const pill = document.getElementById('apiLivePill');
            if (pill) pill.classList.add('ok');
        } catch (e) {
            const pill = document.getElementById('apiLivePill');
            if (pill) pill.classList.remove('ok');
        }
    }

    function escapeHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }

    async function loadPendingApplications() {
        loading(true);
        try {
            const data = await fetchJson('/api/admin/pending-applications');
            const render = (list, elId, type) => {
                const el = document.getElementById(elId);
                if (!el) return;
                if (!list.length) {
                    el.innerHTML = '<tr><td colspan="5" class="ap-table-empty">No pending items</td></tr>';
                    return;
                }
                el.innerHTML = list.map((item) => `
                    <tr>
                        <td><strong>${escapeHtml(item.ack_no || 'ACK-' + item.id)}</strong></td>
                        <td>${escapeHtml(item.name)}</td>
                        <td>${escapeHtml(item.ngo_type || item.vehicle_type || item.specialization || '—')}</td>
                        <td>${escapeHtml(item.reg_number || item.license_number || '—')}</td>
                        <td><button type="button" class="ap-btn ap-btn-ghost ap-btn-sm" onclick="AdminPortal.viewApplicationDetails('${type}', ${item.id})">Review</button></td>
                    </tr>`).join('');
            };
            render(data.ngos || [], 'pendingNgosList', 'ngo');
            render(data.doctors || [], 'pendingDoctorsList', 'doctor');
            const repsCard = document.getElementById('pendingRepsCard');
            const repsEl = document.getElementById('pendingRepsList');
            const reps = data.representatives || [];
            if (repsCard) repsCard.style.display = reps.length ? '' : 'none';
            if (repsEl) {
                if (!reps.length) repsEl.innerHTML = '<tr><td colspan="5" class="ap-table-empty">None</td></tr>';
                else {
                    repsEl.innerHTML = reps.map((item) => `
                        <tr>
                            <td>${escapeHtml(item.name)}</td>
                            <td>${escapeHtml(item.ngo_name || '—')}</td>
                            <td>${escapeHtml(item.email)}</td>
                            <td><span class="ap-badge ap-badge-orange">${escapeHtml(item.status)}</span></td>
                            <td><button type="button" class="ap-btn ap-btn-primary ap-btn-sm ap-approve-rep" data-id="${item.id}" data-uid="${escapeHtml(item.uid || '')}">Approve access</button></td>
                        </tr>`).join('');
                    repsEl.querySelectorAll('.ap-approve-rep').forEach((btn) => {
                        btn.addEventListener('click', () => approveRepresentative(Number(btn.dataset.id), btn.dataset.uid || ''));
                    });
                }
            }
            refreshDashboard();
        } catch (e) {
            toast(e.message, false);
        } finally {
            loading(false);
        }
    }

    async function viewApplicationDetails(type, id) {
        if (type === 'representative' && typeof PawEntityProfile !== 'undefined') return PawEntityProfile.openRep(id);
        if (type === 'doctor' && typeof PawEntityProfile !== 'undefined') return PawEntityProfile.openDoctor(id);
        if (type === 'ngo' && typeof PawEntityProfile !== 'undefined') return PawEntityProfile.openNgo(id);
        try {
            const item = await fetchJson(`/api/admin/application-details/${type}/${id}`);
            document.getElementById('modalTitle').innerText = `${type.toUpperCase()}: ${item.name || item.first_name}`;
            let kyc = {};
            try { kyc = typeof item.kyc_data === 'string' ? JSON.parse(item.kyc_data) : (item.kyc_data || {}); } catch (e) { /* */ }

            let html = '';
            const stdFields = { Email: item.email, Phone: item.phone, Status: item.status };
            for (const [k, v] of Object.entries(stdFields)) {
                if (v) html += `<div class="ap-form-group"><label>${k}</label><p>${escapeHtml(v)}</p></div>`;
            }
            for (const [k, v] of Object.entries(kyc)) {
                if (k === 'registry_photos' || k === 'document_uploads' || k === 'ai_verification' || !v || typeof v === 'object') continue;
                html += `<div class="ap-form-group"><label>${k.replace(/_/g, ' ')}</label><p>${escapeHtml(v)}</p></div>`;
            }
            document.getElementById('modalContent').innerHTML = html;

            const photoCount = Array.isArray(kyc.registry_photos) ? kyc.registry_photos.length : 0;
            const documentUploads = kyc.document_uploads || {};
            let kycHtml = `<p style="margin-bottom:16px;color:var(--ap-success);font-weight:700;">${photoCount} live photo(s) received</p>`;
            if (kyc.registry_photos) {
                kycHtml += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px;">';
                kyc.registry_photos.forEach((p) => {
                    kycHtml += `<div><img src="${escapeHtml(p.url)}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;"><small>${escapeHtml(p.type)}</small></div>`;
                });
                kycHtml += '</div>';
            }
            document.getElementById('kycContent').innerHTML = kycHtml;
            document.getElementById('modalApproveBtn').onclick = () => approveApplication(type, id, item.uid);
            openModal('detailsModal');
        } catch (e) {
            toast(e.message, false);
        }
    }

    async function approveApplication(type, id, uid) {
        if (!confirm('Approve this application?')) return;
        try {
            await postJson('/api/admin/approve-application', { type, id, uid });
            toast('Application approved.', true);
            closeModal('detailsModal');
            loadPendingApplications();
            loadEntities();
        } catch (e) {
            toast(e.message, false);
        }
    }

    async function approveRepresentative(id, uid) {
        if (!confirm('Grant representative app access?')) return;
        try {
            const d = await postJson('/api/admin/approve-representative', { id, uid });
            toast('Representative approved: ' + (d.repId || ''), true);
            loadPendingApplications();
            loadAllReps();
        } catch (e) {
            toast(e.message, false);
        }
    }

    async function loadAllReps() {
        loading(true);
        try {
            const reps = await fetchJson('/api/admin/representatives-all');
            const ngos = await fetchJson('/api/admin/verified-ngos');
            const el = document.getElementById('allRepsList');
            if (!el) return;
            el.innerHTML = reps.map((r) => `
                <tr>
                    <td>${escapeHtml(r.name)}</td>
                    <td>${escapeHtml(r.email)}</td>
                    <td>${escapeHtml(r.ngo_name || '—')}</td>
                    <td><span class="ap-badge ${r.status === 'active' ? 'ap-badge-green' : r.status === 'suspended' ? 'ap-badge-red' : 'ap-badge-orange'}">${escapeHtml(r.status)}</span></td>
                    <td><small>${escapeHtml(r.tracking_id || '—')}</small></td>
                    <td style="white-space:nowrap;">
                        <button type="button" class="ap-btn ap-btn-ghost ap-btn-sm" onclick="AdminPortal.viewRepDetail(${r.id})">View</button>
                        ${r.status === 'pending_admin' ? `<button type="button" class="ap-btn ap-btn-primary ap-btn-sm ap-approve-rep" data-id="${r.id}" data-uid="${escapeHtml(r.uid || '')}">Approve</button>
                        <button type="button" class="ap-btn ap-btn-danger ap-btn-sm" onclick="AdminPortal.rejectRep(${r.id})">Reject</button>` : ''}
                        ${r.status === 'active' ? `<button type="button" class="ap-btn ap-btn-ghost ap-btn-sm" onclick="AdminPortal.suspendRep(${r.id},true)">Suspend</button>` : ''}
                        ${r.status === 'suspended' ? `<button type="button" class="ap-btn ap-btn-primary ap-btn-sm" onclick="AdminPortal.suspendRep(${r.id},false)">Unsuspend</button>` : ''}
                        <select onchange="AdminPortal.allotRepNgo(${r.id}, this.value)" style="margin-top:6px;padding:6px;border-radius:8px;border:1px solid var(--ap-border);">
                            <option value="">Allot NGO</option>
                            ${ngos.map((n) => `<option value="${n.id}" ${r.ngo_id == n.id ? 'selected' : ''}>${escapeHtml(n.name)}</option>`).join('')}
                        </select>
                    </td>
                </tr>`).join('');
            el.querySelectorAll('.ap-approve-rep').forEach((btn) => {
                btn.addEventListener('click', () => approveRepresentative(Number(btn.dataset.id), btn.dataset.uid || ''));
            });
        } catch (e) {
            toast(e.message, false);
        } finally {
            loading(false);
        }
    }

    async function openCreateRepModal() {
        const ngos = await fetchJson('/api/admin/verified-ngos');
        const sel = document.getElementById('createRepNgoSelect');
        sel.innerHTML = '<option value="">Select NGO</option>' + ngos.map((n) => `<option value="${n.id}">${escapeHtml(n.name)}</option>`).join('');
        document.getElementById('createRepForm').reset();
        openModal('createRepModal');
    }

    async function submitCreateRep() {
        const f = document.getElementById('createRepForm');
        const body = {
            name: f.name.value,
            email: f.email.value,
            phone: f.phone.value,
            ngoId: f.ngoId.value || null,
            vehicleType: f.vehicleType.value,
            vehicleNumber: f.vehicleNumber.value
        };
        try {
            await postJson('/api/admin/representatives/create', body);
            toast('Representative created. They register at the rep portal with this email.', true);
            closeModal('createRepModal');
            loadAllReps();
        } catch (e) {
            toast(e.message, false);
        }
    }

    function openCreateCustomerModal() {
        document.getElementById('createCustomerForm').reset();
        document.getElementById('customerAccessResult').style.display = 'none';
        openModal('createCustomerModal');
    }

    async function submitCreateCustomer() {
        const f = document.getElementById('createCustomerForm');
        try {
            const d = await postJson('/api/admin/customers/create', {
                name: f.name.value,
                email: f.email.value,
                phone: f.phone.value
            });
            const box = document.getElementById('customerAccessResult');
            box.style.display = 'block';
            if (d.existed) box.textContent = 'User already exists:\n' + JSON.stringify(d.customer, null, 2);
            else box.textContent = (d.instructions || 'Customer created.') + '\n\nAccess code: ' + (d.portalAccessCode || 'N/A');
            toast('Customer saved.', true);
            loadCustomers();
        } catch (e) {
            toast(e.message, false);
        }
    }

    async function viewRepDetail(id) {
        if (typeof PawEntityProfile !== 'undefined') PawEntityProfile.openRep(id);
        else toast('Profile viewer not loaded', false);
    }

    async function rejectRep(id) {
        const reason = prompt('Rejection reason');
        if (reason === null) return;
        try {
            await postJson('/api/admin/reject-representative', { id, reason });
            toast('Representative rejected.', true);
            loadAllReps();
        } catch (e) {
            toast(e.message, false);
        }
    }

    async function suspendRep(id, suspend) {
        try {
            await postJson('/api/admin/suspend-representative', { id, suspend });
            toast(suspend ? 'Suspended.' : 'Unsuspended.', true);
            loadAllReps();
        } catch (e) {
            toast(e.message, false);
        }
    }

    async function allotRepNgo(repId, ngoId) {
        if (!ngoId) return;
        try {
            await postJson('/api/admin/representatives/' + repId + '/allot-ngo', { ngoId });
            toast('NGO allotted.', true);
            loadAllReps();
        } catch (e) {
            toast(e.message, false);
        }
    }

    async function submitManualReg() {
        const form = document.getElementById('manualRegForm');
        const data = {
            type: form.type.value,
            name: form.name.value,
            email: form.email.value,
            phone: form.phone.value,
            details: {
                address: form.details.value,
                specialization: form.details.value,
                vehicleType: form.details.value
            }
        };
        try {
            await postJson('/api/admin/manual-register', data);
            toast('Registered and activated.', true);
            closeModal('manualRegModal');
            form.reset();
            loadEntities();
        } catch (e) {
            toast(e.message, false);
        }
    }

    function openAdminCaseModal() {
        PawCaseForm.mount('adminCaseFormMount', {
            prefix: 'admin',
            showNgoSelect: true,
            loadNgos: async (prefix) => {
                const ngos = await fetchJson('/api/admin/verified-ngos');
                const sel = document.getElementById(prefix + 'NgoId');
                if (sel) sel.innerHTML = '<option value="">— Select NGO —</option>' + ngos.map((n) => `<option value="${n.id}">${escapeHtml(n.name)}</option>`).join('');
            }
        });
        openModal('addCaseModal');
    }

    async function submitNewCase() {
        const data = PawCaseForm.readPayload('admin');
        const err = PawCaseForm.validatePayload(data);
        if (err) return toast(err, false);
        try {
            const d = await PawCaseForm.createCaseAdmin(data, 'admin');
            toast('Case created: ' + (d.incident?.incident_code || ''), true);
            closeModal('addCaseModal');
            loadCases();
        } catch (e) {
            toast(e.message || 'Failed to create case', false);
        }
    }

    async function loadSiteConfig() {
        loading(true);
        try {
            const config = await fetchJson('/api/site-config');
            const form = document.getElementById('cmsForm');
            for (const [k, v] of Object.entries(config)) {
                if (form.elements[k]) form.elements[k].value = v;
            }
            loadStories();
        } catch (e) {
            toast(e.message, false);
        } finally {
            loading(false);
        }
    }

    async function saveSiteConfig() {
        const form = document.getElementById('cmsForm');
        const updates = {};
        for (const el of form.elements) {
            if (el.name) updates[el.name] = el.value;
        }
        loading(true);
        try {
            await postJson('/api/admin/site-config', updates);
            toast('Public site updated.', true);
            refreshDashboard();
        } catch (e) {
            toast(e.message, false);
        } finally {
            loading(false);
        }
    }

    async function loadSettings() {
        try {
            const config = await fetchJson('/api/admin/site-settings-all');
            if (config.rzp_key_id) document.getElementById('rzp_key_id').value = config.rzp_key_id;
            if (config.rzp_key_secret) document.getElementById('rzp_key_secret').value = config.rzp_key_secret;
        } catch (e) { /* optional */ }
    }

    async function saveRazorpaySettings() {
        const id = document.getElementById('rzp_key_id').value;
        const secret = document.getElementById('rzp_key_secret').value;
        try {
            await postJson('/api/admin/update-site-setting', { key: 'rzp_key_id', value: id });
            await postJson('/api/admin/update-site-setting', { key: 'rzp_key_secret', value: secret });
            toast('Razorpay credentials saved.', true);
        } catch (e) {
            toast(e.message, false);
        }
    }

    async function loadEntities() {
        loading(true);
        try {
            const data = await fetchJson('/api/admin/verified-ngos');
            document.getElementById('verifiedNgosList').innerHTML = data.map((ngo) => `
                <tr>
                    <td><strong>${escapeHtml(ngo.prn)}</strong></td>
                    <td>${escapeHtml(ngo.name)}</td>
                    <td>${escapeHtml(ngo.email)}</td>
                    <td><span class="ap-badge ${ngo.status === 'active' ? 'ap-badge-green' : 'ap-badge-red'}">${escapeHtml((ngo.status || '').toUpperCase())}</span></td>
                    <td>
                        <button type="button" class="ap-btn ap-btn-ghost ap-btn-sm" onclick="PawEntityProfile.openNgo(${ngo.id})">Profile</button>
                        <button type="button" class="ap-btn ap-btn-danger ap-btn-sm" onclick="AdminPortal.banNgo(${ngo.id}, '${ngo.status === 'active' ? 'suspended' : 'active'}')">${ngo.status === 'active' ? 'Suspend' : 'Restore'}</button>
                    </td>
                </tr>`).join('');
        } catch (e) {
            toast(e.message, false);
        } finally {
            loading(false);
        }
    }

    async function banNgo(id, status) {
        if (!confirm('Change this NGO status?')) return;
        try {
            await postJson('/api/admin/ban-ngo', { id, status });
            toast('NGO status updated.', true);
            loadEntities();
        } catch (e) {
            toast(e.message, false);
        }
    }

    async function loadAdminStatusOptions() {
        if (!adminStatusOptions.length) {
            adminStatusOptions = await fetchJson('/api/workflow/status-options');
        }
        return adminStatusOptions;
    }

    async function loadCases() {
        loading(true);
        try {
            await loadAdminStatusOptions();
            const data = await fetchJson('/api/admin/workflow-cases');
            if (typeof PawCaseHub !== 'undefined') {
                if (!pchAdminMounted) {
                    PawCaseHub.mountAdmin('pchAdminRoot', { statusOptions: adminStatusOptions, onUpdated: loadCases });
                    pchAdminMounted = true;
                }
                PawCaseHub.setAdminCases(data);
            }
        } catch (e) {
            toast(e.message, false);
        } finally {
            loading(false);
        }
    }

    async function loadCustomers() {
        loading(true);
        try {
            const data = await fetchJson('/api/admin/customers');
            const el = document.getElementById('customersList');
            if (!data.length) {
                el.innerHTML = '<tr><td colspan="6" class="ap-table-empty">No customers yet</td></tr>';
                return;
            }
            el.innerHTML = data.map((c) => `
                <tr>
                    <td>${c.id}</td>
                    <td><strong>${escapeHtml(c.name)}</strong><br><small>${escapeHtml(c.uid || '')}</small></td>
                    <td>${escapeHtml(c.user_email || c.email || '—')}</td>
                    <td>${escapeHtml(c.user_phone || c.phone || '—')}</td>
                    <td><code style="font-size:0.75rem">${escapeHtml(c.portal_access_code || '—')}</code></td>
                    <td>${c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '—'}</td>
                </tr>`).join('');
        } catch (e) {
            toast(e.message, false);
        } finally {
            loading(false);
        }
    }

    async function loadStories() {
        try {
            const stories = await fetchJson('/api/stories');
            const el = document.getElementById('storiesList');
            if (!stories.length) {
                el.innerHTML = '<p style="color:var(--ap-muted);font-size:0.9rem;">No stories yet. Add one below.</p>';
                return;
            }
            el.innerHTML = stories.map((s) => `
                <div class="ap-queue-item">
                    <div><strong>${escapeHtml(s.title)}</strong><br><small>${escapeHtml(s.location || '')}</small></div>
                    <button type="button" class="ap-btn ap-btn-danger ap-btn-sm" onclick="AdminPortal.deleteStory(${s.id})"><i class="fas fa-trash"></i></button>
                </div>`).join('');
        } catch (e) { /* */ }
    }

    function showStoryModal() {
        document.getElementById('storyForm').reset();
        openModal('storyModal');
    }

    async function submitStory() {
        const f = document.getElementById('storyForm');
        try {
            await postJson('/api/admin/stories', {
                title: f.title.value,
                location: f.location.value,
                description: f.description.value,
                image_url: f.image_url.value,
                category: f.category.value || 'rescue'
            });
            toast('Story published.', true);
            closeModal('storyModal');
            loadStories();
        } catch (e) {
            toast(e.message, false);
        }
    }

    async function deleteStory(id) {
        if (!confirm('Delete this story?')) return;
        try {
            await fetchJson('/api/admin/stories/' + id, { method: 'DELETE' });
            toast('Story removed.', true);
            loadStories();
        } catch (e) {
            toast(e.message, false);
        }
    }

    function logout() {
        PawAdminAuth.logout();
    }

    async function init() {
        if (!(await PawAdminAuth.verifySession())) {
            window.location.href = 'admin_auth.html';
            return;
        }
        const profile = PawAdminAuth.getProfile();
        const el = document.getElementById('adminUserEmail');
        if (el && profile && profile.email) el.textContent = profile.email;

        document.querySelectorAll('.ap-nav a[data-tab]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                showTab(a.getAttribute('data-tab'), a);
            });
        });

        document.getElementById('storyForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            submitStory();
        });

        refreshDashboard();
        showTab('dash', document.querySelector('.ap-nav a[data-tab="dash"]'));
    }

    window.AdminPortal = {
        showTab,
        closeModal,
        openModal,
        loadPendingApplications,
        viewApplicationDetails,
        approveApplication,
        approveRepresentative,
        loadAllReps,
        openCreateRepModal,
        submitCreateRep,
        openCreateCustomerModal,
        submitCreateCustomer,
        viewRepDetail,
        rejectRep,
        suspendRep,
        allotRepNgo,
        submitManualReg,
        openAdminCaseModal,
        submitNewCase,
        loadSiteConfig,
        saveSiteConfig,
        loadSettings,
        saveRazorpaySettings,
        loadEntities,
        banNgo,
        loadCases,
        loadCustomers,
        showStoryModal,
        submitStory,
        deleteStory,
        logout,
        refreshDashboard
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
