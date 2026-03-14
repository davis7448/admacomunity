/**
 * ADMA Communities - Lider Dashboard View
 */

const LiderDashboardView = {
    elements: {},
    currentTab: 'dashboard',
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadData();
    },
    
    cacheElements() {
        this.elements = {
            navDashboard: document.getElementById('navDashboard'),
            navComunidades: document.getElementById('navComunidades'),
            navUsuarios: document.getElementById('navUsuarios'),
            navRetos: document.getElementById('navRetos'),
            navPerfil: document.getElementById('navPerfil'),
            
            dashboardSection: document.getElementById('liderHomeSection'),
            comunidadesSection: document.getElementById('comunidadesSection'),
            usuariosSection: document.getElementById('usuariosSection'),
            retosSection: document.getElementById('retosSection'),
            perfilSection: document.getElementById('perfilSection'),
            
            comunidadName: document.getElementById('liderComunidadName'),
            statsContainer: document.getElementById('liderStats'),
            miembrosContainer: document.getElementById('miembrosContainer'),
            
            createComunidadBtn: document.getElementById('createComunidadBtn'),
            createRetoBtn: document.getElementById('createRetoBtn'),
            addMemberBtn: document.getElementById('addMemberBtn')
        };
    },
    
    bindEvents() {
        // Navegación por tabs
        this.elements.navDashboard?.addEventListener('click', () => this.setTab('dashboard'));
        this.elements.navComunidades?.addEventListener('click', () => this.setTab('comunidades'));
        this.elements.navUsuarios?.addEventListener('click', () => this.setTab('usuarios'));
        this.elements.navRetos?.addEventListener('click', () => this.setTab('retos'));
        this.elements.navPerfil?.addEventListener('click', () => this.setTab('perfil'));
        
        // Botones de acción
        this.elements.createComunidadBtn?.addEventListener('click', () => this.openModal('createComunidad'));
        this.elements.createRetoBtn?.addEventListener('click', () => this.openModal('createReto'));
        this.elements.addMemberBtn?.addEventListener('click', () => this.openModal('addMember'));
    },
    
    async loadData() {
        if (!AppState.currentUser) return;
        
        try {
            // Cargar comunidad del líder
            const comunidades = await getComunidadesByLider(AppState.currentUser.uid);
            
            if (comunidades && comunidades.length > 0) {
                const comunidad = comunidades[0];
                AppState.setComunidad(comunidad);
                
                if (this.elements.comunidadName) {
                    this.elements.comunidadName.textContent = comunidad.nombre;
                }
                
                // Cargar estadísticas
                await this.loadStats(comunidad.id);
                
                // Cargar miembros
                await this.loadMiembros(comunidad.id);
                
                // Cargar retos
                await this.loadRetos(comunidad.id);
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
        }
    },
    
    async loadStats(comunidadId) {
        try {
            if (typeof getVentasStatsByComunidad === 'function') {
                const stats = await getVentasStatsByComunidad(comunidadId);
                this.renderStats(stats);
            }
        } catch (error) {
            console.error('Error cargando stats:', error);
        }
    },
    
    renderStats(stats) {
        if (!this.elements.statsContainer || !stats) return;
        
        this.elements.statsContainer.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white/5 rounded-xl p-4 text-center">
                    <p class="text-slate-400 text-sm">Miembros</p>
                    <p class="text-3xl font-bold text-primary">${stats.miembros || 0}</p>
                </div>
                <div class="bg-white/5 rounded-xl p-4 text-center">
                    <p class="text-slate-400 text-sm">Ventas</p>
                    <p class="text-3xl font-bold">${stats.ventas || 0}</p>
                </div>
                <div class="bg-white/5 rounded-xl p-4 text-center">
                    <p class="text-slate-400 text-sm">Facturación</p>
                    <p class="text-2xl font-bold text-green-400">${AppHelpers.formatCurrency(stats.facturacion)}</p>
                </div>
                <div class="bg-white/5 rounded-xl p-4 text-center">
                    <p class="text-slate-400 text-sm">Unidades</p>
                    <p class="text-3xl font-bold">${stats.unidades || 0}</p>
                </div>
            </div>
        `;
    },
    
    async loadMiembros(comunidadId) {
        try {
            if (typeof getUsersByComunidad === 'function') {
                const miembros = await getUsersByComunidad(comunidadId);
                this.renderMiembros(miembros);
            }
        } catch (error) {
            console.error('Error cargando miembros:', error);
        }
    },
    
    renderMiembros(miembros) {
        if (!this.elements.miembrosContainer) return;
        
        if (!miembros || miembros.length === 0) {
            this.elements.miembrosContainer.innerHTML = `
                <p class="text-slate-400 text-center py-4">No hay miembros aún</p>
            `;
            return;
        }
        
        this.elements.miembrosContainer.innerHTML = miembros.map(m => `
            <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                    <p class="font-medium">${m.nombre || 'Sin nombre'}</p>
                    <p class="text-sm text-slate-400">${m.email || ''}</p>
                </div>
                <span class="text-xs px-2 py-1 rounded ${m.role === 'lider' ? 'bg-primary/20 text-primary' : 'bg-white/10'}">
                    ${m.role || 'user'}
                </span>
            </div>
        `).join('');
    },
    
    async loadRetos(comunidadId) {
        try {
            if (typeof getRetosByComunidad === 'function') {
                const retos = await getRetosByComunidad(comunidadId);
                this.renderRetos(retos);
            }
        } catch (error) {
            console.error('Error cargando retos:', error);
        }
    },
    
    renderRetos(retos) {
        if (!this.elements.retosSection) return;
        
        const container = this.elements.retosSection.querySelector('.space-y-4') || 
                          document.getElementById('retosList');
        
        if (!container) return;
        
        if (!retos || retos.length === 0) {
            container.innerHTML = `<p class="text-slate-400 text-center py-4">No hay retos activos</p>`;
            return;
        }
        
        container.innerHTML = retos.map(r => `
            <div class="glass-card rounded-xl p-4">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold">${r.titulo || 'Reto'}</h3>
                        <p class="text-sm text-slate-400">${r.descripcion || ''}</p>
                    </div>
                    <span class="text-primary text-sm">${r.premio || ''}</span>
                </div>
            </div>
        `).join('');
    },
    
    setTab(tabName) {
        this.currentTab = tabName;
        
        // Ocultar todas las secciones
        const sections = ['dashboard', 'comunidades', 'usuarios', 'retos', 'perfil'];
        sections.forEach(s => {
            const el = document.getElementById(`${s}Section`) || 
                       document.getElementById(`lider${s.charAt(0).toUpperCase() + s.slice(1)}Section`);
            if (el) el.classList.add('hidden');
        });
        
        // Mostrar sección seleccionada
        const showEl = document.getElementById(`${tabName}Section`) ||
                       document.getElementById(`lider${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Section`);
        if (showEl) showEl.classList.remove('hidden');
    },
    
    openModal(modalType) {
        // Delegar a modals.js
        if (window.LiderModals && window.LiderModals[modalType]) {
            window.LiderModals[modalType]();
        }
    },
    
    onMount() {
        this.init();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('liderDashboard')) {
        LiderDashboardView.init();
    }
});

window.LiderDashboardView = LiderDashboardView;
