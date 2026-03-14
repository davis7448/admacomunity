/**
 * ADMA Communities - Modals Manager
 * Manejo centralizado de todos los modales
 */

const Modals = {
    // Registro de modales
    modals: {},
    
    /**
     * Inicializar todos los modales
     */
    init() {
        this.registerModals();
        this.bindGlobalEvents();
    },
    
    /**
     * Registrar todos los modales del sistema
     */
    registerModals() {
        this.modals = {
            assignComunidad: {
                id: 'assignComunidadModal',
                open: this.openAssignComunidad.bind(this),
                close: this.closeAssignComunidad.bind(this)
            },
            editComunidad: {
                id: 'editComunidadModal',
                open: this.openEditComunidad.bind(this),
                close: this.closeEditComunidad.bind(this)
            },
            editLider: {
                id: 'editLiderModal',
                open: this.openEditLider.bind(this),
                close: this.closeEditLider.bind(this)
            },
            editReto: {
                id: 'editAdminRetoModal',
                open: this.openEditReto.bind(this),
                close: this.closeEditReto.bind(this)
            },
            registrarMiembro: {
                id: 'registrarMiembroModal',
                open: this.openRegistrarMiembro.bind(this),
                close: this.closeRegistrarMiembro.bind(this)
            },
            createComunidad: {
                id: 'createComunidadModal',
                open: this.openCreateComunidad.bind(this),
                close: this.closeCreateComunidad.bind(this)
            }
        };
    },
    
    /**
     * Bind eventos globales de modales
     */
    bindGlobalEvents() {
        // Asignar Comunidad
        document.getElementById('closeAssignComunidadBtn')?.addEventListener('click', () => this.close('assignComunidad'));
        document.getElementById('saveAssignComunidadBtn')?.addEventListener('click', () => this.saveAssignComunidad());
        
        // Editar Comunidad
        document.getElementById('closeComunidadEditBtn')?.addEventListener('click', () => this.close('editComunidad'));
        document.getElementById('saveComunidadEditBtn')?.addEventListener('click', () => this.saveEditComunidad());
        
        // Editar Líder
        document.getElementById('closeModalBtn')?.addEventListener('click', () => this.close('editLider'));
        document.getElementById('saveLiderBtn')?.addEventListener('click', () => this.saveEditLider());
        document.getElementById('deleteLiderBtn')?.addEventListener('click', () => this.deleteLider());
        document.getElementById('resetPasswordBtn')?.addEventListener('click', () => this.resetPassword());
        document.getElementById('addComunidadBtn')?.addEventListener('click', () => this.addComunidadToLider());
        
        // Editar Reto (Admin)
        document.getElementById('closeEditAdminRetoBtn')?.addEventListener('click', () => this.close('editReto'));
        document.getElementById('saveEditAdminRetoBtn')?.addEventListener('click', () => this.saveEditReto());
        
        // Registrar Miembro
        document.getElementById('closeMiembroModalBtn')?.addEventListener('click', () => this.close('registrarMiembro'));
        document.getElementById('saveMiembroBtn')?.addEventListener('click', () => this.saveMiembro());
        
        // Crear Comunidad
        document.getElementById('closeComunidadModalBtn')?.addEventListener('click', () => this.close('createComunidad'));
        document.getElementById('saveComunidadBtn')?.addEventListener('click', () => this.saveNewComunidad());
        
        // Cerrar al hacer click fuera
        Object.values(this.modals).forEach(modal => {
            const el = document.getElementById(modal.id);
            el?.addEventListener('click', (e) => {
                if (e.target === el) this.close(modal.id.replace('Modal', ''));
            });
        });
        
        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const visible = Object.values(this.modals).find(m => {
                    const el = document.getElementById(m.id);
                    return el && !el.classList.contains('hidden');
                });
                if (visible) this.close(visible.id.replace('Modal', ''));
            }
        });
    },
    
    /**
     * Abrir modal
     */
    open(modalName) {
        const modal = this.modals[modalName];
        if (!modal) return;
        
        const el = document.getElementById(modal.id);
        if (el) {
            el.classList.remove('hidden');
            el.classList.add('flex', 'fade-in');
        }
    },
    
    /**
     * Cerrar modal
     */
    close(modalName) {
        const modal = this.modals[modalName];
        if (!modal) return;
        
        const el = document.getElementById(modal.id);
        if (el) {
            el.classList.add('hidden');
            el.classList.remove('flex');
        }
    },
    
    // ========== ASIGNAR COMUNIDAD ==========
    async openAssignComunidad(userId, userEmail) {
        document.getElementById('assignUserId').value = userId || '';
        document.getElementById('assignUserEmail').textContent = userEmail || '';
        
        // Cargar comunidades
        const select = document.getElementById('assignComunidadSelect');
        select.innerHTML = '';
        
        try {
            const comunidades = await getComunidades();
            comunidades.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.nombre;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error('Error cargando comunidades:', e);
        }
        
        this.open('assignComunidad');
    },
    
    async saveAssignComunidad() {
        const userId = document.getElementById('assignUserId').value;
        const comunidadId = document.getElementById('assignComunidadSelect').value;
        
        if (!userId || !comunidadId) {
            AppHelpers.showToast('Selecciona una comunidad', 'error');
            return;
        }
        
        try {
            await createOrUpdateUser(userId, { comunidadId });
            AppHelpers.showToast('Comunidad asignada', 'success');
            this.close('assignComunidad');
            
            // Recargar datos si existe función
            if (typeof loadAdminData === 'function') loadAdminData();
        } catch (e) {
            AppHelpers.showToast('Error asignando comunidad', 'error');
        }
    },
    
    closeAssignComunidad() { this.close('assignComunidad'); },
    
    // ========== EDITAR COMUNIDAD ==========
    openEditComunidad(comunidad) {
        document.getElementById('editComunidadId').value = comunidad.id || '';
        document.getElementById('editComunidadNombre').value = comunidad.nombre || '';
        document.getElementById('editComunidadCodigo').value = comunidad.codigo || '';
        document.getElementById('editComunidadLogo').value = comunidad.logo || '';
        this.open('editComunidad');
    },
    
    async saveEditComunidad() {
        const id = document.getElementById('editComunidadId').value;
        if (!id) return;
        
        const data = {
            nombre: document.getElementById('editComunidadNombre').value,
            codigo: document.getElementById('editComunidadCodigo').value.toUpperCase(),
            logo: document.getElementById('editComunidadLogo').value
        };
        
        try {
            await db.collection('comunidades').doc(id).set(data, { merge: true });
            AppHelpers.showToast('Comunidad actualizada', 'success');
            this.close('editComunidad');
            
            if (typeof loadAdminData === 'function') loadAdminData();
        } catch (e) {
            AppHelpers.showToast('Error guardando', 'error');
        }
    },
    
    closeEditComunidad() { this.close('editComunidad'); },
    
    // ========== EDITAR LÍDER ==========
    openEditLider(lider) {
        document.getElementById('editLiderId').value = lider.id || '';
        document.getElementById('editLiderNombre').value = lider.nombre || '';
        document.getElementById('editLiderEmail').value = lider.email || '';
        
        // Cargar comunidades del líder
        const list = document.getElementById('editComunidadesList');
        list.innerHTML = '';
        
        if (lider.comunidades) {
            lider.comunidades.forEach(c => {
                list.innerHTML += `<div class="flex justify-between items-center bg-white/5 p-2 rounded">
                    <span>${c.nombre}</span>
                    <button type="button" onclick="Modals.removeComunidadFromLider('${c.id}')" class="text-red-400">✕</button>
                </div>`;
            });
        }
        
        this.open('editLider');
    },
    
    async saveEditLider() {
        const id = document.getElementById('editLiderId').value;
        if (!id) return;
        
        const data = {
            nombre: document.getElementById('editLiderNombre').value
        };
        
        try {
            await createOrUpdateUser(id, data);
            AppHelpers.showToast('Líder actualizado', 'success');
            this.close('editLider');
        } catch (e) {
            AppHelpers.showToast('Error guardando', 'error');
        }
    },
    
    async deleteLider() {
        if (!confirm('¿Eliminar este líder?')) return;
        const id = document.getElementById('editLiderId').value;
        // Lógica de eliminación
        this.close('editLider');
    },
    
    async resetPassword() {
        const email = document.getElementById('editLiderEmail').value;
        if (!email) return;
        
        try {
            await firebase.auth().sendPasswordResetEmail(email);
            AppHelpers.showToast('Email de recuperación enviado', 'success');
        } catch (e) {
            AppHelpers.showToast('Error enviando email', 'error');
        }
    },
    
    addComunidadToLider() {
        // Implementar selector
    },
    
    removeComunidadFromLider(comunidadId) {
        // Implementar eliminación
    },
    
    closeEditLider() { this.close('editLider'); },
    
    // ========== EDITAR RETO ==========
    openEditReto(reto) {
        document.getElementById('editAdminRetoId').value = reto.id || '';
        document.getElementById('editAdminRetoTitulo').value = reto.titulo || '';
        document.getElementById('editAdminRetoTipo').value = reto.tipo || 'facturacion';
        document.getElementById('editAdminRetoMeta').value = reto.meta || '';
        document.getElementById('editAdminRetoEstado').value = reto.estado || 'activo';
        document.getElementById('editAdminRetoInicio').value = reto.inicio || '';
        document.getElementById('editAdminRetoFin').value = reto.fin || '';
        document.getElementById('editAdminRetoImagen').value = reto.imagen || '';
        document.getElementById('editAdminRetoDesc').value = reto.descripcion || '';
        this.open('editReto');
    },
    
    async saveEditReto() {
        const id = document.getElementById('editAdminRetoId').value;
        if (!id) return;
        
        const data = {
            titulo: document.getElementById('editAdminRetoTitulo').value,
            tipo: document.getElementById('editAdminRetoTipo').value,
            meta: Number(document.getElementById('editAdminRetoMeta').value),
            estado: document.getElementById('editAdminRetoEstado').value,
            inicio: document.getElementById('editAdminRetoInicio').value,
            fin: document.getElementById('editAdminRetoFin').value,
            imagen: document.getElementById('editAdminRetoImagen').value,
            descripcion: document.getElementById('editAdminRetoDesc').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            await db.collection('retos').doc(id).set(data, { merge: true });
            AppHelpers.showToast('Reto actualizado', 'success');
            this.close('editReto');
            
            if (typeof loadAdminData === 'function') loadAdminData();
        } catch (e) {
            AppHelpers.showToast('Error guardando', 'error');
        }
    },
    
    closeEditReto() { this.close('editReto'); },
    
    // ========== REGISTRAR MIEMBRO ==========
    openRegistrarMiembro() {
        // Limpiar campos
        document.getElementById('miembroNombre').value = '';
        document.getElementById('miembroEmail').value = '';
        document.getElementById('miembroTelefono').value = '';
        
        // Cargar comunidades
        const select = document.getElementById('miembroComunidad');
        select.innerHTML = '';
        
        getComunidades().then(comunidades => {
            comunidades.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.nombre;
                select.appendChild(opt);
            });
        });
        
        this.open('registrarMiembro');
    },
    
    async saveMiembro() {
        const nombre = document.getElementById('miembroNombre').value;
        const email = document.getElementById('miembroEmail').value;
        const telefono = document.getElementById('miembroTelefono').value;
        const comunidadId = document.getElementById('miembroComunidad').value;
        
        if (!email || !comunidadId) {
            AppHelpers.showToast('Completa los campos requeridos', 'error');
            return;
        }
        
        AppHelpers.showToast('Función en desarrollo', 'info');
        this.close('registrarMiembro');
    },
    
    closeRegistrarMiembro() { this.close('registrarMiembro'); },
    
    // ========== CREAR COMUNIDAD ==========
    openCreateComunidad() {
        document.getElementById('newComunidadNombre').value = '';
        document.getElementById('newComunidadCodigo').value = '';
        document.getElementById('newComunidadLogo').value = '';
        this.open('createComunidad');
    },
    
    async saveNewComunidad() {
        const btn = document.getElementById('saveComunidadBtn');
        const nombre = document.getElementById('newComunidadNombre').value;
        const codigo = document.getElementById('newComunidadCodigo').value.toUpperCase();
        const logo = document.getElementById('newComunidadLogo').value;
        
        if (!nombre || !codigo) {
            AppHelpers.showToast('Nombre y código son requeridos', 'error');
            return;
        }
        
        // Deshabilitar botón y mostrar estado
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Creando...';
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
        try {
            await db.collection('comunidades').add({
                nombre,
                codigo,
                logo,
                liderId: AppState.currentUser?.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            AppHelpers.showToast('Comunidad creada', 'success');
            this.close('createComunidad');
            
            if (typeof loadAdminData === 'function') loadAdminData();
        } catch (e) {
            AppHelpers.showToast('Error creando comunidad', 'error');
            
            // Re-habilitar botón en caso de error
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Crear';
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    },
    
    closeCreateComunidad() { 
        // Resetear botón al cerrar
        const btn = document.getElementById('saveComunidadBtn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Crear';
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        this.close('createComunidad'); 
    }
};

// Auto-inicializar
document.addEventListener('DOMContentLoaded', () => {
    Modals.init();
});

// Exportar
window.Modals = Modals;
