/* Shared client: Supabase init, auth guard, helpers (FR-14, BR-04, BR-10) */
let sb = null;
try {
  const cfg = window.SUPABASE_CONFIG || {};
  if (/^https?:\/\//.test(cfg.url) && cfg.anonKey && cfg.anonKey !== 'YOUR_SUPABASE_ANON_KEY') {
    sb = supabase.createClient(cfg.url, cfg.anonKey);
  }
} catch (e) { sb = null; }

const CONFIG_MSG = 'Supabase is not configured yet — edit js/config.js with your Project URL and anon key, then reload.';

const STATUSES = ['Active','Pending Submission','For Verification','Compliant','With Deficiency','Probationary','For Renewal','Renewed','Disqualified'];
const STAFF_ROLES = ['admin','staff'];

function showAlert(el, msg, type) {
  if (!el) return;
  el.className = 'alert show ' + (type || 'info');
  el.textContent = msg;
  if (type === 'success') setTimeout(() => { el.className = 'alert'; }, 4000);
}
function hideAlert(el) { if (el) el.className = 'alert'; }
function badge(status) {
  const map = {
    'Verified':'b-verified','Pending':'b-pending','Returned':'b-returned',
    'Compliant':'b-ok','With Deficiency':'b-bad','Active':'b-neutral',
    'For Verification':'b-pending','Pending Submission':'b-pending',
    'Probationary':'b-pending','For Renewal':'b-verified','Renewed':'b-ok','Disqualified':'b-bad'
  };
  return `<span class="badge ${map[status] || 'b-neutral'}">${status}</span>`;
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}
function isValidGwa(v) { const n = Number(v); return !isNaN(n) && n >= 1.00 && n <= 5.00; }

/* Auth ------------------------------------------------------------------ */
async function getCurrentProfile() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return data || null;
}
async function requireAuth(allowedRoles, page) {
  if (!sb) {
    showAlert(document.getElementById('alert'), CONFIG_MSG, 'error');
    return null;
  }
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.replace('login.html'); return null; }
  const profile = await getCurrentProfile();
  if (!profile) { window.location.replace('login.html'); return null; }
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    const el = document.getElementById('alert');
    showAlert(el, 'Access denied: your role ("' + profile.role + '") is not authorized for this page.', 'error');
    document.querySelectorAll('.needs-staff').forEach(n => n.classList.add('hidden'));
    return { profile, denied: true };
  }
  const nameEl = document.getElementById('user-name');
  if (nameEl) nameEl.textContent = profile.full_name + ' (' + profile.role + ')';
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.onclick = async () => { await sb.auth.signOut(); window.location.href = 'login.html'; };
  if (page) {
    document.querySelectorAll('.links a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === page);
    });
  }
  return { profile, denied: false };
}
function isStaff(profile) { return profile && STAFF_ROLES.includes(profile.role); }

/* Data helpers ----------------------------------------------------------- */
async function loadPrograms(onlyActive) {
  let q = sb.from('scholarship_programs').select('*').order('program_name');
  if (onlyActive) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
async function loadScholars() {
  const { data, error } = await sb.from('scholars').select('*, scholarship_programs(program_name)').order('full_name');
  if (error) throw error;
  return data || [];
}
/* Keep scholar status in sync with latest submission + evaluation (FR-09) */
async function syncScholarStatus(scholarId) {
  const { data: latest } = await sb.from('grade_submissions')
    .select('submission_status, compliance_evaluations(result)')
    .eq('scholar_id', scholarId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  let status = 'Active';
  if (latest) {
    if (latest.submission_status === 'Pending') status = 'For Verification';
    else if (latest.submission_status === 'Returned') status = 'Pending Submission';
    else {
      const ev = Array.isArray(latest.compliance_evaluations)
        ? latest.compliance_evaluations[0] : latest.compliance_evaluations;
      if (ev && ev.result) status = ev.result;
    }
  }
  await sb.from('scholars').update({ status, updated_at: new Date().toISOString() }).eq('id', scholarId);
  return status;
}
/* Compliance rule (documented, not hard-coded per screen):
   lower GWA is better (1.00 best, 5.00 failing).
   COMPLIANT when gwa <= required_gwa AND units_enrolled >= min_units
              AND (allow_failing_grade OR failed_subjects = 0)
              AND incomplete_subjects = 0   — otherwise WITH DEFICIENCY (BR-06) */
function evaluateSubmission(sub, program) {
  const reasons = [];
  if (Number(sub.gwa) > Number(program.required_gwa)) reasons.push(`GWA ${sub.gwa} exceeds allowed ${program.required_gwa}`);
  if (Number(sub.units_enrolled) < Number(program.min_units)) reasons.push(`Units ${sub.units_enrolled} below minimum ${program.min_units}`);
  if (!program.allow_failing_grade && Number(sub.failed_subjects) > 0) reasons.push(`${sub.failed_subjects} failed subject(s); program does not allow failing grades`);
  if (Number(sub.incomplete_subjects) > 0) reasons.push(`${sub.incomplete_subjects} incomplete subject(s)`);
  return { result: reasons.length ? 'With Deficiency' : 'Compliant', reasons };
}
