-- Enable RLS on purchases table and add admin policies
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Allow admins to SELECT all purchases
CREATE POLICY IF NOT EXISTS "admins_can_select_purchases"
ON public.purchases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'super_admin', 'content_manager', 'finance_manager', 'administrator')
  )
);

-- Allow users to SELECT their own purchases
CREATE POLICY IF NOT EXISTS "users_can_select_own_purchases"
ON public.purchases
FOR SELECT
USING (user_id = auth.uid());

-- Allow admins to DELETE purchases (for cleanup operations)
CREATE POLICY IF NOT EXISTS "admins_can_delete_purchases"
ON public.purchases
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'super_admin', 'content_manager', 'finance_manager', 'administrator')
  )
);

-- Allow admins to INSERT purchases
CREATE POLICY IF NOT EXISTS "admins_can_insert_purchases"
ON public.purchases
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'super_admin', 'content_manager', 'finance_manager', 'administrator')
  )
);
