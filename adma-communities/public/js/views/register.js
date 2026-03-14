/**
 * ADMA Communities - Register View
 */

const RegisterView = {
    form: null,
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadComunidades();
    },
    
    cacheElements() {
        this.form = document.getElementById('registerForm');
        this.comunidadSelect = document.getElementById('regComunidad');
        this.paisesContainer = document.getElementById('paisesContainer');
    },
    
    bindEvents() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleRegister(e));
        }
    },
    
    async loadComunidades() {
        try {
            if (typeof getComunidades === 'function') {
                const comunidades = await getComunidades();
                this.renderComunidades(comunidades);
            }
        } catch (error) {
            console.error('Error cargando comunidades:', error);
        }
    },
    
    renderComunidades(comunidades) {
        if (!this.comunidadSelect) return;
        
        comunidades.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.nombre;
            this.comunidadSelect.appendChild(option);
        });
    },
    
    async handleRegister(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('regNombre')?.value.trim();
        const email = document.getElementById('regEmail')?.value.trim();
        const password = document.getElementById('regPassword')?.value;
        const telefono = document.getElementById('regTelefono')?.value.trim();
        const comunidadId = this.comunidadSelect?.value;
        
        // Validar
        if (!nombre || !email || !password || !telefono || !comunidadId) {
            AppHelpers.showToast('Por favor completa todos los campos', 'error');
            return;
        }
        
        if (password.length < 6) {
            AppHelpers.showToast('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        try {
            // Obtener países seleccionados
            const paises = Array.from(document.querySelectorAll('input[name="pais"]:checked'))
                .map(cb => cb.value);
            
            // Llamar función de firebase.js
            if (typeof registerWithEmail === 'function') {
                const userCredential = await registerWithEmail(email, password, nombre);
                
                // Crear datos de usuario
                await createOrUpdateUser(userCredential.user.uid, {
                    nombre,
                    email,
                    telefono,
                    comunidadId,
                    paises,
                    role: 'user',
                    createdAt: new Date().toISOString()
                });
                
                AppHelpers.showToast('¡Cuenta creada exitosamente!', 'success');
                
                // Redirigir
                AppState.setUser(userCredential.user);
                AppState.setComunidad(comunidadId);
                AppState.setRole('user');
                Router.navigate('userDashboard');
            }
        } catch (error) {
            console.error('Error registro:', error);
            AppHelpers.showToast(this.getErrorMessage(error.code), 'error');
        }
    },
    
    getErrorMessage(code) {
        const messages = {
            'auth/email-already-in-use': 'El email ya está registrado',
            'auth/invalid-email': 'Email inválido',
            'auth/weak-password': 'Contraseña muy débil'
        };
        return messages[code] || 'Error al crear cuenta';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    RegisterView.init();
});

window.RegisterView = RegisterView;
