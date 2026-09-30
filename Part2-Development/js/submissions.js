/* Module 4 + 5 — Grade Submission, Verification and Compliance Evaluation
   FR-04, FR-05, FR-06, FR-07, FR-08, BR-03 … BR-09 */
(async () => {
  const auth = await requireAuth(null, 'submissions.html');
  if (!auth || auth.denied) return;
  const staff = isStaff(auth.profile);
  const alertEl = document.getElementById('alert');
  const $ = id => document.getElementById(id);
  let scholars = [], programs = [];

  async function loadOptions() {
    scholars = await loadScholars();
    programs = await loadPrograms(false);
    $('s-scholar').innerHTML = '<option value="">-- Select scholar --</option>' +
      scholars.map(s => `<option value="${s.id}">${esc(s.full_name)} (${esc(s.student_id)})</option>`).join('');
  }

  async function render() {
    const statusFilter = $('q-status').value;
    const search = $('q-search').value.trim().toLowerCase();
    let q = sb.from('grade_submissions').select(
      '*, scholars(full_name, student_id, scholarship_id, scholarship_programs(program_name))'
    ).order('submitted_at', { ascending: false });
    if (statusFilter) q = q.eq('submission_status', statusFilter);
    const { data, error } = await q;
    if (error) return showAlert(alertEl, 'Load failed: ' + error.message, 'error');

    const rows = (data || []).filter(r => !search ||
      (r.scholars?.student_id || '').toLowerCase().includes(search) ||
      (r.scholars?.full_name || '').toLowerCase().includes(search));

    $('sub-rows').innerHTML = rows.length ? rows.map(r => {
      const evRaw = r.compliance_evaluations;
      const ev = Array.isArray(evRaw) ? evRaw[0] : evRaw;
      const evalCell = r.submission_status === 'Verified'
        ? (ev && ev.result ? badge(ev.result) : '<span class="muted">Evaluating…</span>')
        : '<span class="muted">—</span>';
      let action = '';
      if (staff && r.submission_status === 'Pending') {
        action = `<button class="btn small success" data-verify="${r.id}">Verify</button>
                  <button class="btn small danger" data-return="${r.id}">Return</button>`;
      } else if (staff && r.submission_status === 'Returned') {
        action = '<span class="muted">Awaiting resubmission</span>';
      } else if (r.submission_status === 'Verified') {
        action = `<span class="muted">${r.verified_by ? 'Verified ' + fmtDate(r.verified_at) : ''}</span>`;
      }
      return `<tr>
        <td><b>${esc(r.scholars?.full_name)}</b><br><span class="muted">${esc(r.scholars?.student_id)} · ${esc(r.scholars?.scholarship_programs?.program_name || '')}</span></td>
        <td>${esc(r.academic_year)}<br><span class="muted">${esc(r.semester)}</span></td>
        <td>${esc(r.gwa)}</td>
        <td>${esc(r.units_enrolled)}</td>
        <td>${esc(r.failed_subjects)} / ${esc(r.incomplete_subjects)}</td>
        <td>${badge(r.submission_status)}${r.return_reason ? `<br><span class="muted">${esc(r.return_reason)}</span>` : ''}</td>
        <td>${evalCell}</td>
        <td class="needs-staff">${action}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="8" class="muted">No submissions found.</td></tr>';

    document.querySelectorAll('[data-verify]').forEach(b => b.onclick = () => verify(Number(b.dataset.verify)));
    document.querySelectorAll('[data-return]').forEach(b => b.onclick = () => returnSub(Number(b.dataset.return)));
  }

  /* --- UC-07 Verify → automatically runs UC-08 Evaluate --- */
  async function verify(id) {
    const { data: sub, error: e1 } = await sb.from('grade_submissions')
      .select('*, scholars(scholarship_id, scholarship_programs(*))')
      .eq('id', id).maybeSingle();
    if (e1 || !sub) return showAlert(alertEl, 'Submission not found.', 'error');
    if (sub.submission_status !== 'Pending') return showAlert(alertEl, 'Only Pending submissions may be verified (BR-09).', 'error');

    const program = sub.scholars?.scholarship_programs;
    if (!program) return showAlert(alertEl, 'Scholar has no assigned program (BR-01/BR-02).', 'error');

    const now = new Date().toISOString();
    const { error: e2 } = await sb.from('grade_submissions').update({
      submission_status: 'Verified', verified_by: auth.profile.id, verified_at: now, return_reason: null
    }).eq('id', id);
    if (e2) return showAlert(alertEl, 'Verify failed: ' + e2.message, 'error');

    // UC-08: evaluate only a Verified submission (BR-05)
    const { result, reasons } = evaluateSubmission(sub, program);
    const { error: e3 } = await sb.from('compliance_evaluations').upsert({
      scholar_id: sub.scholar_id,
      submission_id: sub.id,
      academic_year: sub.academic_year,
      semester: sub.semester,
      result,
      reasons,
      evaluated_by: auth.profile.id,
      evaluated_at: now
    }, { onConflict: 'submission_id' });
    if (e3) return showAlert(alertEl, 'Evaluation failed: ' + e3.message, 'error');

    await syncScholarStatus(sub.scholar_id);
    showAlert(alertEl, `Verified and evaluated: ${result}${reasons.length ? ' — ' + reasons.join('; ') : ''} (${result === 'Compliant' ? 'all requirements met' : 'deficiency recorded'})`, result === 'Compliant' ? 'success' : 'error');
    await render();
  }

  async function returnSub(id) {
    const reason = window.prompt('Reason for returning this submission:') || 'Incomplete or incorrect information';
    const { error } = await sb.from('grade_submissions').update({
      submission_status: 'Returned', return_reason: reason
    }).eq('id', id);
    if (error) return showAlert(alertEl, 'Return failed: ' + error.message, 'error');
    const { data: sub } = await sb.from('grade_submissions').select('scholar_id').eq('id', id).maybeSingle();
    if (sub) await syncScholarStatus(sub.scholar_id);
    showAlert(alertEl, 'Submission returned to the scholar (status: Pending Submission).', 'info');
    await render();
  }

  /* --- UC-06 Submit Grades --- */
  $('submission-form').onsubmit = async (e) => {
    e.preventDefault();
    hideAlert(alertEl);
    const scholarId = Number($('s-scholar').value);
    const year = $('s-year').value;
    const sem = $('s-sem').value;
    const gwa = Number($('s-gwa').value);
    const units = Number($('s-units').value);
    const failed = Number($('s-failed').value);
    const inc = Number($('s-inc').value);

    if (!scholarId) return showAlert(alertEl, 'Select a scholar.', 'error');
    const scholar = scholars.find(s => s.id === scholarId);
    if (!scholar || !scholar.scholarship_id) return showAlert(alertEl, 'Scholar must have a scholarship program (BR-01).', 'error');
    if (!isValidGwa(gwa)) return showAlert(alertEl, 'GWA must be within the valid range 1.00 – 5.00.', 'error');
    if (units < 0 || isNaN(units)) return showAlert(alertEl, 'Units enrolled cannot be negative.', 'error');
    if (failed < 0 || inc < 0 || isNaN(failed) || isNaN(inc))
      return showAlert(alertEl, 'Failed/incomplete counts cannot be negative.', 'error');

    const { data: dup } = await sb.from('grade_submissions')
      .select('id').eq('scholar_id', scholarId).eq('academic_year', year).eq('semester', sem);
    if (dup && dup.length) return showAlert(alertEl, 'A submission for this scholar/academic year/semester already exists (BR-03).', 'error');

    const { error } = await sb.from('grade_submissions').insert({
      scholar_id: scholarId, academic_year: year, semester: sem,
      gwa, units_enrolled: units, failed_subjects: failed, incomplete_subjects: inc,
      submission_status: 'Pending'
    });
    if (error) return showAlert(alertEl, 'Save failed: ' + error.message, 'error');

    await syncScholarStatus(scholarId); // → For Verification (FR-09)
    showAlert(alertEl, 'Submission saved as Pending / For Verification (TC-04).', 'success');
    $('submission-form').reset();
    $('s-failed').value = 0; $('s-inc').value = 0;
    await render();
  };

  $('q-status').onchange = render;
  $('q-search').oninput = render;

  await loadOptions();
  await render();
})();
