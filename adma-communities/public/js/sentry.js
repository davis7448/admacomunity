/**
 * ADMA Communities - Sentry Integration
 * Agrega tracking de errores con Sentry
 * 
 * Para usar:
 * 1. Crear cuenta en sentry.io
 * 2. Crear proyecto para ADMA Communities
 * 3. Reemplazar DSN con tu URL
 */

(function() {
  'use strict';
  
  // Configuración - REEMPLAZAR con tu DSN de Sentry
  // Ejemplo: 'https://abc123@o123456.ingest.sentry.io/1234567'
  var SENTRY_DSN = null; // Set null para deshabilitar
  
  // Inicializar Sentry si hay DSN configurado
  if (SENTRY_DSN) {
    // Cargar script de Sentry dinámicamente
    var sentryScript = document.createElement('script');
    sentryScript.src = 'https://browser.sentry-cdn.com/7.50.0/bundle.min.js';
    sentryScript.crossOrigin = 'anonymous';
    sentryScript.onload = function() {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: window.location.hostname === 'localhost' ? 'development' : 'production',
        release: 'adma-communities@1.0.0',
        integrations: [
          Sentry.BrowserTracing(),
          Sentry.Replay()
        ],
        tracesSampleRate: window.location.hostname === 'localhost' ? 1.0 : 0.1,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        beforeSend: function(event) {
          // Filtrar errores de Firebase que no son críticos
          if (event.exception && event.exception.values) {
            event.exception.values = event.exception.values.filter(function(ex) {
              var message = ex.value || '';
              // Ignorar errores conocidos de Firebase/auth
              return !message.includes('auth/network-request-failed') &&
                     !message.includes('Firebase Error');
            });
          }
          return event;
        }
      });
      
      console.log('🔍 Sentry initialized - Error tracking enabled');
    };
    document.head.appendChild(sentryScript);
  }
  
  // Función global para capturar errores manualmente
  window.admaCaptureException = function(error, context) {
    if (typeof Sentry !== 'undefined') {
      Sentry.withScope(function(scope) {
        if (context) {
          scope.setExtra('context', context);
        }
        Sentry.captureException(error);
      });
    }
    // También logger tradicional
    console.error('[ADMA Error]', error, context);
  };
  
  // Función para capturar mensajes
  window.admaCaptureMessage = function(message, level) {
    if (typeof Sentry !== 'undefined') {
      Sentry.captureMessage(message, level || 'info');
    }
    console.log('[ADMA ' + (level || 'info') + ']', message);
  };
  
  // Wrapper para catchear errores en funciones
  window.admaWithErrorHandling = function(fn, context) {
    return function() {
      try {
        return fn.apply(this, arguments);
      } catch (error) {
        window.admaCaptureException(error, context);
        throw error;
      }
    };
  };
  
  console.log('📊 Sentry integration loaded (DSN: ' + (SENTRY_DSN ? 'configured' : 'not configured') + ')');
})();
