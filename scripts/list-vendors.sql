SELECT 
    v.id AS vendor_id,
    v."userId" AS user_id,
    v."storeName" AS store_name,
    v.status,
    v."isApproved" AS is_approved,
    u.email AS user_email,
    u."firstName" AS first_name,
    u."lastName" AS last_name,
    u.role AS user_role,
    u."isEmailVerified" AS email_verified,
    v."createdAt" AS created_at
FROM vendors v
LEFT JOIN users u ON v."userId" = u.id
ORDER BY v."createdAt" DESC;
