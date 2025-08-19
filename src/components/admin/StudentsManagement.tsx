import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { Tables } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Plus, Edit, Trash2, Search, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

const studentSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  lastname: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido'),
  promotion_id: z.string().min(1, 'La promoción es requerida'),
});

const bulkStudentSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  lastname: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido'),
  level: z.string().min(1, 'El nivel es requerido'),
  shift: z.string().min(1, 'El turno es requerido'),
  year: z.string().min(1, 'El año es requerido'),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface CSVStudent {
  email: string;
  nombre: string;
  apellido: string;
  nivel: string;
  turno: string;
  año: string;
}

export function StudentsManagement() {
  const [students, setStudents] = useState<Tables<'students'>[]>([]);
  const [promotions, setPromotions] = useState<Tables<'promotions'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Tables<'students'> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [csvData, setCsvData] = useState<CSVStudent[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk' | 'csv'>('individual');

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsResult, promotionsResult] = await Promise.all([
        supabase
          .from('students')
          .select(`
            *,
            promotions (
              year,
              level,
              shift
            )
          `)
          .order('lastname')
          .order('name'),
        supabase
          .from('promotions')
          .select('*')
          .eq('active', true)
          .order('year', { ascending: false })
          .order('level')
          .order('shift'),
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (promotionsResult.error) throw promotionsResult.error;

      setStudents(studentsResult.data || []);
      setPromotions(promotionsResult.data || []);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: StudentFormData) => {
    try {
      // First create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: 'temporary123', // This should be changed by the user
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: data.email,
            role: 'student',
          });

        if (profileError) throw profileError;

        // Create student record
        const { error: studentError } = await supabase
          .from('students')
          .insert({
            user_id: authData.user.id,
            name: data.name,
            lastname: data.lastname,
            promotion_id: data.promotion_id,
          });

        if (studentError) throw studentError;

        toast.success('Estudiante creado exitosamente');
        setShowModal(false);
        setEditingStudent(null);
        form.reset();
        fetchData();
      }
    } catch (error) {
      toast.error('Error al crear estudiante');
      console.error('Error creating student:', error);
    }
  };

  const handleEdit = (student: Tables<'students'>) => {
    setEditingStudent(student);
    form.reset({
      name: student.name,
      lastname: student.lastname,
      email: '', // We'll need to get this from profiles table
      promotion_id: student.promotion_id,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este estudiante?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Estudiante eliminado exitosamente');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar estudiante');
      console.error('Error deleting student:', error);
    }
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const data = results.data as CSVStudent[];
        setCsvData(data);
        setCsvErrors([]);
      },
      error: (error) => {
        toast.error('Error al procesar el archivo CSV');
        console.error('CSV parsing error:', error);
      },
    });
  };

  const handleCSVImport = async () => {
    if (csvData.length === 0) {
      toast.error('No hay datos para importar');
      return;
    }

    const errors: string[] = [];
    let successCount = 0;

    for (const student of csvData) {
      try {
        // Find promotion based on level, shift, and year
        const promotion = promotions.find(
          p => p.level === student.nivel && 
               p.shift === student.turno && 
               p.year.toString() === student.año
        );

        if (!promotion) {
          errors.push(`Promoción no encontrada para ${student.nombre} ${student.apellido}`);
          continue;
        }

        // Create user account
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: student.email,
          password: 'temporary123',
        });

        if (authError) {
          errors.push(`Error al crear cuenta para ${student.email}: ${authError.message}`);
          continue;
        }

        if (authData.user) {
          // Create profile
          await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: student.email,
              role: 'student',
            });

          // Create student record
          await supabase
            .from('students')
            .insert({
              user_id: authData.user.id,
              name: student.nombre,
              lastname: student.apellido,
              promotion_id: promotion.id,
            });

          successCount++;
        }
      } catch (error) {
        errors.push(`Error al procesar ${student.email}: ${error}`);
      }
    }

    setCsvErrors(errors);
    
    if (successCount > 0) {
      toast.success(`${successCount} estudiantes importados exitosamente`);
      setShowCSVModal(false);
      setCsvData([]);
      fetchData();
    }

    if (errors.length > 0) {
      toast.error(`${errors.length} errores durante la importación`);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStudent(null);
    form.reset();
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gestión de Estudiantes
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Administra la matrícula de estudiantes
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCSVModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar CSV
              </Button>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Estudiante
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar estudiantes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Plus className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'No se encontraron estudiantes' : 'No hay estudiantes'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza creando el primer estudiante'}
              </p>
              {!searchTerm && (
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => setShowCSVModal(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar CSV
                  </Button>
                  <Button onClick={() => setShowModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Estudiante
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Nombre
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Apellido
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Promoción
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                        {student.name}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                        {student.lastname}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                                {student.promotion_id || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(student)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(student.id)}
                            className="text-red-600 hover:text-red-700"
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
          )}
        </div>
      </div>

      {/* Individual Student Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingStudent ? 'Editar Estudiante' : 'Nuevo Estudiante'}
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre
            </label>
            <Input
              id="name"
              {...form.register('name')}
              className={form.formState.errors.name ? 'border-red-500' : ''}
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="lastname" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Apellido
            </label>
            <Input
              id="lastname"
              {...form.register('lastname')}
              className={form.formState.errors.lastname ? 'border-red-500' : ''}
            />
            {form.formState.errors.lastname && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.lastname.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              className={form.formState.errors.email ? 'border-red-500' : ''}
              disabled={!!editingStudent}
            />
            {form.formState.errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.email.message}
              </p>
            )}
            {editingStudent && (
              <p className="mt-1 text-sm text-gray-500">
                El email no se puede editar
              </p>
            )}
          </div>

          <div>
            <label htmlFor="promotion_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Promoción
            </label>
            <select
              id="promotion_id"
              {...form.register('promotion_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="">Seleccionar promoción</option>
              {promotions.map((promotion) => (
                <option key={promotion.id} value={promotion.id}>
                  {promotion.year} - {promotion.level} {promotion.shift}
                </option>
              ))}
            </select>
            {form.formState.errors.promotion_id && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.promotion_id.message}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleCloseModal}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              {editingStudent ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={showCSVModal}
        onClose={() => setShowCSVModal(false)}
        title="Importar Estudiantes desde CSV"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Archivo CSV
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
            <p className="mt-1 text-sm text-gray-500">
              El archivo debe contener las columnas: email, nombre, apellido, nivel, turno, año
            </p>
          </div>

          {csvData.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Vista previa ({csvData.length} estudiantes)
              </h4>
              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Nombre</th>
                      <th className="px-3 py-2 text-left">Apellido</th>
                      <th className="px-3 py-2 text-left">Nivel</th>
                      <th className="px-3 py-2 text-left">Turno</th>
                      <th className="px-3 py-2 text-left">Año</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 5).map((student, index) => (
                      <tr key={index} className="border-t border-gray-100 dark:border-gray-600">
                        <td className="px-3 py-2">{student.email}</td>
                        <td className="px-3 py-2">{student.nombre}</td>
                        <td className="px-3 py-2">{student.apellido}</td>
                        <td className="px-3 py-2">{student.nivel}</td>
                        <td className="px-3 py-2">{student.turno}</td>
                        <td className="px-3 py-2">{student.año}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {csvErrors.length > 0 && (
            <div>
              <h4 className="font-medium text-red-600 mb-2">Errores encontrados:</h4>
              <div className="max-h-32 overflow-y-auto border border-red-200 rounded-lg p-2 bg-red-50 dark:bg-red-900/20">
                {csvErrors.map((error, index) => (
                  <p key={index} className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setShowCSVModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleCSVImport}
              disabled={csvData.length === 0}
            >
              Importar {csvData.length > 0 ? `(${csvData.length} estudiantes)` : ''}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
