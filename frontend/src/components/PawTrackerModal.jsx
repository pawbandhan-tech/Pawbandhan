import { useCallback, useEffect, useState } from 'react';
import { fetchJson, postJson, resolveImageUrl } from '../lib/api';
import { calcProgress, defaultSteps, formatStepTime, normalizeCode } from '../lib/trackerUtils';
import '../styles/paw-tracker.css';

function StepList({ steps, pct }) {
  return (
    <div className="fk-track-wrap">
      <div className="fk-track-head">
        <span>Rescue progress</span>
        <strong>{pct}%</strong>
      </div>
      <ul className="fk-steps-list">
        {steps.map((s, i) => {
          const t = formatStepTime(s.at);
          const icon = s.done ? 'fa-check' : s.active ? 'fa-truck-fast' : 'fa-circle';
          return (
            <li
              key={s.key || i}
              className={`fk-step ${s.done ? 'done' : ''} ${s.active ? 'active' : ''} ${s.pending ? 'pending' : ''}`}
              style={{ '--i': i }}
            >
              <div className="fk-step-marker"><i className={`fas ${icon}`} /></div>
              <div className="fk-step-body">
                <strong>{s.label}</strong>
                <small>{s.sub || ''}</small>
                {s.note ? <p className="fk-step-note">{String(s.note).slice(0, 120)}</p> : null}
                {t ? (
                  <div className="fk-step-time">
                    <span className="fk-day">{t.day}</span>
                    <span className="fk-date">{t.date}</span>
                    <span className="fk-clock">{t.time}</span>
                  </div>
                ) : s.pending || (!s.done && !s.active) ? (
                  <div className="fk-step-time fk-pending">Expected soon</div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="fk-track-rail-vertical" aria-hidden="true">
        <div className="fk-track-fill-vertical" style={{ height: `${pct}%` }} />
      </div>
    </div>
  );
}

function MapEmbed({ lat, lng, rep }) {
  const repLat = rep?.last_lat != null ? Number(rep.last_lat) : null;
  const repLng = rep?.last_lng != null ? Number(rep.last_lng) : null;
  const centerLat = repLat ?? lat;
  const centerLng = repLng ?? lng;
  if (centerLat == null || centerLng == null) return null;
  const src = `https://maps.google.com/maps?q=${centerLat},${centerLng}&z=15&output=embed`;
  return (
    <div className="pb-track-map-wrap">
      <iframe
        title="Rescue location map"
        className="pb-track-map"
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <p className="fk-map-hint"><i className="fas fa-motorcycle" /> Live GPS on map</p>
    </div>
  );
}

function StaffPanel({ data, isAdmin, onUpdated, reload }) {
  const [panel, setPanel] = useState(null);
  const [status, setStatus] = useState(data.workflow_status || 'reported');
  const [ngoId, setNgoId] = useState(data.ngo_id || '');
  const [repId, setRepId] = useState(data.rep_id || '');
  const [saving, setSaving] = useState(false);
  const code = data.incident_code;

  useEffect(() => {
    fetchJson(`/api/workflow/tracker-panel?portal=${isAdmin ? 'admin' : 'ngo'}`)
      .then(setPanel)
      .catch(() => setPanel({ statusOptions: [], ngos: [], reps: [] }));
  }, [isAdmin]);

  const reps = (panel?.reps || []).filter(
    (r) => !isAdmin || !ngoId || !r.ngo_id || String(r.ngo_id) === String(ngoId)
  );

  async function saveStatus() {
    setSaving(true);
    try {
      const payload = { workflow_status: status, actor_type: isAdmin ? 'admin' : 'ngo' };
      if (isAdmin && ngoId) payload.ngo_id = ngoId;
      await postJson(`/api/workflow/case/${encodeURIComponent(code)}/update`, payload);
      if (onUpdated) onUpdated();
      await reload();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function assignRep() {
    if (!repId) return alert('Select a representative');
    setSaving(true);
    try {
      await postJson(`/api/workflow/${encodeURIComponent(code)}/assign-rep`, {
        repId,
        actor_type: isAdmin ? 'admin' : 'ngo',
        isAdmin: !!isAdmin,
        ...(isAdmin && ngoId ? { ngoId } : {})
      });
      alert('Representative alerted on their app');
      if (onUpdated) onUpdated();
      await reload();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function autoAssignNgo() {
    setSaving(true);
    try {
      const d = await postJson(`/api/workflow/auto-assign-ngo/${encodeURIComponent(code)}`, {});
      alert(d.ngo_name ? `Assigned: ${d.ngo_name}` : 'NGO updated');
      if (onUpdated) onUpdated();
      await reload();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!panel) return null;

  return (
    <section className="paw-staff-panel">
      <h3><i className="fas fa-sliders" /> Case management</h3>
      {data.incident_source_label ? (
        <p className="paw-case-source"><i className="fas fa-tag" /> {data.incident_source_label}</p>
      ) : null}
      <label>Workflow status</label>
      <select className="paw-status-select" value={status} onChange={(e) => setStatus(e.target.value)}>
        {(panel.statusOptions || []).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {isAdmin ? (
        <>
          <label style={{ marginTop: 10 }}>Assigned NGO</label>
          <select className="paw-ngo-select" value={ngoId} onChange={(e) => setNgoId(e.target.value)}>
            <option value="">— Change NGO —</option>
            {(panel.ngos || []).map((n) => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>
        </>
      ) : null}
      <label style={{ marginTop: 10 }}>Assign rescue hero</label>
      <select className="paw-status-select" value={repId} onChange={(e) => setRepId(e.target.value)}>
        <option value="">— Select hero —</option>
        {reps.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <div className="paw-staff-btns">
        <button type="button" className="btn-pill" onClick={saveStatus} disabled={saving}>Save status</button>
        <button type="button" className="btn-pill btn-ghost" onClick={assignRep} disabled={saving}>Dispatch hero</button>
        {isAdmin ? (
          <button type="button" className="btn-pill btn-ghost" onClick={autoAssignNgo} disabled={saving}>Auto-assign NGO</button>
        ) : null}
      </div>
    </section>
  );
}

export default function PawTrackerModal({ incidentCode, isAdmin = false, onClose, onUpdated, fetchFn }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const code = normalizeCode(incidentCode);

  const load = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      const fn = fetchFn || fetchJson;
      const full = await fn(`/api/workflow/case/${encodeURIComponent(code)}/full?_=${Date.now()}`);
      setData(full);
    } catch (e) {
      setError(e.message || 'Could not load tracking');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [code, fetchFn]);

  useEffect(() => {
    load();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [load]);

  const ws = data?.workflow_status || 'reported';
  const steps = data?.track_steps || defaultSteps(ws);
  const pct = data?.progress_percent != null ? data.progress_percent : calcProgress(steps);
  const photos = [
    ...(data?.report_images || []),
    ...(data?.case_photos || []).map((p) => p.file_url || p.url).filter(Boolean)
  ];
  const rep = data?.representative;
  const showMap = rep && (rep.last_lat != null || (data?.latitude != null && data?.longitude != null));

  return (
    <div className="modal-bg paw-track-modal open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="track-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="track-close" onClick={onClose} aria-label="Close">&times;</button>
        {loading ? (
          <div className="track-loading">
            <i className="fas fa-spinner fa-spin fa-2x" />
            <p>Loading live tracking…</p>
          </div>
        ) : error ? (
          <div className="track-loading">
            <p>{error}</p>
            <button type="button" className="btn-pill" onClick={load}>Retry</button>
          </div>
        ) : data ? (
          <>
            <div className="track-sheet-handle" />
            <div className="track-header track-hero">
              <span className="track-id"><i className="fas fa-paw" /> {data.incident_code}</span>
              <h2>{data.animal_type || 'Rescue'}</h2>
              <p className="track-loc">{data.location || data.description || ''}</p>
              <p className="track-updated">
                Updated {new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="track-progress-ring">
                <span className="ring-val">{pct}%</span>
                <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  Rescue progress · {data.status_label || ws}
                </span>
              </div>
            </div>

            {isAdmin ? <StaffPanel data={data} isAdmin onUpdated={onUpdated} reload={load} /> : null}

            {data.ngo ? (
              <section className="fk-partner-card fk-ngo-card">
                <h3><i className="fas fa-hand-holding-heart" /> NGO partner</h3>
                <strong>{data.ngo.name || 'Shelter partner'}</strong>
                {(data.ngo.location_label || data.ngo.address) ? (
                  <p><i className="fas fa-location-dot" /> {data.ngo.location_label || data.ngo.address}</p>
                ) : null}
                {data.ngo.phone ? (
                  <p><a href={`tel:${data.ngo.phone}`}><i className="fas fa-phone" /> {data.ngo.phone}</a></p>
                ) : null}
              </section>
            ) : null}

            {rep ? (
              <section className="fk-partner-card fk-rep-card-live">
                <h3><i className="fas fa-motorcycle" /> Rescue hero</h3>
                <div className="fk-rep-row">
                  <div className="fk-rep-bike"><i className="fas fa-motorcycle" /></div>
                  <div>
                    <strong>{rep.name || 'Field rep'}</strong>
                    <p>{rep.rep_id || ''} · {rep.vehicle_type || 'Rescue vehicle'}</p>
                    {(rep.phone || rep.phone_display) ? (
                      <p><a href={`tel:${rep.phone || rep.phone_display}`}><i className="fas fa-phone" /> {rep.phone || rep.phone_display}</a></p>
                    ) : null}
                    <p className="fk-meta">
                      {rep.is_online ? '🟢 Live on map' : `Last seen ${rep.last_location_at ? new Date(rep.last_location_at).toLocaleTimeString('en-IN') : 'recently'}`}
                    </p>
                    {data.eta_minutes != null ? (
                      <p className="fk-eta-live"><i className="fas fa-clock" /> <strong>{data.eta_minutes} min</strong> estimated arrival</p>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {showMap ? (
              <MapEmbed lat={data.latitude} lng={data.longitude} rep={rep} />
            ) : null}

            <StepList steps={steps} pct={pct} />

            {data.show_doctor_section && (data.doctor || data.treatment_report || data.injury_type) ? (
              <section className="fk-doctor-card">
                <h3><i className="fas fa-user-doctor" /> Veterinary care</h3>
                {data.doctor ? (
                  <div className="fk-doctor-row">
                    <div className="fk-doctor-avatar"><i className="fas fa-stethoscope" /></div>
                    <div>
                      <strong>{data.doctor.name || 'Veterinarian'}</strong>
                      <p>{data.doctor.hospital_name || 'Clinic'} · {data.doctor.specialization || 'Vet'}</p>
                    </div>
                  </div>
                ) : null}
                {data.injury_type ? (
                  <p className="fk-injury"><i className="fas fa-kit-medical" /> Injury: <strong>{data.injury_type}</strong></p>
                ) : null}
                {data.treatment_report ? (
                  <div className="fk-treatment-report"><h4>Treatment report</h4><p>{data.treatment_report}</p></div>
                ) : (
                  <p className="fk-meta">Treatment report appears when the vet completes care.</p>
                )}
              </section>
            ) : null}

            <h3 className="fk-section-title">Rescue photos</h3>
            {photos.length ? (
              <div className="track-photos">
                {photos.slice(0, 12).map((u, i) => (
                  <img key={i} src={resolveImageUrl(u)} alt="Rescue photo" loading="lazy" />
                ))}
              </div>
            ) : (
              <p className="fk-empty-photos">Field photos appear when your rescue team uploads them.</p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
