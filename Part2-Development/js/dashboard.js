/* Module 5 — Compliance Dashboard (FR-10, FR-13) */
(async () => {
  const auth = await requireAuth(null, 'index.html');
  if (!auth || auth.denied) return;
  const alertEl = document.getElementById('alert');

  async function count(table, filterFn) {
    let q = sb.from(table).select('*', { count: 'exact', head: true });
    if (filterFn) q = filterFn(q);
    const { count: n, error } = await q;
    if (error) throw error;
    return n || 0;
  }

  try {
    const [total, pending, verified, compliant, deficient] = await Promise.all([
      count('scholars'),
      count('grade_submissions', q => q.eq('submission_status', 'Pending')),
      count('grade_submissions', q => q.eq('submission_status', 'Verified')),
      count('scholars', q => q.eq('status', 'Compliant')),
      count('scholars', q => q.eq('status', 'With Deficiency'))
    ]);
    document.getElementById('c-total').textContent = total;
    document.getElementById('c-pending').textContent = pending;
    document.getElementById('c-verified').textContent = verified;
    document.getElementById('c-compliant').textContent = compliant;
    document.getElementById('c-deficient').textContent = deficient;

    const { data: pendingRows, error: e2 } = await sb.from('grade_submissions')
      .select('academic_year, semester, gwa, submitted_at, submission_status, scholars(full_name, student_id)')
      .eq('submission_status', 'Pending')
      .order('submitted_at', { ascending: false })
      .limit(8);
    if (e2) throw e2;
    document.getElementById('pending-rows').innerHTML = (pendingRows || []).length
      ? pendingRows.map(r => `<tr>
          <td>${esc(r.scholars?.full_name)} <span class="muted">${esc(r.scholars?.student_id)}</span></td>
          <td>${esc(r.academic_year)} · ${esc(r.semester)}</td>
          <td>${esc(r.gwa)}</td>
          <td>${fmtDate(r.submitted_at)}</td></tr>`).join('')
      : '<tr><td colspan="4" class="muted">No pending submissions.</td></tr>';

    const { data: scholars, error: e3 } = await sb.from('scholars').select('status');
    if (e3) throw e3;
    const counts = {};
    (scholars || []).forEach(s => counts[s.status] = (counts[s.status] || 0) + 1);
    const rows = STATUSES.map(st => `<tr><td>${badge(st)}</td><td class="right">${counts[st] || 0}</td></tr>`).join('');
    document.getElementById('status-rows').innerHTML = rows;
  } catch (err) {
    showAlert(alertEl, 'Dashboard error: ' + err.message, 'error');
  }
})();
