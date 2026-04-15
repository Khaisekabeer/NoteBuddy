const BASE_URL = 'http://localhost:5000/api';
const testCredentials = { username: 'testuser_senior', password: 'password123' };
let authToken = '';
let testNoteId = '';

async function runTests() {
  console.log('🚀 Starting Integration Tests...');

  try {
    // 1. Auth: Login
    console.log('\n--- 1. Auth: Login ---');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCredentials),
    });
    const loginData = await loginRes.json();
    if (loginRes.status === 200 && loginData.token) {
      console.log('✅ Login Successful');
      authToken = loginData.token;
    } else {
      throw new Error(`❌ Login Failed: ${JSON.stringify(loginData)}`);
    }

    // 2. Auth: Get Me
    console.log('\n--- 2. Auth: Get Me ---');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const meData = await meRes.json();
    if (meRes.status === 200 && meData.username === testCredentials.username) {
      console.log('✅ Get Me Successful');
    } else {
      throw new Error(`❌ Get Me Failed: ${JSON.stringify(meData)}`);
    }

    // 3. Notes: Create Note
    console.log('\n--- 3. Notes: Create Note ---');
    const createRes = await fetch(`${BASE_URL}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: 'Senior Test Title',
        content: 'This is a test content that should be encrypted in DB.',
        color: 'bg-blue-200',
        is_revealed: true
      }),
    });
    const createData = await createRes.json();
    if (createRes.status === 201 && createData.id) {
      console.log('✅ Create Note Successful. ID:', createData.id);
      testNoteId = createData.id;
    } else {
      throw new Error(`❌ Create Note Failed: ${JSON.stringify(createData)}`);
    }

    // 4. Notes: Get Notes (Confirm Decryption)
    console.log('\n--- 4. Notes: Get Notes (Decryption Check) ---');
    const notesRes = await fetch(`${BASE_URL}/notes`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const notesData = await notesRes.json();
    const testNote = notesData.find(n => n.id === testNoteId);
    if (testNote && testNote.title === 'Senior Test Title') {
      console.log('✅ Get Notes & Decryption Successful');
    } else {
      throw new Error(`❌ Get Notes failed or Decryption mismatch: ${JSON.stringify(testNote)}`);
    }

    // 5. Notes: Update Note
    console.log('\n--- 5. Notes: Update Note ---');
    const updateRes = await fetch(`${BASE_URL}/notes/${testNoteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: 'Updated Senior Title',
        content: 'Updated content',
        color: 'bg-red-200'
      }),
    });
    const updateData = await updateRes.json();
    if (updateRes.status === 200) {
      console.log('✅ Update Note Successful');
    } else {
      throw new Error(`❌ Update Note Failed: ${JSON.stringify(updateData)}`);
    }

    // 6. Notes: Delete Note
    console.log('\n--- 6. Notes: Delete Note ---');
    const deleteRes = await fetch(`${BASE_URL}/notes/${testNoteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    if (deleteRes.status === 200) {
      console.log('✅ Delete Note Successful');
    } else {
      throw new Error(`❌ Delete Note Failed`);
    }

    console.log('\n✨ ALL TESTS PASSED! Backend is stable and refactored correctly.');
    process.exit(0);

  } catch (err) {
    console.error('\n💥 TEST SUITE FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
