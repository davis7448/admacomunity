// Firebase Config - ADMA Communities
const firebaseConfig = {
  apiKey: "AIzaSyDXz1Nza6ehNYaIv2i7el6pomjtNY2UHX0",
  authDomain: "adma-communities.firebaseapp.com",
  projectId: "adma-communities",
  storageBucket: "adma-communities.firebasestorage.app",
  messagingSenderId: "822839151563",
  appId: "1:822839151563:web:f043fa3e4e6a5fc43d044e"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
// Keep session after refresh/close browser
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(console.error);
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// ==================== AUTH ====================

// Login with Google
async function loginWithGoogle() {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error Google Login:", error);
    return null;
  }
}

// Login with Email
async function loginWithEmail(email, password) {
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    return result.user;
  } catch (error) {
    console.error("Error Email Login:", error);
    return null;
  }
}

// Register with Email
async function registerWithEmail(email, password, nombre) {
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    return result.user;
  } catch (error) {
    console.error("Error Register:", error);
    return null;
  }
}

// Logout
async function logout() {
  await auth.signOut();
}

// Auth state listener
function onAuthStateChange(callback) {
  auth.onAuthStateChanged(callback);
}

// ==================== USER DATA ====================

// Get user data
async function getUserData(userId) {
  const doc = await db.collection('users').doc(userId).get();
  return doc.exists ? doc.data() : null;
}

// Check if user exists in Firestore
async function checkUserExists(userId) {
  const doc = await db.collection('users').doc(userId).get();
  return doc.exists;
}

// Create or update user
async function createOrUpdateUser(userId, data) {
  await db.collection('users').doc(userId).set(data, { merge: true });
}

// ==================== COMUNIDADES ====================

// Get all comunidades
async function getComunidades() {
  const snapshot = await db.collection('comunidades').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Get comunidad by ID
async function getComunidad(comunidadId) {
  const doc = await db.collection('comunidades').doc(comunidadId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

// Get comunidad by code
async function getComunidadByCode(codigo) {
  const snapshot = await db.collection('comunidades')
    .where('codigo', '==', codigo.toUpperCase())
    .limit(1)
    .get();
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

// ==================== RETOS ====================

// Get retos by comunidad
async function getRetosByComunidad(comunidadId) {
  const snapshot = await db.collection('retos')
    .where('comunidadId', '==', comunidadId)
    .orderBy('createdAt', 'desc')
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Get global retos
async function getRetosGlobales() {
  const snapshot = await db.collection('retos')
    .where('tipo', '==', 'global')
    .orderBy('createdAt', 'desc')
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Get retos where user is enrolled
async function getRetosInscritos(userId) {
  const snapshot = await db.collection('inscripciones')
    .where('userId', '==', userId)
    .get();
  
  const retos = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const reto = await getReto(data.retoId);
    if (reto) retos.push({ ...reto, inscripcionId: doc.id });
  }
  return retos;
}

// Get reto by ID
async function getReto(retoId) {
  const doc = await db.collection('retos').doc(retoId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

// Inscribirse en reto
async function inscribirReto(userId, retoId, comunidadId) {
  // Check if already inscribed
  const existing = await db.collection('inscripciones')
    .where('userId', '==', userId)
    .where('retoId', '==', retoId)
    .get();
  
  if (!existing.empty) {
    return { success: false, message: "Ya estás inscrito en este reto" };
  }
  
  await db.collection('inscripciones').add({
    userId,
    retoId,
    comunidadId,
    progreso: 0,
    posicion: 0,
    completado: false,
    enrolledAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  return { success: true };
}

// ==================== VENTAS ====================

// Get ventas by user email
async function getVentasByEmail(email) {
  const snapshot = await db.collection('ventas')
    .where('correoDropshipper', '==', email.toLowerCase())
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Get ventas by comunidad (through user lookup)
async function getVentasByComunidad(comunidadId) {
  // Get users in comunidad
  const users = await db.collection('users')
    .where('comunidadId', '==', comunidadId)
    .get();
  
  const emails = users.docs.map(doc => doc.data().email.toLowerCase());
  
  if (emails.length === 0) return [];
  
  // Get ventas for all these emails
  const ventas = [];
  for (const email of emails) {
    const userVentas = await getVentasByEmail(email);
    ventas.push(...userVentas);
  }
  return ventas;
}

// ==================== LÍDERES ====================

// Check if user is líder
async function checkIsLider(userId) {
  const doc = await db.collection('lideres').doc(userId).get();
  return doc.exists;
}

// Get líder data
async function getLiderData(userId) {
  const doc = await db.collection('lideres').doc(userId).get();
  return doc.exists ? doc.data() : null;
}

// ==================== ADMIN ====================

// Check if user is admin
async function checkIsAdmin(userId) {
  const doc = await db.collection('admins').doc(userId).get();
  return doc.exists;
}

// Create leader
async function createLider(userId, data) {
  await db.collection('lideres').doc(userId).set({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Create comunidad
async function createComunidad(data) {
  const docRef = await db.collection('comunidades').add({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

// Create reto
async function createReto(data) {
  const docRef = await db.collection('retos').add({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

// Import ventas from Excel data
async function importVentas(dataArray) {
  const batch = db.batch();
  let imported = 0;
  
  for (const venta of dataArray) {
    const docRef = db.collection('ventas').doc();
    batch.set(docRef, {
      ...venta,
      importedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    imported++;
  }
  
  await batch.commit();
  return imported;
}
