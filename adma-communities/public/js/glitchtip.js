/**
 * ADMA Communities - GlitchTip Integration
 * Alternativa open-source y gratuita a Sentry
 * 
 * Para usar:
 * 1. Crear cuenta en glitchtip.com (o instancia self-hosted)
 * 2. Crear proyecto para ADMA Communities
 * 3. Reemplazar GLITCHTIP_DSN con tu URL
 */

(function() {
  'use strict';
  
  // Configuración - REEMPLAZAR con tu DSN de GlitchTip
  // Ejemplo: 'https://[email protected]/1'
  var GLITCHTIP_DSN = null; // Set null para deshabilitar
  
  // No cargar script externo - GlitchTip usa su propio SDK o API
  // Puedes configurar esto manualmente o usar self-hosted
  
  if (GLITCHTIP_DSN) {
    console.log('🔍 GlitchTip configured - Error tracking enabled');
  }
  
  // Función global para capturar errores manualmente
  window.admaCaptureException = function(error, context) {
    if (GLITCHTIP_DSN) {
      // Enviar a GlitchTip via API
      fetch(GLITCHTIP_DSN + '/api/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: generateUUID(),
          timestamp: new Date().toISOString(),
          level: 'error',
          message: error.message || String(error),
          logger: 'javascript',
          platform: 'javascript',
          runtime: {
            name: 'browser',
            version: navigator.userAgent
          },
          extra: context || {}
        })
      }).catch(function() {});
    }
    // También logger tradicional
    console.error('[ADMA Error]', error, context);
  };
  
  // Función para capturar mensajes
  window.admaCaptureMessage = function(message, level) {
    if (GLITCHTIP_DSN) {
      fetch(GLITCHTIP_DSN + '/api/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: generateUUID(),
          timestamp: new Date().toISOString(),
          level: level || 'info',
          message: message,
          logger: 'javascript',
          platform: 'javascript'
        })
      }).catch(function() {});
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
  
  // Auto-catch errores no manejados
  window.onerror = function(message, source, lineno, colno, error) {
    window.admaCaptureException(error || message, {
      source: source,
      line: lineno,
      column: colno
    });
  };
  
  window.onunhandledrejection = function(event) {
    window.admaCaptureException(event.reason, {
      type: 'unhandledRejection'
    });
  };
  
  // Helper para generar UUID
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0,
          v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  console.log('📊 GlitchTip integration loaded (DSN: ' + (GLITCHTIP_DSN ? 'configured' : 'not configured') + ')');
})();
