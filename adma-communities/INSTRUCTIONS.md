// Script de inicialización para ADMA Communities
// Ejecutar en Firebase Console → Firestore → Consola de Scripts

// Para agregar un Admin:
// 1. Ve a Firestore → Colección "admins"
// 2. Agrega documento con tu UID como ID
// 3. Campo: nombre, email

// Para agregar un Líder:
// 1. Ve a Firestore → Colección "lideres"  
// 2. Agrega documento con UID del usuario
// 3. Campos: nombre, email, rol: "lider"

// Para agregar Comunidad:
// 1. Ve a Firestore → Colección "comunidades"
// 2. Agrega documento (se genera ID)
// 3. Campos: nombre, codigo (único), liderId (UID del líder)

// Estructura de colecciones:
// - users/{uid}: usuarios registrados
// - lideres/{uid}: líderes de comunidad
// - admins/{uid}: administradores  
// - comunidades/{id}: comunidades
// - retos/{id}: retos
// - inscripciones/{id}: inscripciones a retos
// - ventas/{id}: ventas importadas del Excel
