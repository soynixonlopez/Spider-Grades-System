import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { Tables, InsertDto, UpdateDto } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const promotionSchema = z.object({
  year: z.number().min(2020, 'El año debe ser 2020 o posterior'),
  level: z.enum(['Freshman', 'Junior', 'Senior']),
  shift: z.enum(['AM', 'PM']),
  active: z.boolean().default(true),
});

type PromotionFormData = z.infer<typeof promotionSchema>;

export function PromotionsManagement() {
  const [promotions, setPromotions] = useState<Tables<'promotions'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Tables<'promotions'> | null>(null);

  const form = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      year: new Date().getFullYear(),
      level: 'Freshman',
      shift: 'AM',
      active: true,
    },
  });

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('year', { ascending: false })
        .order('level')
        .order('shift');

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      toast.error('Error al cargar promociones');
      console.error('Error fetching promotions:', error);
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
            year: data.year,
            level: data.level,
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
            year: data.year,
            level: data.level,
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
      year: promotion.year,
      level: promotion.level,
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
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Promoción eliminada exitosamente');
      fetchPromotions();
    } catch (error) {
      toast.error('Error al eliminar promoción');
      console.error('Error deleting promotion:', error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPromotion(null);
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

        {/* Content */}
        <div className="p-6">
          {promotions.length === 0 ? (
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
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Año
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Nivel
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Turno
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Estado
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((promotion) => (
                    <tr
                      key={promotion.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {promotion.year}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {promotion.level}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {promotion.shift}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            promotion.active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}
                        >
                          {promotion.active ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Activa
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Inactiva
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
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
        title={editingPromotion ? 'Editar Promoción' : 'Nueva Promoción'}
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Año
            </label>
            <Input
              id="year"
              type="number"
              {...form.register('year', { valueAsNumber: true })}
              className={form.formState.errors.year ? 'border-red-500' : ''}
            />
            {form.formState.errors.year && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.year.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nivel
            </label>
            <select
              id="level"
              {...form.register('level')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="Freshman">Freshman</option>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
            </select>
          </div>

          <div>
            <label htmlFor="shift" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Turno
            </label>
            <select
              id="shift"
              {...form.register('shift')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              id="active"
              type="checkbox"
              {...form.register('active')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="active" className="ml-2 block text-sm text-gray-900 dark:text-white">
              Promoción activa
            </label>
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
              {editingPromotion ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
