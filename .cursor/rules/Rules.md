# NuDesk 개발 규칙 (Rules)

## 🚨 **중요 원칙**

### **1. Supabase Authentication 미사용**
- **절대 Supabase Auth를 사용하지 않습니다.**
- `supabase.auth.*` 함수 및 `auth.users` 테이블 참조를 금지합니다.
- 모든 인증/인가 로직은 직접 데이터베이스(`public.profiles`)에서 처리합니다.
- 세션 관리는 클라이언트 사이드 `localStorage`(`getCurrentSession()`)에서 수행합니다.

### **2. UI/UX 표준화 (shadcn/ui 기반)**
- **공통 레이아웃**: 모든 페이지는 `PageContainer`와 `PageHeader`를 사용합니다.
- **타이틀 스타일**: `text-4xl font-black tracking-tighter italic uppercase`.
- **입력 폼 표준**:
  - **Label**: `text-sm font-black text-zinc-700 ml-1`
  - **Input/Select**: `h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium`
  - **Button (주요 액션)**: `h-16 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-lg shadow-xl active:scale-95`
  - **벨리데이션**: 아이디(사용자명)는 **영어 또는 숫자**(`/^[a-zA-Z0-9]+$/`)이어야 하며, 중복 검사를 포함하여 폼 제출 시 및 입력 시 검증을 수행합니다.
- **로컬라이징**: 모든 UI 텍스트는 **한국어**를 기본으로 합니다.

### **3. 티켓(접수) 관리 로직**
- **비즈니스 데이 계산**: 종료 일자는 주말 및 공휴일을 제외한 영업일 기준으로 계산합니다.
  - 일반 접수: 3영업일 이후부터 선택 가능
  - 긴급 접수: 1영업일 이후부터 선택 가능
- **상태 동기화**: '긴급' 카테고리 선택 시 '긴급처리요청'이 자동 활성화되며, 해당 상태에서는 체크 해제가 불가능합니다.
- **다중 할당 및 파일**: 내부 인력은 다중 선택(`ticket_assignees` 테이블)이 가능하며, 파일은 다중 첨부(`file_urls TEXT[]`)를 지원합니다.

## 🛠️ **AI 작업 원칙 (Strict Rules)**

1. **설명보다 실행**: 코드를 제안할 때는 반드시 `write` 또는 `search_replace` 도구를 사용하여 실제 파일에 즉시 적용해야 합니다.
2. **누락 없는 로직 반영**: 사용자의 모든 세부 요구사항(날짜 로직, UI 제약 등)을 하나도 빠뜨리지 않고 코드에 반영합니다.
3. **무결성 검사**: 파일 수정 후에는 반드시 `read_lints`를 통해 구문 오류 및 정의되지 않은 참조(ReferenceError)가 없는지 확인합니다.
4. **의존성 및 임포트 체크**: 코드를 수정하거나 로직을 유틸리티로 분리할 때, 사용된 모든 함수, 상수, 라이브러리가 해당 파일에 정확히 임포트되었는지 반드시 전수 조사합니다.
5. **자가 검증 (Self-Verification)**: UI나 로직 변경 후에는 브라우저 도구 또는 테스트 로직을 통해 시나리오별로 의도한 대로 동작하는지 스스로 확인합니다. (예: 달력 비활성화 날짜 클릭 여부 등)

## 📊 **데이터베이스 및 데이터 모델**

### **주요 테이블**
- `profiles`: 사용자 계정 정보 (비밀번호 평문 저장)
- `projects`: 프로젝트 정보
- `project_members`: 프로젝트와 사용자의 다대다 관계 (`user_id` 사용)
- `tickets`: 업무 접수 정보 (`file_urls`, `is_emergency`, `end_date` 등 포함)
- `ticket_assignees`: 티켓별 담당 인력 다중 배정

## 🛠️ **개발 스택 및 패턴**

- **Framework**: Next.js 16 (App Router), React 19
- **State Management**: TanStack Query (서버 상태 관리)
- **Styling**: Tailwind CSS, shadcn/ui, Lucide React
- **Database**: Supabase (직접 SQL 기반 쿼리)
- **Date Library**: `date-fns` (영업일 및 날짜 포맷팅)

## 👥 **테스트 계정**

| Username | Password | Role |
|----------|----------|------|
| nubiz | 3345 | MASTER |
| admin | 3346 | ADMIN |
| staff | 3347 | STAFF |
| customer | 3348 | CUSTOMER |

---
*이 규칙은 프로젝트의 무결성과 일관성을 유지하기 위해 작성되었습니다. 모든 변경 사항은 이 규칙을 준수해야 합니다.*
