import emailjs from '@emailjs/browser';

// Configuración de EmailJS
// Nota: Necesitarás reemplazar estos valores con tus credenciales reales de EmailJS
const EMAILJS_CONFIG = {
  SERVICE_ID: process.env.REACT_APP_EMAILJS_SERVICE_ID || 'tu_service_id',
  TEMPLATE_ID: process.env.REACT_APP_EMAILJS_TEMPLATE_ID || 'tu_template_id',
  PUBLIC_KEY: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || 'tu_public_key'
};

export interface EmailData {
  to: string;
  name: string;
  lastname: string;
  passcode: string;
  role: 'professor' | 'student';
  promotion?: string;
}

// Función para enviar email individual usando EmailJS
export const sendPasscodeEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    console.log('📧 Enviando email real a:', emailData.to);

    // Preparar los datos para la plantilla de EmailJS
    const templateParams = {
      to_email: emailData.to,
      to_name: `${emailData.name} ${emailData.lastname}`,
      user_name: emailData.name,
      user_lastname: emailData.lastname,
      passcode: emailData.passcode,
      role: emailData.role === 'professor' ? 'Profesor' : 'Estudiante',
      promotion: emailData.promotion || 'N/A',
      site_url: process.env.REACT_APP_SITE_URL || 'http://localhost:3000',
      subject: 'Tu Passcode - Sistema de Calificaciones Spider'
    };

    // Enviar email usando EmailJS
    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams,
      EMAILJS_CONFIG.PUBLIC_KEY
    );

    console.log('✅ Email enviado exitosamente:', response);
    return true;
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    return false;
  }
};

// Función para envío masivo de emails
export const sendBulkPasscodeEmails = async (emailDataList: EmailData[]): Promise<{success: number, failed: number, errors: string[]}> => {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  console.log(`📧 Iniciando envío masivo de ${emailDataList.length} emails`);

  for (const emailData of emailDataList) {
    try {
      const success = await sendPasscodeEmail(emailData);
      if (success) {
        results.success++;
        console.log(`✅ Email enviado exitosamente a ${emailData.to}`);
      } else {
        results.failed++;
        results.errors.push(`Error enviando email a ${emailData.to}`);
        console.log(`❌ Error enviando email a ${emailData.to}`);
      }
      
      // Pequeña pausa entre emails para evitar límites de rate
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      results.failed++;
      results.errors.push(`Error enviando email a ${emailData.to}: ${error}`);
      console.log(`❌ Error enviando email a ${emailData.to}:`, error);
    }
  }

  console.log(`📊 Resultado del envío masivo: ${results.success} exitosos, ${results.failed} fallidos`);
  return results;
};

// Función para generar el contenido del email (para mostrar preview)
export const generateEmailContent = (emailData: EmailData): string => {
  return `
    Sistema de Calificaciones Spider - Credenciales de Acceso

    Hola ${emailData.name} ${emailData.lastname},

    Se han generado tus credenciales de acceso al Sistema de Calificaciones Spider.

    Tu Passcode de Acceso: ${emailData.passcode}

    Información de tu cuenta:
    • Email: ${emailData.to}
    • Rol: ${emailData.role === 'professor' ? 'Profesor' : 'Estudiante'}
    ${emailData.promotion ? `• Promoción: ${emailData.promotion}` : ''}
    • Sistema: Sistema de Calificaciones Spider

    Instrucciones de acceso:
    1. Ve al sistema: ${process.env.REACT_APP_SITE_URL || 'http://localhost:3000'}
    2. Ingresa tu email: ${emailData.to}
    3. Ingresa tu passcode: ${emailData.passcode}
    4. Haz clic en "Iniciar Sesión"

    ⚠️ Importante:
    • Guarda este passcode en un lugar seguro
    • No compartas tus credenciales con nadie
    • Si olvidas tu passcode, contacta al administrador

    Este es un email automático del Sistema de Calificaciones Spider
    Si tienes alguna pregunta, contacta al administrador del sistema
  `;
};
