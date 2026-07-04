-- RLS policies to allow admins to manage recharge requests and wallets
-- Apply these in Supabase SQL Editor

-- 1) Allow authenticated users to INSERT recharge requests
CREATE POLICY IF NOT EXISTS "authenticated_can_insert_recharge_requests"
ON public.recharge_requests
FOR INSERT
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 2) Allow users to SELECT their own recharge requests
CREATE POLICY IF NOT EXISTS "users_can_select_own_recharge_requests"
ON public.recharge_requests
FOR SELECT
USING (auth.uid() = user_id);

-- 3) Allow admins to SELECT all recharge requests
CREATE POLICY IF NOT EXISTS "admins_can_select_recharge_requests"
ON public.recharge_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND lower(u.role) = 'admin'
  )
);

-- 4) Allow admins to UPDATE recharge_requests (change status)
CREATE POLICY IF NOT EXISTS "admins_can_update_recharge_requests"
ON public.recharge_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND lower(u.role) = 'admin'
  )
)
WITH CHECK (true);

-- 5) Allow admins to SELECT/UPDATE/INSERT wallets so they can create or update balances
CREATE POLICY IF NOT EXISTS "admins_can_manage_wallets"
ON public.wallets
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND lower(u.role) = 'admin'
  )
)
WITH CHECK (true);

-- 6) (Optional) Allow users to SELECT their own wallet
CREATE POLICY IF NOT EXISTS "users_can_select_own_wallet"
ON public.wallets
FOR SELECT
USING (auth.uid() = user_id);

-- NOTE: Adjust roles comparison if you have different role values (e.g., 'super_admin').
-- After running these, test the admin flow again.
