# NuDesk 개발 규칙 (Rules)

## 🚨 **중요 원칙**

### **1. Supabase Authentication 미사용**
- **절대 Supabase Auth를 사용하지 않습니다.**
- 모든 인증/인가 로직은 직접 데이터베이스(`public.profiles`)에서 처리합니다.
- 세션 관리는 클라이언트 사이드 `localStorage`(`getCurrentSession()`)에서 수행합니다.

### **2. UI/UX 표준화 (shadcn/ui 기반)**
- **공통 레이아웃**: 모든 페이지는 `PageContainer`와 `PageHeader`를 사용합니다.
- **다이얼로그 표준**: 모든 Dialog는 `max-h-[90vh]`와 `ScrollArea`를 적용하여 내용이 많을 경우 내부 스크롤이 생기도록 합니다.
- **목록 비어있음 (Empty State)**: 아이콘, `text-lg font-black` 제목, `text-zinc-400` 설명문을 포함한 센터 정렬 디자인을 사용합니다.
- **테이블 스타일**: 연도 4자리 포맷(`YYYY.MM.DD`), 데이터 부재 시 하이픈(`---`) 처리를 준수합니다.

### **3. 티켓 및 프로젝트 관리 로직**
- **비즈니스 데이 계산**: 종료 일자는 주말 및 공휴일을 제외한 영업일 기준으로 계산합니다.
- **고객사 배정**: `CUSTOMER` 유저는 반드시 고객사에 소속되어야 하며, 소속 프로젝트가 1개일 경우 티켓 등록 시 자동 지정됩니다.
- **접수 유형**: 고객사 유저는 '온라인'으로 고정되며, 관리자/직원은 '온라인, 전화, 팩스, 이메일' 중 선택 가능합니다.

## 🛠️ **메뉴 구성 및 순서**
1. **접수 리스트** (`/dashboard/tickets`)
2. **인력 관리** (`/admin/users`) - MASTER, ADMIN 전용
3. **고객사 관리** (`/admin/customers`) - MASTER, ADMIN 전용
4. **프로젝트 관리** (`/dashboard/projects`) - MASTER, ADMIN 전용

## 📊 **데이터베이스 및 데이터 모델**
- `profiles`: 사용자 계정 및 소속 정보
- `customers`: 고객사 정보 및 관련 서류
- `projects`: 프로젝트 정보 (상세 설명 필드 없음)
- `tickets`: 업무 접수 정보 (카테고리 필드 없음)

## 🛠️ **AI 작업 원칙**
1. **설명보다 실행**: 코드는 즉시 파일에 적용합니다.
2. **무결성 검사**: 수정 후 `read_lints`로 ReferenceError 및 구문 오류를 확인합니다.
3. **권한 기반 UI**: `MASTER`는 등록 버튼 비노출, `CUSTOMER`는 간소화된 폼 제공 등 역할별 권한을 엄격히 적용합니다.

---
*이 규칙은 프로젝트의 무결성과 일관성을 유지하기 위해 작성되었습니다.*
