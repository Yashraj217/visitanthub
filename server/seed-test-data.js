/**
 * Bulk test-data seeder
 * Inserts: 10,000 companies | 250,000 employees | 500,000 visitors | 2,500,000 visits
 * Run from server/ directory: node seed-test-data.js
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

const NUM_COMPANIES      = 10_000;
const EMP_PER_COMPANY    = 25;      // 250,000 total
const VIS_PER_COMPANY    = 50;      // 500,000 total
const VISITS_PER_VISITOR = 5;       // 2,500,000 total
const BATCH              = 5_000;

const CITIES      = ['Mumbai','Delhi','Bangalore','Chennai','Hyderabad','Pune','Kolkata','Ahmedabad','Jaipur','Surat'];
const DESIGNATIONS= ['Manager','Director','Engineer','Analyst','Executive','Supervisor','Coordinator','Consultant'];
const PURPOSES    = ['Meeting','Delivery','Interview','Maintenance','Consultation','Support','Sales Call','Training'];
const STATUSES    = ['pending','approved','rejected','completed'];

function progress(label, done, total) {
  const pct = ((done / total) * 100).toFixed(1);
  process.stdout.write(`\r  ${label}: ${done.toLocaleString()} / ${total.toLocaleString()}  (${pct}%)   `);
}

async function insertRows(conn, sql, rows) {
  if (!rows.length) return;
  await conn.query(sql, [rows]);
}

async function main() {
  const start = Date.now();
  console.log('Connecting to MySQL...');
  const conn = await mysql.createConnection(CFG);
  console.log('Connected.\n');

  // ── Get current max IDs ──────────────────────────────────────────────────
  const [[{ mc }]] = await conn.query('SELECT COALESCE(MAX(id),0) mc FROM companies');
  const [[{ me }]] = await conn.query('SELECT COALESCE(MAX(id),0) me FROM employees');
  const [[{ mv }]] = await conn.query('SELECT COALESCE(MAX(id),0) mv FROM visitors');

  console.log(`Current rows  — companies: ${mc}, employees: ${me}, visitors: ${mv}`);
  console.log(`Inserting     — ${NUM_COMPANIES.toLocaleString()} companies | ${(NUM_COMPANIES*EMP_PER_COMPANY).toLocaleString()} employees | ${(NUM_COMPANIES*VIS_PER_COMPANY).toLocaleString()} visitors | ${(NUM_COMPANIES*VIS_PER_COMPANY*VISITS_PER_VISITOR).toLocaleString()} visits\n`);

  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  await conn.query('SET UNIQUE_CHECKS     = 0');
  await conn.query('SET autocommit        = 0');

  try {

    // ── 1. Companies ────────────────────────────────────────────────────────
    console.log('Inserting companies...');
    let t0 = Date.now(), batch = [];
    for (let i = 1; i <= NUM_COMPANIES; i++) {
      batch.push([
        `Test Company ${mc + i}`,
        `tc-${mc + i}`,
        `company${mc + i}@testdata.local`,
        `9${String(mc + i).padStart(9,'0')}`,
        `${i} Test Street`,
        CITIES[(i-1) % CITIES.length],
        'Maharashtra', 'India', 'active',
      ]);
      if (batch.length === BATCH) {
        await insertRows(conn,
          'INSERT INTO companies (name,slug,email,phone,address,city,state,country,status) VALUES ?',
          batch);
        await conn.query('COMMIT');
        progress('Companies', i, NUM_COMPANIES);
        batch = [];
      }
    }
    if (batch.length) {
      await insertRows(conn,
        'INSERT INTO companies (name,slug,email,phone,address,city,state,country,status) VALUES ?',
        batch);
      await conn.query('COMMIT');
    }
    console.log(`\n  Done in ${((Date.now()-t0)/1000).toFixed(1)}s\n`);

    // ── 2. Employees ────────────────────────────────────────────────────────
    console.log('Inserting employees...');
    t0 = Date.now(); batch = []; let empCount = 0;
    for (let c = 1; c <= NUM_COMPANIES; c++) {
      const cid = mc + c;
      for (let e = 1; e <= EMP_PER_COMPANY; e++) {
        empCount++;
        batch.push([
          cid,
          `Associate ${me + empCount}`,
          `98${String(empCount).padStart(8,'0')}`,
          `emp${me + empCount}@testdata.local`,
          DESIGNATIONS[(empCount-1) % DESIGNATIONS.length],
          'Main Office', 'active',
        ]);
        if (batch.length === BATCH) {
          await insertRows(conn,
            'INSERT INTO employees (company_id,name,phone,email,designation,location,status) VALUES ?',
            batch);
          await conn.query('COMMIT');
          progress('Employees', empCount, NUM_COMPANIES * EMP_PER_COMPANY);
          batch = [];
        }
      }
    }
    if (batch.length) {
      await insertRows(conn,
        'INSERT INTO employees (company_id,name,phone,email,designation,location,status) VALUES ?',
        batch);
      await conn.query('COMMIT');
    }
    console.log(`\n  Done in ${((Date.now()-t0)/1000).toFixed(1)}s\n`);

    // ── 3. Visitors ─────────────────────────────────────────────────────────
    console.log('Inserting visitors...');
    t0 = Date.now(); batch = []; let visCount = 0;
    for (let c = 1; c <= NUM_COMPANIES; c++) {
      const cid = mc + c;
      for (let v = 1; v <= VIS_PER_COMPANY; v++) {
        visCount++;
        batch.push([
          cid,
          `Visitor ${mv + visCount}`,
          `70${String(visCount).padStart(8,'0')}`,
          `vis${mv + visCount}@testdata.local`,
        ]);
        if (batch.length === BATCH) {
          await insertRows(conn,
            'INSERT INTO visitors (company_id,name,mobile,email) VALUES ?',
            batch);
          await conn.query('COMMIT');
          progress('Visitors', visCount, NUM_COMPANIES * VIS_PER_COMPANY);
          batch = [];
        }
      }
    }
    if (batch.length) {
      await insertRows(conn,
        'INSERT INTO visitors (company_id,name,mobile,email) VALUES ?',
        batch);
      await conn.query('COMMIT');
    }
    console.log(`\n  Done in ${((Date.now()-t0)/1000).toFixed(1)}s\n`);

    // ── 4. Visits ────────────────────────────────────────────────────────────
    // Employees for company c start at: me + (c-1)*EMP_PER_COMPANY + 1
    // Visitors  for company c start at: mv + (c-1)*VIS_PER_COMPANY  + 1
    console.log('Inserting visits...');
    t0 = Date.now(); batch = []; let visitCount = 0;
    const TOTAL_VISITS = NUM_COMPANIES * VIS_PER_COMPANY * VISITS_PER_VISITOR;
    const nowMs = Date.now();

    for (let c = 1; c <= NUM_COMPANIES; c++) {
      const cid     = mc + c;
      const empBase = me + (c - 1) * EMP_PER_COMPANY;  // first emp ID - 1 for this company
      const visBase = mv + (c - 1) * VIS_PER_COMPANY;  // first vis ID - 1 for this company

      for (let v = 1; v <= VIS_PER_COMPANY; v++) {
        const visitorId = visBase + v;
        for (let vt = 0; vt < VISITS_PER_VISITOR; vt++) {
          visitCount++;
          // cycle through employees of this company
          const empId   = empBase + ((visitCount % EMP_PER_COMPANY) || EMP_PER_COMPANY);
          const daysAgo = (visitCount % 365);
          const visitTime = new Date(nowMs - daysAgo * 86_400_000);
          batch.push([
            `REF${String(visitCount).padStart(9,'0')}`,
            cid,
            visitorId,
            empId,
            visitTime,
            PURPOSES[visitCount % PURPOSES.length],
            STATUSES[visitCount % STATUSES.length],
          ]);
          if (batch.length === BATCH) {
            await insertRows(conn,
              'INSERT INTO visits (ref_number,company_id,visitor_id,employee_id,visit_time,purpose,status) VALUES ?',
              batch);
            await conn.query('COMMIT');
            progress('Visits', visitCount, TOTAL_VISITS);
            batch = [];
          }
        }
      }
    }
    if (batch.length) {
      await insertRows(conn,
        'INSERT INTO visits (ref_number,company_id,visitor_id,employee_id,visit_time,purpose,status) VALUES ?',
        batch);
      await conn.query('COMMIT');
    }
    console.log(`\n  Done in ${((Date.now()-t0)/1000).toFixed(1)}s\n`);

  } finally {
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.query('SET UNIQUE_CHECKS     = 1');
    await conn.query('SET autocommit        = 1');
    await conn.end();
  }

  // ── Final count ─────────────────────────────────────────────────────────
  const conn2 = await mysql.createConnection(CFG);
  const [[cc]] = await conn2.query('SELECT COUNT(*) n FROM companies');
  const [[ec]] = await conn2.query('SELECT COUNT(*) n FROM employees');
  const [[vc]] = await conn2.query('SELECT COUNT(*) n FROM visitors');
  const [[vtc]]= await conn2.query('SELECT COUNT(*) n FROM visits');
  await conn2.end();

  console.log('─'.repeat(50));
  console.log(`companies : ${cc.n.toLocaleString()}`);
  console.log(`employees : ${ec.n.toLocaleString()}`);
  console.log(`visitors  : ${vc.n.toLocaleString()}`);
  console.log(`visits    : ${vtc.n.toLocaleString()}`);
  console.log('─'.repeat(50));
  console.log(`Total time: ${((Date.now()-start)/1000).toFixed(1)}s`);
}

main().catch(err => { console.error('\nError:', err.message); process.exit(1); });
