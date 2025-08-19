import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Tables } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { BookOpen, GraduationCap, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface SubjectSelectionProps {
  selectedSubject: string;
  selectedPromotion: string;
  onSubjectChange: (subjectId: string) => void;
  onPromotionChange: (promotionId: string) => void;
}

interface AssignmentWithDetails {
  id: string;
  professors: {
    name: string;
    lastname: string;
  }[];
  subjects: {
    id: string;
    name: string;
    description: string | null;
  }[];
  promotions: {
    id: string;
    year: number;
    level: string;
    shift: string;
  }[];
}

export function SubjectSelection({
  selectedSubject,
  selectedPromotion,
  onSubjectChange,
  onPromotionChange,
}: SubjectSelectionProps) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      // First get the professor record
      const { data: professorData, error: professorError } = await supabase
        .from('professors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (professorError) throw professorError;

      if (professorData) {
        // Get assignments for this professor
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('professor_subjects')
          .select(`
            id,
            professors!inner (
              name,
              lastname
            ),
            subjects!inner (
              id,
              name,
              description
            ),
            promotions!inner (
              id,
              year,
              level,
              shift
            )
          `)
          .eq('professor_id', professorData.id)
          .order('created_at', { ascending: false });

        if (assignmentsError) throw assignmentsError;
        setAssignments(assignmentsData || []);
      }
    } catch (error) {
      toast.error('Error al cargar asignaciones');
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelection = (subjectId: string, promotionId: string) => {
    onSubjectChange(subjectId);
    onPromotionChange(promotionId);
    toast.success('Selección actualizada');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <BookOpen className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No tienes asignaciones
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Contacta al administrador para que te asigne materias y promociones.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Selección de Asignatura y Promoción
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Selecciona la asignatura y promoción con la que trabajarás
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => {
              const isSelected = 
                selectedSubject === assignment.subjects[0]?.id && 
                selectedPromotion === assignment.promotions[0]?.id;

              return (
                <div
                  key={assignment.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                  onClick={() => handleSelection(assignment.subjects[0]?.id || '', assignment.promotions[0]?.id || '')}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <BookOpen className="h-5 w-5 text-primary-600 mr-2" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {assignment.subjects[0]?.name}
                      </h3>
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-primary-600" />
                    )}
                  </div>

                  {assignment.subjects[0]?.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {assignment.subjects[0]?.description}
                    </p>
                  )}

                  <div className="flex items-center">
                    <GraduationCap className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {assignment.promotions[0]?.year} - {assignment.promotions[0]?.level} {assignment.promotions[0]?.shift}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-primary-200 dark:border-primary-700">
                      <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                        Seleccionado
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedSubject && selectedPromotion && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Asignación seleccionada
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    Puedes proceder a gestionar categorías y calificaciones
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
