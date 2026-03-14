/**
 * ADMA Communities - Login View
 */

const LoginView = {
    /**
     * Inicializar vista de login
     */
    init() {
        this.cacheElements();
        this.bindEvents();
    },
    
    /**
     * Cachear elementos del DOM
     */
    cacheElements() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.showRegisterLink = document.getElementById('showRegister');
        this.errorMsg = document.getElementById('loginError');
    },
    
    /**
     * Bind eventos
     */
    bindEvents() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (this.showRegisterLink) {
            this.showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                Router.navigate('register');
            });
        }
    },
    
    /**
     * Manejar login
     */
    async handleLogin(e) {
        e.preventDefault();
        
        console.log(' handleLogin llamado');
        
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        
        if (!email || !password) {
            this.showError('Por favor ingresa email y contraseña');
            return;
        }
        
        // Disable button temporarily
        const btn = this.form?.querySelector('button[type="submit"]');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Cargando...';
        }
        
        try {
            console.log(' Intentando login con:', email);
            
            // Direct Firebase call instead of wrapper
            const result = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = result.user;
            
            console.log(' Login exitoso (directo):', user.email);
            console.log(' UID:', user.uid);
            
            // Set in AppState
            AppState.setUser(user);
            
            // Verificar comunidad y redirigir
            await this.checkComunidadAndRedirect(user);
            
        } catch (error) {
            console.error(' Error en login:', error);
            this.showError(error.message || 'Error al iniciar sesión');
        } finally {
            // Re-enable button
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Entrar';
            }
        }
    },
    
    /**
     * Verificar comunidad y redirigir
     */
    async checkComunidadAndRedirect(user) {
        try {
            // Primero buscar en admins collection
            const adminDoc = await firebase.firestore().collection('admins').doc(user.uid).get();
            if (adminDoc.exists) {
                console.log('✅ Es admin');
                AppState.setRole('admin');
                AppState.setComunidad(null);
                Router.navigate('adminDashboard');
                return;
            }
            
            // Buscar en lideres collection
            const liderDoc = await firebase.firestore().collection('lideres').doc(user.uid).get();
            if (liderDoc.exists) {
                console.log('✅ Es líder');
                AppState.setRole('lider');
                const comunidades = await getComunidadesByLider(user.uid);
                AppState.setComunidad(comunidades?.[0]?.id || null);
                Router.navigate('liderDashboard');
                return;
            }
            
            // Buscar en users collection
            const userData = await getUserData(user.uid);
            console.log('📊 UserData:', userData);
            console.log('📊 Rol:', userData?.rol);
            
            const isAdmin = userData?.rol === 'admin';
            const isLider = userData?.rol === 'lider';
            
            console.log('📊 isAdmin:', isAdmin, '| isLider:', isLider);
            
            // Para admin y líder, siempre permitir acceso al dashboard
            if (isAdmin) {
                AppState.setRole('admin');
                AppState.setComunidad(userData?.comunidadId || null);
                Router.navigate('adminDashboard');
                return;
            }
            
            if (isLider) {
                // Para líderes, buscar sus comunidades
                const comunidades = await getComunidadesByLider(user.uid);
                if (comunidades && comunidades.length > 0) {
                    AppState.setRole('lider');
                    AppState.setComunidad(comunidades[0].id);
                    Router.navigate('liderDashboard');
                    return;
                }
                // Si líder sin comunidad asignada, ir al dashboard de líder
                AppState.setRole('lider');
                Router.navigate('liderDashboard');
                return;
            }
            
            // Para usuarios normales, ir directamente al dashboard
            // (aunque no tenga comunidad asignada)
            AppState.setComunidad(userData?.comunidadId || null);
            AppState.setRole('user');
            Router.navigate('userDashboard');
        } catch (error) {
            console.error('Error verificando comunidad:', error);
            // Ir a user dashboard aunque falle
            AppState.setRole('user');
            Router.navigate('userDashboard');
        }
    },
    
    /**
     * Mostrar error
     */
    showError(message) {
        if (this.errorMsg) {
            this.errorMsg.textContent = message;
            this.errorMsg.classList.remove('hidden');
            
            setTimeout(() => {
                this.errorMsg.classList.add('hidden');
            }, 5000);
        }
    },
    
    /**
     * Obtener mensaje de error legible
     */
    getErrorMessage(code) {
        const messages = {
            'auth/invalid-email': 'Email inválido',
            'auth/user-disabled': 'Usuario deshabilitado',
            'auth/user-not-found': 'Usuario no encontrado',
            'auth/wrong-password': 'Contraseña incorrecta',
            'auth/invalid-credential': 'Credenciales incorrectas'
        };
        return messages[code] || 'Error al iniciar sesión';
    }
};

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🔥 LoginView init (DOM ready)');
        LoginView.init();
    });
} else {
    console.log('🔥 LoginView init (already ready)');
    LoginView.init();
}

// Exportar
window.LoginView = LoginView;
