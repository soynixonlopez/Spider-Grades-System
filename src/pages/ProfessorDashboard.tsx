import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { SubjectSelection } from '../components/professor/SubjectSelection';
import { GradeCategories } from '../components/professor/GradeCategories';
import { GradeEntry } from '../components/professor/GradeEntry';
import { GradeOverview } from '../components/professor/GradeOverview';
import { 
  BookOpen, 
  GraduationCap, 
  BarChart3, 
  Edit3,
  LogOut
} from 'lucide-react';

type ProfessorSection = 'selection' | 'categories' | 'grades' | 'overview';

export function ProfessorDashboard() {
  const { signOut, profile } = useAuth();
  const [activeSection, setActiveSection] = useState<ProfessorSection>('selection');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedPromotion, setSelectedPromotion] = useState<string>('');

  const menuItems = [
    {
      id: 'selection' as ProfessorSection,
      label: 'Selección',
      icon: BookOpen,
      description: 'Asignatura y promoción'
    },
    {
      id: 'categories' as ProfessorSection,
      label: 'Categorías',
      icon: GraduationCap,
      description: 'Gestión de categorías'
    },
    {
      id: 'grades' as ProfessorSection,
      label: 'Calificaciones',
      icon: Edit3,
      description: 'Registro de notas'
    },
    {
      id: 'overview' as ProfessorSection,
      label: 'Resumen',
      icon: BarChart3,
      description: 'Vista general'
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'selection':
        return (
          <SubjectSelection
            selectedSubject={selectedSubject}
            selectedPromotion={selectedPromotion}
            onSubjectChange={setSelectedSubject}
            onPromotionChange={setSelectedPromotion}
          />
        );
      case 'categories':
        return (
          <GradeCategories
            selectedSubject={selectedSubject}
            selectedPromotion={selectedPromotion}
          />
        );
      case 'grades':
        return (
          <GradeEntry
            selectedSubject={selectedSubject}
            selectedPromotion={selectedPromotion}
          />
        );
      case 'overview':
        return (
          <GradeOverview
            selectedSubject={selectedSubject}
            selectedPromotion={selectedPromotion}
          />
        );
      default:
        return (
          <SubjectSelection
            selectedSubject={selectedSubject}
            selectedPromotion={selectedPromotion}
            onSubjectChange={setSelectedSubject}
            onPromotionChange={setSelectedPromotion}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        title="Profesor Dashboard"
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
