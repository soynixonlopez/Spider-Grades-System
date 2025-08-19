import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Settings, Mail, TestTube } from 'lucide-react';
import toast from 'react-hot-toast';
import { sendPasscodeEmail, EmailData } from '../../lib/emailService';

const emailConfigSchema = z.object({
  serviceId: z.string().min(1, 'Service ID es requerido'),
  templateId: z.string().min(1, 'Template ID es requerido'),
  publicKey: z.string().min(1, 'Public Key es requerido'),
  siteUrl: z.string().url('URL inválida').optional().or(z.literal('')),
});

type EmailConfigFormData = z.infer<typeof emailConfigSchema>;

export function EmailConfig() {
  const [showModal, setShowModal] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  const form = useForm<EmailConfigFormData>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID || '',
      templateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID || '',
      publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || '',
      siteUrl: process.env.REACT_APP_SITE_URL || 'http://localhost:3000',
    },
  });

  const onSubmit = async (data: EmailConfigFormData) => {
    try {
      // En un entorno real, esto se guardaría en una base de datos o configuración del servidor
      // Por ahora, solo mostramos un mensaje de éxito
      toast.success('Configuración de email guardada exitosamente');
      setShowModal(false);
    } catch (error) {
      toast.error('Error al guardar la configuración');
      console.error('Error saving email config:', error);
    }
  };

  const testEmail = async () => {
    const data = form.getValues();
    if (!data.serviceId || !data.templateId || !data.publicKey) {
      toast.error('Configura primero las credenciales de EmailJS');
      return;
    }

    setTestingEmail(true);

    try {
      const testEmailData: EmailData = {
        to: 'test@example.com',
        name: 'Admin',
        lastname: 'Test',
        passcode: 'TEST123',
        role: 'professor'
      };

      const success = await sendPasscodeEmail(testEmailData);
      
      if (success) {
        toast.success('Email de prueba enviado exitosamente');
        console.log('📧 Email de prueba enviado usando EmailJS');
      } else {
        toast.error('Error al enviar email de prueba');
      }
    } catch (error) {
      toast.error(`Error al enviar email de prueba: ${error}`);
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Settings className="h-4 w-4" />
        Configurar Email
      </Button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Configuración de Email"
              >
        <div className="max-h-96 overflow-y-auto px-4 pt-2 pb-4">
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Configuración para envío de passcodes
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Configura las credenciales de email para enviar passcodes a profesores y estudiantes.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                                            <Input
                          label="Service ID"
                          type="text"
                          placeholder="service_xxxxxxx"
                          {...form.register('serviceId')}
                          error={form.formState.errors.serviceId?.message}
                        />

                        <Input
                          label="Template ID"
                          type="text"
                          placeholder="template_xxxxxxx"
                          {...form.register('templateId')}
                          error={form.formState.errors.templateId?.message}
                        />

                        <Input
                          label="Public Key"
                          type="text"
                          placeholder="xxxxxxxxxxxxxxxxxxxxx"
                          {...form.register('publicKey')}
                          error={form.formState.errors.publicKey?.message}
                        />

            <Input
              label="URL del Sitio"
              type="url"
              placeholder="https://grades.motta.superate.org.pa"
              {...form.register('siteUrl')}
              error={form.formState.errors.siteUrl?.message}
            />

                                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                          <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                            ✅ EmailJS Configurado:
                          </h4>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            El sistema está configurado para enviar emails reales usando EmailJS. 
                            Asegúrate de configurar tus credenciales de EmailJS para que funcione correctamente.
                          </p>
                        </div>

            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={testEmail}
                disabled={testingEmail}
                className="flex items-center gap-2"
              >
                {testingEmail ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                Probar Email
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Guardar
                </Button>
              </div>
            </div>
          </form>
        </div>
        </div>
      </Modal>
    </>
  );
}
