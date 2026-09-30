// Supabase connection settings — replace with your own project values.
// Supabase Dashboard -> Project Settings -> API
window.SUPABASE_CONFIG = {
  url: "https://zesatusefypnavqcpqxh.supabase.co",      // e.g. https://abcdefghij.supabase.co
  anonKey: "sb_publishable_wydpmyq7w6KkqrEshFWq_Q_fDt_pGep"
};

// Demo credentials provisioned by sql/demo_account.sql (FR-14 - no public sign-up).
window.DEMO_ACCOUNTS = {
  admin:    { email: "admin@demo.scholarship.app",   password: "DemoAdmin123",   label: "Demo Admin" },
  staff:    { email: "staff@demo.scholarship.app",   password: "DemoStaff123",   label: "Demo Staff" },
  scholar1: { email: "2026001@demo.scholarship.app", password: "DemoScholar123", label: "Scholar 1 - Ana Reyes" },
  scholar2: { email: "2026002@demo.scholarship.app", password: "DemoScholar123", label: "Scholar 2 - Bruno Santos" }
};
