import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { Tables } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Plus, Edit, Trash2, Search, Users, UserPlus, X, CheckCircle, Eye, EyeOff, Mail, Send } from 'lucide-react';
import { TableFilters, SortableHeader, FilterConfig } from '../ui/TableFilters';
import toast from 'react-hot-toast';
import { sendPasscodeEmail, sendBulkPasscodeEmails, EmailData } from '../../lib/emailService';

const professorSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  lastname: z.string().min(1, 'El apellido es requerido'),
  specialty: z.string().min(1, 'La especialidad es requerida'),
});

const editProfessorSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  lastname: z.string().min(1, 'El apellido es requerido'),
  specialty: z.string().min(1, 'La especialidad es requerida'),
  email: z.string().email('Email inválido'),
});

const bulkProfessorSchema = z.object({
  specialty: z.string().min(1, 'La especialidad es requerida'),
  names: z.string().min(1, 'Los nombres son requeridos'),
});

type ProfessorFormData = z.infer<typeof professorSchema>;
type EditProfessorFormData = z.infer<typeof editProfessorSchema>;
type BulkProfessorFormData = z.infer<typeof bulkProfessorSchema>;

// Extended professor type with profile relation
type ProfessorWithProfile = Tables<'professors'> & {
  profiles?: {
    email: string;
    passcode: string;
  } | null;
};

export function ProfessorsManagement() {
  const [professors, setProfessors] = useState<ProfessorWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingProfessor, setEditingProfessor] = useState<ProfessorWithProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkProfessors, setBulkProfessors] = useState<{name: string, lastname: string, email: string, specialty: string}[]>([]);
  const [showPasscodes, setShowPasscodes] = useState<{[key: string]: boolean}>({});
  const [sendingEmails, setSendingEmails] = useState<{[key: string]: boolean}>({});
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    nombre: '',
    especialidad: '',
    email: ''
  });
  const [sortBy, setSortBy] = useState<{
    field: keyof Tables<'professors'> | 'email';
    direction: 'asc' | 'desc';
  }>({ field: 'lastname', direction: 'asc' });

  const form = useForm<ProfessorFormData>({
    resolver: zodResolver(professorSchema),
  });

  const editForm = useForm<EditProfessorFormData>({
    resolver: zodResolver(editProfessorSchema),
  });

  const bulkForm = useForm<BulkProfessorFormData>({
    resolver: zodResolver(bulkProfessorSchema),
  });

  useEffect(() => {
    fetchProfessors();
  }, []);

  const fetchProfessors = async () => {
    try {
      // Primero obtener los profesores
      const { data: professorsData, error: professorsError } = await supabase
        .from('professors')
        .select('*')
        .order('lastname')
        .order('name');

      if (professorsError) throw professorsError;

      // Luego obtener los perfiles correspondientes
      if (professorsData && professorsData.length > 0) {
        const userIds = professorsData.map(p => p.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, passcode')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Combinar los datos
        const professorsWithProfiles = professorsData.map(professor => {
          const profile = profilesData?.find(p => p.id === professor.user_id);
          return {
            ...professor,
            profiles: profile || null
          };
        });

        setProfessors(professorsWithProfiles);
      } else {
        setProfessors([]);
      }
    } catch (error) {
      toast.error('Error al cargar profesores');
      console.error('Error fetching professors:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePasscode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const generateEmail = (name: string, lastname: string) => {
    const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
    const cleanLastname = lastname.toLowerCase().replace(/[^a-z]/g, '');
    return `${cleanName}.${cleanLastname}@motta.superate.org.pa`;
  };

  const onSubmit = async (data: ProfessorFormData) => {
    try {
      const email = generateEmail(data.name, data.lastname);
      const passcode = generatePasscode();

      // First create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: passcode,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile with passcode
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: email,
            role: 'professor',
            passcode: passcode,
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

        toast.success(`Profesor creado exitosamente. Email: ${email}, Passcode: ${passcode}`);
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

  const onEditSubmit = async (data: EditProfessorFormData) => {
    try {
      if (!editingProfessor) return;

      // Update professor record
      const { error: professorError } = await supabase
        .from('professors')
        .update({
          name: data.name,
          lastname: data.lastname,
          specialty: data.specialty,
        })
        .eq('id', editingProfessor.id);

      if (professorError) throw professorError;

      // Update profile email if changed
      if (editingProfessor.profiles?.email !== data.email) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            email: data.email,
          })
          .eq('id', editingProfessor.user_id);

        if (profileError) throw profileError;
      }

      toast.success('Profesor actualizado exitosamente');
      setShowModal(false);
      setEditingProfessor(null);
      editForm.reset();
      fetchProfessors();
    } catch (error) {
      toast.error('Error al actualizar profesor');
      console.error('Error updating professor:', error);
    }
  };

  const onSubmitBulk = async () => {
    try {
      const data = bulkForm.getValues();
      const results = [];
      const errors = [];

      for (const professorData of bulkProfessors) {
        try {
          const passcode = generatePasscode();

          // Create user account
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: professorData.email,
            password: passcode,
          });

          if (authError) throw authError;

          if (authData.user) {
            // Create profile with passcode
            await supabase
              .from('profiles')
              .insert({
                id: authData.user.id,
                email: professorData.email,
                role: 'professor',
                passcode: passcode,
              });

            // Create professor record
            await supabase
              .from('professors')
              .insert({
                user_id: authData.user.id,
                name: professorData.name,
                lastname: professorData.lastname,
                specialty: data.specialty,
              });

            results.push(`${professorData.email} (${passcode})`);
          }
        } catch (error) {
          errors.push(`${professorData.email}: ${error}`);
        }
      }

      if (results.length > 0) {
        toast.success(`${results.length} profesores creados exitosamente`);
        console.log('Created professors:', results);
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} errores al crear profesores`);
        console.error('Bulk creation errors:', errors);
      }

      setShowBulkModal(false);
      setBulkProfessors([]);
      bulkForm.reset();
      fetchProfessors();
    } catch (error) {
      toast.error('Error en la creación masiva');
      console.error('Error in bulk creation:', error);
    }
  };

  const addBulkProfessors = () => {
    const data = bulkForm.getValues();
    if (data.names && data.specialty) {
      const namesList = data.names.split(',').map(name => name.trim()).filter(name => name);
      const newProfessors = namesList.map(fullName => {
        const [name, lastname] = fullName.split(' ').filter(part => part);
        const email = generateEmail(name, lastname);
        return { name, lastname, email, specialty: data.specialty };
      });
      
      setBulkProfessors([...bulkProfessors, ...newProfessors]);
      bulkForm.setValue('names', '');
    }
  };

  const removeBulkProfessor = (index: number) => {
    setBulkProfessors(bulkProfessors.filter((_, i) => i !== index));
  };

  const togglePasscodeVisibility = (professorId: string) => {
    setShowPasscodes(prev => ({
      ...prev,
      [professorId]: !prev[professorId]
    }));
  };

  const sendIndividualEmail = async (professor: ProfessorWithProfile) => {
    if (!professor.profiles?.email || !professor.profiles?.passcode) {
      toast.error('No se puede enviar email: faltan datos del profesor');
      return;
    }

    setSendingEmails(prev => ({ ...prev, [professor.id]: true }));

    try {
      const emailData: EmailData = {
        to: professor.profiles.email,
      name: professor.name,
      lastname: professor.lastname,
        passcode: professor.profiles.passcode,
        role: 'professor'
      };

      const success = await sendPasscodeEmail(emailData);
      
      if (success) {
        toast.success(`Email enviado exitosamente a ${professor.profiles.email}`);
      } else {
        toast.error(`Error al enviar email a ${professor.profiles.email}`);
      }
    } catch (error) {
      toast.error(`Error al enviar email: ${error}`);
    } finally {
      setSendingEmails(prev => ({ ...prev, [professor.id]: false }));
    }
  };

  const sendBulkEmails = async () => {
    const professorsWithEmails = professors.filter(p => p.profiles?.email && p.profiles?.passcode);
    
    if (professorsWithEmails.length === 0) {
      toast.error('No hay profesores con emails válidos para enviar');
      return;
    }

    const emailDataList: EmailData[] = professorsWithEmails.map(professor => ({
      to: professor.profiles!.email,
      name: professor.name,
      lastname: professor.lastname,
      passcode: professor.profiles!.passcode,
      role: 'professor'
    }));

    toast.loading(`Enviando ${emailDataList.length} emails...`, { id: 'bulk-email' });

    try {
      const results = await sendBulkPasscodeEmails(emailDataList);
      
      toast.dismiss('bulk-email');
      
      if (results.success > 0) {
        toast.success(`${results.success} emails enviados exitosamente`);
      }
      if (results.failed > 0) {
        toast.error(`${results.failed} emails fallaron al enviar`);
        console.error('Email errors:', results.errors);
      }
    } catch (error) {
      toast.dismiss('bulk-email');
      toast.error(`Error al enviar emails: ${error}`);
    }
  };

  // Funciones para filtros y ordenamiento
  const filteredAndSortedProfessors = professors
    .filter(professor => {
      const nameMatch = `${professor.name} ${professor.lastname}`.toLowerCase().includes(filters.nombre.toLowerCase());
      const specialtyMatch = professor.specialty.toLowerCase().includes(filters.especialidad.toLowerCase());
      const emailMatch = professor.profiles?.email.toLowerCase().includes(filters.email.toLowerCase()) || false;
      
      return nameMatch && specialtyMatch && emailMatch;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy.field) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'lastname':
          aValue = a.lastname;
          bValue = b.lastname;
          break;
        case 'specialty':
          aValue = a.specialty;
          bValue = b.specialty;
          break;
        case 'email':
          aValue = a.profiles?.email || '';
          bValue = b.profiles?.email || '';
          break;
        default:
          aValue = a[sortBy.field as keyof Tables<'professors'>];
          bValue = b[sortBy.field as keyof Tables<'professors'>];
      }
      
      if (sortBy.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (field: string) => {
    setSortBy(prev => ({
      field: field as keyof Tables<'professors'> | 'email',
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearFilters = () => {
    setFilters({
      nombre: '',
      especialidad: '',
      email: ''
    });
  };

  // Configuración de filtros
  const filterConfigs: FilterConfig[] = [
    {
      name: 'Nombre',
      type: 'text',
      placeholder: 'Buscar por nombre o apellido...'
    },
    {
      name: 'Especialidad',
      type: 'text',
      placeholder: 'Buscar por especialidad...'
    },
    {
      name: 'Email',
      type: 'text',
      placeholder: 'Buscar por email...'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gestión de Profesores
              </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Administra los profesores del sistema
              </p>
            </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Agregar Profesor
          </Button>
          
          <Button
            onClick={() => setShowBulkModal(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Agregar en Masa
          </Button>

          <Button
            onClick={sendBulkEmails}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Enviar Passcodes
            </Button>
          </div>
        </div>

        {/* Filters */}
        <TableFilters
          filters={filters}
          onFilterChange={(field, value) => setFilters(prev => ({ ...prev, [field]: value }))}
          onClearFilters={clearFilters}
          filterConfigs={filterConfigs}
          totalItems={professors.length}
          filteredItems={filteredAndSortedProfessors.length}
        />

      {/* Professors Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {filteredAndSortedProfessors.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
              <Users className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No se encontraron profesores' : 'No hay profesores registrados'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza creando el primer profesor'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowModal(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                  Crear Profesor
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                    #
                    </th>
                  <SortableHeader
                    field="name"
                    label="Profesor"
                    currentSort={sortBy}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    field="email"
                    label="Email"
                    currentSort={sortBy}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    field=""
                    label="Passcode"
                  />
                  <SortableHeader
                    field="specialty"
                    label="Especialidad"
                    currentSort={sortBy}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    field=""
                    label="Acciones"
                  />
                  </tr>
                </thead>
                              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAndSortedProfessors.map((professor, index) => (
                    <tr key={professor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600 dark:text-primary-300">
                              {professor.name.charAt(0)}{professor.lastname.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {professor.name} {professor.lastname}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {professor.profiles?.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {showPasscodes[professor.id] 
                            ? professor.profiles?.passcode || 'N/A'
                            : '••••••'
                          }
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => togglePasscodeVisibility(professor.id)}
                          className="h-6 w-6 p-0"
                        >
                          {showPasscodes[professor.id] ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {professor.specialty}
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                          <Button
                          size="sm"
                            variant="outline"
                          onClick={() => {
                            setEditingProfessor(professor);
                            editForm.reset({
                              name: professor.name,
                              lastname: professor.lastname,
                              specialty: professor.specialty,
                              email: professor.profiles?.email || '',
                            });
                            setShowModal(true);
                          }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                          size="sm"
                            variant="outline"
                          onClick={() => sendIndividualEmail(professor)}
                          disabled={sendingEmails[professor.id]}
                          className="flex items-center gap-1"
                        >
                          {sendingEmails[professor.id] ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600"></div>
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                            size="sm"
                          variant="outline"
                          onClick={() => {
                            if (window.confirm('¿Estás seguro de que quieres eliminar este profesor?')) {
                              // Handle delete
                            }
                          }}
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

      {/* Individual Professor Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingProfessor(null);
          form.reset();
          editForm.reset();
        }}
        title={editingProfessor ? 'Editar Profesor' : 'Agregar Profesor'}
              >
        <div className="max-h-96 overflow-y-auto px-4 pt-2 pb-4">
        {editingProfessor ? (
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre"
                placeholder="Ingrese el nombre del profesor"
                {...editForm.register('name')}
                error={editForm.formState.errors.name?.message}
              />
            <Input
                label="Apellido"
                placeholder="Ingrese el apellido del profesor"
                {...editForm.register('lastname')}
                error={editForm.formState.errors.lastname?.message}
              />
          </div>
            <Input
              label="Especialidad"
              placeholder="Ej: Matemáticas, Historia, Ciencias"
              {...editForm.register('specialty')}
              error={editForm.formState.errors.specialty?.message}
            />
            <Input
              label="Email"
              type="email"
              placeholder="ejemplo@motta.superate.org.pa"
              {...editForm.register('email')}
              error={editForm.formState.errors.email?.message}
            />
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                ⚠️ Al cambiar el email, el profesor deberá usar el nuevo email para hacer login.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setEditingProfessor(null);
                  editForm.reset();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                Actualizar
              </Button>
          </div>
          </form>
        ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
                label="Nombre"
                placeholder="Ingrese el nombre del profesor"
              {...form.register('name')}
                error={form.formState.errors.name?.message}
              />
            <Input
                label="Apellido"
                placeholder="Ingrese el apellido del profesor"
              {...form.register('lastname')}
                error={form.formState.errors.lastname?.message}
            />
          </div>
            <Input
              label="Especialidad"
              placeholder="Ej: Matemáticas, Historia, Ciencias"
              {...form.register('specialty')}
              error={form.formState.errors.specialty?.message}
            />
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                El email se generará automáticamente como: nombre.apellido@motta.superate.org.pa
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Se generará un passcode aleatorio que se mostrará al crear el profesor.
              </p>
          </div>
            <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setEditingProfessor(null);
                  form.reset();
                }}
            >
              Cancelar
            </Button>
              <Button type="submit">
                Crear
            </Button>
          </div>
        </form>
            )}
          </div>
      </Modal>

      {/* Bulk Professors Modal */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => {
          setShowBulkModal(false);
          setBulkProfessors([]);
          bulkForm.reset();
        }}
        title="Agregar Profesores en Masa"
      >
        <div className="space-y-6">
          {/* Add Professors Form */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Agregar Profesores
            </h3>
            <form onSubmit={bulkForm.handleSubmit(addBulkProfessors)} className="space-y-4">
              <Input
                label="Especialidad"
                {...bulkForm.register('specialty')}
                error={bulkForm.formState.errors.specialty?.message}
              />
          <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombres y Apellidos (separados por comas)
            </label>
                <textarea
                  {...bulkForm.register('names')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  rows={4}
                  placeholder="Juan Pérez, María García, Carlos López"
                />
                {bulkForm.formState.errors.names && (
                  <p className="mt-1 text-sm text-red-600">{bulkForm.formState.errors.names.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Agregar a la Lista
              </Button>
            </form>
          </div>

          {/* Professors List */}
          {bulkProfessors.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Profesores a Crear ({bulkProfessors.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {bulkProfessors.map((professor, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {professor.name} {professor.lastname}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {professor.email} • {professor.specialty}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeBulkProfessor(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkProfessors([]);
                    bulkForm.reset();
                  }}
            >
              Cancelar
            </Button>
                <Button onClick={onSubmitBulk}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Crear {bulkProfessors.length} Profesores
            </Button>
          </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
