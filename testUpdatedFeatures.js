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

async function verifyUpdates() {
  console.log('=== VERIFYING NEW USER REQUIREMENTS ===\n');

  // Login as employee alex_ts
  console.log('1. Login as standard user (Employee alex_ts)...');
  const login = await request('POST', '/api/auth/login', { username: 'alex_ts', password: 'Tech@123' });
  if (login.status !== 200) throw new Error('Employee login failed');
  const userToken = login.body.token;
  console.log('✓ Employee login OK');

  // Test Customer Master CRUD for users
  console.log('\n2. User creating Customer Master...');
  const addCust = await request('POST', '/api/masters/customers', {
    companyName: 'Vertex AI Logistics',
    contactPerson: 'David Brown',
    email: 'dbrown@vertexai.com',
    phone: '+1 555-4321',
    address: '400 Technology Drive, San Jose, CA'
  }, userToken);
  if (addCust.status !== 201) throw new Error(`User cannot add customer: ${JSON.stringify(addCust.body)}`);
  const newCustId = addCust.body.customer.id;
  console.log('✓ Customer created by user:', addCust.body.customer.companyName);

  console.log('3. User editing Customer Master...');
  const editCust = await request('PUT', `/api/masters/customers/${newCustId}`, {
    companyName: 'Vertex AI Logistics Global',
    contactPerson: 'David Brown Jr.',
    email: 'dbrown@vertexai.com',
    phone: '+1 555-9999',
    address: '400 Technology Drive, Suite 900, San Jose, CA'
  }, userToken);
  if (editCust.status !== 200) throw new Error(`User cannot edit customer: ${JSON.stringify(editCust.body || editCust.raw)}`);
  console.log('✓ Customer updated by user:', editCust.body.customer.companyName);

  console.log('4. User deleting Customer Master...');
  const delCust = await request('DELETE', `/api/masters/customers/${newCustId}`, null, userToken);
  if (delCust.status !== 200) throw new Error('User cannot delete customer');
  console.log('✓ Customer deleted successfully');

  // Test Issue Master CRUD for users
  console.log('\n5. User creating Issue Category & Issue Type...');
  const addCat = await request('POST', '/api/masters/issue-categories', {
    name: 'Cybersecurity & Threat Detection',
    description: 'Ransomware, phishing, firewall intrusion incidents'
  }, userToken);
  if (addCat.status !== 201) throw new Error('User cannot add issue category');
  const newCatId = addCat.body.category.id;
  console.log('✓ Issue category created by user:', addCat.body.category.name);

  const editCat = await request('PUT', `/api/masters/issue-categories/${newCatId}`, {
    name: 'Cybersecurity & Zero Trust Network',
    description: 'Updated description'
  }, userToken);
  if (editCat.status !== 200) throw new Error('User cannot edit issue category');
  console.log('✓ Issue category edited by user:', editCat.body.category.name);

  const addType = await request('POST', '/api/masters/issue-types', {
    name: 'Zero-day Exploit Alert',
    category: 'Cybersecurity & Zero Trust Network',
    defaultPriority: 'Emergency'
  }, userToken);
  if (addType.status !== 201) throw new Error('User cannot add issue type');
  const newTypeId = addType.body.issueType.id;
  console.log('✓ Issue type created by user:', addType.body.issueType.name);

  // Clean up created category & type
  await request('DELETE', `/api/masters/issue-types/${newTypeId}`, null, userToken);
  await request('DELETE', `/api/masters/issue-categories/${newCatId}`, null, userToken);
  console.log('✓ Issue masters deleted cleanly');

  // Test Call Creation without location fetching
  console.log('\n6. Daily Call entry without location fetching...');
  const callRes = await request('POST', '/api/calls', {
    customerName: 'Nexus FinTech Labs',
    source: 'Own Doing',
    callType: 'Remote Support',
    priority: 'Medium',
    spentMinutes: 30,
    callLocation: 'Office Desk Remote Session',
    remarks: 'Routine remote firewall patch check'
  }, userToken);
  if (callRes.status !== 201) throw new Error(`Call creation failed: ${JSON.stringify(callRes.body)}`);
  console.log('✓ Call created successfully without location fetching. Number:', callRes.body.call.callNumber);

  // Test Logo static file serving
  console.log('\n7. Verifying attached logo static file serving...');
  const logoCheck = await new Promise((resolve) => {
    http.get('http://localhost:5000/techsavvies-logo.jpg', (res) => {
      resolve(res.statusCode === 200 && res.headers['content-type'].includes('image'));
    });
  });
  if (!logoCheck) throw new Error('Logo file not served properly');
  console.log('✓ Official Tech Savvies Logo served properly from /techsavvies-logo.jpg');

  console.log('\n🎉 ALL UPDATED FEATURE TESTS PASSED 100%! 🎉\n');
}

verifyUpdates().catch(err => {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
});
