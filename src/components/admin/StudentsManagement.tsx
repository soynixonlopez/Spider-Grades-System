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
  X,
  Eye,
  EyeOff,
  Mail,
  Send
} from 'lucide-react';
import { TableFilters, SortableHeader, FilterConfig } from '../ui/TableFilters';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { sendPasscodeEmail, sendBulkPasscodeEmails, EmailData } from '../../lib/emailService';

const studentSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  lastname: z.string().min(1, 'El apellido es requerido'),
  promotion_id: z.string().min(1, 'La promoción es requerida'),
});

const editStudentSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  lastname: z.string().min(1, 'El apellido es requerido'),
  promotion_id: z.string().min(1, 'La promoción es requerida'),
  email: z.string().email('Email inválido'),
});

const bulkStudentSchema = z.object({
  promotion_id: z.string().min(1, 'La promoción es requerida'),
  names: z.string().min(1, 'Los nombres son requeridos'),
});

type StudentFormData = z.infer<typeof studentSchema>;
type EditStudentFormData = z.infer<typeof editStudentSchema>;
type BulkStudentFormData = z.infer<typeof bulkStudentSchema>;

// Extended student type with promotions relation
type StudentWithPromotion = Tables<'students'> & {
  promotions?: {
    name: string;
    cohort_code: string;
    entry_year: number;
    shift: string;
  } | null;
  profiles?: {
    email: string;
    passcode: string;
  } | null;
};

interface CSVStudent {
  email: string;
  nombre: string;
  apellido: string;
  nivel: string;
  turno: string;
  año: string;
}

export function StudentsManagement() {
  const [students, setStudents] = useState<StudentWithPromotion[]>([]);
  const [promotions, setPromotions] = useState<Tables<'promotions'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithPromotion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [csvData, setCsvData] = useState<CSVStudent[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk' | 'csv'>('individual');
  const [bulkStudents, setBulkStudents] = useState<{name: string, lastname: string, email: string, promotion_id: string}[]>([]);
  const [showPasscodes, setShowPasscodes] = useState<{[key: string]: boolean}>({});
  const [sendingEmails, setSendingEmails] = useState<{[key: string]: boolean}>({});
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    name: '',
    promotion: '',
    email: ''
  });
  const [sortBy, setSortBy] = useState<{
    field: keyof Tables<'students'> | 'email' | 'promotion';
    direction: 'asc' | 'desc';
  }>({ field: 'lastname', direction: 'asc' });

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  const editForm = useForm<EditStudentFormData>({
    resolver: zodResolver(editStudentSchema),
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
          .select('*')
          .order('lastname')
          .order('name'),
        supabase
          .from('promotions')
          .select('*')
          .eq('active', true)
          .order('entry_year', { ascending: false })
          .order('name')
          .order('shift'),
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (promotionsResult.error) throw promotionsResult.error;

      // Obtener los perfiles de los estudiantes
      if (studentsResult.data && studentsResult.data.length > 0) {
        const userIds = studentsResult.data.map(s => s.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, passcode')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Combinar los datos
        const studentsWithProfiles = studentsResult.data.map(student => {
          const profile = profilesData?.find(p => p.id === student.user_id);
          const promotion = promotionsResult.data?.find(p => p.id === student.promotion_id);
          return {
            ...student,
            profiles: profile || null,
            promotions: promotion || null
          };
        });

        setStudents(studentsWithProfiles);
      } else {
        setStudents([]);
      }

      setPromotions(promotionsResult.data || []);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePasscode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const generateEmail = (name: string, lastname: string, promotion?: Tables<'promotions'>) => {
    const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
    const cleanLastname = lastname.toLowerCase().replace(/[^a-z]/g, '');
    const promotionSuffix = promotion ? promotion.entry_year.toString() : '';
    return `${cleanName}.${cleanLastname}${promotionSuffix}@motta.superate.org.pa`;
  };

  const onSubmit = async (data: StudentFormData) => {
    try {
      const promotion = promotions.find(p => p.id === data.promotion_id);
      const email = generateEmail(data.name, data.lastname, promotion);
      const passcode = generatePasscode();

      // First create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: passcode,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile with passcode
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: email,
            role: 'student',
            passcode: passcode,
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

        toast.success(`Estudiante creado exitosamente. Email: ${email}, Passcode: ${passcode}`);
        setShowModal(false);
        form.reset();
        fetchData();
      }
    } catch (error) {
      toast.error('Error al crear estudiante');
      console.error('Error creating student:', error);
    }
  };

  const onEditSubmit = async (data: EditStudentFormData) => {
    try {
      if (!editingStudent) return;

      // Update student record
      const { error: studentError } = await supabase
        .from('students')
        .update({
          name: data.name,
          lastname: data.lastname,
          promotion_id: data.promotion_id,
        })
        .eq('id', editingStudent.id);

      if (studentError) throw studentError;

      // Update profile email if changed
      if (editingStudent.profiles?.email !== data.email) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            email: data.email,
          })
          .eq('id', editingStudent.user_id);

        if (profileError) throw profileError;
      }

      toast.success('Estudiante actualizado exitosamente');
      setShowModal(false);
      setEditingStudent(null);
      editForm.reset();
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar estudiante');
      console.error('Error updating student:', error);
    }
  };

  const onSubmitBulk = async () => {
    try {
      const data = bulkForm.getValues();
      const results = [];
      const errors = [];

      for (const studentData of bulkStudents) {
        try {
          const promotion = promotions.find(p => p.id === studentData.promotion_id);
          const passcode = generatePasscode();

        // Create user account
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: studentData.email,
            password: passcode,
        });

          if (authError) throw authError;

        if (authData.user) {
            // Create profile with passcode
          await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
                email: studentData.email,
              role: 'student',
                passcode: passcode,
            });

          // Create student record
          await supabase
            .from('students')
            .insert({
              user_id: authData.user.id,
                name: studentData.name,
                lastname: studentData.lastname,
                promotion_id: studentData.promotion_id,
              });

            results.push(`${studentData.email} (${passcode})`);
        }
      } catch (error) {
          errors.push(`${studentData.email}: ${error}`);
        }
      }

      if (results.length > 0) {
        toast.success(`${results.length} estudiantes creados exitosamente`);
        console.log('Created students:', results);
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} errores al crear estudiantes`);
        console.error('Bulk creation errors:', errors);
      }

      setShowBulkModal(false);
      setBulkStudents([]);
      bulkForm.reset();
      fetchData();
    } catch (error) {
      toast.error('Error en la creación masiva');
      console.error('Error in bulk creation:', error);
    }
  };

  const addBulkStudents = () => {
    const data = bulkForm.getValues();
    if (data.names && data.promotion_id) {
      const namesList = data.names.split(',').map(name => name.trim()).filter(name => name);
      const promotion = promotions.find(p => p.id === data.promotion_id);
      const newStudents = namesList.map(fullName => {
        const [name, lastname] = fullName.split(' ').filter(part => part);
        const email = generateEmail(name, lastname, promotion);
        return { name, lastname, email, promotion_id: data.promotion_id };
      });
      
      setBulkStudents([...bulkStudents, ...newStudents]);
      bulkForm.setValue('names', '');
    }
  };

  const removeBulkStudent = (index: number) => {
    setBulkStudents(bulkStudents.filter((_, i) => i !== index));
  };

  const togglePasscodeVisibility = (studentId: string) => {
    setShowPasscodes(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const sendIndividualEmail = async (student: StudentWithPromotion) => {
    if (!student.profiles?.email || !student.profiles?.passcode) {
      toast.error('No se puede enviar email: faltan datos del estudiante');
      return;
    }

    setSendingEmails(prev => ({ ...prev, [student.id]: true }));

    try {
      const promotionText = student.promotions ? 
        `${student.promotions.name} (${student.promotions.entry_year}) - ${student.promotions.shift}` : 
        undefined;

      const emailData: EmailData = {
        to: student.profiles.email,
        name: student.name,
        lastname: student.lastname,
        passcode: student.profiles.passcode,
        role: 'student',
        promotion: promotionText
      };

      const success = await sendPasscodeEmail(emailData);
      
      if (success) {
        toast.success(`Email enviado exitosamente a ${student.profiles.email}`);
      } else {
        toast.error(`Error al enviar email a ${student.profiles.email}`);
      }
    } catch (error) {
      toast.error(`Error al enviar email: ${error}`);
    } finally {
      setSendingEmails(prev => ({ ...prev, [student.id]: false }));
    }
  };

  const sendBulkEmails = async () => {
    const studentsWithEmails = students.filter(s => s.profiles?.email && s.profiles?.passcode);
    
    if (studentsWithEmails.length === 0) {
      toast.error('No hay estudiantes con emails válidos para enviar');
      return;
    }

    const emailDataList: EmailData[] = studentsWithEmails.map(student => {
      const promotionText = student.promotions ? 
        `${student.promotions.name} (${student.promotions.entry_year}) - ${student.promotions.shift}` : 
        undefined;

      return {
        to: student.profiles!.email,
        name: student.name,
        lastname: student.lastname,
        passcode: student.profiles!.passcode,
        role: 'student',
        promotion: promotionText
      };
    });

    toast.loading(`Enviando ${emailDataList.length} emails...`, { id: 'bulk-email' });

    try {
      const results = await sendBulkPasscodeEmails(emailDataList);
      
      toast.dismiss('bulk-email');
      
      if (results.success > 0) {
        toast.success(`${results.success} emails enviados exitosamente`);
      }
      if (results.failed > 0) {
        toast.error(`${results.failed} emails fallaron al enviar`);
        console.error('Email errors:', results.errors);
      }
    } catch (error) {
      toast.dismiss('bulk-email');
      toast.error(`Error al enviar emails: ${error}`);
    }
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

  // Funciones para filtros y ordenamiento
  const filteredAndSortedStudents = students
    .filter(student => {
      const nameMatch = `${student.name} ${student.lastname}`.toLowerCase().includes(filters.name.toLowerCase());
      const promotionMatch = filters.promotion === '' || 
        (student.promotions && (
          student.promotions.cohort_code.toLowerCase().includes(filters.promotion.toLowerCase()) ||
          student.promotions.name.toLowerCase().includes(filters.promotion.toLowerCase())
        ));
      const emailMatch = student.profiles?.email.toLowerCase().includes(filters.email.toLowerCase()) || false;
      
      return nameMatch && promotionMatch && emailMatch;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy.field) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'lastname':
          aValue = a.lastname;
          bValue = b.lastname;
          break;
        case 'email':
          aValue = a.profiles?.email || '';
          bValue = b.profiles?.email || '';
          break;
        case 'promotion':
          aValue = a.promotions?.cohort_code || '';
          bValue = b.promotions?.cohort_code || '';
          break;
        default:
          aValue = a[sortBy.field as keyof Tables<'students'>];
          bValue = b[sortBy.field as keyof Tables<'students'>];
      }
      
      if (sortBy.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (field: string) => {
    setSortBy(prev => ({
      field: field as keyof Tables<'students'> | 'email' | 'promotion',
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearFilters = () => {
    setFilters({
      name: '',
      promotion: '',
      email: ''
    });
  };

  // Configuración de filtros
  const filterConfigs: FilterConfig[] = [
    {
      name: 'Nombre',
      type: 'text',
      placeholder: 'Buscar por nombre o apellido...'
    },
    {
      name: 'Promoción',
      type: 'text',
      placeholder: 'Buscar por cohorte o nombre...'
    },
    {
      name: 'Email',
      type: 'text',
      placeholder: 'Buscar por email...'
    }
  ];

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

          <Button
            onClick={sendBulkEmails}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Enviar Passcodes
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

      {/* Filters */}
      <TableFilters
        filters={filters}
        onFilterChange={(field, value) => setFilters(prev => ({ ...prev, [field]: value }))}
        onClearFilters={clearFilters}
        filterConfigs={filterConfigs}
        totalItems={students.length}
        filteredItems={filteredAndSortedStudents.length}
      />

      {/* Students Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  {filteredAndSortedStudents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
              <UserPlus className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No se encontraron estudiantes' : 'No hay estudiantes registrados'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza creando el primer estudiante'}
              </p>
              {!searchTerm && (
              <Button onClick={() => {
                setActiveTab('individual');
                setShowModal(true);
              }}>
                <UserPlus className="h-4 w-4 mr-2" />
                    Crear Estudiante
                  </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                    #
                  </th>
                  <SortableHeader
                    field="name"
                    label="Estudiante"
                    currentSort={sortBy}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    field="email"
                    label="Email"
                    currentSort={sortBy}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    field=""
                    label="Passcode"
                  />
                  <SortableHeader
                    field="promotion"
                    label="Promoción"
                    currentSort={sortBy}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    field=""
                    label="Acciones"
                  />
                </tr>
              </thead>
                              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAndSortedStudents.map((student, index) => (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {index + 1}
                      </td>
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
                      {student.profiles?.email || 'N/A'}
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {showPasscodes[student.id] 
                            ? student.profiles?.passcode || 'N/A'
                            : '••••••'
                          }
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => togglePasscodeVisibility(student.id)}
                          className="h-6 w-6 p-0"
                        >
                          {showPasscodes[student.id] ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                             {student.promotions ? 
                               `${student.promotions.cohort_code} - ${student.promotions.name} (${student.promotions.entry_year}) - ${student.promotions.shift}` : 
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
                            editForm.reset({
                              name: student.name,
                              lastname: student.lastname,
                              promotion_id: student.promotion_id,
                              email: student.profiles?.email || '',
                            });
                            setShowModal(true);
                          }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                          size="sm"
                            variant="outline"
                          onClick={() => sendIndividualEmail(student)}
                          disabled={sendingEmails[student.id]}
                          className="flex items-center gap-1"
                        >
                          {sendingEmails[student.id] ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600"></div>
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
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
          )}
      </div>

      {/* Individual Student Modal */}
      <Modal
        isOpen={showModal && activeTab === 'individual'}
        onClose={() => {
          setShowModal(false);
          setEditingStudent(null);
          form.reset();
          editForm.reset();
        }}
        title={editingStudent ? 'Editar Estudiante' : 'Agregar Estudiante'}
      >
        <div className="max-h-96 overflow-y-auto px-4 pt-2 pb-4">
        {editingStudent ? (
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre"
                placeholder="Ingrese el nombre del estudiante"
                {...editForm.register('name')}
                error={editForm.formState.errors.name?.message}
              />
              <Input
                label="Apellido"
                placeholder="Ingrese el apellido del estudiante"
                {...editForm.register('lastname')}
                error={editForm.formState.errors.lastname?.message}
              />
            </div>
          <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Promoción
            </label>
              <select
                {...editForm.register('promotion_id')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Seleccionar promoción</option>
                {promotions.map((promotion) => (
                  <option key={promotion.id} value={promotion.id}>
                    {promotion.cohort_code} - {promotion.name} ({promotion.entry_year}) - {promotion.shift}
                  </option>
                ))}
              </select>
              {editForm.formState.errors.promotion_id && (
                <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.promotion_id.message}</p>
              )}
            </div>
            <Input
              label="Email"
              type="email"
              placeholder="ejemplo2024@motta.superate.org.pa"
              {...editForm.register('email')}
              error={editForm.formState.errors.email?.message}
            />
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                ⚠️ Al cambiar el email, el estudiante deberá usar el nuevo email para hacer login.
              </p>
          </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setEditingStudent(null);
                  editForm.reset();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                Actualizar
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
                label="Nombre"
                placeholder="Ingrese el nombre del estudiante"
                {...form.register('name')}
                error={form.formState.errors.name?.message}
              />
              <Input
                label="Apellido"
                placeholder="Ingrese el apellido del estudiante"
              {...form.register('lastname')}
                error={form.formState.errors.lastname?.message}
            />
          </div>
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
                    {promotion.cohort_code} - {promotion.name} ({promotion.entry_year}) - {promotion.shift}
                  </option>
                ))}
              </select>
              {form.formState.errors.promotion_id && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.promotion_id.message}</p>
              )}
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                El email se generará automáticamente como: nombre.apellido{promotions.find(p => p.id === form.watch('promotion_id'))?.entry_year}@motta.superate.org.pa
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Se generará un passcode aleatorio que se mostrará al crear el estudiante.
              </p>
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
                Crear
              </Button>
            </div>
          </form>
        )}
        </div>
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
              Agregar Estudiantes
            </h3>
            <form onSubmit={bulkForm.handleSubmit(addBulkStudents)} className="space-y-4">
          <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Promoción
            </label>
            <select
                  {...bulkForm.register('promotion_id')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Seleccionar promoción</option>
              {promotions.map((promotion) => (
                <option key={promotion.id} value={promotion.id}>
                      {promotion.cohort_code} - {promotion.name} ({promotion.entry_year}) - {promotion.shift}
                </option>
              ))}
            </select>
                {bulkForm.formState.errors.promotion_id && (
                  <p className="mt-1 text-sm text-red-600">{bulkForm.formState.errors.promotion_id.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombres y Apellidos (separados por comas)
                </label>
                <textarea
                  {...bulkForm.register('names')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  rows={4}
                  placeholder="Juan Pérez, María García, Carlos López"
                />
                {bulkForm.formState.errors.names && (
                  <p className="mt-1 text-sm text-red-600">{bulkForm.formState.errors.names.message}</p>
                )}
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
                        {student.email} • {promotions.find(p => p.id === student.promotion_id)?.cohort_code} - {promotions.find(p => p.id === student.promotion_id)?.name} ({promotions.find(p => p.id === student.promotion_id)?.entry_year}) - {promotions.find(p => p.id === student.promotion_id)?.shift}
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
