-- Allow users to DELETE their own recharge requests
CREATE POLICY IF NOT EXISTS "users_can_delete_own_recharge_requests"
ON public.recharge_requests
FOR DELETE
USING (auth.uid() = user_id);
