/**
 * ADMA Communities - App Router & State
 * Maneja navegación entre vistas y estado global
 */

// ==================== ESTADO GLOBAL ====================
const AppState = {
    currentUser: null,
    currentView: 'login',
    currentComunidad: null,
    userRole: null, // 'user', 'lider', 'admin'
    
    // Cache
    comunidades: [],
    retos: [],
    ventas: [],
    
    // Métodos
    setUser(user) {
        this.currentUser = user;
        this.notify('userChanged', user);
    },
    
    setComunidad(comunidad) {
        this.currentComunidad = comunidad;
        this.notify('comunidadChanged', comunidad);
    },
    
    setRole(role) {
        this.userRole = role;
        this.notify('roleChanged', role);
    },
    
    // Event system simple
    listeners: {},
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    },
    
    notify(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    },
    
    reset() {
        this.currentUser = null;
        this.currentComunidad = null;
        this.userRole = null;
    }
};

// ==================== VISTAS DISPONIBLES ====================
const VIEWS = {
    // Vistas de auth
    login: 'loginView',
    register: 'registerView',
    // selectComunidad: 'selectComunidadView', // ELIMINADO
    // enterCode: 'enterCodeView', // ELIMINADO
    
    // Dashboards
    userDashboard: 'userDashboard',
    liderDashboard: 'liderDashboard',
    adminDashboard: 'adminDashboard'
};

// ==================== LAZY LOADING ====================
const ViewLoader = {
    loadedViews: new Set(['login', 'register']), // Vistas base ya cargadas
    
    /**
     * Cargar módulo de vista dinámicamente
     * @param {string} viewName - Nombre de la vista
     */
    async loadView(viewName) {
        if (this.loadedViews.has(viewName)) {
            return true; // Ya cargada
        }
        
        // Vistas eliminadas - no intentar cargar
        if (viewName === 'selectComunidad' || viewName === 'enterCode') {
            console.warn(`Vista ${viewName} eliminada`);
            return false;
        }
        
        const viewModules = {
            userDashboard: '/js/views/dashboardUser.js',
            liderDashboard: '/js/views/dashboardLider.js',
            adminDashboard: '/js/views/dashboardAdmin.js'
        };
        
        const modulePath = viewModules[viewName];
        if (!modulePath) {
            console.warn(`No hay módulo para: ${viewName}`);
            return false;
        }
        
        try {
            console.log(`📦 Lazy loading: ${viewName}`);
            await this.loadScript(modulePath);
            this.loadedViews.add(viewName);
            return true;
        } catch (error) {
            console.error(`Error cargando vista ${viewName}:`, error);
            return false;
        }
    },
    
    /**
     * Cargar script dinámicamente
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },
    
    /**
     * Precargar vistas comunes (猜测下一步)
     */
    prefetchCommonViews(role) {
        const prefetches = {
            admin: ['adminDashboard'],
            lider: ['liderDashboard'],
            user: ['userDashboard']
        };
        
        const viewsToLoad = prefetches[role] || [];
        viewsToLoad.forEach(v => this.loadView(v));
    }
};

// ==================== ROUTER ====================
const Router = {
    currentView: null,
    
    /**
     * Navega a una vista específica
     * @param {string} viewName - Nombre de la vista (key de VIEWS)
     */
    async navigate(viewName) {
        const viewId = VIEWS[viewName];
        if (!viewId) {
            console.error(`Vista no encontrada: ${viewName}`);
            return;
        }
        
        // Lazy load si es necesario
        await ViewLoader.loadView(viewName);
        
        // Ocultar vista actual
        if (this.currentView) {
            const currentEl = document.getElementById(VIEWS[this.currentView]);
            if (currentEl) {
                currentEl.classList.add('hidden');
                currentEl.style.display = 'none';
            }
        }
        
        // También ocultar loginView si es diferente
        if (viewName !== 'login') {
            const loginEl = document.getElementById('loginView');
            if (loginEl) {
                loginEl.classList.add('hidden');
                loginEl.style.display = 'none';
            }
        }
        
        // Mostrar nueva vista
        const newEl = document.getElementById(viewId);
        console.log('🎯 Navegando a:', viewName, '| Elemento:', newEl);
        if (newEl) {
            newEl.classList.remove('hidden');
            newEl.classList.add('fade-in');
            newEl.style.display = 'flex'; // Forzar display
            console.log('✅ Vista mostrada:', viewId);
            this.currentView = viewName;
            AppState.currentView = viewName;
            
            // Emitir evento
            AppState.notify('viewChanged', viewName);
            
            // Ejecutar init de la vista si existe
            if (ViewControllers[viewName]?.onMount) {
                ViewControllers[viewName].onMount();
            }
        }
    },
    
    /**
     * Navegación por rol
     */
    navigateByRole(role) {
        switch (role) {
            case 'admin':
                this.navigate('adminDashboard');
                break;
            case 'lider':
                this.navigate('liderDashboard');
                break;
            default:
                this.navigate('userDashboard');
        }
    },
    
    /**
     * Obtener vista actual
     */
    getCurrentView() {
        return this.currentView;
    }
};

// ==================== CONTROLADORES DE VISTAS ====================
const ViewControllers = {
    login: {
        onMount() {
            console.log('Login view mounted');
        }
    },
    
    register: {
        onMount() {
            console.log('Register view mounted');
            // Cargar comunidades para el select
            if (typeof loadComunidadesForSelect === 'function') {
                loadComunidadesForSelect();
            }
        }
    },
    
    selectComunidad: {
        onMount() {
            console.log('Select Comunidad view mounted');
        }
    },
    
    userDashboard: {
        onMount() {
            console.log('User Dashboard mounted');
        }
    },
    
    liderDashboard: {
        onMount() {
            console.log('Lider Dashboard mounted');
        }
    },
    
    adminDashboard: {
        onMount() {
            console.log('Admin Dashboard mounted');
        }
    }
};

// ==================== HELPERS ====================
const AppHelpers = {
    /**
     * Mostrar toast/notificación
     */
    showToast(message, type = 'info') {
        // Implementar según necesidad
        console.log(`[${type}] ${message}`);
    },
    
    /**
     * Mostrar loading
     */
    showLoading(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.innerHTML = '<div class="animate-spin">⏳</div>';
    },
    
    /**
     * Ocultar loading
     */
    hideLoading(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.innerHTML = '';
    },
    
    /**
     * Formatear fecha
     */
    formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('es-CO');
    },
    
    /**
     * Formatear currency
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP'
        }).format(amount || 0);
    }
};

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('ADMA Communities App Initialized');
    
    // Verificar si hay sesión activa
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                AppState.setUser(user);
                // Aquí redirigir según rol
                console.log('Usuario autenticado:', user.email);
            } else {
                Router.navigate('login');
            }
        });
    }
});

// Exportar para uso global
window.AppState = AppState;
window.Router = Router;
window.ViewControllers = ViewControllers;
window.AppHelpers = AppHelpers;
window.ViewLoader = ViewLoader;
