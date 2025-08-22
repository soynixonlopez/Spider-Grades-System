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
import { TableFilters, SortableHeader, FilterConfig } from '../ui/TableFilters';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';

const promotionSchema = z.object({
  name: z.string().min(1, 'El nombre de la promoción es requerido'),
  cohort_code: z.string().min(1, 'La abreviatura de cohorte es requerida').max(10, 'Máximo 10 caracteres'),
  entry_year: z.number().min(2020, 'El año debe ser 2020 o posterior'),
  graduation_year: z.number().min(2020, 'El año de graduación debe ser 2020 o posterior'),
  shift: z.enum(['AM', 'PM']),
  active: z.boolean().default(true),
});

type PromotionFormData = z.infer<typeof promotionSchema>;

type PromotionWithStudentCount = Tables<'promotions'> & {
  student_count?: number;
};

  // Función para calcular el nivel basado en el año de ingreso (3 niveles: Freshman, Junior, Senior)
  const calculateLevel = (entryYear: number): string => {
    const currentYear = new Date().getFullYear();
    const yearsDiff = currentYear - entryYear;
    
    if (yearsDiff === 0) return 'Freshman';
    if (yearsDiff === 1) return 'Junior';
    if (yearsDiff === 2) return 'Senior';
    return 'Graduado';
  };

export function PromotionsManagement() {
  const [promotions, setPromotions] = useState<PromotionWithStudentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Tables<'promotions'> | null>(null);
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    nombre: '',
    año: '',
    turno: ''
  });
  const [sortBy, setSortBy] = useState<{
    field: keyof Tables<'promotions'> | 'student_count';
    direction: 'asc' | 'desc';
  }>({ field: 'entry_year', direction: 'desc' });

  const form = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      name: '',
      cohort_code: '',
      entry_year: new Date().getFullYear(),
      graduation_year: new Date().getFullYear() + 2,
      shift: 'AM',
      active: true,
    },
  });

  useEffect(() => {
    fetchPromotions();
  }, []);

  // Función para refrescar desde componentes externos
  const refreshPromotions = () => {
    fetchPromotions();
  };

  // Exponer la función de refresh globalmente para otros componentes
  useEffect(() => {
    (window as any).refreshPromotionsCount = refreshPromotions;
    return () => {
      delete (window as any).refreshPromotionsCount;
    };
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      
      // Obtener promociones con conteo de estudiantes
      const { data, error } = await supabase
        .from('promotions')
        .select(`
          *,
          students(count)
        `)
        .order('entry_year', { ascending: false })
        .order('name')
        .order('shift');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      // Transformar los datos para incluir el conteo
      const promotionsWithCount = (data || []).map(promotion => ({
        ...promotion,
        student_count: promotion.students?.[0]?.count || 0
      }));
      
      console.log('Promociones con conteo:', promotionsWithCount);
      setPromotions(promotionsWithCount);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      toast.error('Error al cargar promociones');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: PromotionFormData) => {
    try {
      if (editingPromotion) {
        // Update existing promotion
        const { error } = await supabase
          .from('promotions')
          .update({
            name: data.name,
            cohort_code: data.cohort_code,
            entry_year: data.entry_year,
            graduation_year: data.graduation_year,
            shift: data.shift,
            active: data.active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPromotion.id);

        if (error) throw error;
        toast.success('Promoción actualizada exitosamente');
      } else {
        // Create new promotion
        const { error } = await supabase
          .from('promotions')
          .insert({
            name: data.name,
            cohort_code: data.cohort_code,
            entry_year: data.entry_year,
            graduation_year: data.graduation_year,
            shift: data.shift,
            active: data.active,
          });

        if (error) throw error;
        toast.success('Promoción creada exitosamente');
      }

      setShowModal(false);
      setEditingPromotion(null);
      form.reset();
      fetchPromotions();
    } catch (error) {
      toast.error('Error al guardar promoción');
      console.error('Error saving promotion:', error);
    }
  };

  const handleEdit = (promotion: Tables<'promotions'>) => {
    setEditingPromotion(promotion);
    form.reset({
      name: promotion.name,
      cohort_code: promotion.cohort_code,
      entry_year: promotion.entry_year,
      graduation_year: promotion.graduation_year,
      shift: promotion.shift,
      active: promotion.active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta promoción?')) {
      return;
    }

    try {
      console.log('🔍 Intentando eliminar promoción con ID:', id);
      
      // Primero verificar si la promoción existe
      const { data: existingPromotion, error: fetchError } = await supabase
        .from('promotions')
        .select('id, name')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error al buscar promoción:', fetchError);
        toast.error('Error al buscar la promoción');
        return;
      }

      if (!existingPromotion) {
        toast.error('Promoción no encontrada');
        return;
      }

      console.log('🗑️ Eliminando promoción:', existingPromotion.name);

      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error de Supabase al eliminar:', error);
        throw error;
      }

      console.log('✅ Promoción eliminada exitosamente');
      toast.success('Promoción eliminada exitosamente');
      fetchPromotions();
    } catch (error: any) {
      console.error('Error completo al eliminar promoción:', error);
      toast.error(`Error al eliminar promoción: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPromotion(null);
    form.reset();
  };

  // Funciones para filtros y ordenamiento
  const filteredAndSortedPromotions = promotions
    .filter(promotion => {
      const nameMatch = promotion.name.toLowerCase().includes(filters.nombre.toLowerCase());
      const yearMatch = filters.año === '' || promotion.entry_year.toString() === filters.año;
      const shiftMatch = filters.turno === '' || promotion.shift === filters.turno;
      
      return nameMatch && yearMatch && shiftMatch;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy.field) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'cohort_code':
          aValue = a.cohort_code;
          bValue = b.cohort_code;
          break;
        case 'entry_year':
          aValue = a.entry_year;
          bValue = b.entry_year;
          break;
        case 'shift':
          aValue = a.shift;
          bValue = b.shift;
          break;
        case 'student_count':
          aValue = a.student_count || 0;
          bValue = b.student_count || 0;
          break;
        default:
          aValue = a[sortBy.field];
          bValue = b[sortBy.field];
      }
      
      if (sortBy.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (field: string) => {
    setSortBy(prev => ({
      field: field as keyof Tables<'promotions'>,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearFilters = () => {
    setFilters({
      nombre: '',
      año: '',
      turno: ''
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
      options: Array.from(new Set(promotions.map(p => p.entry_year))).sort((a, b) => b - a).map(year => ({
        value: year.toString(),
        label: year.toString()
      }))
    },
    {
      name: 'Turno',
      type: 'select',
      options: [
        { value: 'AM', label: 'AM' },
        { value: 'PM', label: 'PM' }
      ]
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="md" text="Cargando promociones..." />
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
                Gestión de Promociones
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Administra las cohortes y años académicos
              </p>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Promoción
            </Button>
          </div>
        </div>

        {/* Filters */}
        <TableFilters
          filters={filters}
          onFilterChange={(field, value) => setFilters(prev => ({ ...prev, [field]: value }))}
          onClearFilters={clearFilters}
          filterConfigs={filterConfigs}
          totalItems={promotions.length}
          filteredItems={filteredAndSortedPromotions.length}
        />

        {/* Content */}
        <div className="p-6">
          {filteredAndSortedPromotions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Plus className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay promociones
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Comienza creando la primera promoción
              </p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Promoción
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
                      field="cohort_code"
                      label="Cohorte"
                      currentSort={sortBy}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="entry_year"
                      label="Año de Ingreso"
                      currentSort={sortBy}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="graduation_year"
                      label="Año de Graduación"
                      currentSort={sortBy}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field=""
                      label="Nivel Actual"
                    />
                    <SortableHeader
                      field="shift"
                      label="Turno"
                      currentSort={sortBy}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="student_count"
                      label="Estudiantes"
                      currentSort={sortBy}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field=""
                      label="Estado"
                    />
                    <SortableHeader
                      field=""
                      label="Acciones"
                    />
                  </tr>
                </thead>
                                <tbody>
                  {filteredAndSortedPromotions.map((promotion, index) => (
                    <tr
                      key={promotion.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {index + 1}
                      </td>
                      <td className="py-4 px-4">
                         <div className="font-medium text-gray-900 dark:text-white">
                           {promotion.name}
                         </div>
                       </td>
                       <td className="py-4 px-4">
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                           {promotion.cohort_code}
                         </span>
                       </td>
                       <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                         {promotion.entry_year}
                       </td>
                       <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                         {promotion.graduation_year}
                       </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {calculateLevel(promotion.entry_year)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                        {promotion.shift}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                            {promotion.student_count || 0} estudiantes
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            promotion.active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {promotion.active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(promotion)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(promotion.id)}
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
        title={editingPromotion ? 'Editar Promoción' : 'Nueva Promoción'}
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                     <Input
             label="Nombre de la Promoción"
             placeholder="Ej: Promoción 2024"
             {...form.register('name')}
             error={form.formState.errors.name?.message}
           />

           <Input
             label="Abreviatura de Cohorte"
             placeholder="Ej: 2024A, 2024B, 2024C"
             {...form.register('cohort_code')}
             error={form.formState.errors.cohort_code?.message}
           />

           <Input
             label="Año de Ingreso"
             type="number"
             placeholder="2024"
             {...form.register('entry_year', { valueAsNumber: true })}
             error={form.formState.errors.entry_year?.message}
           />

           <Input
             label="Año de Graduación"
             type="number"
             placeholder="2026"
             {...form.register('graduation_year', { valueAsNumber: true })}
             error={form.formState.errors.graduation_year?.message}
           />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Turno
            </label>
            <select
              {...form.register('shift')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="AM">AM (Mañana)</option>
              <option value="PM">PM (Tarde)</option>
            </select>
            {form.formState.errors.shift && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.shift.message}
              </p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              {...form.register('active')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
              Promoción activa
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingPromotion ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
