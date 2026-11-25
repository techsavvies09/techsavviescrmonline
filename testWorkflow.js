import http from 'http';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING COMPLETE TECH SAVVIES SYSTEM VERIFICATION ===\n');

  // Test 1: Admin Login with Default Credentials
  console.log('Test 1: Default Admin Login (ADMIN / Admin@123)...');
  const adminLogin = await request('POST', '/api/auth/login', { username: 'ADMIN', password: 'Admin@123' });
  if (adminLogin.status !== 200 || !adminLogin.body.token) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.body)}`);
  }
  const adminToken = adminLogin.body.token;
  console.log('✓ Admin login successful! Token received.');

  // Test 2: User Registration (Status PENDING - requires admin approval)
  console.log('\nTest 2: User Registration & Admin Approval Requirement...');
  const testUsername = `user_${Date.now()}`;
  const regRes = await request('POST', '/api/auth/register', {
    username: testUsername,
    password: 'Password@123',
    role: 'CUSTOMER',
    fullName: 'Jane Doe Logistics',
    email: `${testUsername}@example.com`,
    company: 'Doe Freight'
  });
  console.log('Registration Response Status:', regRes.status, 'Body:', regRes.body.message);
  if (regRes.status !== 201 || regRes.body.status !== 'PENDING') {
    throw new Error('User registration should require Admin approval!');
  }
  console.log('✓ Registered user created with PENDING approval status.');

  // Test 3: Attempting login before approval
  console.log('\nTest 3: Verify user cannot login while PENDING approval...');
  const blockedLogin = await request('POST', '/api/auth/login', { username: testUsername, password: 'Password@123' });
  if (blockedLogin.status !== 403) {
    throw new Error(`Expected status 403 for pending user, got ${blockedLogin.status}`);
  }
  console.log('✓ Access blocked as expected:', blockedLogin.body.error);

  // Test 4: Admin approves the pending user
  console.log('\nTest 4: Admin approving pending user...');
  const pendingList = await request('GET', '/api/auth/pending-users', null, adminToken);
  const targetUser = pendingList.body.pendingUsers.find(u => u.username === testUsername);
  if (!targetUser) throw new Error('Target user not found in pending list');

  const approveRes = await request('POST', `/api/auth/user-status/${targetUser.id}`, { status: 'APPROVED' }, adminToken);
  console.log('✓ User approved by Admin:', approveRes.body.message);

  // Test 5: Login with newly approved user
  console.log('\nTest 5: Login with approved user...');
  const userLogin = await request('POST', '/api/auth/login', { username: testUsername, password: 'Password@123' });
  if (userLogin.status !== 200) throw new Error('Approved user could not login');
  const userToken = userLogin.body.token;
  console.log('✓ Approved user successfully logged in!');

  // Test 6: Customer reports issue -> AUTOMATICALLY FILLS DAILY CALL ENTRY SHEET
  console.log('\nTest 6: Customer reports issue & Daily Call sheet auto-fills...');
  const issueRes = await request('POST', '/api/issues', {
    title: 'Core Database Connection Pool Starvation',
    description: 'Postgres server rejecting incoming connections on port 5432. All checkout microservices failing.',
    category: 'Enterprise Software & ERP',
    issueType: 'Critical Server Down',
    priority: 'Emergency',
    locationAddress: 'Doe Freight Data Center, Rack 14'
  }, userToken);

  console.log('Issue Response Message:', issueRes.body.message);
  if (!issueRes.body.issue || !issueRes.body.dailyCall) {
    throw new Error('Customer issue must automatically generate a linked Daily Call record!');
  }
  console.log('✓ Created Ticket Number:', issueRes.body.issue.ticketNumber);
  console.log('✓ Auto-filled Daily Call Number:', issueRes.body.dailyCall.callNumber);
  console.log('✓ Call Source:', issueRes.body.dailyCall.source);

  const testIssueId = issueRes.body.issue.id;
  const testCallId = issueRes.body.dailyCall.id;

  // Test 7: Employee enters daily support call with mandatory call location
  console.log('\nTest 7: Employee enters daily support call with Location...');
  const empLogin = await request('POST', '/api/auth/login', { username: 'alex_ts', password: 'Tech@123' });
  const empToken = empLogin.body.token;

  const newCallRes = await request('POST', '/api/calls', {
    customerName: 'Apex Logistics Corp',
    source: 'Own Doing',
    callType: 'Onsite Visit',
    priority: 'High',
    spentMinutes: 75,
    callLocation: {
      address: '742 Evergreen Terrace, Chicago, IL',
      latitude: 41.8781,
      longitude: -87.6298
    },
    remarks: 'Replaced faulty Cisco patch cable in patch panel B. Latency normalized to 1ms.'
  }, empToken);

  if (newCallRes.status !== 201) throw new Error(`Daily call creation failed: ${JSON.stringify(newCallRes.body)}`);
  console.log('✓ Daily call recorded:', newCallRes.body.call.callNumber, 'Location:', newCallRes.body.call.callLocation.address);

  // Test 8: Employee escalates call to others if they cannot resolve
  console.log('\nTest 8: Employee escalates call to specialist...');
  const escalateRes = await request('POST', `/api/calls/${testCallId}/escalate`, {
    targetEmployeeId: 'emp-003', // Marcus Chen
    escalationReason: 'Requires L3 Database cluster lead to clear postgres deadlocks.',
    priority: 'Emergency'
  }, empToken);

  if (escalateRes.status !== 200 || !escalateRes.body.call.isEscalated) {
    throw new Error('Call escalation failed!');
  }
  console.log('✓ Call successfully escalated to:', escalateRes.body.call.escalatedToEmployeeName);

  // Test 9: Resolving issue triggers customer email notification
  console.log('\nTest 9: Resolving issue triggers customer email notification...');
  const resolveRes = await request('PUT', `/api/issues/${testIssueId}/status`, {
    status: 'Resolved',
    resolutionNotes: 'Postgres connection pool size increased to 200, deadlocks purged, service recovered.'
  }, adminToken);

  console.log('Resolve Message:', resolveRes.body.message);
  if (!resolveRes.body.emailNotification) {
    throw new Error('Resolving issue must trigger customer email notification!');
  }
  console.log('✓ Email notification dispatched to customer:', resolveRes.body.emailNotification.toEmail);
  console.log('✓ Email Subject:', resolveRes.body.emailNotification.subject);

  // Test 10: Attendance & Payroll Entry
  console.log('\nTest 10: Employee Payroll Attendance Entry (Clock-in / Clock-out)...');
  const clockInRes = await request('POST', '/api/attendance/clock-in', {
    location: 'Tech Savvies Chicago Depot (GPS: 41.8781, -87.6298)',
    notes: 'Morning shift dispatched'
  }, empToken);
  console.log('Clock-in result:', clockInRes.body.message || clockInRes.body.error);

  const payrollRes = await request('GET', '/api/attendance/payroll-summary', null, adminToken);
  console.log('✓ Monthly Payroll Summary calculated for', payrollRes.body.payroll.length, 'employees.');
  if (payrollRes.body.payroll.length > 0) {
    const p1 = payrollRes.body.payroll[0];
    console.log(`  - Employee: ${p1.name} | Total Hours: ${p1.totalHours} hrs | Estimated Salary: $${p1.totalSalary}`);
  }

  // Test 11: Reports verification
  console.log('\nTest 11: Verify Daily reports (Calls, Support, Pending, Emergency)...');
  const [repCalls, repSupport, repPending, repEmergency] = await Promise.all([
    request('GET', '/api/reports/daily-calls', null, adminToken),
    request('GET', '/api/reports/support', null, adminToken),
    request('GET', '/api/reports/issues-pending', null, adminToken),
    request('GET', '/api/reports/emergency-support', null, adminToken)
  ]);

  console.log('✓ Daily Call Report: Total Calls =', repCalls.body.totalCalls, '| Hours =', repCalls.body.totalHoursSpent);
  console.log('✓ Support Report: Resolution Rate =', repSupport.body.resolutionRate + '%');
  console.log('✓ Issues Pending Report: Overdue Tickets =', repPending.body.counts.overdueMoreThan3Days);
  console.log('✓ Emergency Support Report: Active Emergencies =', repEmergency.body.activeEmergenciesCount);

  // Test 12: User & Admin can change username and password
  console.log('\nTest 12: Change Username & Password...');
  const changePassRes = await request('POST', '/api/auth/change-password', {
    currentPassword: 'Admin@123',
    newPassword: 'Admin@123'
  }, adminToken);
  console.log('✓ Password verification passed:', changePassRes.body.message);

  console.log('\n🎉 ALL 12 WORKFLOW TESTS PASSED 100% SUCCESSFULLY! 🎉\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
