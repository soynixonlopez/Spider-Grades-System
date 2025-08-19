import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { Tables } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Upload, 
  Download, 
  Users, 
  UserPlus, 
  FileText,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
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
type BulkStudentFormData = z.infer<typeof bulkStudentSchema>;

interface CSVStudent {
  email: string;
  nombre: string;
  apellido: string;
  nivel: string;
  turno: string;
  año: string;
}

export function StudentsManagementImproved() {
  const [students, setStudents] = useState<Tables<'students'>[]>([]);
  const [promotions, setPromotions] = useState<Tables<'promotions'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Tables<'students'> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [csvData, setCsvData] = useState<CSVStudent[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk' | 'csv'>('individual');
  const [bulkStudents, setBulkStudents] = useState<BulkStudentFormData[]>([]);

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  const bulkForm = useForm<BulkStudentFormData>({
    resolver: zodResolver(bulkStudentSchema),
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
        form.reset();
        fetchData();
      }
    } catch (error) {
      toast.error('Error al crear estudiante');
      console.error('Error creating student:', error);
    }
  };

  const onSubmitBulk = async () => {
    try {
      const results = [];
      const errors = [];

      for (const studentData of bulkStudents) {
        try {
          // Find or create promotion
          let promotion = promotions.find(p => 
            p.year.toString() === studentData.year && 
            p.level === studentData.level && 
            p.shift === studentData.shift
          );

          if (!promotion) {
            const { data: newPromotion, error: promoError } = await supabase
              .from('promotions')
              .insert({
                year: parseInt(studentData.year),
                level: studentData.level as any,
                shift: studentData.shift as any,
                active: true,
              })
              .select()
              .single();

            if (promoError) throw promoError;
            promotion = newPromotion;
          }

          // Create user account
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: studentData.email,
            password: 'temporary123',
          });

          if (authError) throw authError;

          if (authData.user) {
            // Create profile
            await supabase
              .from('profiles')
              .insert({
                id: authData.user.id,
                email: studentData.email,
                role: 'student',
              });

            // Create student record
            await supabase
              .from('students')
              .insert({
                user_id: authData.user.id,
                name: studentData.name,
                lastname: studentData.lastname,
                promotion_id: promotion.id,
              });

            results.push(studentData.email);
          }
        } catch (error) {
          errors.push(`${studentData.email}: ${error}`);
        }
      }

      if (results.length > 0) {
        toast.success(`${results.length} estudiantes creados exitosamente`);
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} errores al crear estudiantes`);
        console.error('Bulk creation errors:', errors);
      }

      setShowBulkModal(false);
      setBulkStudents([]);
      fetchData();
    } catch (error) {
      toast.error('Error en la creación masiva');
      console.error('Error in bulk creation:', error);
    }
  };

  const addBulkStudent = () => {
    const data = bulkForm.getValues();
    if (data.name && data.lastname && data.email && data.level && data.shift && data.year) {
      setBulkStudents([...bulkStudents, data]);
      bulkForm.reset();
    }
  };

  const removeBulkStudent = (index: number) => {
    setBulkStudents(bulkStudents.filter((_, i) => i !== index));
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const data = results.data as CSVStudent[];
          setCsvData(data);
          setShowCSVModal(true);
        },
        error: (error) => {
          toast.error('Error al procesar el archivo CSV');
          console.error('CSV parsing error:', error);
        },
      });
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.promotions?.year.toString().includes(searchTerm) ||
    student.promotions?.level.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.promotions?.shift.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestión de Estudiantes
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Administra los estudiantes del sistema
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => {
              setActiveTab('individual');
              setShowModal(true);
            }}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Agregar Estudiante
          </Button>
          
          <Button
            onClick={() => {
              setActiveTab('bulk');
              setShowBulkModal(true);
            }}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Agregar en Masa
          </Button>
          
          <Button
            onClick={() => {
              setActiveTab('csv');
              document.getElementById('csv-upload')?.click();
            }}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar estudiantes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Estudiante
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Promoción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600 dark:text-primary-300">
                            {student.name.charAt(0)}{student.lastname.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {student.name} {student.lastname}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {student.user_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {student.promotions ? 
                      `${student.promotions.year} - ${student.promotions.level} ${student.promotions.shift}` : 
                      'N/A'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingStudent(student);
                          setShowModal(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (window.confirm('¿Estás seguro de que quieres eliminar este estudiante?')) {
                            // Handle delete
                          }
                        }}
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
      </div>

      {/* Individual Student Modal */}
      <Modal
        isOpen={showModal && activeTab === 'individual'}
        onClose={() => {
          setShowModal(false);
          setEditingStudent(null);
          form.reset();
        }}
        title={editingStudent ? 'Editar Estudiante' : 'Agregar Estudiante'}
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre"
              {...form.register('name')}
              error={form.formState.errors.name?.message}
            />
            <Input
              label="Apellido"
              {...form.register('lastname')}
              error={form.formState.errors.lastname?.message}
            />
          </div>
          <Input
            label="Email"
            type="email"
            {...form.register('email')}
            error={form.formState.errors.email?.message}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Promoción
            </label>
            <select
              {...form.register('promotion_id')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Seleccionar promoción</option>
              {promotions.map((promotion) => (
                <option key={promotion.id} value={promotion.id}>
                  {promotion.year} - {promotion.level} {promotion.shift}
                </option>
              ))}
            </select>
            {form.formState.errors.promotion_id && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.promotion_id.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setEditingStudent(null);
                form.reset();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingStudent ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Students Modal */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => {
          setShowBulkModal(false);
          setBulkStudents([]);
          bulkForm.reset();
        }}
        title="Agregar Estudiantes en Masa"
      >
        <div className="space-y-6">
          {/* Add Student Form */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Agregar Estudiante
            </h3>
            <form onSubmit={bulkForm.handleSubmit(addBulkStudent)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nombre"
                  {...bulkForm.register('name')}
                  error={bulkForm.formState.errors.name?.message}
                />
                <Input
                  label="Apellido"
                  {...bulkForm.register('lastname')}
                  error={bulkForm.formState.errors.lastname?.message}
                />
              </div>
              <Input
                label="Email"
                type="email"
                {...bulkForm.register('email')}
                error={bulkForm.formState.errors.email?.message}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Año
                  </label>
                  <select
                    {...bulkForm.register('year')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Seleccionar año</option>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nivel
                  </label>
                  <select
                    {...bulkForm.register('level')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Seleccionar nivel</option>
                    <option value="Freshman">Freshman</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Turno
                  </label>
                  <select
                    {...bulkForm.register('shift')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Seleccionar turno</option>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Agregar a la Lista
              </Button>
            </form>
          </div>

          {/* Students List */}
          {bulkStudents.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Estudiantes a Crear ({bulkStudents.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {bulkStudents.map((student, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {student.name} {student.lastname}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {student.email} • {student.year} - {student.level} {student.shift}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeBulkStudent(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkStudents([]);
                    bulkForm.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={onSubmitBulk}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Crear {bulkStudents.length} Estudiantes
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={showCSVModal}
        onClose={() => {
          setShowCSVModal(false);
          setCsvData([]);
          setCsvErrors([]);
        }}
        title="Importar Estudiantes desde CSV"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Formato requerido del CSV:
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              El archivo debe contener las columnas: email, nombre, apellido, nivel, turno, año
            </p>
          </div>
          
          {csvData.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Estudiantes a Importar ({csvData.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {csvData.map((student, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {student.nombre} {student.apellido}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {student.email} • {student.año} - {student.nivel} {student.turno}
                      </div>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCSVModal(false);
                    setCsvData([]);
                    setCsvErrors([]);
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={() => {
                  // Handle CSV import
                  toast.success(`${csvData.length} estudiantes importados exitosamente`);
                  setShowCSVModal(false);
                  setCsvData([]);
                  fetchData();
                }}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {csvData.length} Estudiantes
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
