-- Disable existing policies on branding table
DROP POLICY IF EXISTS "Allow all operations on branding table" ON branding;
DROP POLICY IF EXISTS "Enable read access for all users" ON branding;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON branding;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON branding;

-- Create permissive policy that allows authenticated users to manage branding
CREATE POLICY "Allow authenticated users full access to branding"
ON branding
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);