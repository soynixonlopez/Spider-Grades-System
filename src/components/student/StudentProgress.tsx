import React, { useState, useEffect } from 'react';
import { TrendingUp, BookOpen, Target, Calendar, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatGrade, getGradeColor, calculateFinalGrade } from '../../lib/utils';

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface GradeCategory {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  subject_id: string;
  promotion_id: string;
}

interface Grade {
  id: string;
  student_id: string;
  category_id: string;
  subject_id: string;
  promotion_id: string;
  grade: number;
  comments: string | null;
  created_at: string;
  updated_at: string;
  last_editor: string;
}

interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  finalGrade: number;
  categories: number;
  completedCategories: number;
  lastUpdated: string;
  status: 'excellent' | 'good' | 'satisfactory' | 'passing' | 'failing' | 'incomplete';
}

interface StudentProgressProps {}

export const StudentProgress: React.FC<StudentProgressProps> = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string>('');
  const [promotionId, setPromotionId] = useState<string>('');
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalSubjects: 0,
    completedSubjects: 0,
    averageGrade: 0,
    highestGrade: 0,
    lowestGrade: 0,
    improvementRate: 0,
  });

  useEffect(() => {
    fetchStudentData();
  }, []);

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
      setPromotionId(studentData.promotion_id);

      // Get all subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true });

      if (subjectsError) throw subjectsError;
      setSubjects(subjectsData || []);

      // Get all grade categories for the student's promotion
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('grade_categories')
        .select('*')
        .eq('promotion_id', studentData.promotion_id)
        .order('created_at', { ascending: true });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Get all grades for the student
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', studentData.id)
        .eq('promotion_id', studentData.promotion_id);

      if (gradesError) throw gradesError;
      setGrades(gradesData || []);

      // Calculate progress
      calculateProgress(subjectsData || [], categoriesData || [], gradesData || []);

    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (
    subjects: Subject[],
    categories: GradeCategory[],
    grades: Grade[]
  ) => {
    const progressData: SubjectProgress[] = subjects.map(subject => {
      const subjectCategories = categories.filter(cat => cat.subject_id === subject.id);
      const subjectGrades = grades.filter(grade => grade.subject_id === subject.id);
      
      const categoryGrades: { [categoryId: string]: number } = {};
      subjectCategories.forEach(category => {
        const grade = subjectGrades.find(g => g.category_id === category.id);
        categoryGrades[category.id] = grade ? grade.grade : 0;
      });

      const finalGrade = calculateFinalGrade(
        subjectCategories.map(category => ({
          grade: categoryGrades[category.id] || 0,
          weight: category.weight
        }))
      );
      const completedCategories = subjectGrades.length;
      const lastUpdated = subjectGrades.length > 0 
        ? Math.max(...subjectGrades.map(g => new Date(g.updated_at || g.created_at).getTime()))
        : 0;

      let status: SubjectProgress['status'] = 'incomplete';
      if (completedCategories === 0) {
        status = 'incomplete';
      } else if (finalGrade >= 90) {
        status = 'excellent';
      } else if (finalGrade >= 80) {
        status = 'good';
      } else if (finalGrade >= 70) {
        status = 'satisfactory';
      } else if (finalGrade >= 60) {
        status = 'passing';
      } else {
        status = 'failing';
      }

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCode: subject.code,
        finalGrade,
        categories: subjectCategories.length,
        completedCategories,
        lastUpdated: lastUpdated ? new Date(lastUpdated).toISOString() : '',
        status,
      };
    });

    // Calculate overall statistics
    const completedSubjects = progressData.filter(p => p.completedCategories > 0);
    const finalGrades = completedSubjects.map(s => s.finalGrade);
    const averageGrade = finalGrades.length > 0 
      ? finalGrades.reduce((sum, grade) => sum + grade, 0) / finalGrades.length 
      : 0;
    const highestGrade = finalGrades.length > 0 ? Math.max(...finalGrades) : 0;
    const lowestGrade = finalGrades.length > 0 ? Math.min(...finalGrades) : 0;

    setSubjectProgress(progressData);
    setOverallStats({
      totalSubjects: subjects.length,
      completedSubjects: completedSubjects.length,
      averageGrade,
      highestGrade,
      lowestGrade,
      improvementRate: 0, // Would need historical data to calculate
    });
  };

  const getStatusColor = (status: SubjectProgress['status']) => {
    switch (status) {
      case 'excellent': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
      case 'good': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900';
      case 'satisfactory': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900';
      case 'passing': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900';
      case 'failing': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900';
      case 'incomplete': return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900';
    }
  };

  const getStatusText = (status: SubjectProgress['status']) => {
    switch (status) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'satisfactory': return 'Satisfactory';
      case 'passing': return 'Passing';
      case 'failing': return 'Failing';
      case 'incomplete': return 'Incomplete';
      default: return 'Unknown';
    }
  };

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
            Academic Progress
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Track your performance across all subjects
          </p>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Subjects</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overallStats.totalSubjects}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overallStats.completedSubjects}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Grade</p>
              <p className={cn("text-2xl font-bold", getGradeColor(overallStats.averageGrade))}>
                {formatGrade(overallStats.averageGrade)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <BarChart3 className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Grade Range</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatGrade(overallStats.lowestGrade)} - {formatGrade(overallStats.highestGrade)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Subject Progress Overview
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Final Grade
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {subjectProgress.map((progress) => (
                <tr key={progress.subjectId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {progress.subjectName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {progress.subjectCode}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className={cn(
                      "text-sm font-bold",
                      progress.finalGrade > 0 ? getGradeColor(progress.finalGrade) : "text-gray-400"
                    )}>
                      {progress.finalGrade > 0 ? formatGrade(progress.finalGrade) : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex flex-col items-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {progress.completedCategories} / {progress.categories}
                      </div>
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all duration-300",
                            progress.completedCategories > 0 ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                          )}
                          style={{ 
                            width: `${progress.categories > 0 ? (progress.completedCategories / progress.categories) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={cn(
                      "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                      getStatusColor(progress.status)
                    )}>
                      {getStatusText(progress.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="h-3 w-3 mr-1" />
                      {progress.lastUpdated 
                        ? new Date(progress.lastUpdated).toLocaleDateString()
                        : 'Never'
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Best Performing Subjects */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top Performing Subjects
            </h3>
          </div>
          <div className="p-6">
            {subjectProgress
              .filter(p => p.finalGrade > 0)
              .sort((a, b) => b.finalGrade - a.finalGrade)
              .slice(0, 3)
              .map((progress, index) => (
                <div key={progress.subjectId} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white",
                      index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : "bg-orange-500"
                    )}>
                      {index + 1}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {progress.subjectName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {progress.subjectCode}
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "text-sm font-bold",
                    getGradeColor(progress.finalGrade)
                  )}>
                    {formatGrade(progress.finalGrade)}
                  </div>
                </div>
              ))}
            {subjectProgress.filter(p => p.finalGrade > 0).length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No grades recorded yet
              </div>
            )}
          </div>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Areas for Improvement
            </h3>
          </div>
          <div className="p-6">
            {subjectProgress
              .filter(p => p.finalGrade > 0 && p.finalGrade < 70)
              .sort((a, b) => a.finalGrade - b.finalGrade)
              .slice(0, 3)
              .map((progress) => (
                <div key={progress.subjectId} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {progress.subjectName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {progress.subjectCode}
                    </div>
                  </div>
                  <div className={cn(
                    "text-sm font-bold",
                    getGradeColor(progress.finalGrade)
                  )}>
                    {formatGrade(progress.finalGrade)}
                  </div>
                </div>
              ))}
            {subjectProgress.filter(p => p.finalGrade > 0 && p.finalGrade < 70).length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                All subjects are performing well!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
