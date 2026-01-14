# NuDesk 개발 규칙 (Rules)

## 🚨 **중요 원칙**

### **Supabase Authentication 미사용**
- **절대 Supabase Auth를 사용하지 않습니다**
- `supabase.auth.*` 함수들을 사용하지 않습니다
- `auth.users` 테이블을 참조하지 않습니다
- 모든 인증/인가 로직은 직접 데이터베이스에서 처리합니다

### **직접 데이터베이스 기반 회원 관리**
- 사용자 정보는 `public.profiles` 테이블에서 관리
- 비밀번호는 평문 저장 (개발 단계 - 운영시 bcrypt 해시화 필요)
- 세션 관리는 클라이언트 사이드 `localStorage`에서 처리
- 사용자 검증은 데이터베이스 쿼리로 직접 수행

## 📊 **데이터베이스 구조**

### **profiles 테이블**
```sql
CREATE TABLE public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- 평문 저장 (운영시 해시화 필수)
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **프로젝트 및 티켓 구조**
- `projects`: 프로젝트 정보
- `project_members`: 프로젝트 참여자
- `tickets`: 티켓 (요청사항)
- `profiles`의 `id`를 외래키로 사용

## 🔐 **인증/인가 방식**

### **AI 작업 원칙 (Strict Rules)**
1. **설명보다 실행**: 코드를 제안할 때는 반드시 `write` 또는 `search_replace` 도구를 사용하여 실제 파일에 즉시 적용해야 합니다. "적용했습니다"라고 말하기 전에 도구 호출이 성공했는지 반드시 확인합니다.
2. **누락 없는 로직 반영**: 사용자의 모든 세부 요구사항(예: 날짜 로직, UI 제약 사항 등)을 하나도 빠뜨리지 않고 코드에 반영합니다.
3. **무결성 검사**: 파일 수정 후에는 반드시 `read_lints`를 통해 구문 오류가 없는지 확인합니다.
4. **자가 검증 (Self-Verification)**: UI나 로직 변경 후에는 가능한 경우 브라우저 도구나 테스트 스크립트를 통해 의도한 대로 동작하는지 스스로 확인합니다. 특히 상태 연동이나 제약 조건은 시나리오별로 검토합니다.

### **로그인 프로세스**
1. `username`으로 `profiles` 테이블 조회
2. 비밀번호 평문 비교
3. 성공시 세션 정보를 `localStorage`에 저장
4. `getCurrentSession()`으로 현재 세션 확인

### **세션 정보 구조**
```typescript
{
  userId: string,     // profiles.id
  username: string,   // profiles.username
  role: string,       // profiles.role
  fullName: string,   // profiles.full_name
  loggedInAt: string  // ISO timestamp
}
```

## 🛠️ **개발 패턴**

### **컴포넌트 구조**
- Next.js 16 App Router 사용
- 클라이언트 컴포넌트 (`'use client'`) 적극 활용
- 서버 컴포넌트는 최소화

### **상태 관리**
- TanStack Query (React Query) 사용
- 서버 상태 관리에 특화
- 캐시 및 동기화 자동 처리

### **API 호출**
- Supabase 클라이언트 직접 사용
- `@/utils/supabase/client`에서 생성한 인스턴스 사용
- SQL 쿼리는 직접 작성 (Supabase의 ORM 사용)

## 👥 **테스트 계정**

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| nubiz | 3345 | MASTER | 대표 마스터 |
| admin | 3346 | ADMIN | 운영 관리자 |
| staff | 3347 | STAFF | 실무 직원 |
| customer | 3348 | CUSTOMER | 테스트 고객 |

## 📝 **주요 기능**

### **권한별 기능**
- **MASTER**: 모든 기능 접근 가능
- **ADMIN**: 인력 관리, 프로젝트 관리
- **STAFF**: 티켓 처리, 프로젝트 참여
- **CUSTOMER**: 티켓 생성, 본인 티켓 조회

### **티켓 시스템**
- 참여 중인 프로젝트의 티켓만 조회 가능
- `requester_id`: 티켓 생성자
- `assigned_to`: 담당자
- 상태: WAITING → ACCEPTED → IN_PROGRESS → COMPLETED

## 🔧 **개발 환경**

### **기술 스택**
- **Frontend**: Next.js 16, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: Supabase PostgreSQL
- **State**: TanStack Query
- **Icons**: Lucide React

### **폴더 구조**
```
src/
├── app/                 # Next.js App Router
│   ├── login/          # 로그인 페이지
│   ├── dashboard/      # 대시보드
│   └── admin/          # 관리자 페이지
├── components/         # 재사용 컴포넌트
├── hooks/             # 커스텀 훅 (TanStack Query)
├── lib/               # 유틸리티 함수
└── utils/             # 설정 파일
```

## ⚠️ **주의사항**

### **절대 하지 말아야 할 것들**
- ❌ `supabase.auth.signInWithPassword()` 사용
- ❌ `supabase.auth.getUser()` 사용
- ❌ `auth.users` 테이블 참조
- ❌ Supabase Auth 관련 import

### **반드시 해야 할 것들**
- ✅ `signInWithUsername()` 함수 사용
- ✅ `getCurrentSession()`으로 세션 확인
- ✅ `profiles` 테이블 직접 쿼리
- ✅ `localStorage` 세션 관리

## 🚀 **배포 및 운영**

### **운영시 필수 변경사항**
1. **비밀번호 해시화**: bcrypt 사용
2. **HTTPS 적용**: 보안 강화를 위해
3. **세션 만료**: 자동 로그아웃 구현
4. **에러 로깅**: 중앙 집중식 로그 수집

### **모니터링 포인트**
- 데이터베이스 연결 상태
- 세션 유효성 검증
- 권한 체크 로직
- 에러 발생률

---

## 📋 **변경 이력**

### **v1.0 - 초기 구축**
- Supabase Auth 제거
- 직접 데이터베이스 기반 회원 관리 구현
- 티켓 시스템 구축
- 기본 CRUD 기능 구현

### **진행 중인 작업**
- UI/UX 개선
- 추가 기능 개발 (채팅, 파일 업로드 등)
- 성능 최적화

---

*이 규칙은 프로젝트의 핵심 원칙을 유지하기 위해 작성되었습니다. 모든 개발자는 이 규칙을 준수해주세요.*