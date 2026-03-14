/**
 * ADMA Communities - User Dashboard View
 */

const UserDashboardView = {
    elements: {},
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadData();
    },
    
    cacheElements() {
        this.elements = {
            welcome: document.getElementById('userWelcome'),
            comunidadName: document.getElementById('userComunidadName'),
            retosContainer: document.getElementById('retosContainer'),
            ventasContainer: document.getElementById('ventasContainer'),
            perfilLink: document.getElementById('perfilLink'),
            retosLink: document.getElementById('retosLink'),
            ventasLink: document.getElementById('ventasLink'),
            logoutBtn: document.getElementById('logoutBtn')
        };
    },
    
    bindEvents() {
        // Eventos de navegación
        if (this.elements.perfilLink) {
            this.elements.perfilLink.addEventListener('click', () => this.showSection('perfil'));
        }
        if (this.elements.retosLink) {
            this.elements.retosLink.addEventListener('click', () => this.showSection('retos'));
        }
        if (this.elements.ventasLink) {
            this.elements.ventasLink.addEventListener('click', () => this.showSection('ventas'));
        }
        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    },
    
    async loadData() {
        if (!AppState.currentUser) return;
        
        try {
            // Cargar comunidad
            if (AppState.currentComunidad) {
                const comunidad = await getComunidad(AppState.currentComunidad);
                if (comunidad && this.elements.comunidadName) {
                    this.elements.comunidadName.textContent = comunidad.nombre;
                }
            }
            
            // Cargar retos
            await this.loadRetos();
            
            // Cargar ventas
            await this.loadVentas();
            
        } catch (error) {
            console.error('Error cargando datos:', error);
        }
    },
    
    async loadRetos() {
        try {
            let retos = [];
            
            // Cargar retos inscritos
            if (typeof getRetosInscritos === 'function') {
                const inscritos = await getRetosInscritos(AppState.currentUser.uid);
                retos = [...(inscritos || [])];
            }
            
            // También cargar retos de la comunidad (no inscritos)
            if (AppState.currentComunidad && typeof getRetosByComunidad === 'function') {
                const comunidadRetos = await getRetosByComunidad(AppState.currentComunidad);
                
                // Filtrar solo los no inscritos
                const inscritoIds = retos.map(r => r.id);
                const nuevos = (comunidadRetos || []).filter(r => !inscritoIds.includes(r.id));
                
                retos = [...retos, ...nuevos];
            }
            
            // Cargar retos globales también
            if (typeof getRetosGlobales === 'function') {
                const globales = await getRetosGlobales();
                const retoIds = retos.map(r => r.id);
                const nuevosGlobales = (globales || []).filter(r => !retoIds.includes(r.id));
                retos = [...retos, ...nuevosGlobales];
            }
            
            this.renderRetos(retos);
        } catch (error) {
            console.error('Error cargando retos:', error);
        }
    },
    
    renderRetos(retos) {
        if (!this.elements.retosContainer) return;
        
        if (!retos || retos.length === 0) {
            this.elements.retosContainer.innerHTML = `
                <div class="text-center text-slate-400 py-8">
                    <p>No tienes retos inscritos</p>
                    <a href="#" class="text-primary hover:underline">Ver retos disponibles</a>
                </div>
            `;
            return;
        }
        
        this.elements.retosContainer.innerHTML = retos.map(reto => `
            <div class="glass-card rounded-xl p-4">
                <h3 class="font-bold">${reto.titulo || 'Reto sin título'}</h3>
                <p class="text-slate-400 text-sm">${reto.descripcion || ''}</p>
                <div class="mt-2 flex justify-between items-center">
                    <span class="text-primary text-sm">Premio: ${reto.premio || '-'}</span>
                    <span class="text-xs text-slate-500">Estado: ${reto.estado || 'activo'}</span>
                </div>
            </div>
        `).join('');
    },
    
    async loadVentas() {
        try {
            if (typeof getVentasByEmail === 'function') {
                const ventas = await getVentasByEmail(AppState.currentUser.email);
                this.renderVentas(ventas);
            }
        } catch (error) {
            console.error('Error cargando ventas:', error);
        }
    },
    
    renderVentas(ventas) {
        if (!this.elements.ventasContainer) return;
        
        const total = ventas?.reduce((sum, v) => sum + (parseFloat(v.totalOrden) || 0), 0) || 0;
        const unidades = ventas?.reduce((sum, v) => sum + (parseInt(v.cantidad) || 0), 0) || 0;
        
        this.elements.ventasContainer.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-white/5 rounded-lg p-4 text-center">
                    <p class="text-slate-400 text-sm">Total Ventas</p>
                    <p class="text-2xl font-bold text-primary">${AppHelpers.formatCurrency(total)}</p>
                </div>
                <div class="bg-white/5 rounded-lg p-4 text-center">
                    <p class="text-slate-400 text-sm">Unidades</p>
                    <p class="text-2xl font-bold">${unidades}</p>
                </div>
            </div>
        `;
    },
    
    showSection(section) {
        // Ocultar todas las secciones
        document.querySelectorAll('#userDashboard section').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Mostrar sección seleccionada
        const sectionEl = document.getElementById(`${section}Section`);
        if (sectionEl) {
            sectionEl.classList.remove('hidden');
        }
    },
    
    async handleLogout() {
        try {
            if (typeof logout === 'function') {
                await logout();
            }
            AppState.reset();
            Router.navigate('login');
        } catch (error) {
            console.error('Error logout:', error);
        }
    },
    
    onMount() {
        this.init();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('userDashboard')) {
        UserDashboardView.init();
    }
});

window.UserDashboardView = UserDashboardView;
