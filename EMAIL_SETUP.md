# Configuración de EmailJS para Sistema de Calificaciones Spider

Este documento explica cómo configurar EmailJS para enviar passcodes a profesores y estudiantes.

## Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=tu_url_de_supabase
REACT_APP_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase

# EmailJS Configuration
REACT_APP_EMAILJS_SERVICE_ID=service_xxxxxxx
REACT_APP_EMAILJS_TEMPLATE_ID=template_xxxxxxx
REACT_APP_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxxxxxxxx
REACT_APP_SITE_URL=http://localhost:3000
```

## Configuración de EmailJS

### 1. Crear Cuenta en EmailJS
1. Ve a [EmailJS.com](https://www.emailjs.com/)
2. Crea una cuenta gratuita
3. Verifica tu email

### 2. Configurar Email Service
1. Ve a "Email Services" en el dashboard
2. Haz clic en "Add New Service"
3. Selecciona tu proveedor de email (Gmail, Outlook, etc.)
4. Conecta tu cuenta de email
5. Copia el **Service ID** (ej: `service_abc123`)

### 3. Crear Email Template
1. Ve a "Email Templates" en el dashboard
2. Haz clic en "Create New Template"
3. Usa este template HTML:

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tu Passcode - Sistema Spider</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        .passcode-box {
            background-color: #f8f9fa;
            border: 2px solid #007bff;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
        }
        .passcode {
            font-size: 28px;
            font-weight: bold;
            color: #007bff;
            letter-spacing: 3px;
            font-family: 'Courier New', monospace;
        }
        .info {
            background-color: #e7f3ff;
            border-left: 4px solid #007bff;
            padding: 15px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🕷️ Sistema de Calificaciones Spider</div>
            <p>Credenciales de Acceso</p>
        </div>
        
        <h2>Hola {{user_name}} {{user_lastname}},</h2>
        
        <p>Se han generado tus credenciales de acceso al Sistema de Calificaciones Spider.</p>
        
        <div class="passcode-box">
            <h3>Tu Passcode de Acceso:</h3>
            <div class="passcode">{{passcode}}</div>
        </div>
        
        <div class="info">
            <strong>Información de tu cuenta:</strong><br>
            • Email: {{to_email}}<br>
            • Rol: {{role}}<br>
            • Promoción: {{promotion}}<br>
            • Sistema: Sistema de Calificaciones Spider
        </div>
        
        <p><strong>Instrucciones de acceso:</strong></p>
        <ol>
            <li>Ve al sistema: <a href="{{site_url}}">{{site_url}}</a></li>
            <li>Ingresa tu email: <strong>{{to_email}}</strong></li>
            <li>Ingresa tu passcode: <strong>{{passcode}}</strong></li>
            <li>Haz clic en "Iniciar Sesión"</li>
        </ol>
        
        <div class="info">
            <strong>⚠️ Importante:</strong><br>
            • Guarda este passcode en un lugar seguro<br>
            • No compartas tus credenciales con nadie<br>
            • Si olvidas tu passcode, contacta al administrador
        </div>
        
        <div class="footer">
            <p>Este es un email automático del Sistema de Calificaciones Spider</p>
            <p>Si tienes alguna pregunta, contacta al administrador del sistema</p>
        </div>
    </div>
</body>
</html>
```

4. Guarda el template y copia el **Template ID** (ej: `template_xyz789`)

### 4. Obtener Public Key
1. Ve a "Account" > "API Keys"
2. Copia tu **Public Key**

### 5. Configuración en el Sistema
1. Ve a la sección "Configuración" en el dashboard de administrador
2. Haz clic en "Configurar Email"
3. Ingresa:
   - **Service ID:** Tu Service ID de EmailJS
   - **Template ID:** Tu Template ID de EmailJS
   - **Public Key:** Tu Public Key de EmailJS
   - **URL del Sitio:** http://localhost:3000
4. Haz clic en "Probar Email" para verificar la configuración

## 🎯 Funcionalidades Implementadas

### Para Profesores:
- ✅ **Envío Individual:** Botón de email en cada fila de profesor
- ✅ **Envío Masivo:** Botón "Enviar Passcodes" para todos los profesores
- ✅ **Email Personalizado:** Incluye nombre, email, passcode y rol

### Para Estudiantes:
- ✅ **Envío Individual:** Botón de email en cada fila de estudiante
- ✅ **Envío Masivo:** Botón "Enviar Passcodes" para todos los estudiantes
- ✅ **Email Personalizado:** Incluye nombre, email, passcode, rol y promoción

## 📋 Características del Email

Los emails incluyen:
- 🎨 **Diseño HTML profesional** con logo del sistema
- 📝 **Información completa** del usuario (nombre, email, passcode, rol)
- 📚 **Instrucciones de acceso** paso a paso
- ⚠️ **Advertencias de seguridad** sobre el uso del passcode
- 📱 **Diseño responsive** para móviles y desktop

## 🚀 Uso del Sistema

### Envío Individual:
1. Ve a **Profesores** o **Estudiantes**
2. Busca el usuario deseado
3. Haz clic en el botón **📧** (email) en la fila correspondiente
4. El sistema enviará automáticamente el passcode

### Envío Masivo:
1. Ve a **Profesores** o **Estudiantes**
2. Haz clic en **"Enviar Passcodes"**
3. El sistema enviará emails a todos los usuarios con emails válidos
4. Verás notificaciones del progreso

## 🔍 Monitoreo y Errores

- ✅ **Notificaciones de éxito** cuando los emails se envían correctamente
- ❌ **Notificaciones de error** si hay problemas
- 📊 **Contador de emails** enviados vs fallidos
- 🔄 **Indicadores de carga** durante el envío

## 🛠️ Solución de Problemas

### Error: "Service ID not found"
- Verifica que el Service ID sea correcto
- Asegúrate de que el servicio esté activo en EmailJS

### Error: "Template ID not found"
- Verifica que el Template ID sea correcto
- Asegúrate de que el template esté publicado

### Error: "Public Key invalid"
- Verifica que el Public Key sea correcto
- Asegúrate de que la cuenta esté verificada

### Error: "Rate limit exceeded"
- EmailJS gratuito tiene límites de 200 emails/mes
- Considera actualizar a un plan pagado si necesitas más

## 📝 Notas Importantes

- 🔒 **Seguridad:** Los passcodes se generan automáticamente y son únicos
- 📧 **Frecuencia:** Puedes enviar emails múltiples veces si es necesario
- 🎯 **Audiencia:** Los emails solo se envían a usuarios con emails válidos
- 📱 **Compatibilidad:** Los emails funcionan en todos los clientes de correo
- 🆓 **Gratuito:** 200 emails/mes con plan gratuito de EmailJS

## 🔄 Actualizaciones Futuras

- 📊 **Dashboard de emails:** Estadísticas de envío
- 📅 **Programación:** Envío automático en fechas específicas
- 📝 **Plantillas personalizables:** Diferentes estilos de email
- 🔔 **Notificaciones push:** Alertas en tiempo real
