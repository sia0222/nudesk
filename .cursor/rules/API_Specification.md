# NuDesk API 명세서 (API Specification)

본 문서는 NuDesk 프로젝트에서 사용되는 주요 API 및 데이터 인터페이스를 정리한 명세서입니다. NuDesk는 Supabase Auth를 사용하지 않고 직접 데이터베이스(`public.profiles`)와 Server Actions, TanStack Query를 통해 데이터를 관리합니다.

---

## 🔐 **인증 API (Authentication)**
사용자 인증은 `profiles` 테이블의 정보를 직접 조회하여 수행하며, 세션은 브라우저의 `localStorage`에서 관리합니다.

### 1. 로그인 (`signInWithUsername`)
- **함수 위치**: `src/lib/authHelpers.ts`
- **입력**: `username (string)`, `password (string)`
- **동작**: 
  - `profiles` 테이블에서 `username`으로 사용자 조회
  - 비밀번호 평문 비교 (테스트 단계)
  - 성공 시 `nudesk_session` 키로 `localStorage`에 세션 정보 저장
- **출력**: `{ user: sessionData, profile: userProfile }`

---

## 👥 **인력 관리 API (Admin Users)**
관리자용 인력 관리 API입니다.

### 1. 전체 사용자 목록 조회 (`useAllUsers`)
- **Hook**: `src/hooks/use-admin.ts`
- **조회 내용**: `profiles` 테이블 정보 + 소속 고객사명 (`customer:customers(company_name)`)

### 2. 신규 인력 등록 (`registerUserAction`)
- **Action**: `src/app/admin/users/actions.ts`
- **입력**: `username`, `full_name`, `role`, `email`, `phone`, `customer_id`
- **비밀번호**: 신규 등록 시 '0000'으로 기본 설정

---

## 🏢 **고객사 관리 API (Customers)**
고객사 및 관련 서류 관리 API입니다.

### 1. 고객사 목록 조회 (`useCustomers`)
- **Hook**: `src/hooks/use-customers.ts`
- **조회 내용**: 고객사 정보, 첨부 서류 목록, 소속 인력(Profiles) 목록

### 2. 고객사 등록/수정/상태변경 (`useCreateCustomer`, `useUpdateCustomer`, `useToggleCustomerStatus`)
- **Hook**: `src/hooks/use-customers.ts`
- **주요 동작**: 
  - 등록/수정: 고객사 정보 저장, 다중 파일 업로드(Supabase Storage: `customers` 버킷), 소속 인력 배정(`customer_id` 업데이트)
  - 상태변경: `is_active` 필드 토글 (비활성화 시 프로젝트 노출 및 접수 제한)
- **파일 관리**: 업로드된 파일은 `customer_attachments` 테이블에 URL로 기록됩니다.

---

## 📂 **프로젝트 관리 API (Projects)**
프로젝트 관리 API입니다.

### 1. 프로젝트 목록 조회 (`useProjects`)
- **Hook**: `src/hooks/use-projects.ts`
- **조회 내용**: 프로젝트 정보 + 고객사 정보 (`customer:customers(company_name)`)

### 2. 프로젝트 생성/수정/상태변경 (`useCreateProject`, `useUpdateProject`, `useToggleProjectStatus`)
- **Hook**: `src/hooks/use-projects.ts`
- **입력**: `name`, `project_type`, `start_date`, `end_date`, `customer_id`, `memberIds`, `is_active`
- **주요 동작**: 
  - 생성/수정: 프로젝트 정보 및 인력 배치 업데이트
  - 상태변경: `is_active` 필드 토글 (비활성화 시 접수 선택 제한)
- **참고**: `description` 필드는 사용되지 않습니다.

---

## 🎫 **업무 접수 API (Tickets)**
티켓 생성 및 처리 흐름 API입니다.

### 1. 티켓 목록 조회 (`useTickets`)
- **Hook**: `src/hooks/use-tickets.ts`
- **필터링**: 
  - `CUSTOMER`: 본인 소속 고객사(`customer_id`)의 티켓만 조회
  - `ADMIN/STAFF`: 본인이 참여 중인 프로젝트의 티켓 조회
  - `MASTER`: 전체 티켓 조회 가능

### 2. 새 티켓 등록 (`useCreateTicket`)
- **Hook**: `src/hooks/use-tickets.ts`
- **동작**: 티켓 생성 시 요청자의 `customer_id` 자동 할당 및 `ticket_assignees` 배정
- **참고**: `category` 필드는 제거되었습니다.

---

## 📊 **데이터베이스 주요 스키마 (Database Schema)**

### `public.profiles`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| customer_id | UUID | 소속 고객사 FK (CUSTOMER 역할 필수) |
| role | user_role | MASTER, ADMIN, STAFF, CUSTOMER |

### `public.customers`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| company_name | TEXT | 회사명 |
| tel | TEXT | 연락처 |
| is_active | BOOLEAN | 활성화 여부 (비활성 시 접수 및 선택 제한) |

### `public.projects`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| customer_id | UUID | 담당 고객사 FK |
| start_date/end_date | DATE | 프로젝트 기간 |
| is_active | BOOLEAN | 활성화 여부 (비활성 시 접수 선택 제한) |

### `public.tickets`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| customer_id | UUID | 고객사 FK (자동 할당) |
| status | ticket_status | WAITING, ACCEPTED, IN_PROGRESS, DELAYED, REQUESTED, COMPLETED |
| is_emergency | BOOLEAN | 긴급 여부 |

---
*본 명세서는 프로젝트 개발 진행에 따라 수시로 업데이트됩니다.*
