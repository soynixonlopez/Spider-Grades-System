import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { PromotionsManagement } from '../components/admin/PromotionsManagement';
import { SubjectsManagement } from '../components/admin/SubjectsManagement';
import { ProfessorsManagement } from '../components/admin/ProfessorsManagement';
import { StudentsManagement } from '../components/admin/StudentsManagement';

import { EmailConfig } from '../components/admin/EmailConfig';
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  UserCheck, 
  UserPlus,
  Settings,
  LogOut
} from 'lucide-react';

type AdminSection = 
  | 'promotions' 
  | 'subjects' 
  | 'professors' 
  | 'students' 
  | 'settings';

export function AdminDashboard() {
  const { signOut, profile } = useAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>('promotions');

  const menuItems = [
    {
      id: 'promotions' as AdminSection,
      label: 'Promociones',
      icon: GraduationCap,
      description: 'Gestionar cohortes y años'
    },
    {
      id: 'subjects' as AdminSection,
      label: 'Asignaturas',
      icon: BookOpen,
      description: 'Gestionar materias'
    },
    {
      id: 'professors' as AdminSection,
      label: 'Profesores',
      icon: Users,
      description: 'Gestionar docentes'
    },
    {
      id: 'students' as AdminSection,
      label: 'Estudiantes',
      icon: UserPlus,
      description: 'Matrícula y gestión'
    },

    {
      id: 'settings' as AdminSection,
      label: 'Configuración',
      icon: Settings,
      description: 'Ajustes del sistema'
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'promotions':
        return <PromotionsManagement />;
      case 'subjects':
        return <SubjectsManagement />;
      case 'professors':
        return <ProfessorsManagement />;
              case 'students':
          return <StudentsManagement />;

      case 'settings':
        return <SettingsSection />;
      default:
        return <PromotionsManagement />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
             <Sidebar
         title="Admin Dashboard"
         subtitle="Bienvenido, admin"
         menuItems={menuItems}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onSignOut={signOut}
        signOutIcon={LogOut}
      />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Configuración del Sistema
        </h2>
        
        <div className="space-y-6">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Configuración de Email
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Configura el servicio de email para enviar passcodes a profesores y estudiantes.
            </p>
            <EmailConfig />
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Información del Sistema
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Spider Grades System v1.0.0
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Sistema de gestión académica integral
            </p>
          </div>
          
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Acciones de Promoción Anual
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Estas acciones promueven automáticamente a los estudiantes al siguiente nivel.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Promover Freshman → Junior
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-300">
                    Avanza estudiantes de primer año
                  </p>
                </div>
                <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                  Ejecutar
                </button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Promover Junior → Senior
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    Avanza estudiantes de segundo año
                  </p>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Ejecutar
                </button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Egresar Seniors
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    Marca estudiantes como egresados
                  </p>
                </div>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Ejecutar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
