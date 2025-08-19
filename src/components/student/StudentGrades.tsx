import React, { useState, useEffect } from 'react';
import { BookOpen, Award, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatGrade, getGradeColor, calculateFinalGrade } from '../../lib/utils';

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

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Promotion {
  id: string;
  name: string;
  level: string;
  shift: string;
  year: number;
}

interface StudentGradesProps {}

export const StudentGrades: React.FC<StudentGradesProps> = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedPromotion, setSelectedPromotion] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');

  useEffect(() => {
    fetchStudentData();
  }, []);

  useEffect(() => {
    if (selectedSubject && selectedPromotion && studentId) {
      fetchGrades();
    }
  }, [selectedSubject, selectedPromotion, studentId]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user');
        return;
      }

      // Get student profile
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (studentError) throw studentError;
      setStudentId(studentData.id);

      // Get student's promotion
      const { data: promotionData, error: promotionError } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', studentData.promotion_id)
        .single();

      if (promotionError) throw promotionError;
      setSelectedPromotion(promotionData.id);

      // Get subjects for the student's promotion
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true });

      if (subjectsError) throw subjectsError;
      setSubjects(subjectsData || []);

      // Set first subject as default if available
      if (subjectsData && subjectsData.length > 0) {
        setSelectedSubject(subjectsData[0].id);
      }

    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    if (!selectedSubject || !selectedPromotion || !studentId) return;

    try {
      // Fetch grade categories for the subject and promotion
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('grade_categories')
        .select('*')
        .eq('subject_id', selectedSubject)
        .eq('promotion_id', selectedPromotion)
        .order('created_at', { ascending: true });

      if (categoriesError) throw categoriesError;

      // Fetch grades for the student
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', studentId)
        .eq('subject_id', selectedSubject)
        .eq('promotion_id', selectedPromotion);

      if (gradesError) throw gradesError;

      setCategories(categoriesData || []);
      setGrades(gradesData || []);
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const getGradeForCategory = (categoryId: string): Grade | null => {
    return grades.find(g => g.category_id === categoryId) || null;
  };

  const getFinalGrade = () => {
    if (categories.length === 0) return 0;

    const categoryGrades: { [categoryId: string]: number } = {};
    categories.forEach(category => {
      const grade = getGradeForCategory(category.id);
      categoryGrades[category.id] = grade ? grade.grade : 0;
    });

    return calculateFinalGrade(
      categories.map(category => ({
        grade: categoryGrades[category.id] || 0,
        weight: category.weight
      }))
    );
  };

  const getGradeStatus = (grade: number) => {
    if (grade >= 90) return { status: 'Excellent', color: 'text-green-600 dark:text-green-400' };
    if (grade >= 80) return { status: 'Good', color: 'text-blue-600 dark:text-blue-400' };
    if (grade >= 70) return { status: 'Satisfactory', color: 'text-yellow-600 dark:text-yellow-400' };
    if (grade >= 60) return { status: 'Passing', color: 'text-orange-600 dark:text-orange-400' };
    return { status: 'Failing', color: 'text-red-600 dark:text-red-400' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const finalGrade = getFinalGrade();
  const gradeStatus = getGradeStatus(finalGrade);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Grades
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            View your grades and academic performance
          </p>
        </div>
      </div>

      {/* Subject Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select a subject...</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedSubject && (
        <>
          {/* Final Grade Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Award className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Final Grade</p>
                  <p className={cn("text-2xl font-bold", getGradeColor(finalGrade))}>
                    {formatGrade(finalGrade)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</p>
                  <p className={cn("text-lg font-bold", gradeStatus.color)}>
                    {gradeStatus.status}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Categories</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {categories.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Grade Categories */}
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <BookOpen className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Grade Categories
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Grade categories have not been set up for this subject yet.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Grade Breakdown
                </h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {categories.map((category) => {
                  const grade = getGradeForCategory(category.id);
                  const categoryStatus = grade ? getGradeStatus(grade.grade) : null;
                  
                  return (
                    <div key={category.id} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                            {category.name}
                          </h4>
                          {category.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {category.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Weight: {category.weight}%
                          </div>
                          {grade && (
                            <div className={cn(
                              "text-lg font-bold mt-1",
                              getGradeColor(grade.grade)
                            )}>
                              {formatGrade(grade.grade)}
                            </div>
                          )}
                        </div>
                      </div>

                      {grade ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Status: 
                            </span>
                            <span className={cn(
                              "text-sm font-medium",
                              categoryStatus?.color
                            )}>
                              {categoryStatus?.status}
                            </span>
                          </div>
                          
                          {grade.comments && (
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                Comments:
                              </div>
                              <div className="text-sm text-gray-900 dark:text-white">
                                {grade.comments}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="h-3 w-3 mr-1" />
                            Last updated: {new Date(grade.updated_at || grade.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <div className="text-gray-400 dark:text-gray-500 mb-2">
                            <BookOpen className="h-8 w-8 mx-auto" />
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No grade recorded yet
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grade Progress Visualization */}
          {categories.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Grade Progress
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {categories.map((category) => {
                    const grade = getGradeForCategory(category.id);
                    const percentage = grade ? (grade.grade / 100) * 100 : 0;
                    
                    return (
                      <div key={category.id}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {category.name}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {grade ? formatGrade(grade.grade) : 'No grade'} / 100
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={cn(
                              "h-2 rounded-full transition-all duration-300",
                              grade ? getGradeColor(grade.grade).replace('text-', 'bg-').replace('dark:text-', 'dark:bg-') : "bg-gray-300 dark:bg-gray-600"
                            )}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
