/* Module 3 — Scholarship Program and Requirement Management (FR-03, BR-02) */
(async () => {
  const auth = await requireAuth(null, 'programs.html');
  if (!auth || auth.denied) return;
  const staff = isStaff(auth.profile);
  const alertEl = document.getElementById('alert');
  const $ = id => document.getElementById(id);
  let editingId = null;

  async function render() {
    const programs = await loadPrograms(false);
    $('program-rows').innerHTML = programs.length ? programs.map(p => `<tr>
        <td><b>${esc(p.program_name)}</b></td>
        <td>≤ ${p.required_gwa}</td>
        <td>≥ ${p.min_units}</td>
        <td>${p.allow_failing_grade ? '<span class="badge b-ok">Allowed</span>' : '<span class="badge b-bad">Not allowed</span>'}</td>
        <td>${p.active ? '<span class="badge b-ok">Active</span>' : '<span class="badge b-neutral">Inactive</span>'}</td>
        <td>${staff ? `<button class="btn small secondary" data-edit="${p.id}">Edit</button>` : ''}</td>
      </tr>`).join('') : '<tr><td colspan="6" class="muted">No programs configured.</td></tr>';

    document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
      const p = programs.find(x => x.id === Number(b.dataset.edit));
      editingId = p.id;
      $('form-title').textContent = 'Edit Program — ' + p.program_name;
      $('p-name').value = p.program_name;
      $('p-gwa').value = p.required_gwa;
      $('p-units').value = p.min_units;
      $('p-fail').value = String(p.allow_failing_grade);
      $('p-active').value = String(p.active);
      $('btn-cancel').classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  $('btn-cancel').onclick = () => {
    editingId = null;
    $('program-form').reset();
    $('form-title').textContent = 'Create Scholarship Program';
    $('btn-cancel').classList.add('hidden');
    hideAlert(alertEl);
  };

  $('program-form').onsubmit = async (e) => {
    e.preventDefault();
    hideAlert(alertEl);
    if (!staff) return showAlert(alertEl, 'Only staff/admin may configure programs (BR-04).', 'error');

    const name = $('p-name').value.trim();
    const gwa = Number($('p-gwa').value);
    const units = Number($('p-units').value);
    if (!name) return showAlert(alertEl, 'Program name is required.', 'error');
    if (!isValidGwa(gwa)) return showAlert(alertEl, 'Required GWA must be within 1.00 – 5.00.', 'error');
    if (units < 0 || isNaN(units)) return showAlert(alertEl, 'Minimum units cannot be negative.', 'error');

    const payload = {
      program_name: name, required_gwa: gwa, min_units: units,
      allow_failing_grade: $('p-fail').value === 'true',
      active: $('p-active').value === 'true'
    };
    let error;
    if (editingId) ({ error } = await sb.from('scholarship_programs').update(payload).eq('id', editingId));
    else ({ error } = await sb.from('scholarship_programs').insert(payload));

    if (error) return showAlert(alertEl, 'Save failed: ' + error.message, 'error');
    showAlert(alertEl, editingId ? 'Program updated.' : 'Program created with its own requirements (BR-02).', 'success');
    editingId = null;
    $('program-form').reset();
    $('form-title').textContent = 'Create Scholarship Program';
    $('btn-cancel').classList.add('hidden');
    await render();
  };

  await render();
})();
