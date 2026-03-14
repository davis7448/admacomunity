/**
 * MAIN BOOTSTRAP - ADMA Communities
 * 
 * Este archivo es el punto de entrada principal que inicializa todos los módulos
 * y configura el estado de autenticación de la aplicación.
 * 
 * Orden de carga:
 * 1. firebase.js (cargado en index.html)
 * 2. core.js - Funciones helper y base de datos
 * 3. ui.js - Vistas y navegación
 * 4. auth.js - Autenticación
 * 5. dashboard modules (user, lider, admin)
 * 6. main.js - Bootstrap de inicialización
 */

// ==================== App Initialization ====================

async function initApp() {
    console.log('ADMA Communities - Initializing...');
    
    // Initialize UI module (views, navigation)
    if (typeof initUI === 'function') {
        initUI();
    }
    
    // Initialize Auth module (forms, handlers)
    if (typeof initAuth === 'function') {
        initAuth();
    }
    
    // Initialize dashboard-specific handlers
    initDashboardHandlers();
    
    // Listen for auth state changes
    setupAuthListener();
    
    console.log('ADMA Communities - Ready');
}

// ==================== Dashboard Handlers ====================

function initDashboardHandlers() {
    // Leader Dashboard handlers
    initLeaderDashboardHandlers();
    
    // Admin Dashboard handlers
    initAdminDashboardHandlers();
    
    // Common handlers
    initCommonHandlers();
}

function initLeaderDashboardHandlers() {
    // Registrar miembro modal
    const registrarMiembroBtn = document.getElementById('registrarMiembroBtn');
    if (registrarMiembroBtn) {
        registrarMiembroBtn.onclick = () => {
            if (typeof liderDashboardModule?.openRegistrarMiembroModal === 'function') {
                liderDashboardModule.openRegistrarMiembroModal();
            }
        };
    }
    
    // Create comunidad modal
    const createComunidadBtn = document.getElementById('createComunidadBtn');
    if (createComunidadBtn) {
        createComunidadBtn.onclick = () => {
            if (typeof liderDashboardModule?.openCreateComunidadModal === 'function') {
                liderDashboardModule.openCreateComunidadModal();
            }
        };
    }
    
    // Close member modal
    const closeMiembroModalBtn = document.getElementById('closeMiembroModalBtn');
    if (closeMiembroModalBtn) {
        closeMiembroModalBtn.onclick = () => {
            const modal = document.getElementById('registrarMiembroModal');
            if (modal) modal.classList.add('hidden');
        };
    }
    
    // Save member
    const saveMiembroBtn = document.getElementById('saveMiembroBtn');
    if (saveMiembroBtn) {
        saveMiembroBtn.onclick = () => {
            if (typeof liderDashboardModule?.saveMiembro === 'function') {
                liderDashboardModule.saveMiembro();
            }
        };
    }
    
    // Close comunidad modal
    const closeComunidadModalBtn = document.getElementById('closeComunidadModalBtn');
    if (closeComunidadModalBtn) {
        closeComunidadModalBtn.onclick = () => {
            const modal = document.getElementById('createComunidadModal');
            if (modal) modal.classList.add('hidden');
        };
    }
    
    // Save comunidad
    const saveComunidadBtn = document.getElementById('saveComunidadBtn');
    if (saveComunidadBtn) {
        saveComunidadBtn.onclick = () => {
            if (typeof liderDashboardModule?.saveComunidad === 'function') {
                liderDashboardModule.saveComunidad();
            }
        };
    }
    
    // Crear reto button
    const crearRetoBtn = document.getElementById('crearRetoBtn');
    if (crearRetoBtn) {
        crearRetoBtn.onclick = () => {
            if (typeof liderDashboardModule?.crearReto === 'function') {
                liderDashboardModule.crearReto();
            }
        };
    }
    
    // Recalculate retos ranking
    const recalcRetosBtn = document.getElementById('recalcRetosBtn');
    if (recalcRetosBtn) {
        recalcRetosBtn.onclick = async () => {
            const user = auth?.currentUser;
            if (!user) return;
            
            const retosSnap = await db.collection('retos').where('creadoPor', '==', user.uid).get();
            for (const d of retosSnap.docs) {
                if (typeof recalcAndStoreRetoRanking === 'function') {
                    await recalcAndStoreRetoRanking(d.id);
                }
            }
            
            if (typeof loadLiderData === 'function') {
                const liderDoc = await db.collection('lideres').doc(user.uid).get();
                await loadLiderData(user, liderDoc.data() || {});
            }
            alert('✓ Ranking recalculado y snapshot actualizado');
        };
    }
    
    // Perfil photo handlers
    const perfilFotoFile = document.getElementById('perfilFotoFile');
    if (perfilFotoFile) {
        perfilFotoFile.addEventListener('change', handlePerfilFotoFileChange);
    }
    
    const perfilFotoUrl = document.getElementById('perfilFotoUrl');
    if (perfilFotoUrl) {
        perfilFotoUrl.addEventListener('input', handlePerfilFotoUrlChange);
    }
    
    // Save perfil
    const savePerfilBtn = document.getElementById('savePerfilBtn');
    if (savePerfilBtn) {
        savePerfilBtn.onclick = savePerfilHandler;
    }
    
    // Cancel perfil
    const cancelPerfilBtn = document.getElementById('cancelPerfilBtn');
    if (cancelPerfilBtn) {
        cancelPerfilBtn.addEventListener('click', async () => {
            const user = auth?.currentUser;
            if (!user) return;
            const liderDoc = await db.collection('lideres').doc(user.uid).get();
            if (typeof loadLiderData === 'function') {
                loadLiderData(user, liderDoc.data() || {});
            }
        });
    }
    
    // Reto imagen handlers
    const retoImagenUrl = document.getElementById('retoImagenUrl');
    if (retoImagenUrl) {
        retoImagenUrl.addEventListener('input', (e) => {
            const v = e.target.value.trim();
            if (!v) return;
            window.retoImagenData = v;
            const p = document.getElementById('retoImagenPreview');
            if (p) p.src = v;
        });
    }
    
    const retoImagenFile = document.getElementById('retoImagenFile');
    if (retoImagenFile) {
        retoImagenFile.addEventListener('change', (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => {
                window.retoImagenData = r.result;
                const p = document.getElementById('retoImagenPreview');
                if (p) p.src = r.result;
            };
            r.readAsDataURL(f);
        });
    }
}

function initAdminDashboardHandlers() {
    // Create lider form
    const createLiderForm = document.getElementById('createLiderForm');
    if (createLiderForm) {
        createLiderForm.onsubmit = async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('liderNombre').value;
            const email = document.getElementById('liderEmail').value;
            const tempPassword = 'ADMA2024!';
            
            try {
                const cred = await firebase.auth().createUserWithEmailAndPassword(email, tempPassword);
                const uid = cred.user.uid;
                
                await db.collection('lideres').doc(uid).set({
                    nombre: nombre,
                    email: email,
                    rol: 'lider',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                await db.collection('users').doc(uid).set({
                    nombre: nombre,
                    email: email,
                    rol: 'lider',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                alert('✓ Líder creado!\n\nEmail: ' + email + '\n\nContraseña temporal: ADMA2024!');
                
                if (typeof loadAdminData === 'function') {
                    loadAdminData();
                }
                
                document.getElementById('liderNombre').value = '';
                document.getElementById('liderEmail').value = '';
            } catch (error) {
                alert('Error: ' + error.message);
            }
        };
    }
    
    // Import Excel handlers
    initImportExcelHandlers();
    
    // Admin retos handlers
    initAdminRetosHandlers();
    
    // Assign comunidad modal
    initAssignComunidadHandlers();
    
    // Edit comunidad modal
    initEditComunidadHandlers();
    
    // Edit lider modal
    initEditLiderHandlers();
}

function initImportExcelHandlers() {
    const excelFile = document.getElementById('excelFile');
    if (excelFile) {
        excelFile.addEventListener('change', handleExcelFileChange);
    }
    
    const saveMappingBtn = document.getElementById('saveMappingBtn');
    if (saveMappingBtn) {
        saveMappingBtn.addEventListener('click', saveMappingHandler);
    }
    
    const loadMappingBtn = document.getElementById('loadMappingBtn');
    if (loadMappingBtn) {
        loadMappingBtn.addEventListener('click', loadMappingHandler);
    }
    
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        importBtn.onclick = runImport;
    }
}

function initAdminRetosHandlers() {
    const crearAdminRetoBtn = document.getElementById('crearAdminRetoBtn');
    if (crearAdminRetoBtn) {
        crearAdminRetoBtn.onclick = async () => {
            const user = auth?.currentUser;
            if (!user) return;
            
            const selectedCom = document.getElementById('adminRetoComunidad')?.value || '';
            const basePayload = {
                titulo: document.getElementById('adminRetoTitulo')?.value || '',
                descripcion: document.getElementById('adminRetoDesc')?.value || '',
                tipo: document.getElementById('adminRetoTipo')?.value || 'facturacion',
                meta: Number(document.getElementById('adminRetoMeta')?.value || 0),
                inicio: document.getElementById('adminRetoInicio')?.value || '',
                fin: document.getElementById('adminRetoFin')?.value || '',
                imagen: document.getElementById('adminRetoImagen')?.value || '',
                creadoPor: user.uid,
                creadoPorRol: 'admin',
                estado: 'activo',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (!basePayload.titulo || !basePayload.meta || !selectedCom) {
                return alert('Completa título, meta y comunidad');
            }
            
            if (selectedCom === '__GLOBAL__') {
                const comunidades = await db.collection('comunidades').get();
                const gid = `GLOBAL_${Date.now()}`;
                for (const c of comunidades.docs) {
                    await db.collection('retos').add({ ...basePayload, comunidadId: c.id, global: true, globalGroupId: gid });
                }
                alert('✓ Reto global creado para todas las comunidades');
            } else {
                await db.collection('retos').add({ ...basePayload, comunidadId: selectedCom, global: false });
                alert('✓ Reto creado por Admin');
            }
            
            if (typeof loadAdminData === 'function') {
                loadAdminData();
            }
        };
    }
    
    // Filters
    const filterCom = document.getElementById('adminRetoFilterComunidad');
    const filterEstado = document.getElementById('adminRetoFilterEstado');
    const filterSearch = document.getElementById('adminRetoSearch');
    const filterSort = document.getElementById('adminRetoSort');
    const prevBtn = document.getElementById('adminRetosPrevBtn');
    const nextBtn = document.getElementById('adminRetosNextBtn');
    
    if (filterCom) filterCom.addEventListener('change', () => { window.adminRetosPage = 1; loadAdminData?.(); });
    if (filterEstado) filterEstado.addEventListener('change', () => { window.adminRetosPage = 1; loadAdminData?.(); });
    if (filterSearch) filterSearch.addEventListener('input', () => { window.adminRetosPage = 1; loadAdminData?.(); });
    if (filterSort) filterSort.addEventListener('change', () => { window.adminRetosPage = 1; loadAdminData?.(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { window.adminRetosPage = Math.max(1, (window.adminRetosPage || 1) - 1); loadAdminData?.(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { window.adminRetosPage = (window.adminRetosPage || 1) + 1; loadAdminData?.(); });
}

function initAssignComunidadHandlers() {
    window.openAssignComunidad = async function(userId, email) {
        document.getElementById('assignUserId').value = userId;
        document.getElementById('assignUserEmail').textContent = email || '';
        
        const comunidades = await db.collection('comunidades').get();
        const sel = document.getElementById('assignComunidadSelect');
        sel.innerHTML = comunidades.docs.map(d => `<option value="${d.id}">${d.data().nombre} (${d.data().codigo || ''})</option>`).join('');
        
        const modal = document.getElementById('assignComunidadModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };
    
    const closeAssignBtn = document.getElementById('closeAssignComunidadBtn');
    if (closeAssignBtn) {
        closeAssignBtn.onclick = () => {
            const modal = document.getElementById('assignComunidadModal');
            if (modal) modal.classList.add('hidden');
        };
    }
    
    const saveAssignBtn = document.getElementById('saveAssignComunidadBtn');
    if (saveAssignBtn) {
        saveAssignBtn.onclick = async () => {
            const userId = document.getElementById('assignUserId').value;
            const comunidadId = document.getElementById('assignComunidadSelect').value;
            if (!userId || !comunidadId) return;
            
            await db.collection('users').doc(userId).update({ comunidadId });
            
            const modal = document.getElementById('assignComunidadModal');
            if (modal) modal.classList.add('hidden');
            
            if (typeof loadAdminData === 'function') {
                loadAdminData();
            }
        };
    }
}

function initEditComunidadHandlers() {
    window.openEditComunidad = async function(comunidadId) {
        const doc = await db.collection('comunidades').doc(comunidadId).get();
        if (!doc.exists) return alert('Comunidad no encontrada');
        const c = doc.data() || {};
        
        document.getElementById('editComunidadId').value = comunidadId;
        document.getElementById('editComunidadNombre').value = c.nombre || '';
        document.getElementById('editComunidadCodigo').value = c.codigo || '';
        document.getElementById('editComunidadLogo').value = c.logo || '';
        
        const logoFileEl = document.getElementById('editComunidadLogoFile');
        if (logoFileEl) logoFileEl.value = '';
        
        const m = document.getElementById('editComunidadModal');
        if (m) {
            m.classList.remove('hidden');
            m.classList.add('flex');
        }
    };
    
    const closeEditBtn = document.getElementById('closeComunidadEditBtn');
    if (closeEditBtn) {
        closeEditBtn.onclick = () => {
            const m = document.getElementById('editComunidadModal');
            if (m) {
                m.classList.add('hidden');
                m.classList.remove('flex');
            }
        };
    }
    
    const logoFileEl = document.getElementById('editComunidadLogoFile');
    if (logoFileEl) {
        logoFileEl.addEventListener('change', (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => {
                document.getElementById('editComunidadLogo').value = String(r.result || '');
            };
            r.readAsDataURL(f);
        });
    }
    
    const saveEditBtn = document.getElementById('saveComunidadEditBtn');
    if (saveEditBtn) {
        saveEditBtn.onclick = async () => {
            const id = document.getElementById('editComunidadId').value;
            const nombre = document.getElementById('editComunidadNombre').value.trim();
            const codigo = document.getElementById('editComunidadCodigo').value.trim().toUpperCase();
            const logo = document.getElementById('editComunidadLogo').value.trim();
            
            if (!id || !nombre || !codigo) return alert('Completa nombre y código');
            
            await db.collection('comunidades').doc(id).set({ 
                nombre, codigo, logo, 
                updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
            }, { merge: true });
            
            const m = document.getElementById('editComunidadModal');
            if (m) {
                m.classList.add('hidden');
                m.classList.remove('flex');
            }
            
            alert('✓ Comunidad actualizada');
            if (typeof loadAdminData === 'function') loadAdminData();
        };
    }
}

function initEditLiderHandlers() {
    window.openEditLider = async function(liderId) {
        const doc = await db.collection('lideres').doc(liderId).get();
        const data = doc.data();
        
        document.getElementById('editLiderId').value = liderId;
        document.getElementById('editLiderNombre').value = data.nombre || '';
        document.getElementById('editLiderEmail').value = data.email || '';
        
        // Show comunidades
        const coms = (window.allComunidades || []).filter(c => c.liderId === liderId);
        const comsDiv = document.getElementById('editComunidadesList');
        if (comsDiv) {
            comsDiv.innerHTML = coms.map(c => `<div class="flex justify-between items-center bg-white/5 p-2 rounded">
                <span>${c.nombre} (${c.codigo})</span>
                <button onclick="removeComunidad('${c.id}', '${liderId}')" class="text-red-400">×</button>
            </div>`).join('') || '<p class="text-slate-400 text-sm">Sin comunidades</p>';
        }
        
        const m = document.getElementById('editLiderModal');
        if (m) {
            m.classList.remove('hidden');
            m.classList.add('flex');
        }
    };
    
    const saveLiderBtn = document.getElementById('saveLiderBtn');
    if (saveLiderBtn) {
        saveLiderBtn.onclick = async () => {
            const liderId = document.getElementById('editLiderId').value;
            const nombre = document.getElementById('editLiderNombre').value;
            
            await db.collection('lideres').doc(liderId).update({ nombre });
            await db.collection('users').doc(liderId).update({ nombre });
            
            const m = document.getElementById('editLiderModal');
            if (m) m.classList.add('hidden');
            
            if (typeof loadAdminData === 'function') loadAdminData();
        };
    }
    
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.onclick = () => {
            const m = document.getElementById('editLiderModal');
            if (m) m.classList.add('hidden');
        };
    }
    
    const deleteLiderBtn = document.getElementById('deleteLiderBtn');
    if (deleteLiderBtn) {
        deleteLiderBtn.onclick = async () => {
            const liderId = document.getElementById('editLiderId').value;
            if (confirm('¿Eliminar este líder?')) {
                await db.collection('lideres').doc(liderId).delete();
                const m = document.getElementById('editLiderModal');
                if (m) m.classList.add('hidden');
                if (typeof loadAdminData === 'function') loadAdminData();
            }
        };
    }
    
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');
    if (resetPasswordBtn) {
        resetPasswordBtn.onclick = async () => {
            const email = document.getElementById('editLiderEmail').value;
            if (!email) return alert('Ingresa el email del líder');
            
            try {
                await firebase.auth().sendPasswordResetEmail(email);
                alert('✓ Correo de recuperación enviado a ' + email);
            } catch(e) {
                alert('Error: ' + e.message);
            }
        };
    }
}

function initCommonHandlers() {
    // Top 10 modal
    const closeTop10Btn = document.getElementById('closeTop10Btn');
    if (closeTop10Btn) {
        closeTop10Btn.addEventListener('click', () => {
            const modal = document.getElementById('top10Modal');
            if (modal) modal.classList.add('hidden');
        });
    }
    
    // User Dashboard: Edit Perfil button
    const editPerfilBtn = document.getElementById('editPerfilBtn');
    if (editPerfilBtn) {
        editPerfilBtn.addEventListener('click', () => {
            if (typeof showView === 'function') {
                showView('perfilSection');
            }
        });
    }
    
    // New comunidad logo file
    const newComunidadLogoFile = document.getElementById('newComunidadLogoFile');
    if (newComunidadLogoFile) {
        newComunidadLogoFile.addEventListener('change', (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => {
                document.getElementById('newComunidadLogo').value = String(r.result || '');
            };
            r.readAsDataURL(f);
        });
    }
}

// ==================== Helper Handlers ====================

function handlePerfilFotoFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileNameEl = document.getElementById('perfilFotoFileName');
    if (fileNameEl) fileNameEl.textContent = file.name;
    const reader = new FileReader();
    reader.onload = () => {
        window.perfilFotoData = reader.result;
        const preview = document.getElementById('perfilFotoPreview');
        if (preview) preview.src = reader.result;
        const hint = document.getElementById('perfilFotoHint');
        if (hint) hint.textContent = 'Imagen cargada desde archivo local';
    };
    reader.readAsDataURL(file);
}

function handlePerfilFotoUrlChange(e) {
    const val = e.target.value.trim();
    if (!val) return;
    window.perfilFotoData = val;
    const preview = document.getElementById('perfilFotoPreview');
    if (preview) preview.src = val;
}

async function savePerfilHandler() {
    const user = auth?.currentUser;
    if (!user) return;
    
    const payload = {
        username: document.getElementById('perfilUsername')?.value || '',
        slogan: document.getElementById('perfilSlogan')?.value || '',
        nombre: document.getElementById('perfilNombre')?.value || '',
        apellido: document.getElementById('perfilApellido')?.value || '',
        cedula: document.getElementById('perfilCedula')?.value || '',
        ciudad: document.getElementById('perfilCiudad')?.value || '',
        direccion: document.getElementById('perfilDireccion')?.value || '',
        foto: window.perfilFotoData || document.getElementById('perfilFotoUrl')?.value || '',
        paises: Array.from(document.querySelectorAll('input[name="perfilPais"]:checked')).map(x => x.value)
    };
    
    await db.collection('lideres').doc(user.uid).set(payload, { merge: true });
    await db.collection('users').doc(user.uid).set(payload, { merge: true });
    
    alert('✓ Perfil actualizado');
    
    const liderDoc = await db.collection('lideres').doc(user.uid).get();
    if (typeof loadLiderData === 'function') {
        loadLiderData(user, liderDoc.data() || {});
    }
}

// Import Excel state
const importState = { headers: [], rows: [], map: {} };

function handleExcelFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    importState.fileName = file.name;
    
    file.arrayBuffer().then(data => {
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        importState.rows = rows;
        importState.headers = rows.length ? Object.keys(rows[0]) : [];
        importState.map = detectMap(importState.headers);
        renderMappingUI();
    });
}

function renderMappingUI() {
    const wrap = document.getElementById('importMapping');
    if (!wrap) return;
    const fields = [
        ['id_pedido', 'ID Pedido (obligatorio)'],
        ['fecha', 'Fecha'],
        ['correo_dropshipper', 'Correo dropshipper'],
        ['cantidad', 'Cantidad'],
        ['total_proveedor', 'Total proveedor'],
        ['estado', 'Estado'],
        ['sku', 'SKU'],
        ['variacion_id', 'Variación ID']
    ];
    const opts = ['<option value="">-- seleccionar columna --</option>']
        .concat(importState.headers.map(h => `<option value="${String(h).replace(/"/g, '&quot;')}">${h}</option>`))
        .join('');
    wrap.innerHTML = fields.map(([k, label]) => `
        <div class="grid grid-cols-2 gap-2 items-center">
            <label class="text-xs text-slate-300">${label}</label>
            <select data-map="${k}" class="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs">${opts}</select>
        </div>
    `).join('');
    wrap.querySelectorAll('select[data-map]').forEach(sel => {
        const key = sel.getAttribute('data-map');
        sel.value = importState.map[key] || '';
        sel.addEventListener('change', (e) => importState.map[key] = e.target.value);
    });
}

async function saveMappingHandler() {
    const user = auth?.currentUser;
    if (!user) return alert('Sesión expirada');
    if (!importState.fileName) return alert('Selecciona archivo primero');
    
    await db.collection('import_mappings').doc(user.uid + '__' + importState.fileName).set({
        fileName: importState.fileName,
        map: importState.map,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    alert('✓ Mapeo guardado');
}

async function loadMappingHandler() {
    const user = auth?.currentUser;
    if (!user) return alert('Sesión expirada');
    if (!importState.fileName) return alert('Selecciona archivo primero');
    
    const d = await db.collection('import_mappings').doc(user.uid + '__' + importState.fileName).get();
    if (!d.exists) return alert('No hay mapeo guardado para este archivo');
    
    importState.map = d.data().map || {};
    renderMappingUI();
    alert('✓ Mapeo cargado');
}

async function runImport() {
    const importBtn = document.getElementById('importBtn');
    const progressEl = document.getElementById('importProgress');
    
    try {
        if (!importState.rows.length) return alert('Primero selecciona un archivo Excel.');
        const idCol = importState.map.id_pedido;
        if (!idCol) return alert('Mapea la columna ID Pedido (obligatorio).');

        if (importBtn) { importBtn.disabled = true; importBtn.textContent = 'Importando...'; }
        if (progressEl) progressEl.textContent = 'Iniciando importación...';

        const getv = (row, key) => row[importState.map[key] || ''];
        let inserted = 0, updated = 0, skipped = 0, errors = 0, ignoredNoEmail = 0, ignoredNoUser = 0;
        const sourceFile = document.getElementById('excelFile')?.files?.[0]?.name || 'unknown.xlsx';
        const errorRows = [];

        const usersSnap = await db.collection('users').get();
        const registeredEmails = new Set(usersSnap.docs.map(d => String(d.data().email || '').toLowerCase().trim()).filter(Boolean));

        const totalRows = importState.rows.length;
        for (let i = 0; i < totalRows; i++) {
            const row = importState.rows[i];
            const id = String(getv(row, 'id_pedido') || '').trim();
            const correo = String(getv(row, 'correo_dropshipper') || '').toLowerCase().trim();
            const cantidad = parseNumber(getv(row, 'cantidad'));
            const total = parseNumber(getv(row, 'total_proveedor'));
            const fecha = parseDateISO(getv(row, 'fecha'));

            const rowErrors = [];
            if (!id) rowErrors.push('ID vacío');
            if (Number.isNaN(cantidad)) rowErrors.push('Cantidad inválida');
            if (Number.isNaN(total)) rowErrors.push('Total inválido');
            if (correo && !isEmail(correo)) rowErrors.push('Correo inválido');

            if (rowErrors.length) {
                errors++;
                errorRows.push(`Fila ${i+2}: ${rowErrors.join(', ')}`);
                continue;
            }

            if (!id) { skipped++; continue; }
            if (!correo) { ignoredNoEmail++; continue; }
            if (!registeredEmails.has(correo)) { ignoredNoUser++; continue; }

            const sku = String(getv(row, 'sku') || '').trim();
            const variacionId = String(getv(row, 'variacion_id') || '').trim();
            const rowHash = simpleHash([id, String(getv(row, 'fecha') || ''), String(getv(row, 'total_proveedor') || ''), String(getv(row, 'cantidad') || '')].join('|'));
            const lineKey = sku ? `${id}__${sku}` : (variacionId ? `${id}__VAR_${variacionId}` : `${id}__H_${rowHash}`);

            const guia = String(getv(row, 'numero_guia') || '').trim();
            const payload = {
                lineKey,
                id_pedido: id,
                sku,
                variacionId,
                fecha: fecha || String(getv(row, 'fecha') || ''),
                correoDropshipper: correo,
                cantidad: Number.isNaN(cantidad) ? 0 : cantidad,
                totalOrden: Number.isNaN(total) ? 0 : total,
                numeroGuia: guia,
                estado: String(getv(row, 'estado') || ''),
                source_file: sourceFile,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                raw: row
            };

            const ref = db.collection('ventas').doc(lineKey);
            const doc = await ref.get();
            if (doc.exists) {
                await ref.set(payload, { merge: true });
                updated++;
            } else {
                payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await ref.set(payload);
                inserted++;
            }

            if (i % 100 === 0 && progressEl) {
                progressEl.textContent = `Procesando ${i}/${totalRows}... Nuevos:${inserted} Actualizados:${updated}`;
            }
        }

        const report = document.getElementById('importReport');
        if (report) {
            report.innerHTML = `
                <div class="p-2 rounded bg-black/30 border border-white/10">
                    <p><b>Nuevos:</b> ${inserted} · <b>Actualizados:</b> ${updated} · <b>Saltados:</b> ${skipped} · <b>Errores:</b> ${errors}</p>
                    <p><b>Ignorados sin correo:</b> ${ignoredNoEmail} · <b>Ignorados sin usuario:</b> ${ignoredNoUser}</p>
                    ${errorRows.length ? `<details class="mt-1"><summary>Ver errores</summary><pre class="whitespace-pre-wrap text-[11px] mt-1">${errorRows.slice(0, 60).join('\n')}</pre></details>` : ''}
                </div>`;
        }

        if (progressEl) progressEl.textContent = '✅ Importación completada';
        alert(`Importación completa\nNuevos: ${inserted}\nActualizados: ${updated}\nSaltados: ${skipped}\nErrores: ${errors}\nIgnorados sin correo: ${ignoredNoEmail}\nIgnorados sin usuario: ${ignoredNoUser}`);
        
        if (typeof loadAdminData === 'function') loadAdminData();
    } catch (e) {
        console.error(e);
        if (progressEl) progressEl.textContent = '❌ Error en importación';
        alert('Error durante importación: ' + e.message);
    } finally {
        if (importBtn) { importBtn.disabled = false; importBtn.textContent = 'Importar'; }
    }
}

// ==================== Auth Listener ====================

function setupAuthListener() {
    console.log('setupAuthListener called, auth:', !!auth);
    if (!auth) {
        console.log('Auth not ready yet');
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    console.log('setupAuthListener, refParam:', refParam);
    
    // IMMEDIATELY show register if ref param exists (before auth check)
    if (refParam && typeof showView === 'function') {
        console.log('Ref param detected, showing register immediately');
        showView('register');
        if (typeof loadRegisterComunidadesAndPreselect === 'function') {
            loadRegisterComunidadesAndPreselect();
        }
    }

    auth.onAuthStateChanged(async (user) => {
        console.log('Auth state:', user ? user.uid : 'no user');
        
        if (user) {
            try {
                if (typeof handleAuth === 'function') {
                    await handleAuth(user);
                }
            } catch (e) {
                console.error('HandleAuth error:', e);
                alert('Error: ' + e.message);
            }
        } else {
            // Check URL for ref param directly (in case page loaded with ?ref=)
            const urlParams = new URLSearchParams(window.location.search);
            const refInUrl = urlParams.get('ref');
            if (refInUrl) {
                // If there's a ref parameter, show registration with comunidad preselected
                console.log('Auth listener: ref param found in URL, showing register');
                if (typeof showView === 'function') {
                    showView('register');
                }
                if (typeof loadRegisterComunidadesAndPreselect === 'function') {
                    await loadRegisterComunidadesAndPreselect();
                }
            } else {
                if (typeof showView === 'function') {
                    showView('login');
                }
            }
        }
    });
}

// ==================== Auto-Initialize ====================

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
}

// Export
window.mainModule = {
    initApp,
    initDashboardHandlers
};
