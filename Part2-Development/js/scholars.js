/* Module 2 — Scholar Management (FR-01, FR-02, FR-11, FR-12) */
(async () => {
  const auth = await requireAuth(null, 'scholars.html');
  if (!auth || auth.denied) return;
  const staff = isStaff(auth.profile);
  const alertEl = document.getElementById('alert');
  const form = document.getElementById('scholar-form');
  let programs = [];
  let editingId = null;

  const $ = id => document.getElementById(id);

  async function init() {
    programs = await loadPrograms(false);
    $('f-program').innerHTML = '<option value="">-- Select program --</option>' +
      programs.map(p => `<option value="${p.id}">${esc(p.program_name)} (GWA ≤ ${p.required_gwa})</option>`).join('');
    $('q-program').innerHTML = '<option value="">All Programs</option>' +
      programs.map(p => `<option value="${p.id}">${esc(p.program_name)}</option>`).join('');
    $('q-status').innerHTML = '<option value="">All Statuses</option>' +
      STATUSES.map(s => `<option>${s}</option>`).join('');
    $('f-status').innerHTML = STATUSES.map(s => `<option>${s}</option>`).join('');
    await render();
  }

  async function render() {
    const search = $('q-search').value.trim().toLowerCase();
    const prog = $('q-program').value;
    const st = $('q-status').value;
    const all = await loadScholars();
    const rows = all.filter(s => {
      const matchSearch = !search ||
        s.student_id.toLowerCase().includes(search) ||
        s.full_name.toLowerCase().includes(search);
      const matchProg = !prog || String(s.scholarship_id) === prog;
      const matchSt = !st || s.status === st;
      return matchSearch && matchProg && matchSt;
    });
    $('result-count').textContent = `Showing ${rows.length} of ${all.length} scholars`;
    $('scholar-rows').innerHTML = rows.length ? rows.map(s => `<tr>
        <td><b>${esc(s.student_id)}</b></td>
        <td>${esc(s.full_name)}</td>
        <td>${esc(s.degree_program)}<br><span class="muted">${esc(s.year_level)}</span></td>
        <td>${esc(s.scholarship_programs?.program_name || '—')}</td>
        <td>${badge(s.status)}</td>
        <td>${staff ? `<button class="btn small secondary" data-edit="${s.id}">Edit</button>` : ''}</td>
      </tr>`).join('') : '<tr><td colspan="6" class="muted">No scholars found.</td></tr>';

    document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => startEdit(Number(b.dataset.edit), all));
  }

  function startEdit(id, list) {
    const s = list.find(x => x.id === id);
    if (!s) return;
    editingId = id;
    $('form-title').textContent = 'Edit Scholar — ' + s.student_id;
    $('f-student-id').value = s.student_id;
    $('f-name').value = s.full_name;
    $('f-degree').value = s.degree_program;
    $('f-year').value = s.year_level;
    $('f-program').value = s.scholarship_id;
    $('f-status').value = s.status;
    $('f-status').disabled = false;
    $('btn-cancel').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $('btn-cancel').onclick = () => {
    editingId = null;
    form.reset();
    $('form-title').textContent = 'Register Scholar';
    $('f-status').disabled = true;
    $('btn-cancel').classList.add('hidden');
    hideAlert(alertEl);
  };

  ['q-search','q-program','q-status'].forEach(id => {
    $(id).addEventListener('input', () => render());
    $(id).addEventListener('change', () => render());
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    hideAlert(alertEl);
    if (!staff) return showAlert(alertEl, 'Only staff/admin may modify scholar records (BR-04).', 'error');

    const studentId = $('f-student-id').value.trim();
    const name = $('f-name').value.trim();
    const degree = $('f-degree').value.trim();
    const year = $('f-year').value;
    const programId = $('f-program').value;

    if (!studentId) return showAlert(alertEl, 'Student ID cannot be blank (TC-03).', 'error');
    if (!programId) return showAlert(alertEl, 'Scholarship program must be selected (BR-01).', 'error');
    if (!name || !degree) return showAlert(alertEl, 'Full Name and Degree Program are required.', 'error');

    // uniqueness check (excluding the record being edited)
    const { data: dup } = await sb.from('scholars').select('id').eq('student_id', studentId);
    if (dup && dup.length && dup[0].id !== editingId) {
      return showAlert(alertEl, 'Student ID already exists — IDs must be unique.', 'error');
    }

    const payload = {
      student_id: studentId, full_name: name, degree_program: degree,
      year_level: year, scholarship_id: Number(programId)
    };

    let error;
    if (editingId) {
      ({ error } = await sb.from('scholars').update(payload).eq('id', editingId));
    } else {
      payload.status = 'Active'; // FR-09 initial status
      ({ error } = await sb.from('scholars').insert(payload));
    }
    if (error) return showAlert(alertEl, 'Save failed: ' + error.message, 'error');

    showAlert(alertEl, editingId ? 'Scholar updated.' : 'Scholar registered (status: Active).', 'success');
    editingId = null;
    form.reset();
    $('form-title').textContent = 'Register Scholar';
    $('f-status').disabled = true;
    $('btn-cancel').classList.add('hidden');
    await render();
  };

  await init();
})();
