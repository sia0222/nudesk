-- [NuDesk Database Setup - No Supabase Auth]
-- Supabase Auth를 사용하지 않고 직접 데이터베이스 관리

-- 1. 권한 설정
ALTER ROLE anon SET search_path TO public;
ALTER ROLE authenticated SET search_path TO public;
ALTER ROLE service_role SET search_path TO public;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- 2. 확장 기능
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. 기존 테이블 삭제
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.delay_requests CASCADE;
DROP TABLE IF EXISTS public.ticket_assignees CASCADE; -- 추가
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS ticket_status CASCADE;
DROP TYPE IF EXISTS ticket_category CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;
DROP TYPE IF EXISTS project_type CASCADE;
DROP TYPE IF EXISTS receipt_type CASCADE; -- 추가

-- 4. 타입 정의
CREATE TYPE user_role AS ENUM ('MASTER', 'ADMIN', 'STAFF', 'CUSTOMER');
CREATE TYPE ticket_status AS ENUM ('WAITING', 'ACCEPTED', 'IN_PROGRESS', 'DELAYED', 'COMPLETED');
CREATE TYPE request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE project_type AS ENUM ('개발', '유지');
CREATE TYPE receipt_type AS ENUM ('온라인', '전화', '팩스', '이메일'); -- 추가

-- 5. 테이블 생성 (Supabase Auth 제거)
CREATE TABLE public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- 실제 운영에서는 해시화 필수
    full_name TEXT,
    email TEXT,           -- 추가: 이메일
    phone TEXT,           -- 추가: 연락처
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    project_type project_type DEFAULT '개발',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.project_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE TABLE public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status ticket_status NOT NULL DEFAULT 'WAITING',
    category TEXT NOT NULL DEFAULT '수정', -- 유연한 카테고리 관리를 위해 TEXT로 변경
    receipt_type receipt_type DEFAULT '온라인',
    priority TEXT DEFAULT '보통',
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- 호환성 유지
    end_date DATE,
    is_emergency BOOLEAN DEFAULT FALSE,
    emergency_date DATE,
    emergency_reason TEXT,
    file_urls TEXT[] DEFAULT '{}', -- 다중 파일 지원
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deadline TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 다중 배정을 위한 중간 테이블
CREATE TABLE public.ticket_assignees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ticket_id, user_id)
);

CREATE TABLE public.delay_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    requested_deadline TIMESTAMPTZ NOT NULL,
    status request_status NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 테스트 데이터 삽입
INSERT INTO public.profiles (username, password, full_name, role, is_approved) VALUES
('nubiz', '3345', '대표 마스터', 'MASTER', true),
('admin', '3346', '운영 관리자', 'ADMIN', true),
('staff', '3347', '실무 직원', 'STAFF', true),
('customer', '3348', '테스트 고객', 'CUSTOMER', true);

-- 7. 샘플 프로젝트
INSERT INTO public.projects (name, description) VALUES
('NuDesk 시스템 개발', '실무 참여형 스마트 관리 시스템 개발 프로젝트');

-- 8. 프로젝트 멤버십 (모든 사용자를 프로젝트에 추가)
INSERT INTO public.project_members (project_id, user_id)
SELECT p.id, pr.id
FROM public.projects p
CROSS JOIN public.profiles pr;

-- 9. 샘플 티켓
INSERT INTO public.tickets (title, description, status, category, project_id, requester_id) VALUES
('로그인 기능 구현', '사용자 로그인 기능 구현 및 테스트', 'IN_PROGRESS', '🛠️ 오류 / 기능이 마음대로 작동하지 않아요',
 (SELECT id FROM public.projects LIMIT 1),
 (SELECT id FROM public.profiles WHERE username = 'customer')),
('UI 디자인 개선', '대시보드 UI 개선 작업', 'WAITING', '🎨 수정 / 화면이 깨지거나 이상하게 보여요',
 (SELECT id FROM public.projects LIMIT 1),
 (SELECT id FROM public.profiles WHERE username = 'customer'));

-- 10. API 캐시 새로고침
NOTIFY pgrst, 'reload schema';
