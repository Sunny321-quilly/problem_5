/* Compliance view — FR-07, FR-08, FR-09, FR-13 (UC-08, UC-11, UC-15) */
(async () => {
  const auth = await requireAuth(null, 'compliance.html');
  if (!auth || auth.denied) return;
  const staff = isStaff(auth.profile);
  const alertEl = document.getElementById('alert');
  const $ = id => document.getElementById(id);
  let all = [];

  async function load() {
    const { data, error } = await sb.from('compliance_evaluations')
      .select(`*, scholars(student_id, full_name, status, scholarship_id, scholarship_programs(program_name)),
               grade_submissions(gwa, units_enrolled, failed_subjects, incomplete_subjects)`)
      .order('evaluated_at', { ascending: false });
    if (error) return showAlert(alertEl, 'Load failed: ' + error.message, 'error');
    all = data || [];

    const programs = await loadPrograms(false);
    $('q-program').innerHTML = '<option value="">All Programs</option>' +
      programs.map(p => `<option value="${p.id}">${esc(p.program_name)}</option>`).join('');
  }

  function filtered() {
    const res = $('q-result').value;
    const prog = $('q-program').value;
    const search = $('q-search').value.trim().toLowerCase();
    return all.filter(e => {
      const s = e.scholars || {};
      return (!res || e.result === res)
        && (!prog || String(s.scholarship_id) === prog)
        && (!search || (s.student_id || '').toLowerCase().includes(search) || (s.full_name || '').toLowerCase().includes(search));
    });
  }

  function render() {
    const rows = filtered();
    const ok = rows.filter(r => r.result === 'Compliant').length;
    $('k-ok').textContent = ok;
    $('k-bad').textContent = rows.length - ok;
    $('k-all').textContent = rows.length;

    $('comp-rows').innerHTML = rows.length ? rows.map(e => {
      const s = e.scholars || {};
      const g = e.grade_submissions || {};
      const reasons = Array.isArray(e.reasons) ? e.reasons : [];
      return `<tr>
        <td><b>${esc(s.full_name)}</b><br><span class="muted">${esc(s.student_id)}</span></td>
        <td>${esc(s.scholarship_programs?.program_name || '—')}</td>
        <td>${esc(e.academic_year)}<br><span class="muted">${esc(e.semester)}</span></td>
        <td>${esc(g.gwa)} / ${esc(g.units_enrolled)} units</td>
        <td>${esc(g.failed_subjects)} / ${esc(g.incomplete_subjects)}</td>
        <td>${badge(e.result)}</td>
        <td>${reasons.length ? `<ul class="reasons">${reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : '<span class="muted">All requirements met (BR-06)</span>'}</td>
        <td>${fmtDate(e.evaluated_at)}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="8" class="muted">No evaluations yet — verify a grade submission first.</td></tr>';

    if (staff) renderStatusBoard();
  }

  async function renderStatusBoard() {
    const scholars = await loadScholars();
    $('status-rows').innerHTML = scholars.length ? scholars.map(s => `<tr>
        <td>${esc(s.student_id)}</td><td>${esc(s.full_name)}</td>
        <td>${esc(s.scholarship_programs?.program_name || '—')}</td><td>${badge(s.status)}</td>
      </tr>`).join('') : '<tr><td colspan="4" class="muted">No scholars.</td></tr>';
  }

  $('btn-export').onclick = () => {
    const rows = filtered();
    const header = ['Student ID','Name','Program','Academic Year','Semester','GWA','Units','Failed','Incomplete','Result','Reasons','Evaluated At'];
    const lines = [header.join(',')].concat(rows.map(e => {
      const s = e.scholars || {}, g = e.grade_submissions || {};
      const reasons = (Array.isArray(e.reasons) ? e.reasons : []).join(' | ');
      return [s.student_id, s.full_name, s.scholarship_programs?.program_name, e.academic_year, e.semester,
              g.gwa, g.units_enrolled, g.failed_subjects, g.incomplete_subjects, e.result, reasons,
              fmtDate(e.evaluated_at)]
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
    }));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'compliance-report.csv';
    a.click();
    showAlert(alertEl, 'Compliance report exported (UC-15).', 'success');
  };

  ['q-result','q-program'].forEach(id => $(id).onchange = render);
  $('q-search').oninput = render;

  await load();
  await render();
})();
