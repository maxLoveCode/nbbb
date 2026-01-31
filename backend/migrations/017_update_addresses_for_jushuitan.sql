-- 更新地址表，添加聚水潭需要的字段
-- 添加 mobile (手机号) 和 email (邮箱) 字段

DO $$ 
BEGIN
    -- 添加手机号字段（对应聚水潭的 receiver_mobile）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='addresses' AND column_name='mobile') THEN
        ALTER TABLE addresses ADD COLUMN mobile VARCHAR(50);
    END IF;
    
    -- 添加邮箱字段（对应聚水潭的 receiver_email）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='addresses' AND column_name='email') THEN
        ALTER TABLE addresses ADD COLUMN email VARCHAR(200);
    END IF;
    
    -- 确保字段映射关系：
    -- name -> receiver_name (已存在)
    -- phone -> receiver_phone (已存在)
    -- mobile -> receiver_mobile (新增)
    -- province_name -> receiver_state (已存在)
    -- city_name -> receiver_city (已存在)
    -- district_name -> receiver_district (已存在)
    -- detail_address -> receiver_address (已存在)
    -- postal_code -> receiver_zip (已存在)
    -- email -> receiver_email (新增)
END $$;

