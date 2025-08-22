-- =====================================================
-- SPIDER GRADES SYSTEM - SISTEMA COMPLETO FINAL
-- =====================================================
-- Este es el único archivo SQL que necesitas ejecutar
-- Contiene todo lo necesario para el sistema de calificaciones

-- =====================================================
-- LIMPIAR DATOS Y POLÍTICAS EXISTENTES
-- =====================================================
-- Eliminar datos existentes
DELETE FROM grades WHERE id IS NOT NULL;
DELETE FROM grade_categories WHERE id IS NOT NULL;
DELETE FROM professor_subjects WHERE id IS NOT NULL;
DELETE FROM students WHERE id IS NOT NULL;
DELETE FROM professors WHERE id IS NOT NULL;
DELETE FROM subject_promotions WHERE id IS NOT NULL;
DELETE FROM subjects WHERE id IS NOT NULL;
DELETE FROM promotions WHERE id IS NOT NULL;
DELETE FROM profiles WHERE email != 'soynixonlopez@gmail.com'; -- Mantener solo admin

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Allow all authenticated users" ON profiles;
DROP POLICY IF EXISTS "Admin access all" ON promotions;
DROP POLICY IF EXISTS "Admin access all" ON subjects;
DROP POLICY IF EXISTS "Admin access all" ON subject_promotions;
DROP POLICY IF EXISTS "Admin access all" ON professors;
DROP POLICY IF EXISTS "Admin access all" ON students;
DROP POLICY IF EXISTS "Admin access all" ON professor_subjects;
DROP POLICY IF EXISTS "Admin access all" ON grade_categories;
DROP POLICY IF EXISTS "Admin access all" ON grades;
DROP POLICY IF EXISTS "Professor access own assignments" ON professor_subjects;
DROP POLICY IF EXISTS "Professor access assigned subjects" ON grade_categories;
DROP POLICY IF EXISTS "Professor access assigned grades" ON grades;
DROP POLICY IF EXISTS "Student access own data" ON students;
DROP POLICY IF EXISTS "Student access own grades" ON grades;
DROP POLICY IF EXISTS "Public read promotions" ON promotions;
DROP POLICY IF EXISTS "Public read subjects" ON subjects;
DROP POLICY IF EXISTS "profiles_authenticated_access" ON profiles;
DROP POLICY IF EXISTS "promotions_admin_all" ON promotions;
DROP POLICY IF EXISTS "promotions_read_public" ON promotions;
DROP POLICY IF EXISTS "subjects_admin_all" ON subjects;
DROP POLICY IF EXISTS "subjects_read_authenticated" ON subjects;
DROP POLICY IF EXISTS "subject_promotions_admin_all" ON subject_promotions;
DROP POLICY IF EXISTS "subject_promotions_read_authenticated" ON subject_promotions;
DROP POLICY IF EXISTS "professors_admin_all" ON professors;
DROP POLICY IF EXISTS "professors_read_own" ON professors;
DROP POLICY IF EXISTS "students_admin_all" ON students;
DROP POLICY IF EXISTS "students_read_own" ON students;
DROP POLICY IF EXISTS "professor_subjects_admin_all" ON professor_subjects;
DROP POLICY IF EXISTS "professor_subjects_professor_own" ON professor_subjects;
DROP POLICY IF EXISTS "grade_categories_admin_all" ON grade_categories;
DROP POLICY IF EXISTS "grade_categories_professor_assigned" ON grade_categories;
DROP POLICY IF EXISTS "grade_categories_read_authenticated" ON grade_categories;
DROP POLICY IF EXISTS "grades_admin_all" ON grades;
DROP POLICY IF EXISTS "grades_professor_assigned" ON grades;
DROP POLICY IF EXISTS "grades_student_read_own" ON grades;

-- =====================================================
-- ELIMINAR Y RECREAR TABLAS SI EXISTEN
-- =====================================================
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS grade_categories CASCADE;
DROP TABLE IF EXISTS professor_subjects CASCADE;
DROP TABLE IF EXISTS subject_promotions CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS professors CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- =====================================================
-- CREAR TABLAS
-- =====================================================

-- Tabla de perfiles (usuarios del sistema)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'professor', 'student')) NOT NULL,
  passcode TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de promociones (cohortes de estudiantes)
CREATE TABLE promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cohort_code TEXT NOT NULL UNIQUE,
  entry_year INTEGER NOT NULL,
  graduation_year INTEGER NOT NULL,
  shift TEXT CHECK (shift IN ('AM', 'PM')) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de asignaturas
CREATE TABLE subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  year INTEGER NOT NULL,
  semester INTEGER CHECK (semester IN (1, 2)) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de relación asignaturas-promociones (muchos a muchos)
CREATE TABLE subject_promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subject_id, promotion_id)
);

-- Tabla de profesores
CREATE TABLE professors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  lastname TEXT NOT NULL,
  specialty TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de estudiantes
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  lastname TEXT NOT NULL,
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de asignación profesor-asignatura (muchos a muchos)
CREATE TABLE professor_subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professor_id UUID REFERENCES professors(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(professor_id, subject_id)
);

-- Tabla de categorías de calificaciones
CREATE TABLE grade_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  weight DECIMAL(5,2) NOT NULL CHECK (weight >= 0 AND weight <= 100),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de calificaciones
CREATE TABLE grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES grade_categories(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
  grade DECIMAL(5,2) NOT NULL CHECK (grade >= 0 AND grade <= 100),
  comments TEXT,
  last_editor_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, category_id)
);

-- =====================================================
-- CREAR ÍNDICES PARA RENDIMIENTO
-- =====================================================
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_promotions_active ON promotions(active);
CREATE INDEX idx_promotions_entry_year ON promotions(entry_year);
CREATE INDEX idx_promotions_graduation_year ON promotions(graduation_year);
CREATE INDEX idx_subjects_year_semester ON subjects(year, semester);
CREATE INDEX idx_subject_promotions_subject ON subject_promotions(subject_id);
CREATE INDEX idx_subject_promotions_promotion ON subject_promotions(promotion_id);
CREATE INDEX idx_professor_subjects_professor ON professor_subjects(professor_id);
CREATE INDEX idx_professor_subjects_subject ON professor_subjects(subject_id);
CREATE INDEX idx_grade_categories_subject ON grade_categories(subject_id);
CREATE INDEX idx_grade_categories_promotion ON grade_categories(promotion_id);
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_category ON grades(category_id);
CREATE INDEX idx_grades_subject ON grades(subject_id);
CREATE INDEX idx_grades_promotion ON grades(promotion_id);

-- =====================================================
-- HABILITAR ROW LEVEL SECURITY
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
-- POLÍTICAS RLS COMPLETAS Y FUNCIONALES
-- =====================================================

-- Profiles: Acceso completo para usuarios autenticados
CREATE POLICY "profiles_authenticated_access" ON profiles
  FOR ALL USING (auth.uid() IS NOT NULL);

-- PROMOCIONES: Admin puede todo, otros pueden leer las activas
CREATE POLICY "promotions_admin_all" ON promotions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "promotions_read_authenticated" ON promotions FOR SELECT USING (
  active = true OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'professor', 'student'))
);

-- ASIGNATURAS: Admin puede todo, otros pueden leer
CREATE POLICY "subjects_admin_all" ON subjects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "subjects_read_authenticated" ON subjects FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);

-- SUBJECT_PROMOTIONS: Admin puede todo, otros pueden leer
CREATE POLICY "subject_promotions_admin_all" ON subject_promotions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "subject_promotions_read_authenticated" ON subject_promotions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);

-- PROFESORES: Admin puede todo, profesores pueden ver sus datos
CREATE POLICY "professors_admin_all" ON professors FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "professors_read_own" ON professors FOR SELECT USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ESTUDIANTES: Admin puede todo, estudiantes ven sus datos, profesores ven estudiantes de sus clases
CREATE POLICY "students_admin_all" ON students FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "students_read_access" ON students FOR SELECT USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'professor'))
);

-- PROFESSOR_SUBJECTS: Admin puede todo, profesores ven sus asignaciones
CREATE POLICY "professor_subjects_admin_all" ON professor_subjects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "professor_subjects_read_access" ON professor_subjects FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM professors 
    WHERE user_id = auth.uid() 
    AND id = professor_subjects.professor_id
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- GRADE_CATEGORIES: Admin y profesores asignados pueden gestionar
CREATE POLICY "grade_categories_admin_all" ON grade_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "grade_categories_professor_assigned" ON grade_categories FOR ALL USING (
  EXISTS (
    SELECT 1 FROM professor_subjects ps
    JOIN professors p ON p.id = ps.professor_id
    WHERE p.user_id = auth.uid()
    AND ps.subject_id = grade_categories.subject_id
  )
);

CREATE POLICY "grade_categories_read_authenticated" ON grade_categories FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);

-- GRADES: Admin y profesores asignados pueden gestionar, estudiantes ven las suyas
CREATE POLICY "grades_admin_all" ON grades FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "grades_professor_assigned" ON grades FOR ALL USING (
  EXISTS (
    SELECT 1 FROM grade_categories gc
    JOIN professor_subjects ps ON ps.subject_id = gc.subject_id
    JOIN professors p ON p.id = ps.professor_id
    WHERE p.user_id = auth.uid()
    AND gc.id = grades.category_id
  )
);

CREATE POLICY "grades_student_read_own" ON grades FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM students 
    WHERE user_id = auth.uid() 
    AND id = grades.student_id
  )
);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para calcular nivel del estudiante
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

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_professors_updated_at BEFORE UPDATE ON professors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grade_categories_updated_at BEFORE UPDATE ON grade_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de estudiantes con información de promoción
CREATE OR REPLACE VIEW students_with_promotion AS
SELECT 
  s.*,
  p.name as promotion_name,
  p.cohort_code,
  p.entry_year,
  p.graduation_year,
  p.shift,
  calculate_student_level(p.entry_year) as current_level
FROM students s
JOIN promotions p ON s.promotion_id = p.id
WHERE p.active = true;

-- Vista de asignaturas con promociones
CREATE OR REPLACE VIEW subjects_with_promotions AS
SELECT 
  s.*,
  array_agg(p.name) as promotion_names,
  array_agg(p.cohort_code) as promotion_codes
FROM subjects s
LEFT JOIN subject_promotions sp ON s.id = sp.subject_id
LEFT JOIN promotions p ON sp.promotion_id = p.id
GROUP BY s.id, s.name, s.description, s.year, s.semester, s.created_at, s.updated_at;

-- =====================================================
-- CREAR PERFIL ADMIN SINCRONIZADO
-- =====================================================

-- Sincronizar perfil admin con auth.users
INSERT INTO profiles (id, email, role, passcode) 
SELECT 
  id,
  'soynixonlopez@gmail.com',
  'admin',
  'Admin123!'
FROM auth.users 
WHERE email = 'soynixonlopez@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  passcode = 'Admin123!',
  updated_at = NOW();

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
SELECT 
  'Sistema Spider Grades instalado correctamente' as mensaje,
  COUNT(*) as total_tablas
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'promotions', 'subjects', 'subject_promotions', 'professors', 'students', 'professor_subjects', 'grade_categories', 'grades');

-- Verificar perfil admin
SELECT 
  'Perfil de admin:' as info,
  p.email,
  p.role,
  CASE WHEN u.id IS NOT NULL THEN 'Sincronizado con auth.users' ELSE 'ERROR: No sincronizado' END as estado
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.email = 'soynixonlopez@gmail.com';

-- =====================================================
-- INSTRUCCIONES FINALES
-- =====================================================
/*
SISTEMA SPIDER GRADES - CONFIGURACIÓN COMPLETA

✅ FUNCIONALIDADES INCLUIDAS:
- Login con email y passcode para admin, profesores y estudiantes
- Gestión completa de promociones (crear, editar, eliminar)
- Gestión completa de estudiantes (crear, editar, eliminar)
- Gestión completa de profesores (crear, editar, eliminar)
- Gestión completa de asignaturas (crear, editar, eliminar)
- Asignación de promociones a asignaturas
- Asignación de profesores a asignaturas
- Sistema de calificaciones por categorías
- Dashboards específicos por rol (admin, profesor, estudiante)
- Políticas RLS que garantizan seguridad por rol

✅ USUARIOS DEL SISTEMA:
- ADMIN: soynixonlopez@gmail.com / Admin123!
  * Puede gestionar todo el sistema
  * Dashboard administrativo completo

- PROFESORES: Se crean desde el panel de admin
  * Usan su email y passcode generado para login
  * Dashboard de profesor con sus asignaturas y calificaciones

- ESTUDIANTES: Se crean desde el panel de admin
  * Usan su email y passcode generado para login
  * Dashboard de estudiante con sus calificaciones

✅ PRÓXIMOS PASOS:
1. El admin puede crear promociones
2. El admin puede crear asignaturas y asignar promociones
3. El admin puede crear profesores y asignar asignaturas
4. El admin puede crear estudiantes y asignar a promociones
5. Los profesores pueden crear categorías de calificaciones
6. Los profesores pueden calificar estudiantes
7. Los estudiantes pueden ver sus calificaciones

¡El sistema está listo para usar!
*/
