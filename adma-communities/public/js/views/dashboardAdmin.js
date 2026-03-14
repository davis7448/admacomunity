/**
 * ADMA Communities - Admin Dashboard View
 */

const AdminDashboardView = {
    elements: {},
    currentTab: 'overview',
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadData();
    },
    
    cacheElements() {
        this.elements = {
            // Nav tabs
            navOverview: document.getElementById('adminNavOverview'),
            navComunidades: document.getElementById('adminNavComunidades'),
            navUsuarios: document.getElementById('adminNavUsuarios'),
            navRetos: document.getElementById('adminNavRetos'),
            navSettings: document.getElementById('adminNavSettings'),
            
            // Sections
            overviewSection: document.getElementById('adminOverviewSection'),
            comunidadesSection: document.getElementById('adminComunidadesSection'),
            usuariosSection: document.getElementById('adminUsuariosSection'),
            retosSection: document.getElementById('adminRetosSection'),
            settingsSection: document.getElementById('adminSettingsSection'),
            
            // Stats
            totalComunidades: document.getElementById('totalComunidades'),
            totalUsuarios: document.getElementById('totalUsuarios'),
            totalVentas: document.getElementById('totalVentas'),
            totalFacturacion: document.getElementById('totalFacturacion'),
            
            // Containers
            comunidadesList: document.getElementById('adminComunidadesList'),
            usuariosList: document.getElementById('adminUsuariosList'),
            retosList: document.getElementById('adminRetosList'),
            
            // Buttons
            createComunidadBtn: document.getElementById('adminCreateComunidad'),
            createRetoBtn: document.getElementById('adminCreateReto'),
            manageRetosBtn: document.getElementById('adminManageRetos')
        };
    },
    
    bindEvents() {
        // Tabs
        this.elements.navOverview?.addEventListener('click', () => this.setTab('overview'));
        this.elements.navComunidades?.addEventListener('click', () => this.setTab('comunidades'));
        this.elements.navUsuarios?.addEventListener('click', () => this.setTab('usuarios'));
        this.elements.navRetos?.addEventListener('click', () => this.setTab('retos'));
        this.elements.navSettings?.addEventListener('click', () => this.setTab('settings'));
        
        // Buttons
        this.elements.createComunidadBtn?.addEventListener('click', () => this.openCreateComunidad());
        this.elements.createRetoBtn?.addEventListener('click', () => this.openCreateReto());
    },
    
    async loadData() {
        try {
            // Cargar overview
            await this.loadOverview();
            
            // Cargar comunidades
            await this.loadAllComunidades();
            
            // Cargar usuarios
            await this.loadAllUsuarios();
            
            // Cargar retos globales
            await this.loadGlobalRetos();
            
        } catch (error) {
            console.error('Error cargando datos admin:', error);
        }
    },
    
    async loadOverview() {
        try {
            // Cargar comunidades
            const comunidades = await getComunidades();
            
            // Contar usuarios y calcular ventas
            let totalUsuarios = 0;
            let totalVentas = 0;
            let totalFacturacion = 0;
            
            for (const c of comunidades) {
                const users = await getUsersByComunidad(c.id);
                totalUsuarios += users?.length || 0;
                
                const stats = await getVentasStatsByComunidad(c.id);
                totalVentas += stats?.ventas || 0;
                totalFacturacion += stats?.facturacion || 0;
            }
            
            // Render stats
            if (this.elements.totalComunidades) {
                this.elements.totalComunidades.textContent = comunidades.length || 0;
            }
            if (this.elements.totalUsuarios) {
                this.elements.totalUsuarios.textContent = totalUsuarios;
            }
            if (this.elements.totalVentas) {
                this.elements.totalVentas.textContent = totalVentas;
            }
            if (this.elements.totalFacturacion) {
                this.elements.totalFacturacion.textContent = AppHelpers.formatCurrency(totalFacturacion);
            }
            
        } catch (error) {
            console.error('Error loadOverview:', error);
        }
    },
    
    async loadAllComunidades() {
        try {
            const comunidades = await getComunidades();
            this.renderComunidades(comunidades);
        } catch (error) {
            console.error('Error loadComunidades:', error);
        }
    },
    
    renderComunidades(comunidades) {
        if (!this.elements.comunidadesList) return;
        
        if (!comunidades || comunidades.length === 0) {
            this.elements.comunidadesList.innerHTML = `
                <p class="text-slate-400 text-center py-4">No hay comunidades</p>
            `;
            return;
        }
        
        this.elements.comunidadesList.innerHTML = comunidades.map(c => `
            <div class="glass-card rounded-xl p-4 flex justify-between items-center">
                <div>
                    <h3 class="font-bold text-lg">${c.nombre}</h3>
                    <p class="text-sm text-slate-400">Código: ${c.codigo || 'N/A'}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="AdminDashboard.editComunidad('${c.id}')" 
                            class="px-3 py-1 bg-white/10 rounded hover:bg-white/20 text-sm">
                        Editar
                    </button>
                    <button onclick="AdminDashboard.deleteComunidad('${c.id}')" 
                            class="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-sm">
                        Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    },
    
    async loadAllUsuarios() {
        try {
            // Por ahora solo mostrar conteo
            // Para lista completa se necesitaría paginación
            const comunidades = await getComunidades();
            let allUsers = [];
            
            for (const c of comunidades) {
                const users = await getUsersByComunidad(c.id);
                allUsers = [...allUsers, ...(users || [])];
            }
            
            this.renderUsuarios(allUsers);
        } catch (error) {
            console.error('Error loadUsuarios:', error);
        }
    },
    
    renderUsuarios(usuarios) {
        if (!this.elements.usuariosList) return;
        
        if (!usuarios || usuarios.length === 0) {
            this.elements.usuariosList.innerHTML = `
                <p class="text-slate-400 text-center py-4">No hay usuarios</p>
            `;
            return;
        }
        
        // Mostrar solo primeros 50
        const displayUsers = usuarios.slice(0, 50);
        
        this.elements.usuariosList.innerHTML = displayUsers.map(u => `
            <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                    <p class="font-medium">${u.nombre || 'Sin nombre'}</p>
                    <p class="text-sm text-slate-400">${u.email || ''}</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs px-2 py-1 rounded bg-white/10">${u.role || 'user'}</span>
                    <span class="text-xs text-slate-500">${u.comunidadId || '-'}</span>
                </div>
            </div>
        `).join('');
        
        if (usuarios.length > 50) {
            this.elements.usuariosList.innerHTML += `
                <p class="text-center text-slate-400 text-sm py-2">Y ${usuarios.length - 50} más...</p>
            `;
        }
    },
    
    async loadGlobalRetos() {
        try {
            const retos = await getRetosGlobales();
            this.renderRetos(retos);
        } catch (error) {
            console.error('Error loadRetos:', error);
        }
    },
    
    renderRetos(retos) {
        if (!this.elements.retosList) return;
        
        if (!retos || retos.length === 0) {
            this.elements.retosList.innerHTML = `
                <p class="text-slate-400 text-center py-4">No hay retos globales</p>
            `;
            return;
        }
        
        this.elements.retosList.innerHTML = retos.map(r => `
            <div class="glass-card rounded-xl p-4">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold">${r.titulo || 'Reto'}</h3>
                        <p class="text-sm text-slate-400">${r.descripcion || ''}</p>
                        <p class="text-xs text-slate-500 mt-1">Comunidad: ${r.comunidadId || 'Global'}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-primary font-bold">${r.premio || ''}</p>
                        <span class="text-xs px-2 py-1 rounded ${r.estado === 'activo' ? 'bg-green-500/20 text-green-400' : 'bg-white/10'}">
                            ${r.estado || 'inactivo'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    },
    
    setTab(tabName) {
        this.currentTab = tabName;
        
        const sections = ['overview', 'comunidades', 'usuarios', 'retos', 'settings'];
        sections.forEach(s => {
            const el = document.getElementById(`admin${s.charAt(0).toUpperCase() + s.slice(1)}Section`);
            if (el) el.classList.add('hidden');
        });
        
        const showEl = document.getElementById(`admin${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Section`);
        if (showEl) showEl.classList.remove('hidden');
    },
    
    openCreateComunidad() {
        // Abrir modal
        const modal = document.getElementById('createComunidadModal');
        if (modal) modal.classList.remove('hidden');
    },
    
    openCreateReto() {
        const modal = document.getElementById('editAdminRetoModal');
        if (modal) modal.classList.remove('hidden');
    },
    
    // Métodos estáticos para botones
    editComunidad(comunidadId) {
        console.log('Editar comunidad:', comunidadId);
        const modal = document.getElementById('editComunidadModal');
        if (modal) modal.classList.remove('hidden');
    },
    
    deleteComunidad(comunidadId) {
        if (confirm('¿Estás seguro de eliminar esta comunidad?')) {
            console.log('Eliminar comunidad:', comunidadId);
        }
    },
    
    onMount() {
        this.init();
    }
};

// Alias para botones
window.AdminDashboard = {
    editComunidad: (id) => AdminDashboardView.editComunidad(id),
    deleteComunidad: (id) => AdminDashboardView.deleteComunidad(id)
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('adminDashboard')) {
        AdminDashboardView.init();
    }
});

window.AdminDashboardView = AdminDashboardView;
