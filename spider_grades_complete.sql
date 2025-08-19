-- =====================================================
-- SPIDER GRADES SYSTEM - COMPLETE DATABASE SETUP
-- =====================================================

-- Remove this line (it's causing the error):
-- ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP EXISTING TABLES (if they exist)
-- =====================================================
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS grade_categories CASCADE;
DROP TABLE IF EXISTS professor_subjects CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS professors CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'professor', 'student')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create promotions table
CREATE TABLE promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  level TEXT CHECK (level IN ('Freshman', 'Junior', 'Senior')) NOT NULL,
  shift TEXT CHECK (shift IN ('AM', 'PM')) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subjects table
CREATE TABLE subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create professors table
CREATE TABLE professors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  lastname TEXT NOT NULL,
  specialty TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create students table
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  lastname TEXT NOT NULL,
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create professor_subjects table
CREATE TABLE professor_subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professor_id UUID REFERENCES professors(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(professor_id, subject_id, promotion_id)
);

-- Create grade_categories table
CREATE TABLE grade_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  weight DECIMAL(5,2) NOT NULL CHECK (weight >= 0 AND weight <= 100),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create grades table
CREATE TABLE grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES grade_categories(id) ON DELETE CASCADE NOT NULL,
  grade DECIMAL(5,2) NOT NULL CHECK (grade >= 0 AND grade <= 100),
  comments TEXT,
  last_editor_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, category_id)
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_promotions_active ON promotions(active);
CREATE INDEX idx_professor_subjects_professor ON professor_subjects(professor_id);
CREATE INDEX idx_professor_subjects_subject ON professor_subjects(subject_id);
CREATE INDEX idx_professor_subjects_promotion ON professor_subjects(promotion_id);
CREATE INDEX idx_grade_categories_subject ON grade_categories(subject_id);
CREATE INDEX idx_grade_categories_promotion ON grade_categories(promotion_id);
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_category ON grades(category_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE professor_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - SIMPLIFIED AND WORKING
-- =====================================================

-- Profiles: Simple policy for authenticated users
CREATE POLICY "Allow all authenticated users" ON profiles
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Admin access for all other tables
CREATE POLICY "Admin access all" ON promotions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access all" ON subjects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access all" ON professors FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access all" ON students FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access all" ON professor_subjects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access all" ON grade_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin access all" ON grades FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Professor policies
CREATE POLICY "Professor access own assignments" ON professor_subjects FOR ALL USING (
  EXISTS (
    SELECT 1 FROM professors 
    WHERE user_id = auth.uid() 
    AND id = professor_subjects.professor_id
  )
);

CREATE POLICY "Professor access assigned subjects" ON grade_categories FOR ALL USING (
  EXISTS (
    SELECT 1 FROM professor_subjects ps
    JOIN professors p ON p.id = ps.professor_id
    WHERE p.user_id = auth.uid()
    AND ps.subject_id = grade_categories.subject_id
    AND ps.promotion_id = grade_categories.promotion_id
  )
);

CREATE POLICY "Professor access assigned grades" ON grades FOR ALL USING (
  EXISTS (
    SELECT 1 FROM grade_categories gc
    JOIN professor_subjects ps ON ps.subject_id = gc.subject_id AND ps.promotion_id = gc.promotion_id
    JOIN professors p ON p.id = ps.professor_id
    WHERE p.user_id = auth.uid()
    AND gc.id = grades.category_id
  )
);

-- Student policies
CREATE POLICY "Student access own data" ON students FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY "Student access own grades" ON grades FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM students 
    WHERE user_id = auth.uid() 
    AND id = grades.student_id
  )
);

-- Public read access for basic data
CREATE POLICY "Public read promotions" ON promotions FOR SELECT USING (active = true);
CREATE POLICY "Public read subjects" ON subjects FOR SELECT USING (true);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_professors_updated_at BEFORE UPDATE ON professors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grade_categories_updated_at BEFORE UPDATE ON grade_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CREATE ADMIN USER
-- =====================================================
-- Crear el perfil admin (reemplaza USER_ID con el ID real de tu usuario)
INSERT INTO profiles (id, email, role) 
VALUES (
  '7d541023-ecb9-4ba8-98fc-14a674783670',
  'admin@motta.superate.org.pa',
  'admin'
);

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Verificar que todo se creó correctamente
SELECT 'Profiles count:' as info, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'Promotions count:', COUNT(*) FROM promotions
UNION ALL
SELECT 'Subjects count:', COUNT(*) FROM subjects
UNION ALL
SELECT 'Professors count:', COUNT(*) FROM professors
UNION ALL
SELECT 'Students count:', COUNT(*) FROM students;
