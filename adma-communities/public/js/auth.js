// ========================================
// AUTH MODULE - Login, Register, Auth State
// ========================================

// Firebase instances are loaded from firebase.js (global)
// We assume: auth, db are available

// ==================== Login ====================

function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const result = await auth.signInWithEmailAndPassword(email, password);
            await handleAuth(result.user);
        } catch (e) {
            alert('Error: ' + e.message);
        }
    };
}

// ==================== Register ====================

async function loadRegisterComunidadesAndPreselect() {
    console.log('loadRegisterComunidadesAndPreselect called');
    const select = document.getElementById('regComunidad');
    if (!select) {
        console.error('regComunidad select not found');
        return;
    }

    try {
        // Use window.db if available, otherwise use firebase.firestore()
        const dbRef = window.db || (typeof firebase !== 'undefined' ? firebase.firestore() : null);
        console.log('dbRef:', !!dbRef);
        if (!dbRef) {
            console.error('Firestore not initialized');
            return;
        }
        
        const comunidades = await dbRef.collection('comunidades').orderBy('nombre').get();
        console.log('Comunidades loaded:', comunidades.size);
        const opciones = comunidades.docs.map(d => {
            const data = d.data() || {};
            const codigo = normalizeRefCode(data.codigo || '');
            const nombre = String(data.nombre || '');
            return `<option value="${d.id}" data-codigo="${codigo}" data-nombre="${nombre}">${nombre}</option>`;
        }).join('');

        select.innerHTML = '<option value="">-- Seleccionar --</option>' + opciones;

        // Check for ?ref= parameter and preselect by código OR nombre (partial match)
        const refCode = normalizeRefCode(new URLSearchParams(window.location.search).get('ref'));
        if (!refCode) return;

        console.log('Ref code to match:', refCode);
        
        for (let i = 0; i < select.options.length; i++) {
            const opt = select.options[i];
            const codigo = normalizeRefCode(opt.dataset.codigo || '');
            const nombre = normalizeRefCode(opt.dataset.nombre || opt.text || '');
            // Also try partial match
            if (codigo === refCode || nombre === refCode || 
                codigo.startsWith(refCode) || nombre.startsWith(refCode)) {
                console.log('Matched:', codigo, nombre);
                select.selectedIndex = i;
                break;
            }
        }
    } catch (e) {
        console.error('Error loading comunidades:', e);
    }
}

function initRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('regNombre').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const telefono = document.getElementById('regTelefono').value;

        const paises = Array.from(document.querySelectorAll('input[name="pais"]:checked')).map(cb => cb.value);
        const tipoVenta = Array.from(document.querySelectorAll('input[name="tipoVenta"]:checked')).map(cb => cb.value);

        if (paises.length === 0) {
            alert('Selecciona al menos un país donde vendes');
            return;
        }

        if (tipoVenta.length === 0) {
            alert('Selecciona al menos un tipo de venta');
            return;
        }

        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            const comunidadId = document.getElementById('regComunidad').value;
            if (!comunidadId) return alert('Selecciona una comunidad');

            await createOrUpdateUser(result.user.uid, {
                nombre,
                email,
                telefono,
                rol: 'usuario',
                paises: paises,
                tipoVenta: tipoVenta,
                comunidadId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await handleAuth(result.user);
        } catch (e) {
            alert('Error: ' + e.message);
        }
    };
}

// ==================== Code/Invitations ====================

function initCodeForm() {
    const codeForm = document.getElementById('codeForm');
    if (!codeForm) return;

    codeForm.onsubmit = async (e) => {
        e.preventDefault();
        const codigo = document.getElementById('inviteCode').value.toUpperCase();
        const comunidad = await getComunidadByCode(codigo);

        if (comunidad && window.currentUser) {
            await createOrUpdateUser(window.currentUser.uid, { comunidadId: comunidad.id });
            await handleAuth(window.currentUser);
        } else {
            alert('Código inválido');
        }
    };
}

async function loadComunidades() {
    const comunidades = await getComunidades();
    const list = document.getElementById('comunidadesList');
    if (!list) return;

    list.innerHTML = comunidades.map(c => `
        <button onclick="window.selectComunidad('${c.id}')" class="w-full glass-card p-4 rounded-xl hover:border-primary/50 transition text-left">
            <p class="font-bold">${c.nombre}</p>
            <p class="text-slate-400 text-sm">Código: ${c.codigo}</p>
        </button>
    `).join('');
}

window.selectComunidad = async function(comunidadId) {
    if (window.currentUser) {
        await createOrUpdateUser(window.currentUser.uid, { comunidadId });
        await handleAuth(window.currentUser);
    }
};

// ==================== Auth State Handler ====================

async function handleAuth(user) {
    // Check if admin
    const adminDoc = await db.collection('admins').doc(user.uid).get();
    if (adminDoc.exists) {
        showView('adminDashboard');
        loadAdminData();
        return;
    }

    // Check if lider
    const liderDoc = await db.collection('lideres').doc(user.uid).get();
    if (liderDoc.exists) {
        showView('liderDashboard');
        loadLiderData(user, liderDoc.data());
        return;
    }

    const userData = await getUserData(user.uid);

    if (!userData || !userData.rol) {
        showView('selectComunidad');
        window.currentUser = user;
        loadComunidades();
        return;
    }

    showView('userDashboard');
    loadUserData(user, userData);
}

// ==================== Logout ====================

function initLogoutHandlers() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.onclick = async () => { await auth.signOut(); location.reload(); };

    const liderLogoutBtn = document.getElementById('liderLogoutBtn');
    if (liderLogoutBtn) liderLogoutBtn.onclick = async () => { await auth.signOut(); location.reload(); };

    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) adminLogoutBtn.onclick = async () => { await auth.signOut(); location.reload(); };
}

// ==================== Initialization ====================

function initAuth() {
    initLoginForm();
    initRegisterForm();
    initCodeForm();
    initNavigation();
    initLeaderNavigation();
    initLogoutHandlers();
}

// Auto-init when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }
}

// Expose functions globally for compatibility with inline handlers
window.loadRegisterComunidadesAndPreselect = loadRegisterComunidadesAndPreselect;
window.handleAuth = handleAuth;
window.loadComunidades = loadComunidades;
window.initAuth = initAuth;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initLoginForm,
        initRegisterForm,
        initCodeForm,
        initAuth,
        handleAuth
    };
}
