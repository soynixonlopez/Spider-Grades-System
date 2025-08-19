# Spider Grades System

Un sistema de calificaciones escalable construido con React, TypeScript, TailwindCSS y Supabase.

## 🚀 Características

### 🔐 Autenticación y Roles
- **Admin**: Acceso total al sistema
- **Profesor**: Gestión de calificaciones y categorías
- **Estudiante**: Visualización de calificaciones y progreso

### 👨‍💼 Dashboard de Administrador
- **Gestión de Promociones**: CRUD de cohortes/años (Freshman/Junior/Senior, AM/PM)
- **Gestión de Asignaturas**: CRUD de materias académicas
- **Gestión de Profesores**: CRUD de docentes con especialidades
- **Gestión de Estudiantes**: Matrícula individual y masiva por CSV
- **Asignaciones**: Asignar profesores a asignaturas por promoción
- **Acciones de Promoción**: Promoción automática anual de estudiantes

### 👨‍🏫 Dashboard de Profesor
- **Selección de Asignatura/Promoción**: Elegir materia y cohorte
- **Categorías de Calificación**: Crear categorías con ponderaciones (100% total)
- **Registro de Calificaciones**: Ingreso de notas por estudiante y categoría
- **Vista de Promedios**: Cálculo automático de notas finales
- **Soporte Realtime**: Actualizaciones en tiempo real

### 👨‍🎓 Dashboard de Estudiante
- **Visualización de Calificaciones**: Ver notas por categoría
- **Promedio Final**: Cálculo automático de nota final
- **Historial Académico**: Seguimiento por promoción/asignatura
- **Progreso**: Seguimiento del avance académico

## 🛠️ Tecnologías

- **Frontend**: React 18, TypeScript, TailwindCSS
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **UI Components**: Lucide React Icons, React Hook Form, Zod
- **Notificaciones**: React Hot Toast
- **CSV Processing**: PapaParse

## 📋 Requisitos Previos

- Node.js 16+ 
- npm o yarn
- Cuenta de Supabase

## 🚀 Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd spider-grades-system
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
Crear un archivo `.env` en la raíz del proyecto:
```env
REACT_APP_SUPABASE_URL=tu_url_de_supabase
REACT_APP_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

4. **Configurar la base de datos**
Ejecutar el siguiente SQL en tu proyecto de Supabase:

```sql
-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

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

-- Create indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_promotions_active ON promotions(active);
CREATE INDEX idx_professor_subjects_professor ON professor_subjects(professor_id);
CREATE INDEX idx_professor_subjects_subject ON professor_subjects(subject_id);
CREATE INDEX idx_professor_subjects_promotion ON professor_subjects(promotion_id);
CREATE INDEX idx_grade_categories_subject ON grade_categories(subject_id);
CREATE INDEX idx_grade_categories_promotion ON grade_categories(promotion_id);
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_category ON grades(category_id);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE professor_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin can access everything
CREATE POLICY "Admin access all" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

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
```

5. **Ejecutar la aplicación**
```bash
npm start
```

La aplicación estará disponible en `http://localhost:3000`

## 🔑 Acceso Inicial

### Código de Administrador
- **Código**: `SPIDER2025ADMIN`
- **Uso**: En la pantalla de login, hacer clic en "Entrar como Admin"

### Crear Usuario Administrador
1. Usar el código maestro para acceder al modo admin
2. Crear un usuario con email y contraseña
3. El sistema automáticamente asignará el rol de admin

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── admin/           # Componentes del dashboard de admin
│   ├── professor/       # Componentes del dashboard de profesor
│   ├── student/         # Componentes del dashboard de estudiante
│   ├── ui/              # Componentes UI reutilizables
│   └── Sidebar.tsx      # Componente de navegación
├── contexts/
│   └── AuthContext.tsx  # Contexto de autenticación
├── lib/
│   ├── supabase.ts      # Configuración de Supabase
│   └── utils.ts         # Utilidades generales
├── pages/
│   ├── Login.tsx        # Página de login
│   ├── AdminDashboard.tsx
│   ├── ProfessorDashboard.tsx
│   └── StudentDashboard.tsx
└── App.tsx              # Componente principal
```

## 🎨 Características de UI/UX

- **Diseño Responsivo**: Optimizado para desktop y móvil
- **Modo Oscuro/Claro**: Soporte completo para ambos temas
- **Navegación Intuitiva**: Sidebar con navegación clara
- **Estados de Carga**: Indicadores de carga en todas las operaciones
- **Notificaciones**: Toast notifications para feedback
- **Validación de Formularios**: Validación en tiempo real con Zod
- **Accesibilidad**: Componentes accesibles con ARIA labels

## 🔒 Seguridad

- **Row Level Security (RLS)**: Políticas de acceso granular
- **Autenticación**: Supabase Auth con roles
- **Validación**: Validación de datos en frontend y backend
- **Sanitización**: Limpieza de datos de entrada

## 🚀 Despliegue

### Vercel (Recomendado)
1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Desplegar automáticamente

### Netlify
1. Conectar repositorio a Netlify
2. Configurar variables de entorno
3. Build command: `npm run build`
4. Publish directory: `build`

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico o preguntas:
- Crear un issue en GitHub
- Contactar al equipo de desarrollo

## 🔄 Roadmap

- [ ] Implementación completa de realtime updates
- [ ] Exportación de reportes en PDF
- [ ] Notificaciones por email
- [ ] API REST para integraciones externas
- [ ] App móvil nativa
- [ ] Analytics y reportes avanzados
- [ ] Integración con sistemas externos
- [ ] Backup automático de datos
- [ ] Auditoría de cambios
- [ ] Multi-idioma
