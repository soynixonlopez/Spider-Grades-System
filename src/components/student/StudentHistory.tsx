import React, { useState, useEffect } from 'react';
import { History, Calendar, BookOpen, TrendingUp, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatGrade, getGradeColor, formatDate } from '../../lib/utils';

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

interface GradeHistory {
  id: string;
  subjectName: string;
  subjectCode: string;
  promotionName: string;
  promotionYear: number;
  categoryName: string;
  grade: number;
  weight: number;
  comments: string | null;
  recordedAt: string;
  updatedAt: string;
}

interface StudentHistoryProps {}

export const StudentHistory: React.FC<StudentHistoryProps> = () => {
  const [gradeHistory, setGradeHistory] = useState<GradeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedPromotion, setSelectedPromotion] = useState<string>('all');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'subject' | 'grade'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchStudentData();
  }, []);

  useEffect(() => {
    if (studentId) {
      fetchGradeHistory();
    }
  }, [studentId, selectedSubject, selectedPromotion]);

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

      // Get all subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true });

      if (subjectsError) throw subjectsError;
      setSubjects(subjectsData || []);

      // Get all promotions
      const { data: promotionsData, error: promotionsError } = await supabase
        .from('promotions')
        .select('*')
        .order('year', { ascending: false });

      if (promotionsError) throw promotionsError;
      setPromotions(promotionsData || []);

    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGradeHistory = async () => {
    if (!studentId) return;

    try {
      // Build the query
      let query = supabase
        .from('grades')
        .select(`
          *,
          grade_categories!inner(
            name,
            weight,
            subjects!inner(name, code),
            promotions!inner(name, year)
          )
        `)
        .eq('student_id', studentId);

      if (selectedSubject !== 'all') {
        query = query.eq('subject_id', selectedSubject);
      }

      if (selectedPromotion !== 'all') {
        query = query.eq('promotion_id', selectedPromotion);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;

      // Transform the data
      const historyData: GradeHistory[] = (data || []).map((grade: any) => ({
        id: grade.id,
        subjectName: grade.grade_categories.subjects.name,
        subjectCode: grade.grade_categories.subjects.code,
        promotionName: grade.grade_categories.promotions.name,
        promotionYear: grade.grade_categories.promotions.year,
        categoryName: grade.grade_categories.name,
        grade: grade.grade,
        weight: grade.grade_categories.weight,
        comments: grade.comments,
        recordedAt: grade.created_at,
        updatedAt: grade.updated_at || grade.created_at,
      }));

      setGradeHistory(historyData);
    } catch (error) {
      console.error('Error fetching grade history:', error);
    }
  };

  const getSortedHistory = () => {
    const sorted = [...gradeHistory].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          break;
        case 'subject':
          comparison = a.subjectName.localeCompare(b.subjectName);
          break;
        case 'grade':
          comparison = b.grade - a.grade;
          break;
      }
      
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return sorted;
  };

  const getGradeStatus = (grade: number) => {
    if (grade >= 90) return { status: 'Excellent', color: 'text-green-600 dark:text-green-400' };
    if (grade >= 80) return { status: 'Good', color: 'text-blue-600 dark:text-blue-400' };
    if (grade >= 70) return { status: 'Satisfactory', color: 'text-yellow-600 dark:text-yellow-400' };
    if (grade >= 60) return { status: 'Passing', color: 'text-orange-600 dark:text-orange-400' };
    return { status: 'Failing', color: 'text-red-600 dark:text-red-400' };
  };

  const getUniqueSubjects = () => {
    return Array.from(new Set(gradeHistory.map(h => h.subjectName))).sort();
  };

  const getUniquePromotions = () => {
    return Array.from(new Set(gradeHistory.map(h => `${h.promotionName} (${h.promotionYear})`))).sort();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const sortedHistory = getSortedHistory();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Academic History
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            View your complete grade history and academic timeline
          </p>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filter by Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filter by Promotion
            </label>
            <select
              value={selectedPromotion}
              onChange={(e) => setSelectedPromotion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Promotions</option>
              {promotions.map((promotion) => (
                <option key={promotion.id} value={promotion.id}>
                  {promotion.name} ({promotion.year})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'subject' | 'grade')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="date">Date</option>
              <option value="subject">Subject</option>
              <option value="grade">Grade</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Order
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      {gradeHistory.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <History className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Records</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {gradeHistory.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Subjects</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getUniqueSubjects().length}
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
                <p className={cn("text-2xl font-bold", getGradeColor(
                  gradeHistory.reduce((sum, h) => sum + h.grade, 0) / gradeHistory.length
                ))}>
                  {formatGrade(
                    gradeHistory.reduce((sum, h) => sum + h.grade, 0) / gradeHistory.length
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Promotions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getUniquePromotions().length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grade History Timeline */}
      {gradeHistory.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <History className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Grade History
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Your grade history will appear here once grades are recorded.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Grade Timeline
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedHistory.map((record) => {
              const gradeStatus = getGradeStatus(record.grade);
              
              return (
                <div key={record.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                          {record.subjectName}
                        </h4>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({record.subjectCode})
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          • {record.promotionName} ({record.promotionYear})
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 mb-3">
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Category:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white ml-1">
                            {record.categoryName}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Weight:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white ml-1">
                            {record.weight}%
                          </span>
                        </div>
                      </div>

                      {record.comments && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Comments:
                          </div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {record.comments}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="h-3 w-3 mr-1" />
                        Recorded: {formatDate(record.recordedAt)}
                        {record.updatedAt !== record.recordedAt && (
                          <span className="ml-2">
                            • Updated: {formatDate(record.updatedAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className={cn(
                        "text-2xl font-bold mb-1",
                        getGradeColor(record.grade)
                      )}>
                        {formatGrade(record.grade)}
                      </div>
                      <div className={cn(
                        "text-sm font-medium",
                        gradeStatus.color
                      )}>
                        {gradeStatus.status}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
