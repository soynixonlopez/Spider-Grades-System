import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { StudentGrades } from '../components/student/StudentGrades';
import { StudentProgress } from '../components/student/StudentProgress';
import { StudentHistory } from '../components/student/StudentHistory';
import { 
  BookOpen, 
  BarChart3, 
  History,
  LogOut
} from 'lucide-react';

type StudentSection = 'grades' | 'progress' | 'history';

export function StudentDashboard() {
  const { signOut, profile } = useAuth();
  const [activeSection, setActiveSection] = useState<StudentSection>('grades');

  const menuItems = [
    {
      id: 'grades' as StudentSection,
      label: 'Calificaciones',
      icon: BookOpen,
      description: 'Ver notas actuales'
    },
    {
      id: 'progress' as StudentSection,
      label: 'Progreso',
      icon: BarChart3,
      description: 'Seguimiento académico'
    },
    {
      id: 'history' as StudentSection,
      label: 'Historial',
      icon: History,
      description: 'Historial académico'
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'grades':
        return <StudentGrades />;
      case 'progress':
        return <StudentProgress />;
      case 'history':
        return <StudentHistory />;
      default:
        return <StudentGrades />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        title="Estudiante Dashboard"
        subtitle={`Bienvenido, ${profile?.email}`}
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
