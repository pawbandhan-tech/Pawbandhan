'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SiteLogo from '@/components/SiteLogo';
import SupportWidget from '@/components/SupportWidget';

function adminFetch(url, opts = {}) {
  if (typeof window === 'undefined') return Promise.resolve({ ok: false, json: () => ({}) });
  const token = sessionStorage.getItem('pb_admin_token');
  return fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
  });
}

export default function AdminPortalClient() {
  const router = useRouter();
  const [tab, setTab] = useState('dashboard');
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState({ rescues: 0, ngos: 0, doctors: 0, riders: 0 });
  const [cases, setCases] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [stories, setStories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [siteConfig, setSiteConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNgo, setEditingNgo] = useState(null);
  const [editingStory, setEditingStory] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [editingCase, setEditingCase] = useState(null);
  const [showCaseModal, setShowCaseModal] = useState(false);

  // Support agent management state
  const [supportAgents, setSupportAgents] = useState([]);
  const [editingAgent, setEditingAgent] = useState(null);
  const [showAgentForm, setShowAgentForm] = useState(false);

  // KYC Review state
  const [kycSubmissions, setKycSubmissions] = useState([]);
  const [reviewingKyc, setReviewingKyc] = useState(null);
  const [kycActionReason, setKycActionReason] = useState('');

  // Onboarding state
  const [onboardingEntities, setOnboardingEntities] = useState([]);
  const [selectedOnboarding, setSelectedOnboarding] = useState(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  // Entity detail & password reset state
  const [viewingEntity, setViewingEntity] = useState(null);
  const [entityDetailTab, setEntityDetailTab] = useState('overview');
  const [resetPasswordModal, setResetPasswordModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  // Commission config state
  const [commissionConfig, setCommissionConfig] = useState({ percentage: 15, minAmount: 0, maxAmount: 999999, description: '' });
  const [commissionSaving, setCommissionSaving] = useState(false);

  // CMS state
  const [cmsTab, setCmsTab] = useState('news');
  const [cmsData, setCmsData] = useState({});
  const [editingCmsItem, setEditingCmsItem] = useState(null);
  const [showCmsModal, setShowCmsModal] = useState(false);

  // Team state
  const [teamMembers, setTeamMembers] = useState([]);
  const [editingMember, setEditingMember] = useState(null);
  const [showCreateMember, setShowCreateMember] = useState(false);

  // Account creation modals
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateNgo, setShowCreateNgo] = useState(false);
  const [showCreateDoctor, setShowCreateDoctor] = useState(false);
  const [showCreateRider, setShowCreateRider] = useState(false);

  // Logo preview
  const [logoPreview, setLogoPreview] = useState('');

  // Role-based permission checks
  const [adminRole, setAdminRole] = useState('admin');
  useEffect(() => { if (typeof window !== 'undefined') setAdminRole(admin?.role || sessionStorage.getItem('pb_admin_role') || 'admin'); }, [admin]);
  const isViewer = adminRole === 'viewer';
  const isStaff = adminRole === 'staff';
  const isRestricted = isViewer || isStaff;
  const canCreate = adminRole === 'admin' || adminRole === 'co-admin';
  const canDelete = adminRole === 'admin';
  const canEditSettings = adminRole === 'admin';

  function checkPermission(permission) {
    const PERMS = {
      admin: ['*'],
      'co-admin': ['users.view', 'users.create', 'users.edit', 'cases.view', 'cases.edit', 'ngos.view', 'ngos.edit', 'kyc.view', 'kyc.review', 'cms.edit', 'stories.edit', 'reviews.edit', 'settings.view'],
      staff: ['cases.view', 'cases.edit', 'ngos.view', 'kyc.view', 'kyc.review', 'stories.view', 'reviews.view'],
      viewer: ['cases.view', 'ngos.view'],
    };
    const perms = PERMS[adminRole] || [];
    if (perms.includes('*')) return true;
    return perms.includes(permission);
  }

  function showPermDenied() { showToast('Insufficient permissions for this action', 'error'); }

  useEffect(() => {
    const token = sessionStorage.getItem('pb_admin_token');
    if (!token) { router.push('/admin/login'); return; }
    fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setAdmin(d.admin); sessionStorage.setItem('pb_admin_role', d.admin.role || 'admin'); })
      .catch(() => { sessionStorage.removeItem('pb_admin_token'); router.push('/admin/login'); });
  }, [router]);

  const loadTab = useCallback(async (t) => {
    setLoading(true);
    try {
      if (t === 'dashboard') {
        const [s, c] = await Promise.all([fetch('/api/stats').then(r => r.json()), adminFetch('/api/admin/cases').then(r => r.json())]);
        setStats(s); setCases(Array.isArray(c) ? c : []);
      } else if (t === 'cases') {
        const c = await adminFetch('/api/admin/cases').then(r => r.json());
        setCases(Array.isArray(c) ? c : []);
      } else if (t === 'accounts') {
        const a = await adminFetch('/api/admin/all-accounts').then(r => r.json());
        setAccounts(Array.isArray(a) ? a : []);
      } else if (t === 'ngos') {
        const n = await adminFetch('/api/admin/verified-ngos').then(r => r.json());
        setNgos(Array.isArray(n) ? n : []);
      } else if (t === 'kyc') {
        const k = await adminFetch('/api/admin/kyc-review').then(r => r.json());
        setKycSubmissions(Array.isArray(k.submissions) ? k.submissions : []);
      } else if (t === 'onboarding') {
        await loadOnboardingEntities();
      } else if (t === 'stories') {
        const [st, sc] = await Promise.all([adminFetch('/api/admin/stories').then(r => r.json()), adminFetch('/api/admin/site-config').then(r => r.json())]);
        setStories(Array.isArray(st) ? st : []); setSiteConfig(sc || {});
      } else if (t === 'reviews') {
        const [rv, sc] = await Promise.all([adminFetch('/api/admin/reviews').then(r => r.json()), adminFetch('/api/admin/site-config').then(r => r.json())]);
        setReviews(Array.isArray(rv) ? rv : []); setSiteConfig(sc || {});
      } else if (t === 'team') {
        const tm = await adminFetch('/api/admin/team').then(r => r.json());
        setTeamMembers(Array.isArray(tm) ? tm : []);
      } else if (t === 'cms') {
        const cms = await adminFetch('/api/admin/cms').then(r => r.json());
        setCmsData(cms || {});
      } else if (t === 'support') {
        const sRes = await adminFetch('/api/admin/support').then(r => r.json());
        setSupportAgents(Array.isArray(sRes.agents) ? sRes.agents : []);
      } else if (t === 'entity-detail') {
        if (viewingEntity) {
          const detail = await adminFetch(`/api/admin/entity-detail?type=${viewingEntity._type}&id=${viewingEntity.id}`).then(r => r.json());
          setViewingEntity(prev => ({ ...prev, ...detail }));
        }
      } else if (t === 'settings') {
        const [sc, cc] = await Promise.all([
          adminFetch('/api/admin/site-config').then(r => r.json()),
          adminFetch('/api/admin/commission').then(r => r.ok ? r.json() : { percentage: 15, minAmount: 0, maxAmount: 999999, description: '' }),
        ]);
        setSiteConfig(sc || {});
        setCommissionConfig(cc || { percentage: 15, minAmount: 0, maxAmount: 999999, description: '' });
        if (sc && sc.logo_url) setLogoPreview(sc.logo_url);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { if (admin) loadTab(tab); }, [admin, tab, loadTab]);

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  function logout() { sessionStorage.removeItem('pb_admin_token'); sessionStorage.removeItem('pb_admin_profile'); router.push('/admin/login'); }

  const tabs = [
    { key: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
    { key: 'cases', icon: 'fa-folder-open', label: 'Cases' },
    { key: 'accounts', icon: 'fa-users', label: 'All Accounts' },
    { key: 'ngos', icon: 'fa-building', label: 'NGOs' },
    { key: 'kyc', icon: 'fa-id-card', label: 'KYC Review' },
    { key: 'onboarding', icon: 'fa-user-check', label: 'Onboarding' },
    { key: 'stories', icon: 'fa-book-open', label: 'Stories' },
    { key: 'reviews', icon: 'fa-star', label: 'Reviews' },
    { key: 'team', icon: 'fa-people-group', label: 'Team' },
    { key: 'cms', icon: 'fa-newspaper', label: 'CMS' },
    { key: 'support', icon: 'fa-headset', label: 'Support' },
    { key: 'settings', icon: 'fa-gear', label: 'Site Config' },
  ];

  const filteredAccounts = accounts.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (a._label || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q) || (a._type || '').toLowerCase().includes(q);
  });

  const typeColors = { customer: 'badge-green', ngo: 'badge-teal', doctor: 'badge-blue', rider: 'badge-orange', representative: 'badge-gold' };

  async function saveSiteConfig(e) {
    e.preventDefault();
    if (!canEditSettings) { showPermDenied(); return; }
    const form = new FormData(e.target);
    const data = {};
    form.forEach((v, k) => { if (v) data[k] = v; });
    const res = await adminFetch('/api/admin/site-config', { method: 'POST', body: JSON.stringify(data) });
    if (res.ok) { showToast('Site config saved'); loadTab('settings'); }
    else showToast('Failed to save', 'error');
  }

  async function saveCommissionConfig(e) {
    e.preventDefault();
    if (!canEditSettings) { showPermDenied(); return; }
    setCommissionSaving(true);
    try {
      const res = await adminFetch('/api/admin/commission', {
        method: 'POST',
        body: JSON.stringify({
          percentage: parseFloat(commissionConfig.percentage) || 15,
          minAmount: parseFloat(commissionConfig.minAmount) || 0,
          maxAmount: parseFloat(commissionConfig.maxAmount) || 999999,
          description: commissionConfig.description || '',
        }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast('Commission config saved');
        setCommissionConfig(json.config || commissionConfig);
      } else {
        showToast(json.error || 'Failed to save', 'error');
      }
    } catch {
      showToast('Failed to save commission config', 'error');
    }
    setCommissionSaving(false);
  }

  async function saveStory(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    if (editingStory?.id) data.id = editingStory.id;
    const method = editingStory?.id ? 'PUT' : 'POST';
    const res = await adminFetch('/api/admin/stories', { method, body: JSON.stringify(data) });
    if (res.ok) { showToast('Story saved'); setEditingStory(null); loadTab('stories'); }
    else showToast('Failed to save', 'error');
  }

  async function saveReview(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    if (data.rating) data.rating = parseInt(data.rating);
    if (data.isFeatured) data.isFeatured = data.isFeatured === 'true';
    if (editingReview?.id) data.id = editingReview.id;
    const method = editingReview?.id ? 'PUT' : 'POST';
    const res = await adminFetch('/api/admin/reviews', { method, body: JSON.stringify(data) });
    if (res.ok) { showToast('Review saved'); setEditingReview(null); loadTab('reviews'); }
    else showToast('Failed to save', 'error');
  }

  async function saveNgoEdit(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    data.id = editingNgo.id;
    const res = await adminFetch('/api/admin/update-ngo', { method: 'POST', body: JSON.stringify(data) });
    if (res.ok) { showToast('NGO updated'); setEditingNgo(null); loadTab('ngos'); }
    else showToast('Failed to update', 'error');
  }

  async function toggleUserStatus(user) {
    if (!canCreate) { showPermDenied(); return; }
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const res = await adminFetch('/api/admin/update-user', { method: 'POST', body: JSON.stringify({ id: user.id, status: newStatus }) });
    if (res.ok) { showToast(`User ${newStatus === 'active' ? 'activated' : 'suspended'}`); loadTab('accounts'); }
    else showToast('Failed to update user', 'error');
  }

  async function createUser(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    const res = await adminFetch('/api/admin/create-user', { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok) { showToast('User created'); setShowCreateUser(false); loadTab('accounts'); }
    else showToast(json.error || 'Failed to create user', 'error');
  }

  async function createNgo(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    const res = await adminFetch('/api/admin/create-ngo', { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok) { showToast('NGO created'); setShowCreateNgo(false); loadTab('ngos'); }
    else showToast(json.error || 'Failed to create NGO', 'error');
  }

  async function createDoctor(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    const res = await adminFetch('/api/admin/create-doctor', { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok) { showToast('Doctor created'); setShowCreateDoctor(false); loadTab('accounts'); }
    else showToast(json.error || 'Failed to create doctor', 'error');
  }

  async function createRider(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    if (data.ngoId) data.ngoId = parseInt(data.ngoId, 10);
    else delete data.ngoId;
    const res = await adminFetch('/api/admin/create-rider', { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok) { showToast('Rider created'); setShowCreateRider(false); loadTab('accounts'); }
    else showToast(json.error || 'Failed to create rider', 'error');
  }

  function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pw = '';
    for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    return pw;
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!resetPasswordModal) return;
    setResetPasswordLoading(true);
    try {
      const res = await adminFetch('/api/admin/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          entityType: resetPasswordModal._type,
          entityId: resetPasswordModal.id,
          newPassword,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast('Password reset successfully');
        setResetPasswordModal(null);
        setNewPassword('');
      } else {
        showToast(json.error || 'Failed to reset password', 'error');
      }
    } catch {
      showToast('Failed to reset password', 'error');
    }
    setResetPasswordLoading(false);
  }

  function openViewEntity(account) {
    setViewingEntity({ ...account, _type: account._type, cases: [], activityLogs: [], user: null, treatmentPhotos: [], treatmentReports: [] });
    setEntityDetailTab('overview');
    setTab('entity-detail');
    setLoading(true);
  }

  // Download functions
  async function downloadExcel(type) {
    try {
      const { exportToExcel, casesToRows, accountsToRows } = await import('@/lib/excel-generator');
      if (type === 'cases') {
        exportToExcel(casesToRows(cases), 'PawBandhan_Cases', 'Cases');
      } else if (type === 'accounts') {
        exportToExcel(accountsToRows(accounts), 'PawBandhan_Accounts', 'Accounts');
      }
      showToast('Excel file downloaded');
    } catch (err) {
      console.error(err);
      showToast('Failed to export Excel', 'error');
    }
  }

  async function downloadPdf(type) {
    try {
      const { generateEntityReportPDF } = await import('@/lib/pdf-generator');
      if (type === 'cases') {
        const doc = generateEntityReportPDF(cases, 'Cases Report', ['incidentCode', 'animalType', 'status', 'workflowStatus', 'createdAt']);
        doc.save('PawBandhan_Cases.pdf');
      } else if (type === 'accounts') {
        const doc = generateEntityReportPDF(accounts, 'Accounts Report', ['_label', 'email', '_type', 'status']);
        doc.save('PawBandhan_Accounts.pdf');
      }
      showToast('PDF file downloaded');
    } catch (err) {
      console.error(err);
      showToast('Failed to export PDF', 'error');
    }
  }

  async function downloadEntityPdf(entity) {
    try {
      const { generateEntityReportPDF } = await import('@/lib/pdf-generator');
      const doc = generateEntityReportPDF([entity], `${entity._label || entity.name || 'Entity'} Report`, ['_label', 'email', '_type', 'status', 'phone', 'createdAt']);
      doc.save(`PawBandhan_${entity._type || 'entity'}_${entity.id}.pdf`);
      showToast('Entity report downloaded');
    } catch (err) {
      console.error(err);
      showToast('Failed to export PDF', 'error');
    }
  }

  // Admin SSO - Open entity portal
  async function openPortalSSO(portalType, entityUid) {
    try {
      const res = await adminFetch('/api/admin/portal-sso', {
        method: 'POST',
        body: JSON.stringify({ portalType, entityUid }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('pb_portal_token', data.portalToken);
        window.open(data.redirectUrl, '_blank');
        showToast(`Opened ${portalType} portal`);
      } else {
        showToast(data.error || 'SSO failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Portal SSO failed', 'error');
    }
  }

  // KYC Review functions
  async function handleKycAction(entity, action) {
    if ((action === 'reject' || action === 'request_reupload') && !kycActionReason.trim()) {
      showToast('Reason is required', 'error');
      return;
    }
    const res = await adminFetch('/api/admin/kyc-review', {
      method: 'POST',
      body: JSON.stringify({
        entityType: entity.entityType,
        entityId: entity.id,
        action,
        rejectionReason: kycActionReason || undefined,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast(action === 'approve' ? 'KYC approved' : action === 'reject' ? 'KYC rejected' : 'Reupload requested');
      setReviewingKyc(null);
      setKycActionReason('');
      loadTab('kyc');
    } else {
      showToast(json.error || 'Action failed', 'error');
    }
  }

  // Onboarding functions
  async function loadOnboardingEntities() {
    setOnboardingLoading(true);
    try {
      const aRes = await adminFetch('/api/admin/all-accounts').then(r => r.json());
      const allAccounts = Array.isArray(aRes) ? aRes : [];
      const needsOnboarding = allAccounts.filter(a =>
        a._type === 'ngo' || a._type === 'doctor' || a._type === 'rider' || a._type === 'representative'
      );
      const results = await Promise.all(
        needsOnboarding.slice(0, 50).map(a =>
          adminFetch(`/api/admin/onboarding?entityType=${a._type}&entityId=${a.id}`)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        )
      );
      setOnboardingEntities(results.filter(Boolean));
    } catch (e) { console.error(e); }
    setOnboardingLoading(false);
  }

  async function handleOnboardingAction(entity, action) {
    const res = await adminFetch('/api/admin/onboarding', {
      method: 'POST',
      body: JSON.stringify({ entityType: entity.entityType, entityId: entity.entityId, action }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast(action === 'initiate_agreement' ? 'Agreement initiated' : action === 'sign_agreement' ? 'Agreement signed' : 'Onboarding completed');
      setSelectedOnboarding(null);
      loadTab('onboarding');
    } else {
      showToast(json.error || 'Action failed', 'error');
    }
  }

  // CMS functions
  async function saveCmsCollectionItem(collectionKey, itemData, itemId) {
    if (!checkPermission('cms.edit')) { showPermDenied(); return; }
    const action = itemId ? 'update' : 'create';
    const res = await adminFetch('/api/admin/cms', {
      method: 'POST',
      body: JSON.stringify({ action, id: itemId, data: { ...itemData, collectionKey } }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast('Item saved');
      setShowCmsModal(false);
      setEditingCmsItem(null);
      loadTab('cms');
    } else {
      showToast(json.error || 'Failed to save', 'error');
    }
  }

  async function deleteCmsItem(collectionKey, itemId) {
    if (!confirm('Delete this item?')) return;
    const res = await adminFetch('/api/admin/cms', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', id: itemId, collectionKey }),
    });
    if (res.ok) { showToast('Item deleted'); loadTab('cms'); }
    else showToast('Failed to delete', 'error');
  }

  async function saveCmsSetting(key, value) {
    const res = await adminFetch('/api/admin/cms', {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    });
    if (res.ok) { showToast('Setting saved'); loadTab('cms'); }
    else showToast('Failed to save', 'error');
  }

  function handleLogoFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please select an image file', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target.result);
      setSiteConfig(prev => ({ ...prev, logo_url: ev.target.result }));
    };
    reader.readAsDataURL(file);
  }

  function getCmsItems(key) {
    const val = cmsData[key];
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') { try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; } }
    return [];
  }

  function openCmsCreateModal(collectionKey) {
    setEditingCmsItem({ collectionKey, isNew: true });
    setShowCmsModal(true);
  }

  function openCmsEditModal(collectionKey, item) {
    setEditingCmsItem({ collectionKey, ...item, isNew: false });
    setShowCmsModal(true);
  }

  async function saveCmsModalItem(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    if (data.isActive !== undefined) data.isActive = data.isActive === 'true' || data.isActive === true;
    if (data.sortOrder) data.sortOrder = parseInt(data.sortOrder, 10);
    if (data.priority) data.priority = data.priority;
    if (editingCmsItem.isNew) {
      await saveCmsCollectionItem(editingCmsItem.collectionKey, data);
    } else {
      await saveCmsCollectionItem(editingCmsItem.collectionKey, data, editingCmsItem.id);
    }
  }

  if (!admin) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--color-pb-primary)' }}></i></div>;

  return (
    <div className="portal-layout">
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}><i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>{toast.msg}</div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordModal && (
        <div className="modal-overlay" onClick={() => { setResetPasswordModal(null); setNewPassword(''); }}>
          <div className="modal-content modal-sm" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>Reset Password</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => { setResetPasswordModal(null); setNewPassword(''); }}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Account</div>
                <div style={{ fontWeight: 700 }}>{resetPasswordModal._label || resetPasswordModal.name || resetPasswordModal.email}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>{resetPasswordModal.email} · <span className={`badge ${typeColors[resetPasswordModal._type] || 'badge-green'}`} style={{ fontSize: '0.68rem' }}>{resetPasswordModal._type}</span></div>
              </div>
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="pb-label">New Password</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="pb-input" type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ flex: 1 }} />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNewPassword(generateRandomPassword())} title="Generate random password">
                      <i className="fas fa-dice"></i>
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={resetPasswordLoading || !newPassword}>
                  {resetPasswordLoading ? <><i className="fas fa-spinner fa-spin"></i> Resetting…</> : <><i className="fas fa-key"></i> Reset Password</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="portal-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '0 4px' }}>
          <SiteLogo size={36} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem' }}>PawBandhan</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-pb-text-muted)' }}>Admin Portal</div>
          </div>
        </div>

        {tabs.filter(t => {
          if (isViewer) return ['dashboard', 'cases', 'ngos'].includes(t.key);
          if (isStaff) return !['settings'].includes(t.key);
          return true;
        }).map(t => (
          <button key={t.key} className={`sidebar-nav-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <i className={`fas ${t.icon}`} style={{ width: 20, textAlign: 'center' }}></i> {t.label}
          </button>
        ))}

        <div style={{ flex: 1 }}></div>
        <div style={{ padding: '12px 4px', borderTop: '1px solid var(--color-pb-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>{admin.email}</span>
          </div>
          <div style={{ marginBottom: 6 }}>
            <span className={`badge ${adminRole === 'admin' ? 'badge-green' : adminRole === 'co-admin' ? 'badge-blue' : adminRole === 'staff' ? 'badge-gold' : 'badge-orange'}`} style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>
              {adminRole}
            </span>
          </div>
          <button className="sidebar-nav-item" onClick={logout} style={{ color: 'var(--color-pb-danger)' }}>
            <i className="fas fa-right-from-bracket" style={{ width: 20, textAlign: 'center' }}></i> Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="portal-main">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', margin: 0 }}>
            {tabs.find(t => t.key === tab)?.label || 'Dashboard'}
          </h1>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--color-pb-primary)' }}></i></div>
        ) : (
          <>
            {/* DASHBOARD TAB */}
            {tab === 'dashboard' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                  {[
                    { label: 'Total Rescues', value: stats.rescues, icon: 'fa-heart', color: 'var(--color-pb-primary)' },
                    { label: 'Active NGOs', value: stats.ngos, icon: 'fa-building', color: 'var(--color-pb-ngo)' },
                    { label: 'Vet Doctors', value: stats.doctors, icon: 'fa-stethoscope', color: 'var(--color-pb-doctor)' },
                    { label: 'Field Rescuers', value: stats.riders, icon: 'fa-motorcycle', color: 'var(--color-pb-rep)' },
                  ].map((s, i) => (
                    <div key={i} className="glass" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className={`fas ${s.icon}`}></i>
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem' }}>{s.value.toLocaleString()}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>{s.label}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="glass" style={{ padding: 24 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 16px' }}>Recent Cases</h3>
                  {cases.length === 0 ? <p style={{ color: 'var(--color-pb-text-muted)', fontSize: '0.88rem' }}>No cases yet.</p> : (
                    <table className="pb-table">
                      <thead><tr><th>Code</th><th>Animal</th><th>Status</th><th>Created</th></tr></thead>
                      <tbody>
                        {cases.slice(0, 10).map(c => (
                          <tr key={c.id}>
                            <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.incidentCode || `#${c.id}`}</td>
                            <td>{c.animalType || '—'}</td>
                            <td><span className="badge badge-green">{c.status || c.workflowStatus || 'open'}</span></td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--color-pb-text-muted)' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* CASES TAB */}
            {tab === 'cases' && (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => downloadExcel('cases')}>
                    <i className="fas fa-file-excel"></i> Export Cases (Excel)
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => downloadPdf('cases')}>
                    <i className="fas fa-file-pdf"></i> Export Cases (PDF)
                  </button>
                </div>
                <div className="glass" style={{ padding: 24 }}>
                  {cases.length === 0 ? <p style={{ color: 'var(--color-pb-text-muted)' }}>No cases found.</p> : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="pb-table">
                        <thead><tr><th>Code</th><th>Animal</th><th>NGO</th><th>Doctor</th><th>Status</th><th>Workflow</th><th>Payment</th><th>Created</th><th>Actions</th></tr></thead>
                        <tbody>
                          {cases.map(c => (
                            <tr key={c.id}>
                              <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.incidentCode || `#${c.id}`}</td>
                              <td>{c.animalType || '—'}</td>
                              <td style={{ fontSize: '0.85rem' }}>{c.ngoName || '—'}</td>
                              <td style={{ fontSize: '0.85rem' }}>{c.doctorName || '—'}</td>
                              <td><span className="badge badge-green">{c.status || 'open'}</span></td>
                              <td><span className="badge badge-gold">{c.workflowStatus || '—'}</span></td>
                              <td><span className={`badge ${c.paymentStatus === 'paid' ? 'badge-green' : c.paymentStatus === 'pending' ? 'badge-gold' : 'badge-red'}`}>{c.paymentStatus || '—'}</span></td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--color-pb-text-muted)' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                              <td><button className="btn btn-secondary btn-sm" onClick={() => {
                                setEditingCase(c);
                                setShowCaseModal(true);
                              }}><i className="fas fa-pen"></i> Edit</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Case Edit Modal */}
            {showCaseModal && editingCase && (
              <div className="modal-overlay" onClick={() => { setShowCaseModal(false); setEditingCase(null); }}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 750, maxHeight: '90vh' }}>
                  <div className="modal-header">
                    <h3>Manage Case: {editingCase.incidentCode || `#${editingCase.id}`}</h3>
                    <button className="btn btn-ghost btn-icon" onClick={() => { setShowCaseModal(false); setEditingCase(null); }}><i className="fas fa-xmark"></i></button>
                  </div>
                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>
                    <form id="case-edit-form" onSubmit={async (e) => {
                      e.preventDefault();
                      const form = new FormData(e.target);
                      const data = Object.fromEntries(form);
                      data.id = editingCase.id;
                      ['ngoId','doctorId','repId'].forEach(f => { if (data[f] !== undefined) data[f] = parseInt(data[f]) || null; });
                      ['estimatedCost','finalCost','commissionPct'].forEach(f => { if (data[f] !== undefined) data[f] = parseFloat(data[f]) || 0; });
                      ['latitude','longitude','releaseLat','releaseLng','pickupLat','pickupLng','dropLat','dropLng'].forEach(f => { if (data[f] !== undefined) data[f] = parseFloat(data[f]) || null; });

                      const res = await adminFetch('/api/admin/update-case', { method: 'POST', body: JSON.stringify(data) });
                      const json = await res.json();
                      if (json.success) {
                        showToast('Case updated successfully');
                        if (json.handoverPin) showToast(`PIN: ${json.handoverPin}`, 'info');
                        setShowCaseModal(false);
                        setEditingCase(null);
                        loadTab('cases');
                      } else {
                        showToast(json.error || 'Failed to update', 'error');
                      }
                    }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="pb-label">Animal Type</label>
                          <select className="pb-select" name="animalType" defaultValue={editingCase.animalType || ''}>
                            <option value="">— Select —</option>
                            <option value="dog">Dog</option><option value="cat">Cat</option>
                            <option value="cow">Cow</option><option value="buffalo">Buffalo</option>
                            <option value="horse">Horse</option><option value="goat">Goat</option>
                            <option value="sheep">Sheep</option><option value="rabbit">Rabbit</option>
                            <option value="bird">Bird</option><option value="pig">Pig</option>
                            <option value="donkey">Donkey</option><option value="monkey">Monkey</option>
                            <option value="snake">Snake</option><option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="pb-label">Injury Type</label>
                          <select className="pb-select" name="injuryType" defaultValue={editingCase.injuryType || ''}>
                            <option value="">— Select —</option>
                            <option value="injured">Injured</option>
                            <option value="sick">Sick</option>
                            <option value="stuck">Stuck/Trapped</option>
                            <option value="abandoned">Abandoned</option>
                            <option value="accident">Accident</option>
                            <option value="stray">Stray</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="pb-label">Status</label>
                          <select className="pb-select" name="status" defaultValue={editingCase.status || 'open'}>
                            <option value="open">Open</option><option value="in_progress">In Progress</option>
                            <option value="on_hold">On Hold</option><option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                        <div>
                          <label className="pb-label">Workflow Stage</label>
                          <select className="pb-select" name="workflowStatus" defaultValue={editingCase.workflowStatus || 'reported'}>
                            <option value="reported">Reported</option>
                            <option value="ngo_assigned">NGO Assigned</option>
                            <option value="ngo_accepted">NGO Accepted</option>
                            <option value="rider_dispatched">Rider Dispatched</option>
                            <option value="rider_picking">En Route to Animal</option>
                            <option value="animal_picked">Animal Picked Up</option>
                            <option value="en_route_vet">En Route to Vet</option>
                            <option value="at_vet">At Vet Clinic</option>
                            <option value="pre_treatment">Pre-Treatment</option>
                            <option value="in_treatment">Under Treatment</option>
                            <option value="post_treatment">Treatment Complete</option>
                            <option value="payment_pending">Awaiting Payment</option>
                            <option value="ready_for_drop">Ready for Drop</option>
                            <option value="rider_dropping">En Route to Drop</option>
                            <option value="delivered">Delivered Safe</option>
                            <option value="closed">Case Closed</option>
                          </select>
                        </div>
                        <div>
                          <label className="pb-label">Payment Status</label>
                          <select className="pb-select" name="paymentStatus" defaultValue={editingCase.paymentStatus || 'pending'}>
                            <option value="pending">Pending</option>
                            <option value="community_listed">Community Listed</option>
                            <option value="partially_paid">Partially Paid</option>
                            <option value="paid">Paid</option>
                            <option value="refunded">Refunded</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="pb-label">Description</label>
                        <textarea className="pb-textarea" name="description" defaultValue={editingCase.description || ''} rows={2} />
                      </div>

                      <div>
                        <label className="pb-label">Notes / Admin Remarks</label>
                        <textarea className="pb-textarea" name="notes" defaultValue={editingCase.notes || ''} rows={2} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="pb-label">Estimated Cost (₹)</label>
                          <input className="pb-input" name="estimatedCost" type="number" defaultValue={editingCase.estimatedCost || ''} />
                        </div>
                        <div>
                          <label className="pb-label">Final Cost (₹)</label>
                          <input className="pb-input" name="finalCost" type="number" defaultValue={editingCase.finalCost || ''} />
                        </div>
                        <div>
                          <label className="pb-label">Commission (%)</label>
                          <input className="pb-input" name="commissionPct" type="number" step="0.5" defaultValue={editingCase.commissionPct || 15} />
                        </div>
                        <div>
                          <label className="pb-label">Payment Method</label>
                          <select className="pb-select" name="paymentMethod" defaultValue={editingCase.paymentMethod || ''}>
                            <option value="">— Select —</option>
                            <option value="direct">Direct</option>
                            <option value="community">Community</option>
                            <option value="partial">Partial</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="pb-label">NGO ID</label>
                          <input className="pb-input" name="ngoId" type="number" defaultValue={editingCase.ngoId || ''} />
                        </div>
                        <div>
                          <label className="pb-label">Doctor ID</label>
                          <input className="pb-input" name="doctorId" type="number" defaultValue={editingCase.doctorId || ''} />
                        </div>
                        <div>
                          <label className="pb-label">Rider/Rep ID</label>
                          <input className="pb-input" name="repId" type="number" defaultValue={editingCase.repId || ''} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label className="pb-label">Resolution Type</label><input className="pb-input" name="resolutionType" defaultValue={editingCase.resolutionType || ''} /></div>
                        <div><label className="pb-label">Dog Tag ID</label><input className="pb-input" name="dogTagId" defaultValue={editingCase.dogTagId || ''} /></div>
                        <div><label className="pb-label">Handover PIN</label><input className="pb-input" name="handoverPin" defaultValue={editingCase.handoverPin || ''} placeholder="Leave empty to auto-generate" /></div>
                        <div><label className="pb-label">Release Address</label><input className="pb-input" name="releaseAddress" defaultValue={editingCase.releaseAddress || ''} /></div>
                      </div>

                      <div>
                        <label className="pb-label">Treatment Report</label>
                        <textarea className="pb-textarea" name="treatmentReport" defaultValue={editingCase.treatmentReport || ''} rows={2} />
                      </div>

                      <div>
                        <label className="pb-label">Location (Lat, Lng)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <input className="pb-input" name="latitude" placeholder="Latitude" defaultValue={editingCase.latitude || ''} />
                          <input className="pb-input" name="longitude" placeholder="Longitude" defaultValue={editingCase.longitude || ''} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="pb-label">Drop Location (Lat, Lng)</label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <input className="pb-input" name="dropLat" placeholder="Lat" defaultValue={editingCase.dropLat || ''} />
                            <input className="pb-input" name="dropLng" placeholder="Lng" defaultValue={editingCase.dropLng || ''} />
                          </div>
                        </div>
                        <div><label className="pb-label">Drop Address</label><input className="pb-input" name="dropAddress" defaultValue={editingCase.dropAddress || ''} /></div>
                      </div>

                      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--color-pb-border)' }}>
                        <button type="button" className="btn btn-ghost" onClick={() => { setShowCaseModal(false); setEditingCase(null); }}>Cancel</button>
                        <button type="submit" className="btn btn-primary"><i className="fas fa-save"></i> Save All Changes</button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* ALL ACCOUNTS TAB */}
            {tab === 'accounts' && (
              <div>
                <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => downloadExcel('accounts')}>
                    <i className="fas fa-file-excel"></i> Export Accounts (Excel)
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => downloadPdf('accounts')}>
                    <i className="fas fa-file-pdf"></i> Export Accounts (PDF)
                  </button>
                </div>
                <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input className="pb-input" placeholder="Search by name, email, or type..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ maxWidth: 400 }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)' }}>{filteredAccounts.length} accounts</span>
                  <div style={{ flex: 1 }}></div>
                  {canCreate && <button className="btn btn-primary" onClick={() => setShowCreateUser(true)}><i className="fas fa-plus"></i> Create User</button>}
                  {canCreate && <button className="btn btn-secondary" onClick={() => setShowCreateDoctor(true)}><i className="fas fa-user-md"></i> Create Doctor</button>}
                  {canCreate && <button className="btn btn-secondary" onClick={() => setShowCreateRider(true)}><i className="fas fa-motorcycle"></i> Create Rider</button>}
                </div>
                <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="pb-table">
                      <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                      <tbody>
                        {filteredAccounts.map((a, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{a._label}</td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--color-pb-text-secondary)' }}>{a.email || '—'}</td>
                            <td><span className={`badge ${typeColors[a._type] || 'badge-green'}`}>{a._type}</span></td>
                            <td><span className="badge badge-blue">{a.role || a._type}</span></td>
                            <td><span className={`badge ${a.status === 'active' ? 'badge-green' : a.status === 'pending' ? 'badge-gold' : 'badge-red'}`}>{a.status || '—'}</span></td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--color-pb-text-muted)' }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => openViewEntity(a)} title="View details">
                                  <i className="fas fa-eye"></i>
                                </button>
                                {canCreate && (a._type === 'doctor' || a._type === 'ngo' || a._type === 'rider' || a._type === 'representative' || a._type === 'customer') && (
                                  <button className="btn btn-ghost btn-sm" onClick={() => openPortalSSO(a._type === 'representative' ? 'rider' : a._type, a.id)} title={`Open in ${a._type} portal`}>
                                    <i className="fas fa-right-to-bracket"></i>
                                  </button>
                                )}
                                <button className="btn btn-ghost btn-sm" onClick={() => { setResetPasswordModal(a); setNewPassword(generateRandomPassword()); }} title="Reset password">
                                  <i className="fas fa-key"></i>
                                </button>
                                <button className={`btn btn-sm ${a.status === 'active' ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggleUserStatus(a)} title={a.status === 'active' ? 'Suspend' : 'Activate'}>
                                  <i className={`fas ${a.status === 'active' ? 'fa-ban' : 'fa-check'}`}></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Create User Modal */}
                {showCreateUser && (
                  <div className="modal-overlay" onClick={() => setShowCreateUser(false)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header"><h3>Create User</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowCreateUser(false)}><i className="fas fa-xmark"></i></button></div>
                      <div className="modal-body">
                        <form onSubmit={createUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div><label className="pb-label">Name</label><input className="pb-input" name="name" required /></div>
                          <div><label className="pb-label">Email</label><input className="pb-input" name="email" type="email" required /></div>
                          <div><label className="pb-label">Phone</label><input className="pb-input" name="phone" required /></div>
                          <div><label className="pb-label">Password</label><input className="pb-input" name="password" type="password" required /></div>
                          <div><label className="pb-label">Role</label>
                            <select className="pb-select" name="role" required>
                              <option value="">Select role…</option>
                              <option value="admin">Admin</option>
                              <option value="staff">Staff</option>
                              <option value="co-admin">Co-Admin</option>
                              <option value="customer">Customer</option>
                            </select>
                          </div>
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-plus"></i> Create User</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                {/* Create Doctor Modal */}
                {showCreateDoctor && (
                  <div className="modal-overlay" onClick={() => setShowCreateDoctor(false)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header"><h3>Create Doctor</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowCreateDoctor(false)}><i className="fas fa-xmark"></i></button></div>
                      <div className="modal-body">
                        <form onSubmit={createDoctor} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div><label className="pb-label">Name</label><input className="pb-input" name="name" required /></div>
                          <div><label className="pb-label">Email</label><input className="pb-input" name="email" type="email" required /></div>
                          <div><label className="pb-label">Phone</label><input className="pb-input" name="phone" required /></div>
                          <div><label className="pb-label">Specialization</label><input className="pb-input" name="specialization" /></div>
                          <div><label className="pb-label">License Number</label><input className="pb-input" name="licenseNumber" /></div>
                          <div><label className="pb-label">Hospital Name</label><input className="pb-input" name="hospitalName" /></div>
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-plus"></i> Create Doctor</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                {/* Create Rider Modal */}
                {showCreateRider && (
                  <div className="modal-overlay" onClick={() => setShowCreateRider(false)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header"><h3>Create Rider</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowCreateRider(false)}><i className="fas fa-xmark"></i></button></div>
                      <div className="modal-body">
                        <form onSubmit={createRider} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div><label className="pb-label">Name</label><input className="pb-input" name="name" required /></div>
                          <div><label className="pb-label">Email</label><input className="pb-input" name="email" type="email" required /></div>
                          <div><label className="pb-label">Phone</label><input className="pb-input" name="phone" required /></div>
                          <div><label className="pb-label">Vehicle Type</label><input className="pb-input" name="vehicleType" /></div>
                          <div><label className="pb-label">Vehicle Number</label><input className="pb-input" name="vehicleNumber" /></div>
                          <div><label className="pb-label">License Number</label><input className="pb-input" name="licenseNumber" /></div>
                          <div><label className="pb-label">NGO ID (optional)</label><input className="pb-input" name="ngoId" type="number" /></div>
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-plus"></i> Create Rider</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* NGOS TAB */}
            {tab === 'ngos' && (
              <div>
                {editingNgo && (
                  <div className="modal-overlay" onClick={() => setEditingNgo(null)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header"><h3>Edit NGO</h3><button className="btn btn-ghost btn-icon" onClick={() => setEditingNgo(null)}><i className="fas fa-xmark"></i></button></div>
                      <div className="modal-body">
                        <form onSubmit={saveNgoEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {['name', 'email', 'phone', 'city', 'state', 'address', 'serviceArea', 'workType'].map(f => (
                            <div key={f}><label className="pb-label">{f.replace(/([A-Z])/g, ' $1')}</label><input className="pb-input" name={f} defaultValue={editingNgo[f] || ''} /></div>
                          ))}
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-check"></i> Save changes</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                {showCreateNgo && (
                  <div className="modal-overlay" onClick={() => setShowCreateNgo(false)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header"><h3>Create NGO</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowCreateNgo(false)}><i className="fas fa-xmark"></i></button></div>
                      <div className="modal-body">
                        <form onSubmit={createNgo} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div><label className="pb-label">Name</label><input className="pb-input" name="name" required /></div>
                          <div><label className="pb-label">Email</label><input className="pb-input" name="email" type="email" required /></div>
                          <div><label className="pb-label">Phone</label><input className="pb-input" name="phone" required /></div>
                          <div><label className="pb-label">NGO Type</label><input className="pb-input" name="ngoType" /></div>
                          <div><label className="pb-label">Registration Number</label><input className="pb-input" name="regNumber" /></div>
                          <div><label className="pb-label">PAN Number</label><input className="pb-input" name="panNumber" /></div>
                          <div><label className="pb-label">Address</label><input className="pb-input" name="address" /></div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div><label className="pb-label">City</label><input className="pb-input" name="city" /></div>
                            <div><label className="pb-label">State</label><input className="pb-input" name="state" /></div>
                          </div>
                          <div><label className="pb-label">Service Area</label><input className="pb-input" name="serviceArea" /></div>
                          <div><label className="pb-label">Work Type</label><input className="pb-input" name="workType" /></div>
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-plus"></i> Create NGO</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  {canCreate && <button className="btn btn-primary" onClick={() => setShowCreateNgo(true)}><i className="fas fa-plus"></i> Create NGO</button>}
                </div>
                <div className="glass" style={{ padding: 24 }}>
                  {ngos.length === 0 ? <p style={{ color: 'var(--color-pb-text-muted)' }}>No NGOs found.</p> : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="pb-table">
                        <thead><tr><th>Name</th><th>Email</th><th>PRN</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                          {ngos.map(n => (
                            <tr key={n.id}>
                              <td style={{ fontWeight: 600 }}>{n.name}</td>
                              <td style={{ fontSize: '0.85rem' }}>{n.email}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{n.prn || '—'}</td>
                              <td><span className={`badge ${n.status === 'active' ? 'badge-green' : n.status === 'suspended' ? 'badge-red' : 'badge-gold'}`}>{n.status}</span></td>
                              <td><button className="btn btn-secondary btn-sm" onClick={() => setEditingNgo(n)}><i className="fas fa-pen"></i> Edit</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* KYC REVIEW TAB */}
            {tab === 'kyc' && (
              <div>
                {reviewingKyc && (
                  <div className="modal-overlay" onClick={() => { setReviewingKyc(null); setKycActionReason(''); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
                      <div className="modal-header">
                        <h3>KYC Review — {reviewingKyc.name || reviewingKyc._label || 'Entity'}</h3>
                        <button className="btn btn-ghost btn-icon" onClick={() => { setReviewingKyc(null); setKycActionReason(''); }}><i className="fas fa-xmark"></i></button>
                      </div>
                      <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                          <div><label className="pb-label">Entity Name</label><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{reviewingKyc.name || '—'}</div></div>
                          <div><label className="pb-label">Type</label><div><span className={`badge ${typeColors[reviewingKyc.entityType] || 'badge-green'}`}>{reviewingKyc.entityLabel || reviewingKyc.entityType}</span></div></div>
                          <div><label className="pb-label">Email</label><div style={{ fontSize: '0.9rem' }}>{reviewingKyc.email || '—'}</div></div>
                          <div><label className="pb-label">Phone</label><div style={{ fontSize: '0.9rem' }}>{reviewingKyc.phone || '—'}</div></div>
                          <div><label className="pb-label">PRN / ID</label><div style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>{reviewingKyc.prn || reviewingKyc.riderId || '—'}</div></div>
                          <div><label className="pb-label">Status</label><div><span className={`badge ${reviewingKyc.status === 'active' ? 'badge-green' : reviewingKyc.status === 'pending' || reviewingKyc.status === 'kyc_submitted' ? 'badge-gold' : 'badge-red'}`}>{reviewingKyc.status}</span></div></div>
                          <div><label className="pb-label">Submitted</label><div style={{ fontSize: '0.85rem', color: 'var(--color-pb-text-muted)' }}>{reviewingKyc.createdAt ? new Date(reviewingKyc.createdAt).toLocaleString() : '—'}</div></div>
                        </div>

                        {reviewingKyc.entityType === 'doctor' && (
                          <div style={{ marginBottom: 20 }}>
                            <h4 style={{ fontWeight: 700, margin: '0 0 10px', fontSize: '0.95rem' }}>Doctor KYC Documents</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              {[
                                { label: 'VCI Registration', key: 'vciRegistration' },
                                { label: 'IVPR Entry', key: 'ivprEntry' },
                                { label: 'Degree Certificate', key: 'degreeCertificate' },
                                { label: 'PAN Card', key: 'pan' },
                                { label: 'Aadhaar Card', key: 'aadhaar' },
                                { label: 'GSTIN', key: 'gstin' },
                              ].map(doc => {
                                const kycData = reviewingKyc.kycData && typeof reviewingKyc.kycData === 'object' ? reviewingKyc.kycData : {};
                                const documents = kycData.documents || {};
                                const val = documents[doc.key] || kycData[doc.key];
                                return (
                                  <div key={doc.key} className="glass" style={{ padding: 10, fontSize: '0.82rem' }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{doc.label}</div>
                                    {val ? (
                                      typeof val === 'string' && val.startsWith('http') ? (
                                        <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-pb-primary)', wordBreak: 'break-all' }}>
                                          <i className="fas fa-external-link-alt"></i> View document
                                        </a>
                                      ) : (
                                        <span style={{ color: 'var(--color-pb-text-secondary)' }}>{String(val)}</span>
                                      )
                                    ) : (
                                      <span style={{ color: 'var(--color-pb-text-muted)' }}>Not provided</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {reviewingKyc.entityType === 'ngo' && (
                          <div style={{ marginBottom: 20 }}>
                            <h4 style={{ fontWeight: 700, margin: '0 0 10px', fontSize: '0.95rem' }}>NGO KYC Documents</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              {[
                                { label: 'Registration Certificate', key: 'registrationCert' },
                                { label: 'Trust Deed', key: 'trustDeed' },
                                { label: 'PAN Card', key: 'pan' },
                                { label: 'Address Proof', key: 'addressProof' },
                                { label: 'Committee Resolution', key: 'committeeResolution' },
                                { label: 'Trustee OVD', key: 'trusteeOvd' },
                                { label: 'Power of Attorney', key: 'poa' },
                              ].map(doc => {
                                const kycData = reviewingKyc.kycData && typeof reviewingKyc.kycData === 'object' ? reviewingKyc.kycData : {};
                                const documents = kycData.documents || {};
                                const val = documents[doc.key] || kycData[doc.key];
                                return (
                                  <div key={doc.key} className="glass" style={{ padding: 10, fontSize: '0.82rem' }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{doc.label}</div>
                                    {val ? (
                                      typeof val === 'string' && val.startsWith('http') ? (
                                        <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-pb-primary)', wordBreak: 'break-all' }}>
                                          <i className="fas fa-external-link-alt"></i> View document
                                        </a>
                                      ) : (
                                        <span style={{ color: 'var(--color-pb-text-secondary)' }}>{String(val)}</span>
                                      )
                                    ) : (
                                      <span style={{ color: 'var(--color-pb-text-muted)' }}>Not provided</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {reviewingKyc.entityType === 'rider' && (
                          <div style={{ marginBottom: 20 }}>
                            <h4 style={{ fontWeight: 700, margin: '0 0 10px', fontSize: '0.95rem' }}>Rider KYC Documents</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              {[
                                { label: 'Aadhaar Card', key: 'aadhaar' },
                                { label: 'PAN Card', key: 'pan' },
                                { label: 'Driving License', key: 'drivingLicense' },
                                { label: 'Vehicle RC', key: 'vehicleRc' },
                                { label: 'Insurance', key: 'insurance' },
                              ].map(doc => {
                                const kycData = reviewingKyc.kycData && typeof reviewingKyc.kycData === 'object' ? reviewingKyc.kycData : {};
                                const documents = kycData.documents || {};
                                const val = documents[doc.key] || kycData[doc.key];
                                return (
                                  <div key={doc.key} className="glass" style={{ padding: 10, fontSize: '0.82rem' }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{doc.label}</div>
                                    {val ? (
                                      typeof val === 'string' && val.startsWith('http') ? (
                                        <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-pb-primary)', wordBreak: 'break-all' }}>
                                          <i className="fas fa-external-link-alt"></i> View document
                                        </a>
                                      ) : (
                                        <span style={{ color: 'var(--color-pb-text-secondary)' }}>{String(val)}</span>
                                      )
                                    ) : (
                                      <span style={{ color: 'var(--color-pb-text-muted)' }}>Not provided</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {reviewingKyc.entityType === 'representative' && (
                          <div style={{ marginBottom: 20 }}>
                            <h4 style={{ fontWeight: 700, margin: '0 0 10px', fontSize: '0.95rem' }}>Representative KYC Documents</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              {[
                                { label: 'Aadhaar Card', key: 'aadhaar' },
                                { label: 'PAN Card', key: 'pan' },
                                { label: 'ID Proof', key: 'idProof' },
                                { label: 'Address Proof', key: 'addressProof' },
                              ].map(doc => {
                                const kycData = reviewingKyc.kycData && typeof reviewingKyc.kycData === 'object' ? reviewingKyc.kycData : {};
                                const documents = kycData.documents || {};
                                const val = documents[doc.key] || kycData[doc.key];
                                return (
                                  <div key={doc.key} className="glass" style={{ padding: 10, fontSize: '0.82rem' }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{doc.label}</div>
                                    {val ? (
                                      typeof val === 'string' && val.startsWith('http') ? (
                                        <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-pb-primary)', wordBreak: 'break-all' }}>
                                          <i className="fas fa-external-link-alt"></i> View document
                                        </a>
                                      ) : (
                                        <span style={{ color: 'var(--color-pb-text-secondary)' }}>{String(val)}</span>
                                      )
                                    ) : (
                                      <span style={{ color: 'var(--color-pb-text-muted)' }}>Not provided</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div style={{ marginBottom: 16 }}>
                          <label className="pb-label">Reason (required for Reject / Request Reupload)</label>
                          <textarea className="pb-textarea" placeholder="Enter reason if rejecting or requesting reupload…" value={kycActionReason} onChange={e => setKycActionReason(e.target.value)} rows={3} />
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                          <button className="btn" style={{ background: '#22c55e', color: '#fff', flex: 1 }} onClick={() => handleKycAction(reviewingKyc, 'approve')}>
                            <i className="fas fa-check"></i> Approve
                          </button>
                          <button className="btn" style={{ background: '#ef4444', color: '#fff', flex: 1 }} onClick={() => handleKycAction(reviewingKyc, 'reject')}>
                            <i className="fas fa-times"></i> Reject
                          </button>
                          <button className="btn" style={{ background: '#eab308', color: '#fff', flex: 1 }} onClick={() => handleKycAction(reviewingKyc, 'request_reupload')}>
                            <i className="fas fa-upload"></i> Request Reupload
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="glass" style={{ padding: 24 }}>
                  {kycSubmissions.length === 0 ? (
                    <p style={{ color: 'var(--color-pb-text-muted)' }}>No pending KYC submissions.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="pb-table">
                        <thead><tr><th>Entity Name</th><th>Type</th><th>PRN / ID</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>
                        <tbody>
                          {kycSubmissions.map((s, i) => (
                            <tr key={s.id || i}>
                              <td style={{ fontWeight: 600 }}>{s.name || '—'}</td>
                              <td><span className={`badge ${typeColors[s.entityType] || 'badge-green'}`}>{s.entityLabel || s.entityType}</span></td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{s.prn || s.riderId || '—'}</td>
                              <td><span className={`badge ${s.status === 'active' ? 'badge-green' : s.status === 'pending' || s.status === 'kyc_submitted' ? 'badge-gold' : 'badge-red'}`}>{s.status}</span></td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--color-pb-text-muted)' }}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}</td>
                              <td>
                                <button className="btn btn-secondary btn-sm" onClick={() => { setReviewingKyc(s); setKycActionReason(''); }}>
                                  <i className="fas fa-eye"></i> Review
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ONBOARDING TAB */}
            {tab === 'onboarding' && (
              <div>
                {selectedOnboarding && (
                  <div className="modal-overlay" onClick={() => setSelectedOnboarding(null)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                      <div className="modal-header">
                        <h3>Onboarding — {selectedOnboarding.name}</h3>
                        <button className="btn btn-ghost btn-icon" onClick={() => setSelectedOnboarding(null)}><i className="fas fa-xmark"></i></button>
                      </div>
                      <div className="modal-body">
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ display: 'flex', gap: 0, alignItems: 'center', marginBottom: 16 }}>
                            {[
                              { label: 'KYC Approved', done: !!selectedOnboarding.kycApproved },
                              { label: 'Agreement Initiated', done: !!selectedOnboarding.agreementPending || !!selectedOnboarding.agreementSigned || !!selectedOnboarding.onboarded },
                              { label: 'Agreement Signed', done: !!selectedOnboarding.agreementSigned || !!selectedOnboarding.onboarded },
                              { label: 'Fully Onboarded', done: !!selectedOnboarding.onboarded },
                            ].map((step, idx) => (
                              <div key={idx} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: step.done ? '#22c55e' : 'var(--color-pb-border)', color: step.done ? '#fff' : 'var(--color-pb-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', fontSize: '0.7rem', fontWeight: 700 }}>
                                  {step.done ? <i className="fas fa-check"></i> : idx + 1}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: step.done ? 'var(--color-pb-text)' : 'var(--color-pb-text-muted)' }}>{step.label}</div>
                                {idx < 3 && <div style={{ position: 'absolute', top: 13, right: -20, width: 40, height: 2, background: step.done ? '#22c55e' : 'var(--color-pb-border)' }}></div>}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20, fontSize: '0.85rem' }}>
                          <div><label className="pb-label">Current Status</label><span className={`badge ${selectedOnboarding.onboarded ? 'badge-green' : 'badge-gold'}`}>{selectedOnboarding.currentStatus}</span></div>
                          <div><label className="pb-label">Entity Type</label><span className="badge badge-blue">{selectedOnboarding.entityType}</span></div>
                          <div><label className="pb-label">Email</label>{selectedOnboarding.email || '—'}</div>
                          <div><label className="pb-label">Registered</label>{selectedOnboarding.registeredAt ? new Date(selectedOnboarding.registeredAt).toLocaleDateString() : '—'}</div>
                          {selectedOnboarding.kycApproved && <div><label className="pb-label">KYC Approved</label>{new Date(selectedOnboarding.kycApproved).toLocaleDateString()}</div>}
                          {selectedOnboarding.agreementSigned && <div><label className="pb-label">Signed</label>{new Date(selectedOnboarding.agreementSigned).toLocaleDateString()}</div>}
                          {selectedOnboarding.onboarded && <div><label className="pb-label">Onboarded</label>{new Date(selectedOnboarding.onboarded).toLocaleDateString()}</div>}
                        </div>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {!selectedOnboarding.agreementPending && !selectedOnboarding.agreementSigned && !selectedOnboarding.onboarded && selectedOnboarding.kycApproved && (
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleOnboardingAction(selectedOnboarding, 'initiate_agreement')}>
                              <i className="fas fa-file-signature"></i> Initiate Agreement
                            </button>
                          )}
                          {selectedOnboarding.agreementPending && !selectedOnboarding.agreementSigned && (
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleOnboardingAction(selectedOnboarding, 'sign_agreement')}>
                              <i className="fas fa-pen-fancy"></i> Mark as Signed
                            </button>
                          )}
                          {selectedOnboarding.agreementSigned && !selectedOnboarding.onboarded && (
                            <button className="btn btn-primary" style={{ flex: 1, background: '#22c55e' }} onClick={() => handleOnboardingAction(selectedOnboarding, 'complete_onboarding')}>
                              <i className="fas fa-check-circle"></i> Complete Onboarding
                            </button>
                          )}
                          {selectedOnboarding.onboarded && (
                            <div style={{ padding: 12, textAlign: 'center', color: '#22c55e', fontWeight: 600, width: '100%' }}>
                              <i className="fas fa-check-circle"></i> Fully Onboarded
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="glass" style={{ padding: 24 }}>
                  {onboardingLoading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--color-pb-primary)' }}></i></div>
                  ) : onboardingEntities.length === 0 ? (
                    <p style={{ color: 'var(--color-pb-text-muted)' }}>No entities found for onboarding.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="pb-table">
                        <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>KYC</th><th>Agreement</th><th>Signed</th><th>Onboarded</th><th>Actions</th></tr></thead>
                        <tbody>
                          {onboardingEntities.map((e, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{e.name || '—'}</td>
                              <td><span className={`badge ${typeColors[e.entityType] || 'badge-green'}`}>{e.entityType}</span></td>
                              <td><span className={`badge ${e.currentStatus === 'active' ? 'badge-green' : 'badge-gold'}`}>{e.currentStatus}</span></td>
                              <td>{e.kycApproved ? <i className="fas fa-check-circle" style={{ color: '#22c55e' }}></i> : <i className="fas fa-times-circle" style={{ color: 'var(--color-pb-text-muted)' }}></i>}</td>
                              <td>{e.agreementPending || e.agreementSigned ? <i className="fas fa-check-circle" style={{ color: '#22c55e' }}></i> : <i className="fas fa-times-circle" style={{ color: 'var(--color-pb-text-muted)' }}></i>}</td>
                              <td>{e.agreementSigned ? <i className="fas fa-check-circle" style={{ color: '#22c55e' }}></i> : <i className="fas fa-times-circle" style={{ color: 'var(--color-pb-text-muted)' }}></i>}</td>
                              <td>{e.onboarded ? <i className="fas fa-check-circle" style={{ color: '#22c55e' }}></i> : <i className="fas fa-times-circle" style={{ color: 'var(--color-pb-text-muted)' }}></i>}</td>
                              <td>
                                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedOnboarding(e)}>
                                  <i className="fas fa-arrow-right"></i> Manage
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STORIES TAB */}
            {tab === 'stories' && (
              <div>
                {editingStory !== null && (
                  <div className="modal-overlay" onClick={() => setEditingStory(null)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header"><h3>{editingStory?.id ? 'Edit' : 'New'} Story</h3><button className="btn btn-ghost btn-icon" onClick={() => setEditingStory(null)}><i className="fas fa-xmark"></i></button></div>
                      <div className="modal-body">
                        <form onSubmit={saveStory} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div><label className="pb-label">Title</label><input className="pb-input" name="title" defaultValue={editingStory?.title || ''} required /></div>
                          <div><label className="pb-label">Location</label><input className="pb-input" name="location" defaultValue={editingStory?.location || ''} /></div>
                          <div><label className="pb-label">Category</label><input className="pb-input" name="category" defaultValue={editingStory?.category || ''} /></div>
                          <div><label className="pb-label">Description</label><textarea className="pb-textarea" name="description" defaultValue={editingStory?.description || ''} /></div>
                          <div><label className="pb-label">Image URL</label><input className="pb-input" name="imageUrl" defaultValue={editingStory?.imageUrl || ''} /></div>
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-check"></i> Save</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
                <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => { if (!checkPermission('stories.edit')) { showPermDenied(); return; } setEditingStory({}); }}><i className="fas fa-plus"></i> New story</button>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {stories.map(s => (
                    <div key={s.id} className="glass" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="badge badge-green">{s.category || 'Story'}</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingStory(s)}><i className="fas fa-pen"></i></button>
                      </div>
                      <h4 style={{ margin: '12px 0 8px', fontWeight: 700 }}>{s.title}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-pb-text-secondary)' }}>{s.description?.slice(0, 100)}…</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* REVIEWS TAB */}
            {tab === 'reviews' && (
              <div>
                {editingReview !== null && (
                  <div className="modal-overlay" onClick={() => setEditingReview(null)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header"><h3>{editingReview?.id ? 'Edit' : 'New'} Review</h3><button className="btn btn-ghost btn-icon" onClick={() => setEditingReview(null)}><i className="fas fa-xmark"></i></button></div>
                      <div className="modal-body">
                        <form onSubmit={saveReview} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div><label className="pb-label">Name</label><input className="pb-input" name="name" defaultValue={editingReview?.name || ''} required /></div>
                          <div><label className="pb-label">Role</label><input className="pb-input" name="role" defaultValue={editingReview?.role || ''} /></div>
                          <div><label className="pb-label">Location</label><input className="pb-input" name="location" defaultValue={editingReview?.location || ''} /></div>
                          <div><label className="pb-label">Quote</label><textarea className="pb-textarea" name="quote" defaultValue={editingReview?.quote || ''} required /></div>
                          <div><label className="pb-label">Rating (1-5)</label><input className="pb-input" name="rating" type="number" min="1" max="5" defaultValue={editingReview?.rating || 5} /></div>
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-check"></i> Save</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
                <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => { if (!checkPermission('reviews.edit')) { showPermDenied(); return; } setEditingReview({}); }}><i className="fas fa-plus"></i> New review</button>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {reviews.map(r => (
                    <div key={r.id} className="glass" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 2, color: 'var(--color-pb-accent)' }}>
                          {Array.from({ length: r.rating || 5 }).map((_, i) => <i key={i} className="fas fa-star" style={{ fontSize: '0.7rem' }}></i>)}
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingReview(r)}><i className="fas fa-pen"></i></button>
                      </div>
                      <p style={{ margin: '12px 0', fontStyle: 'italic', fontSize: '0.88rem' }}>&ldquo;{r.quote}&rdquo;</p>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>{r.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TEAM TAB */}
            {tab === 'team' && (
              <div>
                <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
                  {canCreate && <button className="btn btn-primary" onClick={() => { setEditingMember(null); setShowCreateMember(true); }}><i className="fas fa-plus"></i> Add Team Member</button>}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {teamMembers.map(m => (
                    <div key={m.id} className="glass" style={{ padding: 20, textAlign: 'center' }}>
                      <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px', overflow: 'hidden', background: 'var(--color-pb-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {m.photoUrl ? <img src={m.photoUrl} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <i className="fas fa-user" style={{ fontSize: 32, color: 'var(--color-pb-text-muted)' }}></i>}
                      </div>
                      <h4 style={{ fontWeight: 700, margin: '0 0 4px' }}>{m.name}</h4>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-pb-primary)', fontWeight: 600, marginBottom: 4 }}>{m.role}</div>
                      {m.department && <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>{m.department}</div>}
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
                        {canCreate && <button className="btn btn-secondary btn-sm" onClick={() => { setEditingMember(m); setShowCreateMember(true); }}><i className="fas fa-pen"></i></button>}
                        {canDelete && <button className="btn btn-ghost btn-sm" onClick={async () => { if (confirm('Delete team member?')) { await adminFetch('/api/admin/team', { method: 'POST', body: JSON.stringify({ action: 'delete', id: m.id }) }); loadTab('team'); } }} style={{ color: 'var(--color-pb-danger)' }}><i className="fas fa-trash"></i></button>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Create/Edit Member Modal */}
                {showCreateMember && (
                  <div className="modal-overlay" onClick={() => { setShowCreateMember(false); setEditingMember(null); }}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3>{editingMember ? 'Edit Team Member' : 'Add Team Member'}</h3>
                        <button className="btn btn-ghost btn-icon" onClick={() => { setShowCreateMember(false); setEditingMember(null); }}><i className="fas fa-xmark"></i></button>
                      </div>
                      <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          const form = new FormData(e.target);
                          const data = Object.fromEntries(form);
                          if (editingMember?.id) data.id = editingMember.id;
                          if (data.sortOrder) data.sortOrder = parseInt(data.sortOrder, 10);
                          const res = await adminFetch('/api/admin/team', { method: 'POST', body: JSON.stringify(data) });
                          const json = await res.json();
                          if (json.ok) { showToast('Team member saved'); setShowCreateMember(false); setEditingMember(null); loadTab('team'); }
                          else showToast('Failed to save', 'error');
                        }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div><label className="pb-label">Name</label><input className="pb-input" name="name" defaultValue={editingMember?.name || ''} required /></div>
                          <div><label className="pb-label">Role / Designation</label><input className="pb-input" name="role" defaultValue={editingMember?.role || ''} required placeholder="e.g. Founder, CEO, Lead Developer" /></div>
                          <div><label className="pb-label">Department</label><input className="pb-input" name="department" defaultValue={editingMember?.department || ''} placeholder="e.g. Engineering, Design, Operations" /></div>
                          <div><label className="pb-label">Bio</label><textarea className="pb-textarea" name="bio" defaultValue={editingMember?.bio || ''} rows={3} /></div>
                          <div><label className="pb-label">Photo URL</label><input className="pb-input" name="photoUrl" defaultValue={editingMember?.photoUrl || ''} placeholder="Paste image URL or upload" /></div>
                          <div><label className="pb-label">Or Upload Photo</label><input type="file" accept="image/*" onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const input = document.querySelector('input[name="photoUrl"]');
                              if (input) input.value = ev.target.result;
                            };
                            reader.readAsDataURL(file);
                          }} /></div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div><label className="pb-label">Email</label><input className="pb-input" name="email" type="email" defaultValue={editingMember?.email || ''} /></div>
                            <div><label className="pb-label">Phone</label><input className="pb-input" name="phone" defaultValue={editingMember?.phone || ''} /></div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div><label className="pb-label">LinkedIn</label><input className="pb-input" name="linkedin" defaultValue={editingMember?.linkedin || ''} placeholder="URL" /></div>
                            <div><label className="pb-label">Twitter</label><input className="pb-input" name="twitter" defaultValue={editingMember?.twitter || ''} placeholder="URL" /></div>
                            <div><label className="pb-label">Instagram</label><input className="pb-input" name="instagram" defaultValue={editingMember?.instagram || ''} placeholder="URL" /></div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div><label className="pb-label">Sort Order</label><input className="pb-input" name="sortOrder" type="number" defaultValue={editingMember?.sortOrder || 0} /></div>
                            <div><label className="pb-label">Active</label>
                              <select className="pb-select" name="active" defaultValue={editingMember?.active !== false ? 'true' : 'false'}>
                                <option value="true">Visible on site</option>
                                <option value="false">Hidden</option>
                              </select>
                            </div>
                          </div>
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-save"></i> {editingMember ? 'Update' : 'Add'} Team Member</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CMS TAB */}
            {tab === 'cms' && (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                  {[
                    { key: 'news', label: 'News', icon: 'fa-newspaper' },
                    { key: 'announcements', label: 'Announcements', icon: 'fa-bullhorn' },
                    { key: 'banners', label: 'Banners', icon: 'fa-image' },
                    { key: 'maintenance', label: 'Maintenance', icon: 'fa-wrench' },
                  ].map(st => (
                    <button key={st.key} className={`btn ${cmsTab === st.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCmsTab(st.key)}>
                      <i className={`fas ${st.icon}`}></i> {st.label}
                    </button>
                  ))}
                </div>

                {/* CMS Modals */}
                {showCmsModal && editingCmsItem && (
                  <div className="modal-overlay" onClick={() => { setShowCmsModal(false); setEditingCmsItem(null); }}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3>{editingCmsItem.isNew ? 'New' : 'Edit'} {editingCmsItem.collectionKey?.replace('_', ' ')}</h3>
                        <button className="btn btn-ghost btn-icon" onClick={() => { setShowCmsModal(false); setEditingCmsItem(null); }}><i className="fas fa-xmark"></i></button>
                      </div>
                      <div className="modal-body">
                        <form onSubmit={saveCmsModalItem} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {editingCmsItem.collectionKey === 'news_items' && (
                            <>
                              <div><label className="pb-label">Title</label><input className="pb-input" name="title" defaultValue={editingCmsItem.title || ''} required /></div>
                              <div><label className="pb-label">Content</label><textarea className="pb-textarea" name="content" defaultValue={editingCmsItem.content || ''} rows={4} /></div>
                              <div><label className="pb-label">Publish Date</label><input className="pb-input" name="publishDate" type="date" defaultValue={editingCmsItem.publishDate || ''} /></div>
                              <div><label className="pb-label">Active</label>
                                <select className="pb-select" name="isActive" defaultValue={editingCmsItem.isActive !== undefined ? String(editingCmsItem.isActive) : 'true'}>
                                  <option value="true">Yes</option>
                                  <option value="false">No</option>
                                </select>
                              </div>
                            </>
                          )}
                          {editingCmsItem.collectionKey === 'announcement_items' && (
                            <>
                              <div><label className="pb-label">Title</label><input className="pb-input" name="title" defaultValue={editingCmsItem.title || ''} required /></div>
                              <div><label className="pb-label">Message</label><textarea className="pb-textarea" name="message" defaultValue={editingCmsItem.message || ''} rows={3} /></div>
                              <div><label className="pb-label">Priority</label>
                                <select className="pb-select" name="priority" defaultValue={editingCmsItem.priority || 'medium'}>
                                  <option value="high">High</option>
                                  <option value="medium">Medium</option>
                                  <option value="low">Low</option>
                                </select>
                              </div>
                              <div><label className="pb-label">Active</label>
                                <select className="pb-select" name="isActive" defaultValue={editingCmsItem.isActive !== undefined ? String(editingCmsItem.isActive) : 'true'}>
                                  <option value="true">Yes</option>
                                  <option value="false">No</option>
                                </select>
                              </div>
                              <div><label className="pb-label">Expires At</label><input className="pb-input" name="expiresAt" type="datetime-local" defaultValue={editingCmsItem.expiresAt || ''} /></div>
                            </>
                          )}
                          {editingCmsItem.collectionKey === 'banner_items' && (
                            <>
                              <div><label className="pb-label">Title</label><input className="pb-input" name="title" defaultValue={editingCmsItem.title || ''} required /></div>
                              <div><label className="pb-label">Image URL</label><input className="pb-input" name="imageUrl" defaultValue={editingCmsItem.imageUrl || ''} /></div>
                              <div><label className="pb-label">Link URL</label><input className="pb-input" name="linkUrl" defaultValue={editingCmsItem.linkUrl || ''} /></div>
                              <div><label className="pb-label">Position</label>
                                <select className="pb-select" name="position" defaultValue={editingCmsItem.position || 'hero'}>
                                  <option value="hero">Hero</option>
                                  <option value="sidebar">Sidebar</option>
                                  <option value="footer">Footer</option>
                                </select>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div><label className="pb-label">Sort Order</label><input className="pb-input" name="sortOrder" type="number" defaultValue={editingCmsItem.sortOrder || 0} /></div>
                                <div><label className="pb-label">Active</label>
                                  <select className="pb-select" name="isActive" defaultValue={editingCmsItem.isActive !== undefined ? String(editingCmsItem.isActive) : 'true'}>
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                  </select>
                                </div>
                              </div>
                            </>
                          )}
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-check"></i> Save</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                {/* News Sub-tab */}
                {cmsTab === 'news' && (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <button className="btn btn-primary" onClick={() => openCmsCreateModal('news_items')}><i className="fas fa-plus"></i> New Article</button>
                    </div>
                    {(() => { const items = getCmsItems('news_items'); return items.length === 0 ? (
                      <p style={{ color: 'var(--color-pb-text-muted)' }}>No news articles.</p>
                    ) : (
                      <div className="glass" style={{ padding: 24 }}>
                        <table className="pb-table">
                          <thead><tr><th>Title</th><th>Publish Date</th><th>Active</th><th>Actions</th></tr></thead>
                          <tbody>
                            {items.map(item => (
                              <tr key={item.id}>
                                <td style={{ fontWeight: 600 }}>{item.title || '—'}</td>
                                <td style={{ fontSize: '0.85rem' }}>{item.publishDate || '—'}</td>
                                <td><span className={`badge ${item.isActive ? 'badge-green' : 'badge-red'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                                <td>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => openCmsEditModal('news_items', item)}><i className="fas fa-pen"></i></button>
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-pb-danger)' }} onClick={() => deleteCmsItem('news_items', item.id)}><i className="fas fa-trash"></i></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ); })()}
                  </div>
                )}

                {/* Announcements Sub-tab */}
                {cmsTab === 'announcements' && (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <button className="btn btn-primary" onClick={() => openCmsCreateModal('announcement_items')}><i className="fas fa-plus"></i> New Announcement</button>
                    </div>
                    {(() => { const items = getCmsItems('announcement_items'); return items.length === 0 ? (
                      <p style={{ color: 'var(--color-pb-text-muted)' }}>No announcements.</p>
                    ) : (
                      <div className="glass" style={{ padding: 24 }}>
                        <table className="pb-table">
                          <thead><tr><th>Title</th><th>Priority</th><th>Active</th><th>Expires</th><th>Actions</th></tr></thead>
                          <tbody>
                            {items.map(item => (
                              <tr key={item.id}>
                                <td style={{ fontWeight: 600 }}>{item.title || '—'}</td>
                                <td><span className={`badge ${item.priority === 'high' ? 'badge-red' : item.priority === 'medium' ? 'badge-gold' : 'badge-green'}`}>{item.priority || 'medium'}</span></td>
                                <td><span className={`badge ${item.isActive ? 'badge-green' : 'badge-red'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--color-pb-text-muted)' }}>{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : '—'}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => openCmsEditModal('announcement_items', item)}><i className="fas fa-pen"></i></button>
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-pb-danger)' }} onClick={() => deleteCmsItem('announcement_items', item.id)}><i className="fas fa-trash"></i></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ); })()}
                  </div>
                )}

                {/* Banners Sub-tab */}
                {cmsTab === 'banners' && (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <button className="btn btn-primary" onClick={() => openCmsCreateModal('banner_items')}><i className="fas fa-plus"></i> New Banner</button>
                    </div>
                    {(() => { const items = getCmsItems('banner_items'); return items.length === 0 ? (
                      <p style={{ color: 'var(--color-pb-text-muted)' }}>No banners.</p>
                    ) : (
                      <div className="glass" style={{ padding: 24 }}>
                        <table className="pb-table">
                          <thead><tr><th>Title</th><th>Position</th><th>Sort</th><th>Active</th><th>Actions</th></tr></thead>
                          <tbody>
                            {items.map(item => (
                              <tr key={item.id}>
                                <td style={{ fontWeight: 600 }}>{item.title || '—'}</td>
                                <td><span className="badge badge-blue">{item.position || 'hero'}</span></td>
                                <td>{item.sortOrder || 0}</td>
                                <td><span className={`badge ${item.isActive ? 'badge-green' : 'badge-red'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                                <td>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => openCmsEditModal('banner_items', item)}><i className="fas fa-pen"></i></button>
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-pb-danger)' }} onClick={() => deleteCmsItem('banner_items', item.id)}><i className="fas fa-trash"></i></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ); })()}
                  </div>
                )}

                {/* Maintenance Sub-tab */}
                {cmsTab === 'maintenance' && (
                  <div className="glass" style={{ padding: 28 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 20px' }}>Maintenance Mode</h3>
                    <form onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.target); saveCmsSetting('maintenance_mode', form.get('maintenance_mode') === 'on'); saveCmsSetting('maintenance_message', form.get('maintenance_message')); saveCmsSetting('schedule_start', form.get('schedule_start')); saveCmsSetting('schedule_end', form.get('schedule_end')); }} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
                      <div>
                        <label className="pb-label">Maintenance Mode</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 6 }}>
                          <input type="checkbox" name="maintenance_mode" defaultChecked={cmsData.maintenance_mode === true || cmsData.maintenance_mode === 'true'} style={{ width: 18, height: 18, accentColor: 'var(--color-pb-primary)' }} />
                          <span style={{ fontSize: '0.88rem' }}>Enable maintenance mode</span>
                        </label>
                      </div>
                      <div>
                        <label className="pb-label">Maintenance Message</label>
                        <textarea className="pb-textarea" name="maintenance_message" defaultValue={cmsData.maintenance_message || 'We are currently performing scheduled maintenance. Please check back later.'} rows={3} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label className="pb-label">Schedule Start</label><input className="pb-input" name="schedule_start" type="datetime-local" defaultValue={cmsData.schedule_start || ''} /></div>
                        <div><label className="pb-label">Schedule End</label><input className="pb-input" name="schedule_end" type="datetime-local" defaultValue={cmsData.schedule_end || ''} /></div>
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}><i className="fas fa-save"></i> Save Maintenance Settings</button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* SUPPORT TAB */}
            {tab === 'support' && (
              <div>
                <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
                  <SupportWidget uid="" email={admin?.email} name={admin?.name} userType="admin" isAdmin={isStaff ? false : true} isStaff={isStaff} agentName={admin?.name} />
                </div>

                {adminRole === 'admin' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0, fontSize: '1.1rem' }}>
                        <i className="fas fa-users-gear" style={{ marginRight: 8, color: 'var(--color-pb-primary)' }}></i>
                        Support Agents
                      </h3>
                      {canCreate && <button className="btn btn-primary btn-sm" onClick={() => { setEditingAgent(null); setShowAgentForm(true); }}><i className="fas fa-plus"></i> Add Agent</button>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                      {supportAgents.map(a => (
                        <div key={a.id} className="glass" style={{ padding: 18 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{a.name}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>{a.department || 'Support'} | {a.role || 'agent'}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: a.online ? '#22c55e' : '#9ca3af', display: 'inline-block', marginBottom: 4 }}></div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--color-pb-text-muted)' }}>{a.online ? 'Online' : 'Offline'}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--color-pb-border)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 3, background: (a.currentLoad||0) >= (a.maxLoad||10) * 0.8 ? 'var(--color-pb-danger)' : 'var(--color-pb-primary)', width: `${((a.currentLoad||0)/(a.maxLoad||10))*100}%`, transition: 'width 0.3s' }}></div>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{a.currentLoad || 0}/{a.maxLoad || 10}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {canCreate && <button className="btn btn-secondary btn-sm" onClick={() => { setEditingAgent(a); setShowAgentForm(true); }}><i className="fas fa-pen"></i></button>}
                            {canDelete && <button className="btn btn-ghost btn-sm" onClick={async () => { if (confirm('Delete agent?')) { await adminFetch('/api/admin/support', { method: 'POST', body: JSON.stringify({ action: 'agent-delete', id: a.id }) }); loadTab('support'); } }} style={{ color: 'var(--color-pb-danger)' }}><i className="fas fa-trash"></i></button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showAgentForm && (
                  <div className="modal-overlay" onClick={() => { setShowAgentForm(false); setEditingAgent(null); }}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header"><h3>{editingAgent ? 'Edit Agent' : 'Add Agent'}</h3><button className="btn btn-ghost btn-icon" onClick={() => { setShowAgentForm(false); setEditingAgent(null); }}><i className="fas fa-xmark"></i></button></div>
                      <div className="modal-body">
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          const form = new FormData(e.target);
                          const data = Object.fromEntries(form);
                          if (editingAgent?.id) data.id = editingAgent.id;
                          data.currentLoad = parseInt(data.currentLoad) || 0;
                          data.maxLoad = parseInt(data.maxLoad) || 10;
                          data.online = data.online === 'true';
                          data.active = data.active === 'true';
                          const res = await adminFetch('/api/admin/support', { method: 'POST', body: JSON.stringify({ ...data, action: editingAgent?.id ? 'agent-update' : 'agent-create' }) });
                          const json = await res.json();
                          if (json.ok) { showToast('Agent saved'); setShowAgentForm(false); setEditingAgent(null); loadTab('support'); }
                          else showToast('Failed', 'error');
                        }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div><label className="pb-label">Name</label><input className="pb-input" name="name" defaultValue={editingAgent?.name || ''} required /></div>
                          <div><label className="pb-label">Email</label><input className="pb-input" name="email" type="email" defaultValue={editingAgent?.email || ''} required /></div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div><label className="pb-label">Department</label><input className="pb-input" name="department" defaultValue={editingAgent?.department || 'Support'} /></div>
                            <div><label className="pb-label">Role</label>
                              <select className="pb-select" name="role" defaultValue={editingAgent?.role || 'agent'}>
                                <option value="agent">Agent</option><option value="senior">Senior Agent</option><option value="lead">Team Lead</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div><label className="pb-label">Current Load</label><input className="pb-input" name="currentLoad" type="number" defaultValue={editingAgent?.currentLoad || 0} /></div>
                            <div><label className="pb-label">Max Load</label><input className="pb-input" name="maxLoad" type="number" defaultValue={editingAgent?.maxLoad || 10} /></div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div><label className="pb-label">Online</label>
                              <select className="pb-select" name="online" defaultValue={editingAgent?.online ? 'true' : 'false'}>
                                <option value="true">Online</option><option value="false">Offline</option>
                              </select>
                            </div>
                            <div><label className="pb-label">Active</label>
                              <select className="pb-select" name="active" defaultValue={editingAgent?.active !== false ? 'true' : 'false'}>
                                <option value="true">Active</option><option value="false">Inactive</option>
                              </select>
                            </div>
                          </div>
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-save"></i> Save Agent</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ENTITY DETAIL TAB */}
            {tab === 'entity-detail' && viewingEntity && (
              <div>
                {/* Back button + header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setViewingEntity(null); setTab('accounts'); }}>
                    <i className="fas fa-arrow-left"></i> Back to Accounts
                  </button>
                  <span style={{ fontWeight: 700, fontSize: '1.15rem', fontFamily: 'var(--font-display)' }}>
                    {viewingEntity.name || viewingEntity._label || 'Entity'}
                  </span>
                  <span className={`badge ${typeColors[viewingEntity._type] || 'badge-green'}`}>{viewingEntity._type}</span>
                  <span className={`badge ${viewingEntity.status === 'active' ? 'badge-green' : viewingEntity.status === 'pending' ? 'badge-gold' : 'badge-red'}`}>{viewingEntity.status || '—'}</span>
                  <div style={{ flex: 1 }}></div>
                  <button className="btn btn-secondary btn-sm" onClick={() => downloadEntityPdf(viewingEntity)} title="Download entity report PDF">
                    <i className="fas fa-file-pdf"></i> Download Report
                  </button>
                  {canCreate && (viewingEntity._type === 'doctor' || viewingEntity._type === 'ngo' || viewingEntity._type === 'rider' || viewingEntity._type === 'representative' || viewingEntity._type === 'customer') && (
                    <button className="btn btn-primary btn-sm" onClick={() => openPortalSSO(viewingEntity._type === 'representative' ? 'rider' : viewingEntity._type, viewingEntity.id)} title={`Open in ${viewingEntity._type} portal`}>
                      <i className="fas fa-right-to-bracket"></i> Open in Portal
                    </button>
                  )}
                </div>

                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                  {[
                    { label: 'Cases', value: (viewingEntity.cases || []).length, icon: 'fa-folder-open', color: 'var(--color-pb-primary)' },
                    { label: 'Activity Logs', value: (viewingEntity.activityLogs || []).length, icon: 'fa-clock-rotate-left', color: 'var(--color-pb-doctor)' },
                    { label: 'Member Since', value: viewingEntity.createdAt ? new Date(viewingEntity.createdAt).toLocaleDateString() : '—', icon: 'fa-calendar', color: 'var(--color-pb-ngo)' },
                  ].map((s, i) => (
                    <div key={i} className="glass" style={{ padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className={`fas ${s.icon}`} style={{ fontSize: '0.85rem' }}></i>
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem' }}>{s.value}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-pb-text-muted)' }}>{s.label}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tab bar */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--color-pb-border)', paddingBottom: 0 }}>
                  {[
                    { key: 'overview', label: 'Overview', icon: 'fa-user' },
                    { key: 'cases', label: 'Cases', icon: 'fa-folder-open' },
                    { key: 'activity', label: 'Activity', icon: 'fa-clock-rotate-left' },
                    { key: 'kyc', label: 'KYC', icon: 'fa-id-card' },
                    ...(viewingEntity._type === 'doctor' ? [{ key: 'photos', label: 'Photos & Reports', icon: 'fa-images' }] : []),
                  ].map(t => (
                    <button key={t.key} onClick={() => setEntityDetailTab(t.key)}
                      style={{ padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: entityDetailTab === t.key ? 700 : 500, color: entityDetailTab === t.key ? 'var(--color-pb-primary)' : 'var(--color-pb-text-muted)', borderBottom: entityDetailTab === t.key ? '2px solid var(--color-pb-primary)' : '2px solid transparent', marginBottom: -2, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className={`fas ${t.icon}`} style={{ fontSize: '0.8rem' }}></i> {t.label}
                    </button>
                  ))}
                </div>

                {/* Overview sub-tab */}
                {entityDetailTab === 'overview' && (
                  <div className="glass" style={{ padding: 24 }}>
                    <h4 style={{ fontWeight: 700, margin: '0 0 16px', fontSize: '0.95rem' }}>Profile Information</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                      {Object.entries(viewingEntity).filter(([k]) => !['_type', '_label', 'cases', 'activityLogs', 'user', 'treatmentPhotos', 'treatmentReports', 'ngoRiders', 'ngoRepresentatives', 'totalIncidents', 'trackingHistory', 'checkins', 'payments', 'kycData'].includes(k) && viewingEntity[k] != null && viewingEntity[k] !== '').map(([key, val]) => (
                        <div key={key}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-pb-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, wordBreak: 'break-all' }}>
                            {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </div>
                        </div>
                      ))}
                    </div>
                    {viewingEntity.lat && viewingEntity.lng && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-pb-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Location</div>
                        <a href={`https://www.google.com/maps?q=${viewingEntity.lat},${viewingEntity.lng}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-pb-primary)', fontSize: '0.88rem', fontWeight: 600 }}>
                          <i className="fas fa-map-marker-alt"></i> {String(viewingEntity.lat)}, {String(viewingEntity.lng)} — View on Maps
                        </a>
                      </div>
                    )}
                    {viewingEntity.user && (
                      <div style={{ marginTop: 20, borderTop: '1px solid var(--color-pb-border)', paddingTop: 16 }}>
                        <h4 style={{ fontWeight: 700, margin: '0 0 12px', fontSize: '0.95rem' }}>Linked User Account</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                          <div><div style={{ fontSize: '0.72rem', color: 'var(--color-pb-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Email</div><div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{viewingEntity.user.email || '—'}</div></div>
                          <div><div style={{ fontSize: '0.72rem', color: 'var(--color-pb-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Name</div><div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{[viewingEntity.user.firstName, viewingEntity.user.middleName, viewingEntity.user.lastName].filter(Boolean).join(' ') || '—'}</div></div>
                          <div><div style={{ fontSize: '0.72rem', color: 'var(--color-pb-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Phone</div><div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{viewingEntity.user.phoneNo || '—'}</div></div>
                          <div><div style={{ fontSize: '0.72rem', color: 'var(--color-pb-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Role</div><div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{viewingEntity.user.role || '—'}</div></div>
                          <div><div style={{ fontSize: '0.72rem', color: 'var(--color-pb-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Status</div><div><span className={`badge ${viewingEntity.user.status === 'active' ? 'badge-green' : 'badge-red'}`}>{viewingEntity.user.status || '—'}</span></div></div>
                        </div>
                      </div>
                    )}
                    {viewingEntity._type === 'ngo' && (
                      <div style={{ marginTop: 20, borderTop: '1px solid var(--color-pb-border)', paddingTop: 16 }}>
                        <h4 style={{ fontWeight: 700, margin: '0 0 12px', fontSize: '0.95rem' }}>NGO Members</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-pb-text-muted)', marginBottom: 6 }}>Riders ({(viewingEntity.ngoRiders || []).length})</div>
                            {(viewingEntity.ngoRiders || []).length === 0 ? <div style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)' }}>No riders</div> : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {viewingEntity.ngoRiders.map((r, i) => (
                                  <div key={i} style={{ fontSize: '0.82rem', padding: '6px 10px', background: 'var(--color-pb-bg)', borderRadius: 6 }}>
                                    <span style={{ fontWeight: 600 }}>{r.name || '—'}</span> <span className={`badge ${r.status === 'active' ? 'badge-green' : 'badge-gold'}`} style={{ fontSize: '0.65rem' }}>{r.status}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-pb-text-muted)', marginBottom: 6 }}>Representatives ({(viewingEntity.ngoRepresentatives || []).length})</div>
                            {(viewingEntity.ngoRepresentatives || []).length === 0 ? <div style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)' }}>No representatives</div> : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {viewingEntity.ngoRepresentatives.map((r, i) => (
                                  <div key={i} style={{ fontSize: '0.82rem', padding: '6px 10px', background: 'var(--color-pb-bg)', borderRadius: 6 }}>
                                    <span style={{ fontWeight: 600 }}>{r.name || '—'}</span> <span className={`badge ${r.status === 'active' ? 'badge-green' : 'badge-gold'}`} style={{ fontSize: '0.65rem' }}>{r.status}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Cases sub-tab */}
                {entityDetailTab === 'cases' && (
                  <div className="glass" style={{ padding: 24 }}>
                    {(viewingEntity.cases || []).length === 0 ? (
                      <p style={{ color: 'var(--color-pb-text-muted)', fontSize: '0.88rem' }}>No cases found for this entity.</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="pb-table">
                          <thead><tr><th>Code</th><th>Animal</th><th>Status</th><th>Workflow</th><th>Created</th><th></th></tr></thead>
                          <tbody>
                            {(viewingEntity.cases || []).map(c => (
                              <tr key={c.id}>
                                <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.incidentCode || `#${c.id}`}</td>
                                <td>{c.animalType || '—'}</td>
                                <td><span className="badge badge-green">{c.status || 'open'}</span></td>
                                <td><span className="badge badge-gold">{c.workflowStatus || '—'}</span></td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--color-pb-text-muted)' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                                <td>
                                  {c.timeline && c.timeline.length > 0 && (
                                    <details>
                                      <summary style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--color-pb-primary)' }}>{c.timeline.length} events</summary>
                                      <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {c.timeline.slice(0, 10).map((t, i) => (
                                          <div key={i} style={{ fontSize: '0.78rem', padding: '6px 8px', background: 'var(--color-pb-bg)', borderRadius: 4 }}>
                                            <span style={{ fontWeight: 600 }}>{t.status || '—'}</span>
                                            <span style={{ color: 'var(--color-pb-text-muted)', marginLeft: 8 }}>{t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}</span>
                                            {t.note && <div style={{ color: 'var(--color-pb-text-secondary)', marginTop: 2 }}>{t.note}</div>}
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Activity sub-tab */}
                {entityDetailTab === 'activity' && (
                  <div className="glass" style={{ padding: 24 }}>
                    {(viewingEntity.activityLogs || []).length === 0 ? (
                      <p style={{ color: 'var(--color-pb-text-muted)', fontSize: '0.88rem' }}>No activity logs found.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {viewingEntity.activityLogs.map((log, i) => {
                          const actionIcons = {
                            admin_password_reset: { icon: 'fa-key', color: '#eab308' },
                            status_change: { icon: 'fa-toggle-on', color: '#22c55e' },
                            kyc_approved: { icon: 'fa-id-card', color: '#22c55e' },
                            kyc_rejected: { icon: 'fa-id-card', color: '#ef4444' },
                            login: { icon: 'fa-right-to-bracket', color: '#3b82f6' },
                            case_created: { icon: 'fa-folder-plus', color: 'var(--color-pb-primary)' },
                          };
                          const matched = actionIcons[log.action] || { icon: 'fa-circle-info', color: 'var(--color-pb-text-muted)' };
                          return (
                            <div key={log.id || i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < (viewingEntity.activityLogs || []).length - 1 ? '1px solid var(--color-pb-border)' : 'none' }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${matched.color}15`, color: matched.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className={`fas ${matched.icon}`} style={{ fontSize: '0.75rem' }}></i>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{log.action?.replace(/_/g, ' ') || '—'}</div>
                                {log.details && (
                                  <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-secondary)', marginTop: 2, wordBreak: 'break-all' }}>
                                    {typeof log.details === 'object' ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' · ') : String(log.details)}
                                  </div>
                                )}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-pb-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* KYC sub-tab */}
                {entityDetailTab === 'kyc' && (
                  <div className="glass" style={{ padding: 24 }}>
                    {viewingEntity.kycData && typeof viewingEntity.kycData === 'object' ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>KYC Status</span>
                          <span className={`badge ${viewingEntity.status === 'active' ? 'badge-green' : viewingEntity.status === 'kyc_submitted' || viewingEntity.status === 'pending' ? 'badge-gold' : 'badge-red'}`}>
                            {viewingEntity.status === 'active' ? 'Approved' : viewingEntity.status === 'rejected' ? 'Rejected' : viewingEntity.status === 'kyc_resubmit' ? 'Reupload Requested' : 'Pending'}
                          </span>
                        </div>
                        {viewingEntity.kycData.approvedAt && <div style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Approved: {new Date(viewingEntity.kycData.approvedAt).toLocaleString()}</div>}
                        {viewingEntity.kycData.rejectedAt && <div style={{ fontSize: '0.82rem', color: '#ef4444', marginBottom: 4 }}>Rejected: {new Date(viewingEntity.kycData.rejectedAt).toLocaleString()}</div>}
                        {viewingEntity.kycData.rejectionReason && <div style={{ fontSize: '0.82rem', color: '#ef4444', marginBottom: 12, fontStyle: 'italic' }}>Reason: {viewingEntity.kycData.rejectionReason}</div>}
                        <h4 style={{ fontWeight: 700, margin: '16px 0 10px', fontSize: '0.9rem' }}>Documents</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                          {Object.entries(viewingEntity.kycData).filter(([k]) => !['approvedAt', 'rejectedAt', 'rejectionReason', 'reuploadRequestedAt', 'reuploadReason', 'approvedBy', 'rejectedBy'].includes(k)).map(([key, val]) => (
                            <div key={key} style={{ padding: 12, background: 'var(--color-pb-bg)', borderRadius: 8, fontSize: '0.82rem' }}>
                              <div style={{ fontWeight: 600, marginBottom: 4, textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</div>
                              {val && typeof val === 'object' ? (
                                Object.entries(val).map(([k2, v2]) => (
                                  <div key={k2} style={{ marginBottom: 2 }}>
                                    <span style={{ color: 'var(--color-pb-text-muted)', textTransform: 'capitalize' }}>{k2.replace(/([A-Z])/g, ' $1')}: </span>
                                    {typeof v2 === 'string' && v2.startsWith('http') ? (
                                      <a href={v2} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-pb-primary)' }}><i className="fas fa-external-link-alt"></i> View</a>
                                    ) : (
                                      <span style={{ fontWeight: 500 }}>{String(v2)}</span>
                                    )}
                                  </div>
                                ))
                              ) : val && typeof val === 'string' && val.startsWith('http') ? (
                                <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-pb-primary)' }}><i className="fas fa-external-link-alt"></i> View document</a>
                              ) : (
                                <span style={{ fontWeight: 500 }}>{val ? String(val) : 'Not provided'}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--color-pb-text-muted)', fontSize: '0.88rem' }}>No KYC data available.</p>
                    )}
                  </div>
                )}

                {/* Photos sub-tab (doctors only) */}
                {entityDetailTab === 'photos' && viewingEntity._type === 'doctor' && (
                  <div className="glass" style={{ padding: 24 }}>
                    {viewingEntity.treatmentReports && viewingEntity.treatmentReports.length > 0 && (
                      <div style={{ marginBottom: 24 }}>
                        <h4 style={{ fontWeight: 700, margin: '0 0 12px', fontSize: '0.95rem' }}>Treatment Reports</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {viewingEntity.treatmentReports.map((r, i) => (
                            <div key={i} style={{ padding: 14, background: 'var(--color-pb-bg)', borderRadius: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem' }}>{r.incidentCode}</span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</span>
                              </div>
                              <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{r.report}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {viewingEntity.treatmentPhotos && viewingEntity.treatmentPhotos.length > 0 && (
                      <div>
                        <h4 style={{ fontWeight: 700, margin: '0 0 12px', fontSize: '0.95rem' }}>Treatment Photos</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                          {viewingEntity.treatmentPhotos.map((p, i) => (
                            <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: 'var(--color-pb-bg)' }}>
                              {p.fileUrl ? (
                                <a href={p.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                                  <div style={{ width: '100%', height: 140, background: 'var(--color-pb-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fas fa-image" style={{ fontSize: 24, color: 'var(--color-pb-text-muted)' }}></i>
                                  </div>
                                </a>
                              ) : (
                                <div style={{ width: '100%', height: 140, background: 'var(--color-pb-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <i className="fas fa-image" style={{ fontSize: 24, color: 'var(--color-pb-text-muted)' }}></i>
                                </div>
                              )}
                              <div style={{ padding: '6px 8px' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize' }}>{(p.photoType || 'photo').replace(/_/g, ' ')}</div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--color-pb-text-muted)' }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(!viewingEntity.treatmentReports || viewingEntity.treatmentReports.length === 0) && (!viewingEntity.treatmentPhotos || viewingEntity.treatmentPhotos.length === 0) && (
                      <p style={{ color: 'var(--color-pb-text-muted)', fontSize: '0.88rem' }}>No photos or treatment reports found.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SITE CONFIG TAB */}
            {tab === 'settings' && (
              <div>
                {/* Commission Settings */}
                <div className="glass" style={{ padding: 28, marginBottom: 24 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 6px' }}>
                    <i className="fas fa-percent" style={{ marginRight: 8, color: 'var(--color-pb-primary)' }}></i>
                    Commission Settings
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)', marginBottom: 20 }}>
                    Configure the platform commission percentage applied to case expenses.
                  </p>
                  <form onSubmit={saveCommissionConfig} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
                    <div>
                      <label className="pb-label">Commission Percentage (%)</label>
                      <input
                        className="pb-input"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={commissionConfig.percentage || ''}
                        onChange={e => setCommissionConfig(prev => ({ ...prev, percentage: e.target.value }))}
                        required
                      />
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-pb-text-muted)', marginTop: 4 }}>
                        Current rate: <strong>{commissionConfig.percentage || 15}%</strong> — Applied on top of case expenses
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label className="pb-label">Minimum Amount (₹)</label>
                        <input
                          className="pb-input"
                          type="number"
                          min="0"
                          value={commissionConfig.minAmount || ''}
                          onChange={e => setCommissionConfig(prev => ({ ...prev, minAmount: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="pb-label">Maximum Amount (₹)</label>
                        <input
                          className="pb-input"
                          type="number"
                          min="0"
                          value={commissionConfig.maxAmount || ''}
                          onChange={e => setCommissionConfig(prev => ({ ...prev, maxAmount: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="pb-label">Description</label>
                      <input
                        className="pb-input"
                        value={commissionConfig.description || ''}
                        onChange={e => setCommissionConfig(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="e.g. Platform commission for rescue operations"
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={commissionSaving}>
                      {commissionSaving ? <><i className="fas fa-spinner fa-spin"></i> Saving…</> : <><i className="fas fa-save"></i> Save Commission Settings</>}
                    </button>
                  </form>
                </div>

                {/* Site Configuration */}
                <div className="glass" style={{ padding: 28 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 20px' }}>Site Configuration</h3>
                <form onSubmit={saveSiteConfig} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
                  <div><label className="pb-label">Hero Title</label><input className="pb-input" name="hero_title" defaultValue={siteConfig.hero_title || ''} /></div>
                  <div><label className="pb-label">Hero Subtitle</label><textarea className="pb-textarea" name="hero_subtitle" defaultValue={siteConfig.hero_subtitle || ''} /></div>
                  <div>
                    <label className="pb-label">Logo</label>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: 8 }}>
                          <input className="pb-input" name="logo_url" defaultValue={siteConfig.logo_url || ''} placeholder="Or paste image URL" onChange={e => setLogoPreview(e.target.value)} style={{ marginBottom: 8 }} />
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginTop: 4 }}>Paste a URL or upload a file below</div>
                        </div>
                        <div>
                          <input type="file" accept="image/*" onChange={handleLogoFileSelect} style={{ fontSize: '0.85rem' }} />
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginTop: 4 }}>Upload an image (converted to base64)</div>
                        </div>
                      </div>
                      {logoPreview && (
                        <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', border: '2px solid var(--color-pb-border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-pb-bg)' }}>
                          <img src={logoPreview} alt="Logo preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div><label className="pb-label">Banner URL</label><input className="pb-input" name="banner_url" defaultValue={siteConfig.banner_url || ''} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><label className="pb-label">Rescues Override</label><input className="pb-input" name="stat_rescues_override" type="number" defaultValue={siteConfig.stat_rescues_override || ''} /></div>
                    <div><label className="pb-label">NGOs Override</label><input className="pb-input" name="stat_ngos_override" type="number" defaultValue={siteConfig.stat_ngos_override || ''} /></div>
                    <div><label className="pb-label">Doctors Override</label><input className="pb-input" name="stat_doctors_override" type="number" defaultValue={siteConfig.stat_doctors_override || ''} /></div>
                    <div><label className="pb-label">Riders Override</label><input className="pb-input" name="stat_riders_override" type="number" defaultValue={siteConfig.stat_riders_override || ''} /></div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}><i className="fas fa-save"></i> Save configuration</button>
                </form>
                </div>

                {/* Social Media Settings */}
                <div className="glass" style={{ padding: 28, marginBottom: 24, marginTop: 24 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 6px' }}>
                    <i className="fas fa-share-nodes" style={{ marginRight: 8, color: 'var(--color-pb-primary)' }}></i>
                    Social Media Links
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)', marginBottom: 20 }}>
                    Configure social media links displayed in the footer and about page.
                  </p>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const form = new FormData(e.target);
                    const data = Object.fromEntries(form);
                    const socialData = {};
                    for (const [k, v] of Object.entries(data)) { socialData['social_' + k] = v; }
                    const res = await adminFetch('/api/admin/cms', { method: 'POST', body: JSON.stringify(socialData) });
                    if (res.ok) showToast('Social media links saved');
                    else showToast('Failed to save', 'error');
                  }} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 600 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div><label className="pb-label"><i className="fab fa-instagram" style={{ marginRight: 6 }}></i>Instagram URL</label><input className="pb-input" name="instagram" defaultValue={cmsData.social_instagram || ''} placeholder="https://instagram.com/..." /></div>
                      <div><label className="pb-label"><i className="fab fa-twitter" style={{ marginRight: 6 }}></i>Twitter / X URL</label><input className="pb-input" name="twitter" defaultValue={cmsData.social_twitter || ''} placeholder="https://twitter.com/..." /></div>
                      <div><label className="pb-label"><i className="fab fa-facebook" style={{ marginRight: 6 }}></i>Facebook URL</label><input className="pb-input" name="facebook" defaultValue={cmsData.social_facebook || ''} placeholder="https://facebook.com/..." /></div>
                      <div><label className="pb-label"><i className="fab fa-linkedin" style={{ marginRight: 6 }}></i>LinkedIn URL</label><input className="pb-input" name="linkedin" defaultValue={cmsData.social_linkedin || ''} placeholder="https://linkedin.com/..." /></div>
                      <div><label className="pb-label"><i className="fab fa-youtube" style={{ marginRight: 6 }}></i>YouTube URL</label><input className="pb-input" name="youtube" defaultValue={cmsData.social_youtube || ''} placeholder="https://youtube.com/..." /></div>
                      <div><label className="pb-label"><i className="fab fa-github" style={{ marginRight: 6 }}></i>GitHub URL</label><input className="pb-input" name="github" defaultValue={cmsData.social_github || ''} placeholder="https://github.com/..." /></div>
                      <div><label className="pb-label"><i className="fab fa-whatsapp" style={{ marginRight: 6 }}></i>WhatsApp Number</label><input className="pb-input" name="whatsapp" defaultValue={cmsData.social_whatsapp || ''} placeholder="+91..." /></div>
                      <div><label className="pb-label"><i className="fab fa-telegram" style={{ marginRight: 6 }}></i>Telegram URL</label><input className="pb-input" name="telegram" defaultValue={cmsData.social_telegram || ''} placeholder="https://t.me/..." /></div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}><i className="fas fa-save"></i> Save Social Links</button>
                  </form>
                </div>

                {/* Live Chat Settings */}
                <div className="glass" style={{ padding: 28, marginBottom: 24 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 6px' }}>
                    <i className="fas fa-headset" style={{ marginRight: 8, color: 'var(--color-pb-primary)' }}></i>
                    Live Chat Settings
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)', marginBottom: 20 }}>Configure live chat availability hours and days.</p>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const form = new FormData(e.target);
                    const data = Object.fromEntries(form);
                    const chatData = {};
                    for (const [k, v] of Object.entries(data)) { chatData['chat_' + k] = v; }
                    const res = await adminFetch('/api/admin/cms', { method: 'POST', body: JSON.stringify(chatData) });
                    if (res.ok) showToast('Chat settings saved');
                    else showToast('Failed to save', 'error');
                  }} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 600 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label className="pb-label">Live Chat Enabled</label>
                        <select className="pb-select" name="enabled" defaultValue={cmsData.chat_enabled || 'true'}>
                          <option value="true">Yes — Enabled</option>
                          <option value="false">No — Disabled</option>
                        </select>
                      </div>
                      <div>
                        <label className="pb-label">Chat Days (comma-separated)</label>
                        <input className="pb-input" name="days" defaultValue={cmsData.chat_days || 'mon,tue,wed,thu,fri,sat'} placeholder="mon,tue,wed,thu,fri,sat" />
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-pb-text-muted)', marginTop: 2 }}>Use: mon,tue,wed,thu,fri,sat,sun</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div><label className="pb-label">Start Time (24h IST)</label><input className="pb-input" name="start" defaultValue={cmsData.chat_start || '09:00'} placeholder="09:00" /></div>
                      <div><label className="pb-label">End Time (24h IST)</label><input className="pb-input" name="end" defaultValue={cmsData.chat_end || '18:00'} placeholder="18:00" /></div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}><i className="fas fa-save"></i> Save Chat Settings</button>
                  </form>
                </div>

                {/* About Us Settings */}
                <div className="glass" style={{ padding: 28, marginBottom: 24 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 6px' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: 8, color: 'var(--color-pb-primary)' }}></i>
                    About Us / Page Content
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)', marginBottom: 20 }}>
                    Edit the About Us page content, mission statement, and page descriptions.
                  </p>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const form = new FormData(e.target);
                    const data = Object.fromEntries(form);
                    const aboutData = {};
                    for (const [k, v] of Object.entries(data)) { aboutData['about_' + k] = v; }
                    const res = await adminFetch('/api/admin/cms', { method: 'POST', body: JSON.stringify(aboutData) });
                    if (res.ok) showToast('About Us content saved');
                    else showToast('Failed to save', 'error');
                  }} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 700 }}>
                    <div><label className="pb-label">Page Title</label><input className="pb-input" name="title" defaultValue={cmsData.about_title || 'About PawBandhan'} /></div>
                    <div><label className="pb-label">Mission Statement</label><textarea className="pb-textarea" name="mission" defaultValue={cmsData.about_mission || ''} rows={3} placeholder="Our mission is to..." /></div>
                    <div><label className="pb-label">About Description</label><textarea className="pb-textarea" name="description" defaultValue={cmsData.about_description || ''} rows={5} placeholder="Detailed about us content..." /></div>
                    <div><label className="pb-label">Vision</label><textarea className="pb-textarea" name="vision" defaultValue={cmsData.about_vision || ''} rows={3} placeholder="Our vision for the future..." /></div>
                    <div><label className="pb-label">Values</label><textarea className="pb-textarea" name="values" defaultValue={cmsData.about_values || ''} rows={3} placeholder="Compassion, Innovation, Community..." /></div>
                    <div><label className="pb-label">Founding Story</label><textarea className="pb-textarea" name="story" defaultValue={cmsData.about_story || ''} rows={4} placeholder="How PawBandhan started..." /></div>
                    <div><label className="pb-label">Copyright Text</label><input className="pb-input" name="copyright" defaultValue={cmsData.about_copyright || 'Designed and Developed by Capture Visual Studios'} /></div>
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}><i className="fas fa-save"></i> Save About Us</button>
                  </form>
                </div>

                {/* Donation Settings */}
                <div className="glass" style={{ padding: 28, marginBottom: 24 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 6px' }}>
                    <i className="fas fa-hand-holding-heart" style={{ marginRight: 8, color: 'var(--color-pb-primary)' }}></i>
                    Donation Settings
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)', marginBottom: 20 }}>
                    Configure the donation page and platform donation options.
                  </p>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const form = new FormData(e.target);
                    const data = Object.fromEntries(form);
                    const donationData = {};
                    for (const [k, v] of Object.entries(data)) { donationData['donation_' + k] = v; }
                    const res = await adminFetch('/api/admin/cms', { method: 'POST', body: JSON.stringify(donationData) });
                    if (res.ok) showToast('Donation settings saved');
                    else showToast('Failed to save', 'error');
                  }} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 600 }}>
                    <div><label className="pb-label">Donate to PawBandhan Title</label><input className="pb-input" name="platform_title" defaultValue={cmsData.donation_platform_title || 'Support PawBandhan'} /></div>
                    <div><label className="pb-label">Platform Donation Description</label><textarea className="pb-textarea" name="platform_desc" defaultValue={cmsData.donation_platform_desc || ''} rows={3} placeholder="Help us keep the platform running..." /></div>
                    <div><label className="pb-label">UPI ID for Direct Donations</label><input className="pb-input" name="upi_id" defaultValue={cmsData.donation_upi_id || ''} placeholder="pawbandhan@upi" /></div>
                    <div><label className="pb-label">Bank Account (for large donations)</label><input className="pb-input" name="bank_details" defaultValue={cmsData.donation_bank_details || ''} placeholder="Account details..." /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div><label className="pb-label">Min Donation Amount (₹)</label><input className="pb-input" name="min_amount" type="number" defaultValue={cmsData.donation_min_amount || '10'} /></div>
                      <div><label className="pb-label">Platform Fee (%)</label><input className="pb-input" name="platform_fee_pct" type="number" defaultValue={cmsData.donation_platform_fee_pct || '0'} min="0" max="100" /></div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}><i className="fas fa-save"></i> Save Donation Settings</button>
                  </form>
                </div>

                {/* Page-specific Maintenance Mode */}
                <div className="glass" style={{ padding: 28 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 6px' }}>
                    <i className="fas fa-wrench" style={{ marginRight: 8, color: 'var(--color-pb-danger)' }}></i>
                    Maintenance Mode
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)', marginBottom: 20 }}>
                    Enable maintenance mode per page. Pages in maintenance show a custom message to visitors.
                  </p>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const form = new FormData(e.target);
                    const pages = ['home', 'donate', 'about', 'auth', 'dashboard', 'doctor', 'ngo', 'rep'];
                    const data = {};
                    pages.forEach(p => { data['maintenance_' + p] = form.get(p) === 'on' ? 'true' : 'false'; });
                    data['maintenance_message'] = form.get('message') || 'We are currently performing maintenance. Please check back later.';
                    const res = await adminFetch('/api/admin/cms', { method: 'POST', body: JSON.stringify(data) });
                    if (res.ok) showToast('Maintenance settings saved');
                    else showToast('Failed to save', 'error');
                  }} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 600 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {['home', 'donate', 'about', 'auth', 'dashboard', 'doctor', 'ngo', 'rep'].map(page => (
                        <label key={page} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-pb-border)', cursor: 'pointer' }}>
                          <input type="checkbox" name={page} defaultChecked={cmsData['maintenance_' + page] === 'true'} style={{ width: 18, height: 18 }} />
                          <span style={{ fontSize: '0.88rem', fontWeight: 500, textTransform: 'capitalize' }}>{page}</span>
                        </label>
                      ))}
                    </div>
                    <div><label className="pb-label">Maintenance Message</label><textarea className="pb-textarea" name="message" defaultValue={cmsData.maintenance_message || 'We are currently performing maintenance. Please check back later.'} rows={2} /></div>
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}><i className="fas fa-save"></i> Save Maintenance Settings</button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
