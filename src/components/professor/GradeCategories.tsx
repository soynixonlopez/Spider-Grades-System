import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { cn, validateWeightSum } from '../../lib/utils';

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  weight: z.number().min(0.01, 'Weight must be greater than 0').max(100, 'Weight cannot exceed 100%'),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface GradeCategory {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  subject_id: string;
  promotion_id: string;
  created_at: string;
}

interface GradeCategoriesProps {
  selectedSubject: string | null;
  selectedPromotion: string | null;
}

export const GradeCategories: React.FC<GradeCategoriesProps> = ({
  selectedSubject,
  selectedPromotion,
}) => {
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<GradeCategory | null>(null);
  const [totalWeight, setTotalWeight] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  const watchedWeight = watch('weight', 0);

  useEffect(() => {
    if (selectedSubject && selectedPromotion) {
      fetchCategories();
    }
  }, [selectedSubject, selectedPromotion]);

  useEffect(() => {
    const newTotalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0) + watchedWeight;
    setTotalWeight(newTotalWeight);
  }, [categories, watchedWeight]);

  const fetchCategories = async () => {
    if (!selectedSubject || !selectedPromotion) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('grade_categories')
        .select('*')
        .eq('subject_id', selectedSubject)
        .eq('promotion_id', selectedPromotion)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load grade categories');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    if (!selectedSubject || !selectedPromotion) {
      toast.error('Please select a subject and promotion first');
      return;
    }

    // Check if adding this weight would exceed 100%
    const currentTotal = categories.reduce((sum, cat) => sum + cat.weight, 0);
    const newTotal = editingCategory 
      ? currentTotal - editingCategory.weight + data.weight
      : currentTotal + data.weight;

    if (newTotal > 100) {
      toast.error(`Total weight cannot exceed 100%. Current total would be ${newTotal.toFixed(2)}%`);
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('grade_categories')
          .update({
            name: data.name,
            description: data.description || null,
            weight: data.weight,
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        // Create new category
        const { error } = await supabase
          .from('grade_categories')
          .insert({
            name: data.name,
            description: data.description || null,
            weight: data.weight,
            subject_id: selectedSubject,
            promotion_id: selectedPromotion,
          });

        if (error) throw error;
        toast.success('Category created successfully');
      }

      reset();
      setIsModalOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleEdit = (category: GradeCategory) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description || '',
      weight: category.weight,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category? This will also delete all grades associated with it.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('grade_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const handleCancel = () => {
    reset();
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  if (!selectedSubject || !selectedPromotion) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Select Subject and Promotion
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            Please select a subject and promotion to manage grade categories.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Grade Categories
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage grade categories and their weight distribution
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Weight Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Total Weight Distribution:
          </span>
          <span className={cn(
            "text-sm font-bold",
            totalWeight === 100 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {totalWeight.toFixed(2)}%
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              totalWeight === 100 ? "bg-green-500" : "bg-red-500"
            )}
            style={{ width: `${Math.min(totalWeight, 100)}%` }}
          ></div>
        </div>
        {totalWeight !== 100 && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {totalWeight < 100 
              ? `Need ${(100 - totalWeight).toFixed(2)}% more to reach 100%`
              : `Exceeds 100% by ${(totalWeight - 100).toFixed(2)}%`
            }
          </p>
        )}
      </div>

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <Plus className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No categories yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create your first grade category to get started.
          </p>
          <Button onClick={() => setIsModalOpen(true)}>
            Create First Category
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Category Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Weight
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {category.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {category.weight}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(category)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCancel}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category Name *
            </label>
            <Input
              {...register('name')}
              placeholder="e.g., Exams, Homework, Participation"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <Input
              {...register('description')}
              placeholder="Optional description of the category"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Weight (%) *
            </label>
            <Input
              {...register('weight', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              placeholder="e.g., 30.5"
              className={errors.weight ? 'border-red-500' : ''}
            />
            {errors.weight && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {errors.weight.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
