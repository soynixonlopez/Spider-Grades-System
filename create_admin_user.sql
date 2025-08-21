-- =====================================================
-- CREATE ADMIN USER IN SUPABASE AUTH
-- =====================================================

-- First, create the user in auth.users
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '7d541023-ecb9-4ba8-98fc-14a674783670',
  'soynixonlopez@gmail.com',
  crypt('Admin123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '',
  '',
  '',
  ''
);

-- Then, create the profile
INSERT INTO profiles (id, email, role, passcode) 
VALUES (
  '7d541023-ecb9-4ba8-98fc-14a674783670',
  'soynixonlopez@gmail.com',
  'admin',
  'Admin123!'
);

-- Verify the user was created
SELECT 'Admin user created successfully' as status;
