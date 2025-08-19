import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { Tables } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const subjectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

export function SubjectsManagement() {
  const [subjects, setSubjects] = useState<Tables<'subjects'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Tables<'subjects'> | null>(null);

  const form = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      toast.error('Error al cargar asignaturas');
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SubjectFormData) => {
    try {
      if (editingSubject) {
        const { error } = await supabase
          .from('subjects')
          .update({
            name: data.name,
            description: data.description || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingSubject.id);

        if (error) throw error;
        toast.success('Asignatura actualizada exitosamente');
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert({
            name: data.name,
            description: data.description || null,
          });

        if (error) throw error;
        toast.success('Asignatura creada exitosamente');
      }

      setShowModal(false);
      setEditingSubject(null);
      form.reset();
      fetchSubjects();
    } catch (error) {
      toast.error('Error al guardar asignatura');
      console.error('Error saving subject:', error);
    }
  };

  const handleEdit = (subject: Tables<'subjects'>) => {
    setEditingSubject(subject);
    form.reset({
      name: subject.name,
      description: subject.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta asignatura?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Asignatura eliminada exitosamente');
      fetchSubjects();
    } catch (error) {
      toast.error('Error al eliminar asignatura');
      console.error('Error deleting subject:', error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSubject(null);
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
                Gestión de Asignaturas
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Administra las materias académicas
              </p>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Asignatura
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {subjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Plus className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay asignaturas
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Comienza creando la primera asignatura
              </p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Asignatura
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Nombre
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Descripción
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr
                      key={subject.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                        {subject.name}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {subject.description || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(subject)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(subject.id)}
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
        title={editingSubject ? 'Editar Asignatura' : 'Nueva Asignatura'}
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre
            </label>
            <Input
              id="name"
              {...form.register('name')}
              className={form.formState.errors.name ? 'border-red-500' : ''}
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción
            </label>
            <textarea
              id="description"
              {...form.register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
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
              {editingSubject ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
