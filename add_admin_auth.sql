-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS admin_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('master', 'secondary')),
    status TEXT NOT NULL CHECK (status IN ('approved', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add missing password_hash column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_profiles' AND column_name='password_hash') THEN
        ALTER TABLE admin_profiles ADD COLUMN password_hash TEXT NOT NULL DEFAULT 'temp_hash';
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Recreate Policies
DROP POLICY IF EXISTS "Master admin can see all profiles" ON admin_profiles;
CREATE POLICY "Master admin can see all profiles" ON admin_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_profiles 
            WHERE email = 'sibiparimala12@gmail.com' AND role = 'master' AND status = 'approved'
        )
    );

DROP POLICY IF EXISTS "Users can see own profile" ON admin_profiles;
CREATE POLICY "Users can see own profile" ON admin_profiles
    FOR SELECT USING (auth.jwt()->>'email' = email);

-- 5. Seed Master Admin
INSERT INTO admin_profiles (email, role, status)
VALUES ('sibiparimala12@gmail.com', 'master', 'approved')
ON CONFLICT (email) DO UPDATE SET role = 'master', status = 'approved';

-- 6. Create resets table
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
