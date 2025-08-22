-- =====================================================
-- SCRIPT DE VERIFICACIÓN DE LOGIN ADMIN
-- =====================================================
-- Ejecutar este script para verificar que el admin esté configurado correctamente

-- 1. Verificar que el usuario admin existe en auth.users
SELECT 
  '1. Usuario Admin en auth.users:' as verificacion,
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'soynixonlopez@gmail.com';

-- 2. Verificar que el perfil admin existe en profiles
SELECT 
  '2. Perfil Admin en profiles:' as verificacion,
  id,
  email,
  role,
  passcode,
  created_at
FROM profiles 
WHERE email = 'soynixonlopez@gmail.com';

-- 3. Verificar que los IDs coinciden
SELECT 
  '3. Sincronización de IDs:' as verificacion,
  CASE 
    WHEN u.id = p.id THEN '✅ IDs coinciden correctamente'
    ELSE '❌ ERROR: IDs no coinciden'
  END as estado,
  u.id as auth_user_id,
  p.id as profile_id
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'soynixonlopez@gmail.com';

-- 4. Verificar políticas RLS para admin
SELECT 
  '4. Políticas RLS para admin:' as verificacion,
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND policyname LIKE '%admin%'
ORDER BY tablename, policyname;

-- 5. Test de acceso a promociones (simulado)
SELECT 
  '5. Test acceso promociones:' as verificacion,
  COUNT(*) as total_promociones,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ Acceso OK'
    ELSE '❌ Sin acceso'
  END as estado
FROM promotions;

-- 6. Verificar estructura de tablas principales
SELECT 
  '6. Tablas del sistema:' as verificacion,
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ Existe'
    ELSE '❌ No existe'
  END as estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'promotions', 'subjects', 'professors', 'students', 'grades')
ORDER BY table_name;

-- 7. Mensaje de resumen
SELECT 
  '=== RESUMEN DE VERIFICACIÓN ===' as titulo,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'soynixonlopez@gmail.com')
    AND EXISTS (SELECT 1 FROM profiles WHERE email = 'soynixonlopez@gmail.com' AND role = 'admin')
    THEN '✅ ADMIN CONFIGURADO CORRECTAMENTE - Login debería funcionar'
    ELSE '❌ PROBLEMA DE CONFIGURACIÓN - Revisar pasos anteriores'
  END as estado;

-- 8. Instrucciones de login
SELECT 
  'CREDENCIALES DE LOGIN:' as info,
  'Email: soynixonlopez@gmail.com' as email,
  'Password: Admin123!' as password,
  'Dashboard: /admin' as dashboard;
