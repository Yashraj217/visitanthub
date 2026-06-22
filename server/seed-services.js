/**
 * Adds 3 services per test company, then fills service_id / service_name
 * on all test visits (those with ref_number LIKE 'REF%').
 * Run: node seed-services.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const mysql = require('mysql2/promise');

const CFG = {
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'visitor_management',
};

const SVC_NAMES  = ['General Consultation', 'Technical Support', 'Site Visit'];
const SVC_ICONS  = ['🩺', '🔧', '🏢'];
const SVC_COLORS = ['#6366f1', '#10b981', '#f59e0b'];
const BATCH      = 5_000;

function progress(label, done, total) {
  const pct = ((done / total) * 100).toFixed(1);
  process.stdout.write(`\r  ${label}: ${done.toLocaleString()} / ${total.toLocaleString()}  (${pct}%)   `);
}

async function main() {
  const start = Date.now();
  const conn  = await mysql.createConnection(CFG);
  console.log('Connected.\n');

  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  await conn.query('SET UNIQUE_CHECKS     = 0');
  await conn.query('SET autocommit        = 0');

  // ── 1. Find test companies ────────────────────────────────────────────────
  const [testCompanies] = await conn.query(
    "SELECT id FROM companies WHERE slug LIKE 'tc-%' ORDER BY id"
  );
  console.log(`Test companies found: ${testCompanies.length.toLocaleString()}`);

  // ── 2. Insert services ────────────────────────────────────────────────────
  // Skip companies that already have services seeded
  const [existingSvcs] = await conn.query(
    "SELECT DISTINCT company_id FROM services WHERE company_id IN (SELECT id FROM companies WHERE slug LIKE 'tc-%')"
  );
  const alreadyDone = new Set(existingSvcs.map(r => r.company_id));
  const toSeed = testCompanies.filter(r => !alreadyDone.has(r.id));

  console.log(`Companies needing services: ${toSeed.length.toLocaleString()}`);

  if (toSeed.length > 0) {
    console.log('Inserting services...');
    let batch = [], svcCount = 0;
    for (const { id: cid } of toSeed) {
      for (let i = 0; i < SVC_NAMES.length; i++) {
        svcCount++;
        batch.push([cid, SVC_NAMES[i], SVC_COLORS[i], SVC_ICONS[i]]);
        if (batch.length === BATCH) {
          await conn.query(
            'INSERT INTO services (company_id, name, color, icon) VALUES ?',
            [batch]
          );
          await conn.query('COMMIT');
          progress('Services', svcCount, toSeed.length * SVC_NAMES.length);
          batch = [];
        }
      }
    }
    if (batch.length) {
      await conn.query('INSERT INTO services (company_id, name, color, icon) VALUES ?', [batch]);
      await conn.query('COMMIT');
    }
    console.log(`\n  Done: ${svcCount.toLocaleString()} services\n`);
  }

  // ── 3. Build company → [svc1, svc2, svc3] map ────────────────────────────
  console.log('Loading service map...');
  const [allSvcs] = await conn.query(
    `SELECT id, company_id, name
     FROM services
     WHERE company_id IN (SELECT id FROM companies WHERE slug LIKE 'tc-%')
     ORDER BY company_id, id`
  );
  const svcMap = new Map(); // companyId → [{id, name}, ...]
  for (const r of allSvcs) {
    if (!svcMap.has(r.company_id)) svcMap.set(r.company_id, []);
    svcMap.get(r.company_id).push({ id: r.id, name: r.name });
  }
  console.log(`  Loaded ${svcMap.size.toLocaleString()} companies' service lists\n`);

  // ── 4. Update test visits with service_id / service_name ─────────────────
  console.log('Updating visits with service data...');
  let updated = 0, compIdx = 0;
  const allCids = [...svcMap.keys()];

  await conn.query('SET autocommit = 1'); // single-row updates are auto-committed

  for (const cid of allCids) {
    compIdx++;
    const svcs = svcMap.get(cid);
    if (!svcs || svcs.length < 3) continue;

    // Cycle through 3 services based on visit id % 3
    const [result] = await conn.query(
      `UPDATE visits
       SET service_id   = CASE (id % 3) WHEN 0 THEN ? WHEN 1 THEN ? ELSE ? END,
           service_name = CASE (id % 3) WHEN 0 THEN ? WHEN 1 THEN ? ELSE ? END
       WHERE company_id = ? AND ref_number LIKE 'REF%'`,
      [svcs[0].id, svcs[1].id, svcs[2].id,
       svcs[0].name, svcs[1].name, svcs[2].name,
       cid]
    );
    updated += result.affectedRows;
    if (compIdx % 500 === 0) progress('Companies updated', compIdx, allCids.length);
  }
  progress('Companies updated', compIdx, allCids.length);
  console.log(`\n  Total visits updated: ${updated.toLocaleString()}\n`);

  // ── Final verify ──────────────────────────────────────────────────────────
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  await conn.query('SET UNIQUE_CHECKS     = 1');
  await conn.end();

  const conn2 = await mysql.createConnection(CFG);
  const [[sv]] = await conn2.query('SELECT COUNT(*) n FROM services');
  const [[vw]] = await conn2.query("SELECT COUNT(*) n FROM visits WHERE service_id IS NOT NULL AND ref_number LIKE 'REF%'");
  const [[vn]] = await conn2.query("SELECT COUNT(*) n FROM visits WHERE service_id IS NULL AND ref_number LIKE 'REF%'");
  await conn2.end();

  console.log('─'.repeat(50));
  console.log(`services total          : ${sv.n.toLocaleString()}`);
  console.log(`test visits WITH service: ${vw.n.toLocaleString()}`);
  console.log(`test visits WITHOUT     : ${vn.n.toLocaleString()}`);
  console.log('─'.repeat(50));
  console.log(`Total time: ${((Date.now()-start)/1000).toFixed(1)}s`);
}

main().catch(err => { console.error('\nError:', err.message); process.exit(1); });
