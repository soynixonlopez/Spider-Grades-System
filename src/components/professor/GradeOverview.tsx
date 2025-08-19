import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Award, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { cn, formatGrade, getGradeColor, calculateFinalGrade } from '../../lib/utils';

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

interface CategoryStats {
  categoryId: string;
  categoryName: string;
  weight: number;
  average: number;
  min: number;
  max: number;
  totalGrades: number;
  grades: number[];
}

interface StudentGradeSummary {
  studentId: string;
  studentName: string;
  studentEmail: string;
  categoryGrades: { [categoryId: string]: number };
  finalGrade: number;
  rank: number;
}

interface GradeOverviewProps {
  selectedSubject: string | null;
  selectedPromotion: string | null;
}

export const GradeOverview: React.FC<GradeOverviewProps> = ({
  selectedSubject,
  selectedPromotion,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [studentSummaries, setStudentSummaries] = useState<StudentGradeSummary[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalStudents: 0,
    studentsWithGrades: 0,
    classAverage: 0,
    highestGrade: 0,
    lowestGrade: 0,
    passRate: 0,
  });

  useEffect(() => {
    if (selectedSubject && selectedPromotion) {
      fetchData();
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

      // Calculate statistics
      calculateStatistics(studentsData || [], categoriesData || [], gradesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (
    students: Student[],
    categories: GradeCategory[],
    grades: Grade[]
  ) => {
    // Calculate category statistics
    const categoryStatsData: CategoryStats[] = categories.map(category => {
      const categoryGrades = grades
        .filter(g => g.category_id === category.id)
        .map(g => g.grade);

      const average = categoryGrades.length > 0 
        ? categoryGrades.reduce((sum, grade) => sum + grade, 0) / categoryGrades.length 
        : 0;

      return {
        categoryId: category.id,
        categoryName: category.name,
        weight: category.weight,
        average,
        min: categoryGrades.length > 0 ? Math.min(...categoryGrades) : 0,
        max: categoryGrades.length > 0 ? Math.max(...categoryGrades) : 0,
        totalGrades: categoryGrades.length,
        grades: categoryGrades,
      };
    });

    // Calculate student summaries
    const studentSummariesData: StudentGradeSummary[] = students.map(student => {
      const studentGrades = grades.filter(g => g.student_id === student.id);
      const categoryGrades: { [categoryId: string]: number } = {};

      categories.forEach(category => {
        const grade = studentGrades.find(g => g.category_id === category.id);
        categoryGrades[category.id] = grade ? grade.grade : 0;
      });

      const finalGrade = calculateFinalGrade(
        categories.map(category => ({
          grade: categoryGrades[category.id] || 0,
          weight: category.weight
        }))
      );

      return {
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        studentEmail: student.email,
        categoryGrades,
        finalGrade,
        rank: 0, // Will be calculated below
      };
    });

    // Calculate ranks
    const sortedStudents = [...studentSummariesData].sort((a, b) => b.finalGrade - a.finalGrade);
    sortedStudents.forEach((student, index) => {
      student.rank = index + 1;
    });

    // Calculate overall statistics
    const finalGrades = studentSummariesData.map(s => s.finalGrade).filter(g => g > 0);
    const studentsWithGrades = finalGrades.length;
    const classAverage = studentsWithGrades > 0 
      ? finalGrades.reduce((sum, grade) => sum + grade, 0) / studentsWithGrades 
      : 0;
    const highestGrade = studentsWithGrades > 0 ? Math.max(...finalGrades) : 0;
    const lowestGrade = studentsWithGrades > 0 ? Math.min(...finalGrades) : 0;
    const passRate = studentsWithGrades > 0 
      ? (finalGrades.filter(g => g >= 60).length / studentsWithGrades) * 100 
      : 0;

    setCategoryStats(categoryStatsData);
    setStudentSummaries(sortedStudents);
    setOverallStats({
      totalStudents: students.length,
      studentsWithGrades,
      classAverage,
      highestGrade,
      lowestGrade,
      passRate,
    });
  };

  const exportGrades = () => {
    if (studentSummaries.length === 0) {
      toast.error('No grades to export');
      return;
    }

    const headers = ['Rank', 'Student Name', 'Email', ...categories.map(c => c.name), 'Final Grade'];
    const csvData = studentSummaries.map(student => [
      student.rank,
      student.studentName,
      student.studentEmail,
      ...categories.map(category => student.categoryGrades[category.id] || ''),
      student.finalGrade.toFixed(2),
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grades_${selectedSubject}_${selectedPromotion}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Grades exported successfully');
  };

  if (!selectedSubject || !selectedPromotion) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Select Subject and Promotion
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            Please select a subject and promotion to view grade overview.
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
          Please create grade categories first to view grade overview.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Grade Overview
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            View category averages, final grades, and overall statistics
          </p>
        </div>
        <Button
          onClick={exportGrades}
          className="flex items-center gap-2"
          disabled={studentSummaries.length === 0}
        >
          <Download className="h-4 w-4" />
          Export Grades
        </Button>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Students</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{overallStats.totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Class Average</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatGrade(overallStats.classAverage)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pass Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overallStats.passRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
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

      {/* Category Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Category Statistics
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Weight
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Average
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Min
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Max
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Grades Count
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {categoryStats.map((stat) => (
                <tr key={stat.categoryId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {stat.categoryName}
                    </div>
                    {/* Description removed for now */}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {stat.weight}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className={cn(
                      "text-sm font-medium",
                      getGradeColor(stat.average)
                    )}>
                      {formatGrade(stat.average)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className={cn(
                      "text-sm font-medium",
                      getGradeColor(stat.min)
                    )}>
                      {formatGrade(stat.min)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className={cn(
                      "text-sm font-medium",
                      getGradeColor(stat.max)
                    )}>
                      {formatGrade(stat.max)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {stat.totalGrades} / {students.length}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Rankings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Student Rankings
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Student
                </th>
                {categories.map((category) => (
                  <th key={category.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {category.name}
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Final Grade
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {studentSummaries.map((student) => (
                <tr key={student.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      #{student.rank}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {student.studentName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {student.studentEmail}
                      </div>
                    </div>
                  </td>
                  {categories.map((category) => (
                    <td key={category.id} className="px-6 py-4 whitespace-nowrap text-center">
                      <div className={cn(
                        "text-sm font-medium",
                        student.categoryGrades[category.id] 
                          ? getGradeColor(student.categoryGrades[category.id])
                          : "text-gray-400"
                      )}>
                        {student.categoryGrades[category.id] 
                          ? formatGrade(student.categoryGrades[category.id])
                          : '-'
                        }
                      </div>
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className={cn(
                      "text-sm font-bold",
                      getGradeColor(student.finalGrade)
                    )}>
                      {formatGrade(student.finalGrade)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
