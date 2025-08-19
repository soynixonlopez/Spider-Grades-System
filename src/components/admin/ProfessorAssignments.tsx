import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { Tables } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Plus, Edit, Trash2, Users, BookOpen, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

const assignmentSchema = z.object({
  professor_id: z.string().min(1, 'El profesor es requerido'),
  subject_id: z.string().min(1, 'La asignatura es requerida'),
  promotion_id: z.string().min(1, 'La promoción es requerida'),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

interface AssignmentWithDetails extends Tables<'professor_subjects'> {
  professors: {
    name: string;
    lastname: string;
    specialty: string;
  };
  subjects: {
    name: string;
    description: string | null;
  };
  promotions: {
    year: number;
    level: string;
    shift: string;
  };
}

export function ProfessorAssignments() {
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [professors, setProfessors] = useState<Tables<'professors'>[]>([]);
  const [subjects, setSubjects] = useState<Tables<'subjects'>[]>([]);
  const [promotions, setPromotions] = useState<Tables<'promotions'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentWithDetails | null>(null);

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assignmentsResult, professorsResult, subjectsResult, promotionsResult] = await Promise.all([
        supabase
          .from('professor_subjects')
          .select(`
            *,
            professors (
              name,
              lastname,
              specialty
            ),
            subjects (
              name,
              description
            ),
            promotions (
              year,
              level,
              shift
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('professors')
          .select('*')
          .order('lastname')
          .order('name'),
        supabase
          .from('subjects')
          .select('*')
          .order('name'),
        supabase
          .from('promotions')
          .select('*')
          .eq('active', true)
          .order('year', { ascending: false })
          .order('level')
          .order('shift'),
      ]);

      if (assignmentsResult.error) throw assignmentsResult.error;
      if (professorsResult.error) throw professorsResult.error;
      if (subjectsResult.error) throw subjectsResult.error;
      if (promotionsResult.error) throw promotionsResult.error;

      setAssignments(assignmentsResult.data || []);
      setProfessors(professorsResult.data || []);
      setSubjects(subjectsResult.data || []);
      setPromotions(promotionsResult.data || []);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: AssignmentFormData) => {
    try {
      // Check if assignment already exists
      const existingAssignment = assignments.find(
        assignment =>
          assignment.professor_id === data.professor_id &&
          assignment.subject_id === data.subject_id &&
          assignment.promotion_id === data.promotion_id
      );

      if (existingAssignment && !editingAssignment) {
        toast.error('Esta asignación ya existe');
        return;
      }

      if (editingAssignment) {
        const { error } = await supabase
          .from('professor_subjects')
          .update({
            professor_id: data.professor_id,
            subject_id: data.subject_id,
            promotion_id: data.promotion_id,
          })
          .eq('id', editingAssignment.id);

        if (error) throw error;
        toast.success('Asignación actualizada exitosamente');
      } else {
        const { error } = await supabase
          .from('professor_subjects')
          .insert({
            professor_id: data.professor_id,
            subject_id: data.subject_id,
            promotion_id: data.promotion_id,
          });

        if (error) throw error;
        toast.success('Asignación creada exitosamente');
      }

      setShowModal(false);
      setEditingAssignment(null);
      form.reset();
      fetchData();
    } catch (error) {
      toast.error('Error al guardar asignación');
      console.error('Error saving assignment:', error);
    }
  };

  const handleEdit = (assignment: AssignmentWithDetails) => {
    setEditingAssignment(assignment);
    form.reset({
      professor_id: assignment.professor_id,
      subject_id: assignment.subject_id,
      promotion_id: assignment.promotion_id,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta asignación?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('professor_subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Asignación eliminada exitosamente');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar asignación');
      console.error('Error deleting assignment:', error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAssignment(null);
    form.reset();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Asignaciones de Profesores
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Asigna profesores a asignaturas por promoción
              </p>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Asignación
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Users className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay asignaciones
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Comienza creando la primera asignación
              </p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Asignación
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Profesor
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Asignatura
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Promoción
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr
                      key={assignment.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {assignment.professors.name} {assignment.professors.lastname}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {assignment.professors.specialty}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {assignment.subjects.name}
                          </div>
                          {assignment.subjects.description && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {assignment.subjects.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <GraduationCap className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-900 dark:text-white">
                            {assignment.promotions.year} - {assignment.promotions.level} {assignment.promotions.shift}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(assignment)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(assignment.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingAssignment ? 'Editar Asignación' : 'Nueva Asignación'}
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="professor_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Profesor
            </label>
            <select
              id="professor_id"
              {...form.register('professor_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="">Seleccionar profesor</option>
              {professors.map((professor) => (
                <option key={professor.id} value={professor.id}>
                  {professor.name} {professor.lastname} - {professor.specialty}
                </option>
              ))}
            </select>
            {form.formState.errors.professor_id && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.professor_id.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="subject_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Asignatura
            </label>
            <select
              id="subject_id"
              {...form.register('subject_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="">Seleccionar asignatura</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            {form.formState.errors.subject_id && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.subject_id.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="promotion_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Promoción
            </label>
            <select
              id="promotion_id"
              {...form.register('promotion_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="">Seleccionar promoción</option>
              {promotions.map((promotion) => (
                <option key={promotion.id} value={promotion.id}>
                  {promotion.year} - {promotion.level} {promotion.shift}
                </option>
              ))}
            </select>
            {form.formState.errors.promotion_id && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.promotion_id.message}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleCloseModal}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              {editingAssignment ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
