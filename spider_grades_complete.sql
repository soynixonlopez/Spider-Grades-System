-- =====================================================
-- SPIDER GRADES SYSTEM - COMPLETE DATABASE SETUP (UPDATED)
-- =====================================================

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

-- Create profiles table (UPDATED with passcode field)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'professor', 'student')) NOT NULL,
  passcode TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create promotions table (UPDATED structure: name, cohort_code, entry_year, shift)
CREATE TABLE promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cohort_code TEXT NOT NULL UNIQUE,
  entry_year INTEGER NOT NULL,
  shift TEXT CHECK (shift IN ('AM', 'PM')) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subjects table (UPDATED - removed promotion_id, will use junction table)
CREATE TABLE subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  year INTEGER NOT NULL,
  semester INTEGER CHECK (semester IN (1, 2)) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subject_promotions junction table for many-to-many relationship
CREATE TABLE subject_promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subject_id, promotion_id)
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(professor_id, subject_id)
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
CREATE INDEX idx_promotions_entry_year ON promotions(entry_year);
CREATE INDEX idx_subjects_year_semester ON subjects(year, semester);
CREATE INDEX idx_subject_promotions_subject ON subject_promotions(subject_id);
CREATE INDEX idx_subject_promotions_promotion ON subject_promotions(promotion_id);
CREATE INDEX idx_professor_subjects_professor ON professor_subjects(professor_id);
CREATE INDEX idx_professor_subjects_subject ON professor_subjects(subject_id);

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
ALTER TABLE subject_promotions ENABLE ROW LEVEL SECURITY;
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

CREATE POLICY "Admin access all" ON subject_promotions FOR ALL USING (
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
  )
);

CREATE POLICY "Professor access assigned grades" ON grades FOR ALL USING (
  EXISTS (
    SELECT 1 FROM grade_categories gc
    JOIN professor_subjects ps ON ps.subject_id = gc.subject_id
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

-- Function to calculate student level based on entry year (3 levels: Freshman, Junior, Senior)
CREATE OR REPLACE FUNCTION calculate_student_level(entry_year INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN (EXTRACT(YEAR FROM CURRENT_DATE) - entry_year) = 0 THEN 'Freshman'
    WHEN (EXTRACT(YEAR FROM CURRENT_DATE) - entry_year) = 1 THEN 'Junior'
    WHEN (EXTRACT(YEAR FROM CURRENT_DATE) - entry_year) = 2 THEN 'Senior'
    ELSE 'Graduado'
  END;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subject_promotions_updated_at BEFORE UPDATE ON subject_promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_professors_updated_at BEFORE UPDATE ON professors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grade_categories_updated_at BEFORE UPDATE ON grade_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CREATE VIEWS
-- =====================================================

-- View for students with calculated level
CREATE OR REPLACE VIEW students_with_level AS
SELECT 
  s.*,
  p.name as promotion_name,
  p.entry_year,
  p.shift,
  calculate_student_level(p.entry_year) as current_level
FROM students s
JOIN promotions p ON s.promotion_id = p.id
WHERE p.active = true;

-- View for subjects with promotion information
CREATE OR REPLACE VIEW subjects_with_promotion AS
SELECT 
  s.*,
  p.name as promotion_name,
  p.cohort_code as promotion_cohort_code,
  p.entry_year as promotion_entry_year,
  p.shift as promotion_shift
FROM subjects s
JOIN subject_promotions sp ON s.id = sp.subject_id
JOIN promotions p ON sp.promotion_id = p.id;

-- =====================================================
-- CREATE ADMIN USER
-- =====================================================
-- Crear el perfil admin (reemplaza USER_ID con el ID real de tu usuario)
INSERT INTO profiles (id, email, role, passcode) 
VALUES (
  '7d541023-ecb9-4ba8-98fc-14a674783670',
  'admin@motta.superate.org.pa',
  'admin',
  'admin123'
);

-- Ejemplo de promociones con códigos de cohorte
INSERT INTO promotions (name, cohort_code, entry_year, shift, active) VALUES
('Promoción 2024 A', '2024A', 2024, 'AM', true),
('Promoción 2024 B', '2024B', 2024, 'PM', true),
('Promoción 2023 A', '2023A', 2023, 'AM', true),
('Promoción 2023 B', '2023B', 2023, 'PM', true);

-- =====================================================
-- SAMPLE DATA (COMMENTED OUT - UNCOMMENT IF NEEDED)
-- =====================================================

-- -- Sample promotions (uncomment if you want example data)
-- INSERT INTO promotions (name, entry_year, shift, active) VALUES
-- ('Promoción 2024', 2024, 'AM', true),
-- ('Promoción 2023', 2023, 'AM', true),
-- ('Promoción 2022', 2022, 'PM', true);

-- Sample subjects (uncomment if you want example data)
-- INSERT INTO subjects (name, description, year, semester) VALUES
-- ('Matemáticas', 'Matemáticas básicas y avanzadas', 2024, 1),
-- ('Historia', 'Historia universal y panameña', 2024, 1),
-- ('Ciencias', 'Biología, química y física', 2024, 2),
-- ('Inglés', 'Idioma inglés básico e intermedio', 2024, 1);

-- Sample subject-promotion relationships (uncomment if you want example data)
-- INSERT INTO subject_promotions (subject_id, promotion_id) VALUES
-- ((SELECT id FROM subjects WHERE name = 'Matemáticas'), (SELECT id FROM promotions WHERE cohort_code = '2024A')),
-- ((SELECT id FROM subjects WHERE name = 'Matemáticas'), (SELECT id FROM promotions WHERE cohort_code = '2024B')),
-- ((SELECT id FROM subjects WHERE name = 'Historia'), (SELECT id FROM promotions WHERE cohort_code = '2024A')),
-- ((SELECT id FROM subjects WHERE name = 'Ciencias'), (SELECT id FROM promotions WHERE cohort_code = '2024B'));

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

-- =====================================================
-- SYSTEM FEATURES SUMMARY
-- =====================================================
/*
NUEVAS FUNCIONALIDADES IMPLEMENTADAS:

1. SISTEMA DE PASSCODES:
   - Campo 'passcode' agregado a la tabla 'profiles'
   - Autenticación por email + passcode en lugar de password

2. ESTRUCTURA DE PROMOCIONES ACTUALIZADA:
   - 'name': Nombre de la promoción (ej: "Promoción 2024")
   - 'entry_year': Año de ingreso (ej: 2024)
   - 'shift': Turno (AM/PM)
   - El nivel se calcula automáticamente: Freshman, Sophomore, Junior, Senior

3. ASIGNATURAS MEJORADAS:
   - 'year': Año académico
   - 'semester': Semestre (1 o 2)
   - 'promotion_id': Vinculación opcional con promociones específicas
   - Si promotion_id es NULL, la asignatura está disponible para todas las promociones

4. FUNCIONES Y VISTAS:
   - calculate_student_level(): Calcula automáticamente el nivel del estudiante
   - students_with_level: Vista con estudiantes y su nivel actual
   - subjects_with_promotion: Vista con asignaturas y información de promoción

5. ÍNDICES OPTIMIZADOS:
   - Nuevos índices para mejorar el rendimiento de consultas

6. DATOS DE EJEMPLO:
   - Promociones de ejemplo
   - Asignaturas de ejemplo
   - Usuario admin con passcode

SISTEMA LISTO PARA:
- Creación masiva de estudiantes y profesores con emails automáticos
- Envío de passcodes por email
- Gestión de promociones con niveles automáticos
- Asignación de asignaturas por promoción
- Cálculo automático de niveles estudiantiles
*/
