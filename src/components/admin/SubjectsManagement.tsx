import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { Tables } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Plus, Edit, Trash2, X, Search, Filter, ArrowUpDown } from 'lucide-react';
import { TableFilters, SortableHeader, FilterConfig, SortConfig } from '../ui/TableFilters';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';

const subjectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  year: z.number().min(2020, 'El año debe ser 2020 o posterior'),
  semester: z.number().min(1, 'El semestre debe ser 1 o 2').max(2, 'El semestre debe ser 1 o 2'),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

// Extended subject type with promotions and professors relations
type SubjectWithDetails = Tables<'subjects'> & {
  subject_promotions?: {
    promotions: {
      name: string;
      cohort_code: string;
      entry_year: number;
      graduation_year: number;
      shift: string;
    };
  }[];
  professor_subjects?: {
    professors: {
      name: string;
      lastname: string;
      specialty: string;
    };
  }[];
};

export function SubjectsManagement() {
  const [subjects, setSubjects] = useState<SubjectWithDetails[]>([]);
  const [promotions, setPromotions] = useState<Tables<'promotions'>[]>([]);
  const [professors, setProfessors] = useState<Tables<'professors'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPromotions, setSelectedPromotions] = useState<Tables<'promotions'>[]>([]);
  const [selectedProfessors, setSelectedProfessors] = useState<Tables<'professors'>[]>([]);
  const [showProfessorDropdown, setShowProfessorDropdown] = useState(false);
  const [professorSearchTerm, setProfessorSearchTerm] = useState('');
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    nombre: '',
    año: '',
    promoción: ''
  });
  const [sortBy, setSortBy] = useState<{
    field: keyof Tables<'subjects'> | 'promotions' | 'professors';
    direction: 'asc' | 'desc';
  }>({ field: 'year', direction: 'desc' });

  const form = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: '',
      description: '',
      year: new Date().getFullYear(),
      semester: 1,
    },
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.promotion-search')) {
        setShowDropdown(false);
      }
      if (!target.closest('.professor-search')) {
        setShowProfessorDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchSubjects = async () => {
    try {
      // Fetch subjects, promotions, and professors separately
      const [subjectsResult, promotionsResult, professorsResult] = await Promise.all([
        supabase
          .from('subjects')
          .select('*')
          .order('year', { ascending: false })
          .order('semester')
          .order('name'),
        supabase
          .from('promotions')
          .select('*')
          .eq('active', true)
          .order('entry_year', { ascending: false })
          .order('name'),
        supabase
          .from('professors')
          .select('*')
          .order('lastname')
          .order('name')
      ]);

      if (subjectsResult.error) throw subjectsResult.error;
      if (promotionsResult.error) throw promotionsResult.error;
      if (professorsResult.error) throw professorsResult.error;

      // Fetch relationships separately
      const [subjectPromotionsResult, professorSubjectsResult] = await Promise.all([
        supabase
          .from('subject_promotions')
          .select('subject_id, promotion_id'),
        supabase
          .from('professor_subjects')
          .select('subject_id, professor_id')
      ]);

      if (subjectPromotionsResult.error) throw subjectPromotionsResult.error;
      
      // Handle professor_subjects error gracefully
      if (professorSubjectsResult.error) {
        console.warn('Could not fetch professor-subject relationships:', professorSubjectsResult.error);
        // Continue with empty professor relationships
      }

      // Combine the data
      const subjectsWithRelations = subjectsResult.data?.map(subject => {
        const subjectPromotions = subjectPromotionsResult.data?.filter(sp => sp.subject_id === subject.id) || [];
        const professorSubjects = professorSubjectsResult.data?.filter(ps => ps.subject_id === subject.id) || [];
        
        const promotionIds = subjectPromotions.map(sp => sp.promotion_id);
        const professorIds = professorSubjects.map(ps => ps.professor_id);
        
        const subjectPromotionsData = promotionsResult.data?.filter(p => promotionIds.includes(p.id)) || [];
        const professorSubjectsData = professorsResult.data?.filter(p => professorIds.includes(p.id)) || [];

        return {
          ...subject,
          subject_promotions: subjectPromotionsData.map(promotion => ({
            promotions: promotion
          })),
          professor_subjects: professorSubjectsData.map(professor => ({
            professors: professor
          }))
        };
      }) || [];

      setSubjects(subjectsWithRelations);
      setPromotions(promotionsResult.data || []);
      setProfessors(professorsResult.data || []);
    } catch (error) {
      toast.error('Error al cargar asignaturas');
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SubjectFormData) => {
    try {
      console.log('Submitting data:', data);
      console.log('Selected promotions:', selectedPromotions);
      console.log('Selected professors:', selectedProfessors);

      // Validate that at least one promotion is selected
      if (selectedPromotions.length === 0) {
        toast.error('Debe seleccionar al menos una promoción');
        return;
      }

      if (editingSubject) {
        console.log('Updating existing subject:', editingSubject.id);
        
        // Update subject
        const { error: subjectError } = await supabase
          .from('subjects')
          .update({
            name: data.name,
            description: data.description || null,
            year: data.year,
            semester: data.semester,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingSubject.id);

        if (subjectError) {
          console.error('Subject update error:', subjectError);
          throw subjectError;
        }

        // Delete existing subject-promotion relationships
        const { error: deletePromError } = await supabase
          .from('subject_promotions')
          .delete()
          .eq('subject_id', editingSubject.id);

        if (deletePromError) {
          console.error('Delete promotions error:', deletePromError);
          throw deletePromError;
        }

        // Delete existing professor-subject relationships
        try {
          const { error: deleteProfError } = await supabase
            .from('professor_subjects')
            .delete()
            .eq('subject_id', editingSubject.id);

          if (deleteProfError) {
            console.error('Delete professors error:', deleteProfError);
            // Don't throw error, just log it and continue
            console.warn('Could not delete existing professor assignments, but continuing with update');
          }
        } catch (deleteProfError) {
          console.error('Delete professors error:', deleteProfError);
          // Don't throw error, just log it and continue
          console.warn('Could not delete existing professor assignments, but continuing with update');
        }

        // Insert new subject-promotion relationships
        if (selectedPromotions.length > 0) {
          const promotionRelations = selectedPromotions.map(promotion => ({
            subject_id: editingSubject.id,
            promotion_id: promotion.id,
          }));
          
          console.log('Inserting promotion relations:', promotionRelations);
          
          const { error: relError } = await supabase
            .from('subject_promotions')
            .insert(promotionRelations);

          if (relError) {
            console.error('Promotion relations error:', relError);
            throw relError;
          }
        }

        // Insert new professor-subject relationships
        if (selectedProfessors.length > 0) {
          try {
            const professorRelations = selectedProfessors.map(professor => ({
              subject_id: editingSubject.id,
              professor_id: professor.id,
            }));
            
            console.log('Inserting professor relations:', professorRelations);
            
            const { error: profError } = await supabase
              .from('professor_subjects')
              .insert(professorRelations);

            if (profError) {
              console.error('Professor relations error:', profError);
              // Don't throw error, just log it and continue
              console.warn('Could not assign professors to subject, but subject was updated successfully');
            }
          } catch (profError) {
            console.error('Professor relations error:', profError);
            // Don't throw error, just log it and continue
            console.warn('Could not assign professors to subject, but subject was updated successfully');
          }
        }

        toast.success('Asignatura actualizada exitosamente');
      } else {
        console.log('Creating new subject');
        
        // Create new subject
        const { data: newSubject, error: subjectError } = await supabase
          .from('subjects')
          .insert({
            name: data.name,
            description: data.description || null,
            year: data.year,
            semester: data.semester,
          })
          .select()
          .single();

        if (subjectError) {
          console.error('Subject creation error:', subjectError);
          throw subjectError;
        }

        console.log('New subject created:', newSubject);

        // Insert subject-promotion relationships
        if (selectedPromotions.length > 0 && newSubject) {
          const promotionRelations = selectedPromotions.map(promotion => ({
            subject_id: newSubject.id,
            promotion_id: promotion.id,
          }));
          
          console.log('Inserting promotion relations:', promotionRelations);
          
          const { error: relError } = await supabase
            .from('subject_promotions')
            .insert(promotionRelations);

          if (relError) {
            console.error('Promotion relations error:', relError);
            throw relError;
          }
        }

        // Insert professor-subject relationships
        if (selectedProfessors.length > 0 && newSubject) {
          try {
            const professorRelations = selectedProfessors.map(professor => ({
              subject_id: newSubject.id,
              professor_id: professor.id,
            }));
            
            console.log('Inserting professor relations:', professorRelations);
            
            const { error: profError } = await supabase
              .from('professor_subjects')
              .insert(professorRelations);

            if (profError) {
              console.error('Professor relations error:', profError);
              // Don't throw error, just log it and continue
              console.warn('Could not assign professors to subject, but subject was created successfully');
            }
          } catch (profError) {
            console.error('Professor relations error:', profError);
            // Don't throw error, just log it and continue
            console.warn('Could not assign professors to subject, but subject was created successfully');
          }
        }

        toast.success('Asignatura creada exitosamente');
      }

      handleCloseModal();
      fetchSubjects();
    } catch (error) {
      console.error('Error in onSubmit:', error);
      toast.error('Error al guardar asignatura');
    }
  };

  const handleEdit = async (subject: Tables<'subjects'>) => {
    // Fetch subject-promotion relationships
    const { data: subjectPromotions } = await supabase
      .from('subject_promotions')
      .select('promotion_id')
      .eq('subject_id', subject.id);

    // Fetch professor-subject relationships
    const { data: professorSubjects } = await supabase
      .from('professor_subjects')
      .select('professor_id')
      .eq('subject_id', subject.id);

    // Get the actual promotion data
    const promotionIds = subjectPromotions?.map(sp => sp.promotion_id) || [];
    const selectedPromotionData = promotions.filter(p => promotionIds.includes(p.id));

    // Get the actual professor data
    const professorIds = professorSubjects?.map(ps => ps.professor_id) || [];
    const selectedProfessorData = professors.filter(p => professorIds.includes(p.id));

    setEditingSubject(subject);
    setSelectedPromotions(selectedPromotionData);
    setSelectedProfessors(selectedProfessorData);
    setSearchTerm('');
    setShowDropdown(false);
    form.reset({
      name: subject.name,
      description: subject.description || '',
      year: subject.year,
      semester: subject.semester,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta asignatura?')) {
      return;
    }

    try {
      console.log('🔍 Intentando eliminar asignatura con ID:', id);
      
      // Primero verificar si la asignatura existe
      const { data: existingSubject, error: fetchError } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error al buscar asignatura:', fetchError);
        toast.error('Error al buscar la asignatura');
        return;
      }

      if (!existingSubject) {
        toast.error('Asignatura no encontrada');
        return;
      }

      console.log('🗑️ Eliminando asignatura:', existingSubject.name);

      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error de Supabase al eliminar:', error);
        throw error;
      }

      console.log('✅ Asignatura eliminada exitosamente');
      toast.success('Asignatura eliminada exitosamente');
      fetchSubjects();
    } catch (error: any) {
      console.error('Error completo al eliminar asignatura:', error);
      toast.error(`Error al eliminar asignatura: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSubject(null);
    setSelectedPromotions([]);
    setSelectedProfessors([]);
    setSearchTerm('');
    setProfessorSearchTerm('');
    setShowDropdown(false);
    setShowProfessorDropdown(false);
    form.reset();
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setEditingSubject(null);
    setSelectedPromotions([]);
    setSelectedProfessors([]);
    setSearchTerm('');
    setProfessorSearchTerm('');
    setShowDropdown(false);
    setShowProfessorDropdown(false);
    form.reset();
  };

  const filteredPromotions = promotions.filter(promotion => 
    !selectedPromotions.find(sp => sp.id === promotion.id) &&
    (promotion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     promotion.cohort_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const addPromotion = (promotion: Tables<'promotions'>) => {
    setSelectedPromotions(prev => [...prev, promotion]);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const removePromotion = (promotionId: string) => {
    setSelectedPromotions(prev => prev.filter(p => p.id !== promotionId));
  };

  // Funciones para manejar profesores
  const filteredProfessors = professors.filter(
    professor => 
    !selectedProfessors.find(sp => sp.id === professor.id) &&
    (professor.name.toLowerCase().includes(professorSearchTerm.toLowerCase()) ||
     professor.lastname.toLowerCase().includes(professorSearchTerm.toLowerCase()) ||
     professor.specialty?.toLowerCase().includes(professorSearchTerm.toLowerCase()))
  );

  const addProfessor = (professor: Tables<'professors'>) => {
    setSelectedProfessors(prev => [...prev, professor]);
    setProfessorSearchTerm('');
    setShowProfessorDropdown(false);
  };

  const removeProfessor = (professorId: string) => {
    setSelectedProfessors(prev => prev.filter(p => p.id !== professorId));
  };

  // Funciones para filtros y ordenamiento
  const filteredAndSortedSubjects = subjects
    .filter(subject => {
      const nameMatch = subject.name.toLowerCase().includes(filters.nombre.toLowerCase());
      const yearMatch = filters.año === '' || subject.year.toString() === filters.año;
      
      const promotionMatch = filters.promoción === '' || 
        (subject.subject_promotions && subject.subject_promotions.some(sp => 
          sp.promotions.cohort_code.toLowerCase().includes(filters.promoción.toLowerCase())
        ));
      
      return nameMatch && yearMatch && promotionMatch;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy.field) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'year':
          aValue = a.year;
          bValue = b.year;
          break;
        case 'semester':
          aValue = a.semester;
          bValue = b.semester;
          break;
        case 'promotions':
          aValue = a.subject_promotions?.[0]?.promotions.cohort_code || '';
          bValue = b.subject_promotions?.[0]?.promotions.cohort_code || '';
          break;
        case 'professors':
          aValue = a.professor_subjects?.[0]?.professors.name || '';
          bValue = b.professor_subjects?.[0]?.professors.name || '';
          break;
        default:
          aValue = a[sortBy.field as keyof Tables<'subjects'>];
          bValue = b[sortBy.field as keyof Tables<'subjects'>];
      }
      
      if (sortBy.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (field: string) => {
    setSortBy(prev => ({
      field: field as keyof Tables<'subjects'> | 'promotions' | 'professors',
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearFilters = () => {
    setFilters({
      nombre: '',
      año: '',
      promoción: ''
    });
  };

  // Configuración de filtros
  const filterConfigs: FilterConfig[] = [
    {
      name: 'Nombre',
      type: 'text',
      placeholder: 'Buscar por nombre...'
    },
    {
      name: 'Año',
      type: 'select',
      options: Array.from(new Set(subjects.map(s => s.year))).sort((a, b) => b - a).map(year => ({
        value: year.toString(),
        label: year.toString()
      }))
    },
    {
      name: 'Promoción',
      type: 'text',
      placeholder: 'Buscar por cohorte...'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="md" text="Cargando asignaturas..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
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
             <Button onClick={handleOpenModal}>
               <Plus className="h-4 w-4 mr-2" />
               Nueva Asignatura
             </Button>
           </div>
         </div>

         {/* Filters */}
         <TableFilters
           filters={filters}
           onFilterChange={(field, value) => setFilters(prev => ({ ...prev, [field]: value }))}
           onClearFilters={clearFilters}
           filterConfigs={filterConfigs}
           totalItems={subjects.length}
           filteredItems={filteredAndSortedSubjects.length}
         />

         {/* Content */}
         <div className="p-6">
           {filteredAndSortedSubjects.length === 0 ? (
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
                             <Button onClick={handleOpenModal}>
                 <Plus className="h-4 w-4 mr-2" />
                 Crear Asignatura
               </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                                                 <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white w-12">
                      #
                    </th>
                    <SortableHeader
                      field="name"
                      label="Nombre"
                      currentSort={sortBy}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="year"
                      label="Año"
                      currentSort={sortBy}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="semester"
                      label="Semestre"
                      currentSort={sortBy}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="promotions"
                      label="Promoción"
                      currentSort={sortBy}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="professors"
                      label="Profesores"
                      currentSort={sortBy}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field=""
                      label="Descripción"
                    />
                    <SortableHeader
                      field=""
                      label="Acciones"
                    />
                  </tr>
                </thead>
                                                   <tbody>
                    {filteredAndSortedSubjects.map((subject, index) => (
                      <tr
                        key={subject.id}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-sm font-medium">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                          {subject.name}
                        </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {subject.year}
                      </td>
                                             <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                         {subject.semester}
                       </td>
                                               <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                          {subject.subject_promotions && subject.subject_promotions.length > 0 ? 
                            subject.subject_promotions.map(sp => 
                              sp.promotions.cohort_code
                            ).join(', ') : 
                            'Sin promociones asignadas'
                          }
                        </td>
                       <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                          {subject.professor_subjects && subject.professor_subjects.length > 0 ? 
                            subject.professor_subjects.map(ps => 
                              `${ps.professors.name} ${ps.professors.lastname}`
                            ).join(', ') : 
                            'Sin profesores asignados'
                          }
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
          <div className="max-h-96 overflow-y-auto px-4 pt-2 pb-4">
         <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Ej: Matemáticas Avanzadas, Historia Universal"
            {...form.register('name')}
            error={form.formState.errors.name?.message}
          />

                     <div className="grid grid-cols-2 gap-4">
             <Input
               label="Año"
               type="number"
               placeholder="2024"
               {...form.register('year', { valueAsNumber: true })}
               error={form.formState.errors.year?.message}
             />

             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                 Semestre
               </label>
               <select
                 {...form.register('semester', { valueAsNumber: true })}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
               >
                 <option value={1}>Primer Semestre</option>
                 <option value={2}>Segundo Semestre</option>
               </select>
               {form.formState.errors.semester && (
                 <p className="mt-1 text-sm text-red-600">
                   {form.formState.errors.semester.message}
                 </p>
               )}
             </div>
           </div>

                       <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Promociones
              </label>
              
              {/* Selected promotions display */}
              {selectedPromotions.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedPromotions.map((promotion) => (
                                         <span
                       key={promotion.id}
                       className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
                     >
                       {promotion.cohort_code}
                       <button
                         type="button"
                         onClick={() => removePromotion(promotion.id)}
                         className="ml-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                       >
                         <X className="h-3 w-3" />
                       </button>
                     </span>
                  ))}
                </div>
              )}

              {/* Search input */}
              <div className="relative promotion-search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar promociones por nombre o código de cohorte..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Dropdown */}
                {showDropdown && filteredPromotions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredPromotions.map((promotion) => (
                      <button
                        key={promotion.id}
                        type="button"
                        onClick={() => addPromotion(promotion)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
                      >
                        {promotion.cohort_code} - {promotion.name} ({promotion.entry_year}) - {promotion.shift}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedPromotions.length === 0 && (
                <p className="mt-1 text-sm text-red-600">
                  Debe seleccionar al menos una promoción
                </p>
              )}
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Escribe para buscar y seleccionar las promociones donde se impartirá esta asignatura
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Profesores
              </label>
              
              {/* Selected professors display */}
              {selectedProfessors.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedProfessors.map((professor) => (
                    <span
                      key={professor.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      {professor.name} {professor.lastname} - {professor.specialty}
                      <button
                        type="button"
                        onClick={() => removeProfessor(professor.id)}
                        className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search input */}
              <div className="relative professor-search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar profesores por nombre, apellido o especialidad..."
                    value={professorSearchTerm}
                    onChange={(e) => {
                      setProfessorSearchTerm(e.target.value);
                      setShowProfessorDropdown(true);
                    }}
                    onFocus={() => setShowProfessorDropdown(true)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Dropdown */}
                {showProfessorDropdown && filteredProfessors.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredProfessors.map((professor) => (
                      <button
                        key={professor.id}
                        type="button"
                        onClick={() => addProfessor(professor)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
                      >
                        {professor.name} {professor.lastname} - {professor.specialty}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Escribe para buscar y seleccionar los profesores que impartirán esta asignatura
              </p>
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
        </div>
      </Modal>
    </div>
  );
}
