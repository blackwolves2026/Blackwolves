-- Add new columns to recharge_requests table for wallet charging feature
ALTER TABLE recharge_requests
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS transfer_image_url TEXT;

-- Add comment to document the columns
COMMENT ON COLUMN recharge_requests.account_number IS 'Bank account number or transfer reference provided by the user';
COMMENT ON COLUMN recharge_requests.transfer_image_url IS 'URL to the uploaded transfer receipt image stored in Supabase Storage';
