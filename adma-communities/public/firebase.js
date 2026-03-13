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

// ==================== IN-MEMORY CACHE ====================

const cache = {
  comunidades: new Map(),
  usuarios: new Map(),
  retos: new Map(),
  lideres: new Map(),
  ventas: new Map(),
  _ttl: 5 * 60 * 1000, // 5 minutes TTL
  _timestamps: {
    comunidades: 0,
    usuarios: 0,
    retos: 0,
    lideres: 0,
    ventas: 0
  },
  
  isValid(collection) {
    return Date.now() - this._timestamps[collection] < this._ttl;
  },
  
  set(collection, key, value) {
    this[collection].set(key, value);
    this._timestamps[collection] = Date.now();
  },
  
  get(collection, key) {
    if (this[collection].has(key)) {
      return this[collection].get(key);
    }
    return null;
  },
  
  getAll(collection) {
    // Validate TTL before returning
    if (!this.isValid(collection)) {
      this[collection].clear();
      return [];
    }
    return Array.from(this[collection].values());
  },
  
  clear(collection) {
    if (collection) {
      this[collection].clear();
      this._timestamps[collection] = 0;
    } else {
      // Clear all
      for (const key of Object.keys(this._timestamps)) {
        this[key]?.clear?.();
        this._timestamps[key] = 0;
      }
    }
  }
};

// Cache para ventas por email (frecuentemente consultado)
const ventasCache = new Map();
const VENTAS_CACHE_TTL = 60 * 1000; // 1 minuto

function getCachedVentas(email) {
  const cached = ventasCache.get(email);
  if (cached && Date.now() - cached.timestamp < VENTAS_CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedVentas(email, data) {
  ventasCache.set(email, { data, timestamp: Date.now() });
}

function invalidateVentasCache(email) {
  if (email) {
    ventasCache.delete(email);
  } else {
    ventasCache.clear();
  }
}

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

// Get user data (with caching)
async function getUserData(userId) {
  // Check cache first
  const cached = cache.get('usuarios', userId);
  if (cached) return cached;
  
  const doc = await db.collection('users').doc(userId).get();
  if (doc.exists) {
    const data = doc.data();
    cache.set('usuarios', userId, data);
    return data;
  }
  return null;
}

// Get multiple users by IDs (optimized batch fetch)
async function getUsersByIds(userIds) {
  if (!userIds || userIds.length === 0) return [];
  
  const users = [];
  const uncachedIds = [];
  
  // Check cache first
  for (const userId of userIds) {
    const cached = cache.get('usuarios', userId);
    if (cached) {
      users.push({ id: userId, ...cached });
    } else {
      uncachedIds.push(userId);
    }
  }
  
  // Fetch uncached users in parallel
  if (uncachedIds.length > 0) {
    const promises = uncachedIds.map(id => db.collection('users').doc(id).get());
    const docs = await Promise.all(promises);
    
    for (const doc of docs) {
      if (doc.exists) {
        const data = doc.data();
        cache.set('usuarios', doc.id, data);
        users.push({ id: doc.id, ...data });
      }
    }
  }
  
  return users;
}

// Check if user exists in Firestore
async function checkUserExists(userId) {
  const doc = await db.collection('users').doc(userId).get();
  return doc.exists;
}

// Create or update user
async function createOrUpdateUser(userId, data) {
  await db.collection('users').doc(userId).set(data, { merge: true });
  // Invalidate cache
  cache.set('usuarios', userId, data);
}

// Get all users in a comunidad (optimized)
async function getUsersByComunidad(comunidadId) {
  const snapshot = await db.collection('users')
    .where('comunidadId', '==', comunidadId)
    .get();
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    // Cache each user
    cache.set('usuarios', doc.id, data);
    return { id: doc.id, ...data };
  });
}

// ==================== COMUNIDADES ====================

// Get all comunidades (with caching and optional pagination)
async function getComunidades(lastDoc = null, limit = 50) {
  // Check cache first for first page
  if (!lastDoc && cache.isValid('comunidades') && cache.comunidades.size > 0) {
    return cache.getAll('comunidades');
  }
  
  let query = db.collection('comunidades').orderBy('nombre').limit(limit);
  
  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }
  
  const snapshot = await query.get();
  const comunidades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Cache only first page
  if (!lastDoc) {
    cache.comunidades.clear();
    comunidades.forEach(c => cache.comunidades.set(c.id, c));
  }
  
  return comunidades;
}

// Get comunidades with pagination support
async function getComunidadesPaginated(limit = 20, lastDocId = null) {
  let query = db.collection('comunidades').orderBy('nombre').limit(limit);
  
  if (lastDocId) {
    const lastDoc = await db.collection('comunidades').doc(lastDocId).get();
    if (lastDoc.exists) {
      query = query.startAfter(lastDoc);
    }
  }
  
  const snapshot = await query.get();
  const comunidades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
  
  return {
    comunidades,
    lastDocId: lastDoc ? lastDoc.id : null,
    hasMore: snapshot.docs.length === limit
  };
}

// Get comunidad by ID (with caching)
async function getComunidad(comunidadId) {
  // Check cache first
  const cached = cache.get('comunidades', comunidadId);
  if (cached) return cached;
  
  const doc = await db.collection('comunidades').doc(comunidadId).get();
  if (doc.exists) {
    const data = { id: doc.id, ...doc.data() };
    cache.set('comunidades', comunidadId, data);
    return data;
  }
  return null;
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

// Get retos by comunidad (with pagination)
async function getRetosByComunidad(comunidadId, lastDoc = null, limit = 20) {
  let query = db.collection('retos')
    .where('comunidadId', '==', comunidadId)
    .orderBy('createdAt', 'desc')
    .limit(limit);
  
  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }
  
  const snapshot = await query.get();
  const retos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const lastDocument = snapshot.docs[snapshot.docs.length - 1] || null;
  
  return {
    retos,
    lastDoc: lastDocument,
    hasMore: snapshot.docs.length === limit
  };
}

// Get global retos (with pagination)
async function getRetosGlobales(lastDoc = null, limit = 20) {
  let query = db.collection('retos')
    .where('tipo', '==', 'global')
    .orderBy('createdAt', 'desc')
    .limit(limit);
  
  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }
  
  const snapshot = await query.get();
  const retos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const lastDocument = snapshot.docs[snapshot.docs.length - 1] || null;
  
  return {
    retos,
    lastDoc: lastDocument,
    hasMore: snapshot.docs.length === limit
  };
}

// Get all retos (paginated)
async function getAllRetos(lastDoc = null, limit = 20) {
  let query = db.collection('retos')
    .orderBy('createdAt', 'desc')
    .limit(limit);
  
  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }
  
  const snapshot = await query.get();
  const retos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const lastDocument = snapshot.docs[snapshot.docs.length - 1] || null;
  
  return {
    retos,
    lastDoc: lastDocument,
    hasMore: snapshot.docs.length === limit
  };
}

// Get retos where user is enrolled (OPTIMIZED - no N+1)
async function getRetosInscritos(userId) {
  const snapshot = await db.collection('inscripciones')
    .where('userId', '==', userId)
    .get();
  
  if (snapshot.empty) return [];
  
  // Get all inscripcion data
  const inscripciones = snapshot.docs.map(doc => ({
    inscripcionId: doc.id,
    retoId: doc.data().retoId,
    ...doc.data()
  }));
  
  // Collect all reto IDs
  const retoIds = inscripciones.map(i => i.retoId);
  
  // Fetch all retos in parallel (single batch instead of N queries)
  const retosPromises = retoIds.map(retoId => 
    db.collection('retos').doc(retoId).get()
  );
  
  const retoDocs = await Promise.all(retosPromises);
  
  // Combine data
  const retos = [];
  for (let i = 0; i < retoDocs.length; i++) {
    if (retoDocs[i].exists) {
      retos.push({
        ...retoDocs[i].data(),
        id: retoDocs[i].id,
        inscripcionId: inscripciones[i].inscripcionId,
        enrolledAt: inscripciones[i].enrolledAt
      });
    }
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

// Get ventas by user email (with caching)
async function getVentasByEmail(email, useCache = true) {
  if (!email) return [];
  
  const normalizedEmail = email.toLowerCase();
  
  // Check cache first
  if (useCache) {
    const cached = getCachedVentas(normalizedEmail);
    if (cached) return cached;
  }
  
  const snapshot = await db.collection('ventas')
    .where('correoDropshipper', '==', normalizedEmail)
    .get();
  
  const ventas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Cache the result
  setCachedVentas(normalizedEmail, ventas);
  
  return ventas;
}

// Get ventas by comunidad (OPTIMIZED - uses Firestore filtering)
async function getVentasByComunidad(comunidadId, lastDoc = null, limit = 100) {
  // Get users in comunidad
  const usersSnapshot = await db.collection('users')
    .where('comunidadId', '==', comunidadId)
    .get();
  
  const emails = usersSnapshot.docs
    .map(doc => doc.data().email?.toLowerCase())
    .filter(Boolean);
  
  if (emails.length === 0) return [];
  
  // Use 'in' query to filter in Firestore (max 10 items per 'in' clause)
  // Split into batches of 10
  const batchSize = 10;
  const batches = [];
  for (let i = 0; i < emails.length; i += batchSize) {
    batches.push(emails.slice(i, i + batchSize));
  }
  
  // Query each batch in parallel
  const queryPromises = batches.map(batchEmails => {
    let query = db.collection('ventas')
      .where('correoDropshipper', 'in', batchEmails)
      .limit(limit);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    return query.get();
  });
  
  const results = await Promise.all(queryPromises);
  
  // Flatten results
  let ventas = [];
  let lastDocument = null;
  results.forEach(snapshot => {
    snapshot.docs.forEach(doc => {
      ventas.push({ id: doc.id, ...doc.data() });
    });
    if (snapshot.docs.length > 0) {
      lastDocument = snapshot.docs[snapshot.docs.length - 1];
    }
  });
  
  return {
    ventas,
    lastDoc: lastDocument,
    hasMore: ventas.length === limit
  };
}

// Legacy function for backward compatibility
async function getVentasByComunidadLegacy(comunidadId) {
  const result = await getVentasByComunidad(comunidadId);
  return result.ventas;
}

// Get ventas stats for a comunidad (optimized)
async function getVentasStatsByComunidad(comunidadId) {
  const result = await getVentasByComunidad(comunidadId);
  const ventas = result.ventas;
  
  return {
    totalVentas: ventas.length,
    facturacion: ventas.reduce((sum, v) => sum + (parseFloat(v.totalOrden) || 0), 0),
    unidades: ventas.reduce((sum, v) => sum + (parseInt(v.cantidad) || 0), 0)
  };
}

// ==================== LÍDERES ====================

// Check if user is líder (with caching)
async function checkIsLider(userId) {
  const cached = cache.get('lideres', userId);
  if (cached !== null) return cached !== false;
  
  const doc = await db.collection('lideres').doc(userId).get();
  const exists = doc.exists;
  cache.set('lideres', userId, exists);
  return exists;
}

// Get líder data (with caching)
async function getLiderData(userId) {
  // Check cache first
  const cached = cache.get('lideres', userId);
  if (cached) return cached;
  
  const doc = await db.collection('lideres').doc(userId).get();
  if (doc.exists) {
    const data = doc.data();
    cache.set('lideres', userId, data);
    return data;
  }
  return null;
}

// Get comunidades by líder (optimized)
async function getComunidadesByLider(liderId) {
  const snapshot = await db.collection('comunidades')
    .where('liderId', '==', liderId)
    .get();
  
  const comunidades = snapshot.docs.map(doc => {
    const data = doc.data();
    cache.set('comunidades', doc.id, data);
    return { id: doc.id, ...data };
  });
  
  return comunidades;
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

// Import ventas from Excel data (optimized with smaller batches)
async function importVentas(dataArray, batchSize = 100) {
  let imported = 0;
  
  // Process in batches of 100
  for (let i = 0; i < dataArray.length; i += batchSize) {
    const batch = db.batch();
    const chunk = dataArray.slice(i, i + batchSize);
    
    for (const venta of chunk) {
      const docRef = db.collection('ventas').doc();
      batch.set(docRef, {
        ...venta,
        importedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      imported++;
    }
    
    await batch.commit();
  }
  
  // Invalidate all ventas cache after import
  invalidateVentasCache();
  
  return imported;
}

// Utility function to invalidate all caches (call after bulk operations)
function invalidateAllCache() {
  cache.clear();
  invalidateVentasCache();
}
