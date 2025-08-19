import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { Tables } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const professorSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  lastname: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido'),
  specialty: z.string().min(1, 'La especialidad es requerida'),
});

type ProfessorFormData = z.infer<typeof professorSchema>;

export function ProfessorsManagement() {
  const [professors, setProfessors] = useState<Tables<'professors'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProfessor, setEditingProfessor] = useState<Tables<'professors'> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<ProfessorFormData>({
    resolver: zodResolver(professorSchema),
  });

  useEffect(() => {
    fetchProfessors();
  }, []);

  const fetchProfessors = async () => {
    try {
      const { data, error } = await supabase
        .from('professors')
        .select('*')
        .order('lastname')
        .order('name');

      if (error) throw error;
      setProfessors(data || []);
    } catch (error) {
      toast.error('Error al cargar profesores');
      console.error('Error fetching professors:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ProfessorFormData) => {
    try {
      // First create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: 'temporary123', // This should be changed by the user
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: data.email,
            role: 'professor',
          });

        if (profileError) throw profileError;

        // Create professor record
        const { error: professorError } = await supabase
          .from('professors')
          .insert({
            user_id: authData.user.id,
            name: data.name,
            lastname: data.lastname,
            specialty: data.specialty,
          });

        if (professorError) throw professorError;

        toast.success('Profesor creado exitosamente');
        setShowModal(false);
        setEditingProfessor(null);
        form.reset();
        fetchProfessors();
      }
    } catch (error) {
      toast.error('Error al crear profesor');
      console.error('Error creating professor:', error);
    }
  };

  const handleEdit = (professor: Tables<'professors'>) => {
    setEditingProfessor(professor);
    // Note: We can't edit email as it's tied to auth
    form.reset({
      name: professor.name,
      lastname: professor.lastname,
      email: '', // We'll need to get this from profiles table
      specialty: professor.specialty,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este profesor?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('professors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Profesor eliminado exitosamente');
      fetchProfessors();
    } catch (error) {
      toast.error('Error al eliminar profesor');
      console.error('Error deleting professor:', error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProfessor(null);
    form.reset();
  };

  const filteredProfessors = professors.filter(professor =>
    professor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    professor.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    professor.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                Gestión de Profesores
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Administra los docentes y sus especialidades
              </p>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Profesor
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar profesores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {filteredProfessors.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Plus className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'No se encontraron profesores' : 'No hay profesores'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza creando el primer profesor'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Profesor
                </Button>
              )}
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
                      Apellido
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Especialidad
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfessors.map((professor) => (
                    <tr
                      key={professor.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                        {professor.name}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                        {professor.lastname}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {professor.specialty}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(professor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(professor.id)}
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
        title={editingProfessor ? 'Editar Profesor' : 'Nuevo Profesor'}
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
            <label htmlFor="lastname" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Apellido
            </label>
            <Input
              id="lastname"
              {...form.register('lastname')}
              className={form.formState.errors.lastname ? 'border-red-500' : ''}
            />
            {form.formState.errors.lastname && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.lastname.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              className={form.formState.errors.email ? 'border-red-500' : ''}
              disabled={!!editingProfessor}
            />
            {form.formState.errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.email.message}
              </p>
            )}
            {editingProfessor && (
              <p className="mt-1 text-sm text-gray-500">
                El email no se puede editar
              </p>
            )}
          </div>

          <div>
            <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Especialidad
            </label>
            <Input
              id="specialty"
              {...form.register('specialty')}
              className={form.formState.errors.specialty ? 'border-red-500' : ''}
            />
            {form.formState.errors.specialty && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.specialty.message}
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
              {editingProfessor ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
