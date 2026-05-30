/**
 * Shared rescue case form — same fields as customer emergency report
 */
window.PawCaseForm = {
    _files: {},

    CONDITION_OPTIONS: [
        'Bleeding / Fracture',
        'Sick / Weak',
        'Stuck / Trapped',
        'Abandoned / Stray',
        'Traffic accident',
        'Other emergency'
    ],
    SEVERITY_OPTIONS: [
        'Critical — Needs Immediate Help',
        'Moderate — Injured but Stable',
        'Low — Needs Shelter/Food'
    ],

    async lookupCustomer(phone, email) {
        const res = await fetch('/api/customers/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: (phone || '').trim(), email: (email || '').trim() })
        });
        return res.json();
    },

    buildFormData(prefix, payload) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
            if (v != null && v !== '') fd.append(k, v);
        });
        (this._files[prefix] || []).forEach((file) => fd.append('images', file));
        return fd;
    },

    async createCaseAdmin(payload, prefix = 'admin') {
        const res = await fetch('/api/admin/add-case', {
            method: 'POST',
            body: this.buildFormData(prefix, payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create case');
        return data;
    },

    async createCaseNgo(ngoUid, payload, prefix = 'ngo') {
        const res = await fetch('/api/ngos/' + ngoUid + '/create-case', {
            method: 'POST',
            body: this.buildFormData(prefix, payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create case');
        return data;
    },

    setLookupStatus(el, data) {
        if (!el) return;
        if (data.found) {
            el.textContent = 'Customer found: ' + data.customer.name + ' — details prefilled; you can still edit any field below.';
            el.style.color = '#15803d';
        } else {
            el.textContent = 'New customer — account will be created and they can track on the app.';
            el.style.color = '#b45309';
        }
    },

    unlockFormFields(prefix) {
        const form = document.getElementById(prefix + 'CaseForm');
        if (!form) return;
        form.querySelectorAll('input, select, textarea, button').forEach((el) => {
            if (el.type === 'hidden' || el.hasAttribute('data-photo-btn') || el.hasAttribute('data-locate')) return;
            el.removeAttribute('readonly');
            el.disabled = false;
            el.style.pointerEvents = '';
            el.style.opacity = '';
        });
    },

    applyCustomerPrefill(prefix, customer) {
        if (!customer) return;
        const phone = document.getElementById(prefix + 'CustomerPhone');
        const email = document.getElementById(prefix + 'CustomerEmail');
        const name = document.getElementById(prefix + 'CustomerName');
        if (phone && customer.phone && !phone.value.trim()) phone.value = customer.phone;
        if (email && customer.email && !email.value.trim()) email.value = customer.email;
        if (name && customer.name && !name.value.trim()) name.value = customer.name;
        this.unlockFormFields(prefix);
    },

    mount(containerId, options = {}) {
        const el = document.getElementById(containerId);
        if (!el) return;
        const prefix = options.prefix || 'paw';
        this._files[prefix] = [];
        const showNgo = options.showNgoSelect === true;
        const animalOpts = ['Dog', 'Cat', 'Bird', 'Cattle', 'Other'].map(a => '<option value="' + a + '">' + a + '</option>').join('');
        const sevOpts = this.SEVERITY_OPTIONS.map(s => '<option>' + s + '</option>').join('');
        const condOpts = this.CONDITION_OPTIONS.map(c => '<option>' + c + '</option>').join('');
        const ngoField = showNgo
            ? '<div class="form-field full"><label>Assign NGO</label><select id="' + prefix + 'NgoId"><option value="">— Select NGO —</option></select></div>'
            : '';

        el.innerHTML =
            '<form class="paw-case-form" id="' + prefix + 'CaseForm">' +
            '<div class="input-grid">' +
            '<p class="section-title">Reporter / customer</p>' +
            '<div class="form-field"><label>Phone</label><input type="tel" id="' + prefix + 'CustomerPhone" placeholder="+91 98765 43210" data-lookup autocomplete="off"></div>' +
            '<div class="form-field"><label>Email</label><input type="email" id="' + prefix + 'CustomerEmail" placeholder="customer@email.com" data-lookup autocomplete="off"></div>' +
            '<div class="form-field full"><div id="' + prefix + 'LookupHint" class="lookup-hint">Enter phone or email to find an existing customer.</div></div>' +
            '<div class="form-field full"><label>Full name</label><input type="text" id="' + prefix + 'CustomerName" required placeholder="Reporter name" autocomplete="off"></div>' +
            ngoField +
            '<p class="section-title">Animal & incident (same as customer app)</p>' +
            '<div class="form-field"><label>Animal type</label><select id="' + prefix + 'AnimalType" required>' + animalOpts + '</select></div>' +
            '<div class="form-field"><label>Severity</label><select id="' + prefix + 'Severity" required>' + sevOpts + '</select></div>' +
            '<div class="form-field full"><label>Animal condition</label><select id="' + prefix + 'Condition" required>' + condOpts + '</select></div>' +
            '<div class="form-field full"><label>Incident location</label><div class="loc-row">' +
            '<input type="text" id="' + prefix + 'Location" required placeholder="Street, landmark, city">' +
            '<button type="button" class="btn-locate" data-locate="' + prefix + '"><i class="fas fa-crosshairs"></i> GPS</button></div>' +
            '<input type="hidden" id="' + prefix + 'Latitude"><input type="hidden" id="' + prefix + 'Longitude"></div>' +
            '<div class="form-field full"><label>Scene photos (up to 5)</label>' +
            '<div class="photo-upload-zone" id="' + prefix + 'PhotoZone">' +
            '<input type="file" id="' + prefix + 'Photos" accept="image/*" multiple hidden>' +
            '<button type="button" class="btn-photo-add" data-photo-btn="' + prefix + '"><i class="fas fa-camera"></i> Add photos</button>' +
            '<p class="photo-hint">Photos help the rescue team assess the situation before arrival.</p>' +
            '<div class="photo-preview-row" id="' + prefix + 'PhotoPreview"></div></div></div>' +
            '<div class="form-field full"><label>What do you see? (description)</label>' +
            '<textarea id="' + prefix + 'Description" placeholder="Injuries, surroundings, access notes for rescue team…"></textarea></div>' +
            '</div></form>';

        this._lookupTimers = this._lookupTimers || {};
        const lookupKey = prefix + 'Lookup';
        el.querySelectorAll('[data-lookup]').forEach((inp) => {
            inp.addEventListener('input', () => {
                clearTimeout(this._lookupTimers[lookupKey]);
                this._lookupTimers[lookupKey] = setTimeout(() => this.runLookup(prefix, options.onLookup), 400);
            });
        });
        this.unlockFormFields(prefix);
        const locBtn = el.querySelector('[data-locate="' + prefix + '"]');
        if (locBtn) locBtn.addEventListener('click', () => this.useGps(prefix));
        if (showNgo && options.loadNgos) options.loadNgos(prefix);

        const photoBtn = el.querySelector('[data-photo-btn="' + prefix + '"]');
        const photoInput = document.getElementById(prefix + 'Photos');
        if (photoBtn && photoInput) {
            photoBtn.addEventListener('click', () => photoInput.click());
            photoInput.addEventListener('change', (e) => this.onPhotosSelected(prefix, e.target.files));
        }
    },

    onPhotosSelected(prefix, fileList) {
        const max = 5;
        const existing = this._files[prefix] || [];
        const incoming = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
        if (incoming.length === 0 && existing.length > 0) {
            this.renderPhotoPreview(prefix);
            return;
        }
        this._files[prefix] = existing.concat(incoming).slice(0, max);
        this.renderPhotoPreview(prefix);
        const addBtn = document.querySelector('[data-photo-btn="' + prefix + '"]');
        if (addBtn) addBtn.disabled = this._files[prefix].length >= max;
    },

    renderPhotoPreview(prefix) {
        const merged = this._files[prefix] || [];
        const preview = document.getElementById(prefix + 'PhotoPreview');
        if (!preview) return;
        preview.innerHTML = merged.map((file, i) => {
            const url = URL.createObjectURL(file);
            return '<div class="photo-thumb"><img src="' + url + '" alt=""><button type="button" data-remove-photo="' + prefix + '" data-idx="' + i + '" title="Remove">&times;</button></div>';
        }).join('');
        preview.querySelectorAll('[data-remove-photo]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-idx'), 10);
                this._files[prefix].splice(idx, 1);
                this.renderPhotoPreview(prefix);
                const addBtn = document.querySelector('[data-photo-btn="' + prefix + '"]');
                if (addBtn) addBtn.disabled = this._files[prefix].length >= max;
                const input = document.getElementById(prefix + 'Photos');
                if (input) input.value = '';
            });
        });
    },

    async runLookup(prefix, callback) {
        const phone = document.getElementById(prefix + 'CustomerPhone')?.value;
        const email = document.getElementById(prefix + 'CustomerEmail')?.value;
        const hint = document.getElementById(prefix + 'LookupHint');
        if (!phone && !email) return;
        try {
            const data = await this.lookupCustomer(phone, email);
            this.setLookupStatus(hint, data);
            if (data.found && data.customer) {
                this.applyCustomerPrefill(prefix, data.customer);
                if (callback) callback(data);
            } else {
                this.unlockFormFields(prefix);
            }
        } catch (e) {
            if (hint) hint.textContent = 'Could not look up customer.';
        }
    },

    useGps(prefix) {
        const loc = document.getElementById(prefix + 'Location');
        if (!navigator.geolocation) return alert('GPS not available in this browser.');
        loc.value = 'Detecting location…';
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                document.getElementById(prefix + 'Latitude').value = latitude;
                document.getElementById(prefix + 'Longitude').value = longitude;
                if (typeof google !== 'undefined' && google.maps?.Geocoder) {
                    new google.maps.Geocoder().geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
                        loc.value = status === 'OK' && results[0] ? results[0].formatted_address : latitude.toFixed(5) + ', ' + longitude.toFixed(5);
                    });
                } else {
                    loc.value = latitude.toFixed(5) + ', ' + longitude.toFixed(5);
                }
            },
            () => { loc.value = ''; alert('Location permission denied.'); }
        );
    },

    readPayload(prefix) {
        return {
            customer_name: document.getElementById(prefix + 'CustomerName')?.value?.trim(),
            customer_phone: document.getElementById(prefix + 'CustomerPhone')?.value?.trim(),
            customer_email: document.getElementById(prefix + 'CustomerEmail')?.value?.trim(),
            animal_type: document.getElementById(prefix + 'AnimalType')?.value,
            severity: document.getElementById(prefix + 'Severity')?.value,
            condition: document.getElementById(prefix + 'Condition')?.value,
            location: document.getElementById(prefix + 'Location')?.value?.trim(),
            description: document.getElementById(prefix + 'Description')?.value?.trim(),
            latitude: document.getElementById(prefix + 'Latitude')?.value || null,
            longitude: document.getElementById(prefix + 'Longitude')?.value || null,
            ngo_id: document.getElementById(prefix + 'NgoId')?.value || null
        };
    },

    validatePayload(p) {
        if (!p.customer_name || !p.customer_phone) return 'Customer name and phone are required.';
        if (!p.animal_type || !p.condition || !p.location) return 'Animal type, condition, and location are required.';
        return null;
    }
};
