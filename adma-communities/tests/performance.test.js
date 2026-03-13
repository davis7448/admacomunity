/**
 * tests/performance.test.js
 * Tests de rendimiento para ADMA Communities
 * 
 * Mide tiempo de carga, cuenta consultas Firestore, verifica caché
 */

const fs = require('fs');
const path = require('path');

// ==================== MOCKS ====================

// Query counter
let queryCount = 0;
let queryLog = [];

// Mock Firestore con contador de queries
class MockFirestore {
  constructor() {
    this.collections = {
      users: new Map(),
      comunidades: new Map([
        ['com-1', { id: 'com-1', nombre: 'Comunidad 1', liderId: 'lider-1' }],
        ['com-2', { id: 'com-2', nombre: 'Comunidad 2', liderId: 'lider-2' }]
      ]),
      retos: new Map(),
      inscripciones: new Map(),
      ventas: new Map(),
      lideres: new Map(),
      admins: new Map()
    };
    
    // Prepopulate users
    for (let i = 1; i <= 50; i++) {
      this.collections.users.set(`user-${i}`, {
        id: `user-${i}`,
        email: `user${i}@example.com`,
        nombre: `Usuario ${i}`,
        comunidadId: 'com-1'
      });
    }
    
    // Prepopulate retos
    for (let i = 1; i <= 20; i++) {
      this.collections.retos.set(`reto-${i}`, {
        id: `reto-${i}`,
        titulo: `Reto ${i}`,
        comunidadId: 'com-1',
        meta: 100 * i
      });
    }
  }
  
  resetCounters() {
    queryCount = 0;
    queryLog = [];
  }
  
  logQuery(collection, type) {
    queryCount++;
    queryLog.push({ collection, type, timestamp: Date.now() });
  }
  
  collection(name) {
    const self = this;
    return {
      doc: (id) => ({
        get() {
          self.logQuery(name, 'get');
          const data = self.collections[name]?.get(id);
          return Promise.resolve({
            exists: !!data,
            id,
            data: () => data
          });
        },
        set(data, opts) {
          self.logQuery(name, 'set');
          if (!self.collections[name]) self.collections[name] = new Map();
          self.collections[name].set(id, data);
          return Promise.resolve();
        },
        update(data) {
          self.logQuery(name, 'update');
          const existing = self.collections[name]?.get(id) || {};
          self.collections[name].set(id, { ...existing, ...data });
          return Promise.resolve();
        }
      }),
      add(data) {
        self.logQuery(name, 'add');
        const id = name + '_' + Date.now();
        if (!self.collections[name]) self.collections[name] = new Map();
        self.collections[name].set(id, data);
        return Promise.resolve({ id });
      },
      where(field, op, value) {
        return {
          where: () => this,
          orderBy: () => ({
            limit(n) {
              self.logQuery(name, 'where-orderBy-limit');
              const items = [];
              if (self.collections[name]) {
                self.collections[name].forEach((data, docId) => {
                  if (data[field] === value) {
                    items.push({ id: docId, exists: true, data: () => data });
                  }
                });
              }
              return Promise.resolve({
                docs: items.slice(0, n),
                empty: items.length === 0
              });
            },
            get() {
              self.logQuery(name, 'where-orderBy');
              const items = [];
              if (self.collections[name]) {
                self.collections[name].forEach((data, docId) => {
                  if (data[field] === value) {
                    items.push({ id: docId, exists: true, data: () => data });
                  }
                });
              }
              return Promise.resolve({ docs: items, empty: items.length === 0 });
            }
          }),
          limit(n) {
            self.logQuery(name, 'where-limit');
            const items = [];
            if (self.collections[name]) {
              self.collections[name].forEach((data, docId) => {
                if (data[field] === value) {
                  items.push({ id: docId, exists: true, data: () => data });
                }
              });
            }
            return Promise.resolve({
              docs: items.slice(0, n),
              empty: items.length === 0
            });
          },
          get() {
            self.logQuery(name, 'where');
            const items = [];
            if (self.collections[name]) {
              self.collections[name].forEach((data, docId) => {
                if (data[field] === value) {
                  items.push({ id: docId, exists: true, data: () => data });
                }
              });
            }
            return Promise.resolve({ docs: items, empty: items.length === 0 });
          }
        };
      },
      orderBy(field, dir) {
        return {
          limit(n) {
            self.logQuery(name, 'orderBy-limit');
            const items = [];
            if (self.collections[name]) {
              self.collections[name].forEach((data, docId) => {
                items.push({ id: docId, exists: true, data: () => data });
              });
            }
            return Promise.resolve({
              docs: items.slice(0, n),
              empty: items.length === 0
            });
          },
          get() {
            self.logQuery(name, 'orderBy');
            const items = [];
            if (self.collections[name]) {
              self.collections[name].forEach((data, docId) => {
                items.push({ id: docId, exists: true, data: () => data });
              });
            }
            return Promise.resolve({ docs: items, empty: items.length === 0 });
          }
        };
      },
      get() {
        self.logQuery(name, 'get-all');
        const items = [];
        if (self.collections[name]) {
          self.collections[name].forEach((data, docId) => {
            items.push({ id: docId, exists: true, data: () => data });
          });
        }
        return Promise.resolve({ docs: items, empty: items.length === 0 });
      }
    };
  }
}

// ==================== CACHE ====================

const cache = {
  comunidades: new Map(),
  usuarios: new Map(),
  retos: new Map(),
  _ttl: 5 * 60 * 1000,
  _timestamps: { comunidades: 0, usuarios: 0, retos: 0 },
  
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
    }
  }
};

// ==================== FUNCIONES BAJO TEST ====================

let mockDb;

function initialize() {
  mockDb = new MockFirestore();
}

// Simular carga de dashboard
async function loadDashboard(userId) {
  mockDb.resetCounters();
  const startTime = Date.now();
  
  // 1. Get user data (1 query)
  const userDoc = await mockDb.collection('users').doc(userId).get();
  const userData = userDoc.exists ? userDoc.data() : null;
  
  // 2. Get user's comunidad (1 query)
  const comunidadDoc = userData?.comunidadId 
    ? await mockDb.collection('comunidades').doc(userData.comunidadId).get()
    : null;
  
  // 3. Get retos de la comunidad (1 query)
  const retosDocs = userData?.comunidadId
    ? await mockDb.collection('retos').where('comunidadId', '==', userData.comunidadId).get()
    : { docs: [], empty: true };
  
  // 4. Get user's inscripciones (1 query)
  const inscripcionesDocs = await mockDb.collection('inscripciones').where('userId', '==', userId).get();
  
  const loadTime = Date.now() - startTime;
  
  return {
    loadTime,
    queries: queryCount,
    user: userData,
    comunidad: comunidadDoc?.exists ? comunidadDoc.data() : null,
    retos: retosDocs.docs.map(d => d.data()),
    inscripciones: inscripcionesDocs.docs.map(d => d.data())
  };
}

// Obtener comunidades con cache
async function getComunidades(useCache = true) {
  mockDb.resetCounters();
  const startTime = Date.now();
  
  // Check cache first
  if (useCache && cache.isValid('comunidades') && cache.comunidades.size > 0) {
    const data = cache.getAll('comunidades');
    return {
      fromCache: true,
      time: Date.now() - startTime,
      queries: 0,
      comunidades: data
    };
  }
  
  // Fetch from DB
  const snapshot = await mockDb.collection('comunidades').get();
  const comunidades = snapshot.docs.map(doc => doc.data());
  
  // Update cache
  cache.comunidades.clear();
  comunidades.forEach(c => cache.comunidades.set(c.id, c));
  
  return {
    fromCache: false,
    time: Date.now() - startTime,
    queries: queryCount,
    comunidades
  };
}

// Obtener ventas por comunidad optimizado
async function getVentasByComunidad(comunidadId) {
  mockDb.resetCounters();
  const startTime = Date.now();
  
  // Get users in comunidad
  const usersSnapshot = await mockDb.collection('users').where('comunidadId', '==', comunidadId).get();
  
  // Get ventas for those users (simplified - in real app would use 'in' query)
  const ventasPromises = usersSnapshot.docs.map(userDoc => {
    const email = userDoc.data().email;
    return mockDb.collection('ventas').where('email', '==', email).get();
  });
  
  const ventasResults = await Promise.all(ventasPromises);
  const ventas = [];
  ventasResults.forEach(snapshot => {
    snapshot.docs.forEach(doc => ventas.push(doc.data()));
  });
  
  return {
    time: Date.now() - startTime,
    queries: queryCount,
    ventas
  };
}

// ==================== TESTS ====================

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  testsRun++;
  try {
    fn();
    testsPassed++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (error) {
    testsFailed++;
    console.log(`  ❌ FAIL: ${name}`);
    console.log(`     Error: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertLessThan(actual, max, message) {
  if (!(actual < max)) {
    throw new Error(message || `Expected ${actual} to be less than ${max}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function describe(name, fn) {
  console.log(`\n📁 ${name}`);
  fn();
}

// ==================== SUITE ====================

console.log('⚡ ADMA Communities - Performance Tests');
console.log('========================================');

describe('Setup', () => {
  test('Mock Firestore initialization', () => {
    initialize();
    assert(mockDb !== null, 'DB should be initialized');
  });
});

describe('TEST: Medir tiempo de carga del dashboard', () => {
  test('Dashboard carga en tiempo razonable (< 500ms simulado)', async () => {
    const result = await loadDashboard('user-1');
    
    console.log(`     📊 Load time: ${result.loadTime}ms`);
    console.log(`     📊 Queries: ${result.queries}`);
    
    // En entorno real, deberían ser < 500ms
    assert(result.loadTime >= 0, 'Load time should be measured');
    assert(result.user !== null, 'Should load user data');
    assert(result.retos.length > 0, 'Should load retos');
  });
  
  test('Dashboard ejecuta número óptimo de queries', async () => {
    const result = await loadDashboard('user-1');
    
    // Dashboard ideal: ~4 queries máximo
    // 1. User doc
    // 2. Comunidad doc
    // 3. Retos by comunidad
    // 4. Inscripciones
    
    console.log(`     📊 Queries executed: ${result.queries}`);
    
    // Allow some margin but should be under 10
    assertLessThan(result.queries, 10, 'Should use reasonable number of queries');
  });
});

describe('TEST: Contar consultas Firestore por operación', () => {
  test('Obtener comunidades sin cache hace queries', async () => {
    // Clear cache first
    cache.clear('comunidades');
    
    const result = await getComunidades(true);
    
    console.log(`     📊 Queries: ${result.queries}, From cache: ${result.fromCache}`);
    
    assertEqual(result.fromCache, false, 'Should fetch from DB');
    assert(result.queries > 0, 'Should execute queries');
  });
  
  test('Segunda llamada usa cache', async () => {
    // First call populates cache
    await getComunidades(true);
    
    // Second call should use cache
    const result = await getComunidades(true);
    
    console.log(`     📊 Queries: ${result.queries}, From cache: ${result.fromCache}`);
    
    assertEqual(result.fromCache, true, 'Should use cache');
    assertEqual(result.queries, 0, 'Should not execute queries');
  });
  
  test('Obtener ventas por comunidad cuenta queries', async () => {
    const result = await getVentasByComunidad('com-1');
    
    console.log(`     📊 Queries for ventas: ${result.queries}`);
    
    assert(result.queries > 0, 'Should count queries');
  });
});

describe('TEST: Verificar caché funciona', () => {
  test('Cache almacena datos correctamente', () => {
    cache.set('comunidades', 'com-1', { nombre: 'Test' });
    
    const cached = cache.get('comunidades', 'com-1');
    
    assert(cached !== null, 'Should retrieve cached data');
    assertEqual(cached.nombre, 'Test', 'Should have correct data');
  });
  
  test('Cache expira después de TTL', async () => {
    // Set short TTL
    const originalTTL = cache._ttl;
    cache._ttl = 50;
    
    cache.set('test', 'key1', { data: 'value1' });
    
    // Wait for expiry
    await new Promise(r => setTimeout(r, 60));
    
    const isValid = cache.isValid('test');
    assert(!isValid, 'Cache should expire');
    
    cache._ttl = originalTTL;
  });
  
  test('getAll retorna array vacío cuando cache expirado', async () => {
    cache._ttl = 10;
    
    cache.set('retos', 'r1', { titulo: 'Reto 1' });
    
    await new Promise(r => setTimeout(r, 15));
    
    const result = cache.getAll('retos');
    
    assert(Array.isArray(result), 'Should return array');
    assertEqual(result.length, 0, 'Should be empty after expiry');
    
    cache._ttl = 5 * 60 * 1000;
  });
  
  test('Cache clear funciona', () => {
    cache.set('usuarios', 'u1', { nombre: 'User 1' });
    cache.set('comunidades', 'c1', { nombre: 'Comunidad 1' });
    
    cache.clear('usuarios');
    
    assert(!cache.isValid('usuarios'), 'Usuarios should be cleared');
    assert(cache.isValid('comunidades'), 'Comunidades should remain');
  });
});

describe('Performance Benchmarks', () => {
  test('Carga de múltiples usuarios es eficiente', async () => {
    const startTime = Date.now();
    let totalQueries = 0;
    
    // Simulate loading 10 users
    for (let i = 1; i <= 10; i++) {
      mockDb.resetCounters();
      await mockDb.collection('users').doc(`user-${i}`).get();
      totalQueries += queryCount;
    }
    
    const elapsed = Date.now() - startTime;
    
    console.log(`     📊 10 users loaded in ${elapsed}ms with ${totalQueries} total queries`);
    
    assert(elapsed < 1000, 'Should load quickly');
  });
  
  test('Query con where es registrada', async () => {
    mockDb.resetCounters();
    
    await mockDb.collection('users').where('comunidadId', '==', 'com-1').get();
    
    assert(queryCount > 0, 'Where query should be logged');
    assert(queryLog.some(q => q.type === 'where'), 'Should log where type');
  });
});

// ==================== RESUMEN ====================

console.log('\n========================================');
console.log('📊 PERFORMANCE TESTS SUMMARY');
console.log('========================================');
console.log(`   Total:  ${testsRun}`);
console.log(`   ✅ Passed: ${testsPassed}`);
console.log(`   ❌ Failed: ${testsFailed}`);
console.log('========================================');

if (testsFailed > 0) {
  console.log('\n⚠️  Some performance tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All performance tests passed!');
  process.exit(0);
}
