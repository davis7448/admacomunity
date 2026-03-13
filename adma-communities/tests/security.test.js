/**
 * tests/security.test.js
 * Tests de seguridad Firestore para ADMA Communities
 * 
 * Verifica que las reglas de Firestore permiten/deniegan correctamente el acceso
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================

const RULES_PATH = path.join(__dirname, '..', 'firestore.rules');

// Cargar reglas de Firestore
function loadRules() {
  return fs.readFileSync(RULES_PATH, 'utf8');
}

// ==================== SIMULADORES ====================

// Simulador de contexto de request
class MockRequest {
  constructor(auth, resourceData = {}, resourceId = null) {
    this.auth = auth;
    this.resource = {
      data: resourceData,
      id: resourceId
    };
    this.resourceId = resourceId;
  }
}

// Simulador de documento
class MockDoc {
  constructor(id, data) {
    this.id = id;
    this.data = data;
    this.exists = data !== null;
  }
}

// Simulador de snapshot
class MockSnapshot {
  constructor(docs = []) {
    this.docs = docs;
    this.empty = docs.length === 0;
  }
  
  map(mapper) {
    return this.docs.map(mapper);
  }
}

// ==================== HELPERS DE ANÁLISIS DE REGLAS ====================

// Extraer funciones helper de las reglas
function extractHelpers(rulesContent) {
  const helpers = {};
  
  // Extract isSignedIn - simpler check
  if (/function isSignedIn\(\)/.test(rulesContent) && /request\.auth != null/.test(rulesContent)) {
    helpers.isSignedIn = true;
  }
  
  // Extract isAdmin - simpler check
  if (/function isAdmin\(\)/.test(rulesContent)) {
    helpers.isAdmin = true;
  }
  
  // Extract isLider - simpler check  
  if (/function isLider\(\)/.test(rulesContent)) {
    helpers.isLider = true;
  }
  
  // Extract comunidadEsDeLider
  if (/function comunidadEsDeLider\(comunidadId\)/.test(rulesContent)) {
    helpers.comunidadEsDeLider = true;
  }
  
  return helpers;
}

// Analizar regla específica para colección
function analyzeCollectionRule(rulesContent, collection, operation) {
  // Find the collection section more broadly
  const collectionPattern = `match /${collection}/`;
  const collectionStart = rulesContent.indexOf(collectionPattern);
  
  if (collectionStart === -1) return null;
  
  // Find next match statement or end
  const nextMatch = rulesContent.indexOf('match /', collectionStart + 10);
  const section = nextMatch === -1 
    ? rulesContent.substring(collectionStart) 
    : rulesContent.substring(collectionStart, nextMatch);
  
  // Look for the operation in the section - handle both single and combined rules
  // E.g., "allow read:" or "allow create, update, delete:"
  const opPattern = operation === 'read' ? 'allow read:' : 
                     operation === 'create' ? 'allow create' :
                     operation === 'update' ? 'allow update' :
                     operation === 'delete' ? 'allow delete' : 'allow read:';
  
  const opIndex = section.indexOf(opPattern);
  if (opIndex === -1) return null;
  
  // Extract the rule - find the semicolon
  const rest = section.substring(opIndex);
  const semiColonIndex = rest.indexOf(';');
  if (semiColonIndex === -1) return null;
  
  return rest.substring(0, semiColonIndex).trim();
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
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertContains(text, substring, message) {
  if (!text.includes(substring)) {
    throw new Error(message || `Expected "${text}" to contain "${substring}"`);
  }
}

function assertNotContains(text, substring, message) {
  if (text.includes(substring)) {
    throw new Error(message || `Expected "${text}" not to contain "${substring}"`);
  }
}

function describe(name, fn) {
  console.log(`\n📁 ${name}`);
  fn();
}

// ==================== SUITE DE TESTS ====================

console.log('🛡️  ADMA Communities - Security Tests');
console.log('=====================================');

describe('Security Rules Analysis', () => {
  let rulesContent;
  let helpers;
  
  test('Firestore rules file exists', () => {
    assert(fs.existsSync(RULES_PATH), 'firestore.rules file not found');
  });
  
  test('Rules use version 2', () => {
    rulesContent = loadRules();
    assertContains(rulesContent, "rules_version = '2';", 'Rules should use version 2');
  });
  
  test('Helper functions are defined', () => {
    helpers = extractHelpers(rulesContent);
    assert(helpers.isSignedIn, 'isSignedIn helper should be defined');
    assert(helpers.isAdmin, 'isAdmin helper should be defined');
    assert(helpers.isLider, 'isLider helper should be defined');
  });
});

describe('Users Collection Security', () => {
  let rulesContent = loadRules();
  
  test('Users collection has read rule', () => {
    const rule = analyzeCollectionRule(rulesContent, 'users', 'read');
    assert(rule !== null, 'Users read rule should exist');
    assertContains(rule, 'isAdmin()', 'Should check isAdmin');
    assertContains(rule, 'isSelf', 'Should check isSelf');
  });
  
  test('Users collection allows self write', () => {
    const rule = analyzeCollectionRule(rulesContent, 'users', 'update');
    assert(rule !== null, 'Users update rule should exist');
    assertContains(rule, 'isSelf', 'Should allow self update');
  });
});

describe('Ventas Collection Security', () => {
  let rulesContent = loadRules();
  
  test('Ventas collection restricts read access', () => {
    const rule = analyzeCollectionRule(rulesContent, 'ventas', 'read');
    assert(rule !== null, 'Ventas read rule should exist');
    // Should NOT allow any signed-in user to read
    assertContains(rule, 'isAdmin()', 'Should require admin');
    assertContains(rule, 'isLider()', 'Should require lider');
  });
  
  test('TEST: Usuario no puede leer ventas de otros usuarios', () => {
    // Analizamos la regla de ventas
    const rule = analyzeCollectionRule(rulesContent, 'ventas', 'read');
    
    // Un usuario regular (no admin, no lider) NO debería poder leer ventas
    // La regla debe contener isAdmin() o isLider() - NO solo isSignedIn()
    assertNotContains(rule, 'isSignedIn()', 
      'Ventas no debe permitir lectura a cualquier usuario firmado');
    
    // Debe requerir permisos de admin o líder
    assert(rule.includes('isAdmin()') || rule.includes('isLider()'),
      'Ventas debe requerir permisos elevados');
    
    console.log('     ✓ Usuario regular NO puede leer ventas de otros');
  });
  
  test('Ventas collection restricts write access', () => {
    const rule = analyzeCollectionRule(rulesContent, 'ventas', 'create');
    assert(rule !== null, 'Ventas create rule should exist');
    assertContains(rule, 'isAdmin()', 'Should require admin for create');
  });
});

describe('Comunidades Collection Security', () => {
  let rulesContent = loadRules();
  
  test('Comunidades is publicly readable', () => {
    const rule = analyzeCollectionRule(rulesContent, 'comunidades', 'read');
    assert(rule !== null, 'Comunidades read rule should exist');
    assert(rule.includes('true') || rule === 'if true', 
      'Comunidades should be publicly readable for registration');
  });
  
  test('Comunidades create requires auth', () => {
    const rule = analyzeCollectionRule(rulesContent, 'comunidades', 'create');
    assert(rule !== null, 'Comunidades create rule should exist');
    assert(rule.includes('isAdmin()') || rule.includes('isLider()'), 
      'Comunidades create should require auth');
  });
});

describe('Lider Access Control', () => {
  let rulesContent = loadRules();
  
  test('TEST: Líder puede leer usuarios de su comunidad', () => {
    // Verificar que existe la función comunidadEsDeLider
    const hasComunidadEsDeLider = /function comunidadEsDeLider\(comunidadId\)/.test(rulesContent);
    assert(hasComunidadEsDeLider, 'comunidadEsDeLider function should exist');
    
    // Verificar que usuarios permite lectura a lider de la comunidad
    const usersReadRule = analyzeCollectionRule(rulesContent, 'users', 'read');
    assert(usersReadRule !== null, 'Users read rule should exist');
    
    // Debe tener verificación de líder
    assertContains(usersReadRule, 'isLider()', 'Users should allow lider access');
    // La regla puede verificar comunidad de diferentes formas
    const hasComunidadCheck = usersReadRule.includes('comunidad') || 
                              usersReadRule.includes('comunidadId') ||
                              usersReadRule.includes('EsDe');
    assert(hasComunidadCheck, 'Users rule should check comunidad relationship');
    
    console.log('     ✓ Líder puede leer usuarios de su comunidad');
  });
  
  test('Lider can manage their own comunidades', () => {
    const rule = analyzeCollectionRule(rulesContent, 'comunidades', 'update');
    assert(rule !== null, 'Comunidades update rule should exist');
    assert(rule.includes('isLider()') || rule.includes('liderId'), 
      'Lider should be able to update their comunidades');
  });
});

describe('Admin Full Access', () => {
  let rulesContent = loadRules();
  
  test('TEST: Admin tiene acceso completo', () => {
    // Admin debería tener acceso a users, ventas, comunidades, retos, etc.
    const usersRule = analyzeCollectionRule(rulesContent, 'users', 'read');
    const ventasRule = analyzeCollectionRule(rulesContent, 'ventas', 'read');
    const comunidadesRule = analyzeCollectionRule(rulesContent, 'comunidades', 'delete');
    const retosRule = analyzeCollectionRule(rulesContent, 'retos', 'create');
    
    // Verificar que admin tiene acceso completo
    assertContains(usersRule, 'isAdmin()', 'Admin debe poder leer users');
    assertContains(ventasRule, 'isAdmin()', 'Admin debe poder leer ventas');
    assertContains(comunidadesRule, 'isAdmin()', 'Admin debe poder eliminar comunidades');
    assertContains(retosRule, 'isAdmin()', 'Admin debe poder crear retos');
    
    console.log('     ✓ Admin tiene acceso completo al sistema');
  });
});

describe('Retos and Inscripciones Security', () => {
  let rulesContent = loadRules();
  
  test('Retos readable by signed in users', () => {
    const rule = analyzeCollectionRule(rulesContent, 'retos', 'read');
    assert(rule !== null, 'Retos read rule should exist');
    assert(rule.includes('isSignedIn()') || rule.includes('isAdmin()'), 
      'Retos should be readable by auth users');
  });
  
  test('Inscripciones restricts read', () => {
    const rule = analyzeCollectionRule(rulesContent, 'inscripciones', 'read');
    assert(rule !== null, 'Inscripciones read rule should exist');
    // Should check: isAdmin, own userId, or lider
    assert(rule.includes('userId') || rule.includes('isAdmin()'), 
      'Inscripciones should protect user data');
  });
});

describe('Default Deny Rule', () => {
  let rulesContent = loadRules();
  
  test('Default deny exists', () => {
    assertContains(rulesContent, 'match /{document=**}', 
      'Default catch-all rule should exist');
    assertContains(rulesContent, 'allow read, write: if false', 
      'Default should deny all');
  });
});

// ==================== RESUMEN ====================

console.log('\n=====================================');
console.log('📊 SECURITY TESTS SUMMARY');
console.log('=====================================');
console.log(`   Total:  ${testsRun}`);
console.log(`   ✅ Passed: ${testsPassed}`);
console.log(`   ❌ Failed: ${testsFailed}`);
console.log('=====================================');

if (testsFailed > 0) {
  console.log('\n⚠️  Some security tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All security tests passed!');
  process.exit(0);
}
