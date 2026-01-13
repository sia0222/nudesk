-- [NuDesk Master Setup SQL]
-- 실행 순서: 1. API 경로 및 권한 복구 -> 2. 확장기능 -> 3. 테이블 -> 4. RLS -> 5. 테스트계정

-- 1. [핵심] API 경로 및 권한 복구 (querying schema 에러 방지)
ALTER ROLE anon SET search_path TO public, auth;
ALTER ROLE authenticated SET search_path TO public, auth;
ALTER ROLE service_role SET search_path TO public, auth;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- 2. 기초 설정
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. 기존 테이블/타입 완전 삭제 (초기화)
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.delay_requests CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS ticket_status CASCADE;
DROP TYPE IF EXISTS ticket_category CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;

-- 4. 커스텀 타입(ENUM) 정의
CREATE TYPE user_role AS ENUM ('MASTER', 'ADMIN', 'STAFF', 'CUSTOMER');
CREATE TYPE ticket_status AS ENUM ('WAITING', 'ACCEPTED', 'IN_PROGRESS', 'DELAYED', 'COMPLETED');
CREATE TYPE ticket_category AS ENUM ('수정요청', '자료요청', '기타');
CREATE TYPE request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- 5. 테이블 생성
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX one_master_idx ON public.profiles (role) WHERE (role = 'MASTER');

CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.project_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, profile_id)
);

CREATE TABLE public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id),
    assigned_staff_id UUID REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    category ticket_category NOT NULL DEFAULT '기타',
    content TEXT,
    status ticket_status DEFAULT 'WAITING',
    is_urgent BOOLEAN DEFAULT FALSE,
    is_auto_assigned BOOLEAN DEFAULT FALSE,
    delay_count INT DEFAULT 0 CHECK (delay_count <= 1),
    deadline TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 보안 정책(RLS) 설정
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "View Projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "View Memberships" ON public.project_members FOR SELECT TO authenticated USING (true);

-- 티켓 조회 정책 (소속 프로젝트 기반 또는 MASTER/ADMIN)
CREATE POLICY "Ticket Access Policy" ON public.tickets
FOR ALL TO authenticated
USING (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')))
    OR
    (project_id IN (SELECT project_id FROM public.project_members WHERE profile_id = auth.uid()))
);

-- 7. 테스트 계정 생성 (id@nudesk.local / 비번 규칙 준수)
DO $$
DECLARE
    u RECORD;
    user_list JSONB := '[
        {"un": "nubiz", "pw": "3345", "role": "MASTER", "name": "대표 마스터"},
        {"un": "admin", "pw": "3346", "role": "ADMIN", "name": "운영 관리자"},
        {"un": "staff", "pw": "3347", "role": "STAFF", "name": "실무 직원"},
        {"un": "customer", "pw": "3348", "role": "CUSTOMER", "name": "테스트 고객"}
    ]';
    u_id UUID;
BEGIN
    DELETE FROM auth.users WHERE email LIKE '%@nudesk.local';
    FOR u IN SELECT * FROM jsonb_to_recordset(user_list) AS x(un TEXT, pw TEXT, role user_role, name TEXT)
    LOOP
        u_id := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (u_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.un || '@nudesk.local', crypt(u.pw, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', format('{"username":"%s","full_name":"%s"}', u.un, u.name)::jsonb, now(), now());
        INSERT INTO public.profiles (id, username, full_name, role) VALUES (u_id, u.un, u.name, u.role);
    END LOOP;
END $$;

-- 8. 스키마 캐시 새로고침
NOTIFY pgrst, 'reload schema';
