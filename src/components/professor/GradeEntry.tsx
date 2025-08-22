import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Edit, Eye, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { cn, formatGrade, getGradeColor } from '../../lib/utils';

const gradeSchema = z.object({
  grade: z.number().min(0, 'Grade must be at least 0').max(100, 'Grade cannot exceed 100'),
  comments: z.string().optional(),
});

type GradeFormData = z.infer<typeof gradeSchema>;

interface Student {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  promotion_id: string;
}

interface GradeCategory {
  id: string;
  name: string;
  description: string | null;
  weight: number;
}

interface Grade {
  id: string;
  student_id: string;
  category_id: string;
  grade: number;
  comments: string | null;
  created_at: string;
  updated_at: string;
  last_editor: string;
}

interface GradeEntryProps {
  selectedSubject: string | null;
  selectedPromotion: string | null;
}

export const GradeEntry: React.FC<GradeEntryProps> = ({
  selectedSubject,
  selectedPromotion,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<{ studentId: string; categoryId: string; grade: Grade | null } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lastEditor, setLastEditor] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<GradeFormData>({
    resolver: zodResolver(gradeSchema),
  });

  useEffect(() => {
    if (selectedSubject && selectedPromotion) {
      fetchData();
      setupRealtimeSubscription();
    }
  }, [selectedSubject, selectedPromotion]);

  const fetchData = async () => {
    if (!selectedSubject || !selectedPromotion) return;

    try {
      setLoading(true);
      
      // Fetch students in the promotion
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('promotion_id', selectedPromotion)
        .order('last_name', { ascending: true });

      if (studentsError) throw studentsError;

      // Fetch grade categories for the subject and promotion
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('grade_categories')
        .select('*')
        .eq('subject_id', selectedSubject)
        .eq('promotion_id', selectedPromotion)
        .order('created_at', { ascending: true });

      if (categoriesError) throw categoriesError;

      // Fetch existing grades
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .eq('subject_id', selectedSubject)
        .eq('promotion_id', selectedPromotion);

      if (gradesError) throw gradesError;

      setStudents(studentsData || []);
      setCategories(categoriesData || []);
      setGrades(gradesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!selectedSubject || !selectedPromotion) return;

    const subscription = supabase
      .channel('grades_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grades',
          filter: `subject_id=eq.${selectedSubject} AND promotion_id=eq.${selectedPromotion}`,
        },
        (payload) => {
          console.log('Grade change detected:', payload);
          fetchData(); // Refresh data when changes occur
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const getGradeForStudentAndCategory = (studentId: string, categoryId: string): Grade | null => {
    return grades.find(g => g.student_id === studentId && g.category_id === categoryId) || null;
  };

  const handleEditGrade = (studentId: string, categoryId: string) => {
    const existingGrade = getGradeForStudentAndCategory(studentId, categoryId);
    setEditingGrade({ studentId, categoryId, grade: existingGrade });
    
    if (existingGrade) {
      reset({
        grade: existingGrade.grade,
        comments: existingGrade.comments || '',
      });
    } else {
      reset({
        grade: 0,
        comments: '',
      });
    }
    
    setIsModalOpen(true);
  };

  const onSubmit = async (data: GradeFormData) => {
    if (!selectedSubject || !selectedPromotion || !editingGrade) {
      toast.error('Missing required data');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      if (editingGrade.grade) {
        // Update existing grade
        const { error } = await supabase
          .from('grades')
          .update({
            grade: data.grade,
            comments: data.comments || null,
            updated_at: new Date().toISOString(),
            last_editor_id: user.id,
          })
          .eq('id', editingGrade.grade.id);

        if (error) throw error;
        toast.success('Grade updated successfully');
      } else {
        // Create new grade
        const { error } = await supabase
          .from('grades')
          .insert({
            student_id: editingGrade.studentId,
            category_id: editingGrade.categoryId,
            subject_id: selectedSubject,
            promotion_id: selectedPromotion,
            grade: data.grade,
            comments: data.comments || null,
            last_editor_id: user.id,
          });

        if (error) throw error;
        toast.success('Grade registered successfully');
      }

      reset();
      setIsModalOpen(false);
      setEditingGrade(null);
      fetchData();
    } catch (error) {
      console.error('Error saving grade:', error);
      toast.error('Failed to save grade');
    }
  };

  const handleCancel = () => {
    reset();
    setIsModalOpen(false);
    setEditingGrade(null);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const filteredCategories = selectedCategory === 'all' 
    ? categories 
    : categories.filter(cat => cat.id === selectedCategory);

  if (!selectedSubject || !selectedPromotion) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Select Subject and Promotion
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            Please select a subject and promotion to enter grades.
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

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Grade Categories Found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Please create grade categories first before entering grades.
        </p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Students Found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          No students are enrolled in this promotion.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Grade Entry
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Register grades for students by category
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search Students
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filter by Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Student
                </th>
                {filteredCategories.map((category) => (
                  <th key={category.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex flex-col items-center">
                      <span>{category.name}</span>
                      <span className="text-xs text-gray-400">({category.weight}%)</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {student.first_name} {student.last_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {student.email}
                      </div>
                    </div>
                  </td>
                  {filteredCategories.map((category) => {
                    const grade = getGradeForStudentAndCategory(student.id, category.id);
                    return (
                      <td key={category.id} className="px-6 py-4 whitespace-nowrap text-center">
                        {grade ? (
                          <div className="flex flex-col items-center">
                            <span className={cn(
                              "text-sm font-medium",
                              getGradeColor(grade.grade)
                            )}>
                              {formatGrade(grade.grade)}
                            </span>
                            <div className="flex gap-1 mt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditGrade(student.id, category.id)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              {grade.comments && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingGrade({ studentId: student.id, categoryId: category.id, grade });
                                    reset({
                                      grade: grade.grade,
                                      comments: grade.comments || '',
                                    });
                                    setIsModalOpen(true);
                                  }}
                                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 p-1"
                                  title="View comments"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditGrade(student.id, category.id)}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                          >
                            Add Grade
                          </Button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCancel}
        title={editingGrade?.grade ? 'Edit Grade' : 'Add Grade'}
        size="md"
      >
        {editingGrade && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Student:</strong> {students.find(s => s.id === editingGrade.studentId)?.first_name} {students.find(s => s.id === editingGrade.studentId)?.last_name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Category:</strong> {categories.find(c => c.id === editingGrade.categoryId)?.name}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Grade (0-100) *
              </label>
              <Input
                {...register('grade', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g., 85.5"
                className={errors.grade ? 'border-red-500' : ''}
              />
              {errors.grade && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.grade.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Comments
              </label>
              <textarea
                {...register('comments')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Optional comments about the grade..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? 'Saving...' : editingGrade.grade ? 'Update' : 'Save'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
