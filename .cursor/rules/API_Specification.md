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

### 2. 로그아웃 (`signOut`)
- **함수 위치**: `src/lib/authHelpers.ts`
- **동작**: `localStorage`에서 `nudesk_session` 삭제

---

## 👥 **인력 관리 API (Admin Users)**
관리자용 인력 관리 API입니다.

### 1. 전체 사용자 목록 조회 (`useAllUsers`)
- **Hook**: `src/hooks/use-admin.ts`
- **테이블**: `public.profiles`
- **필터**: 역할(`role`) 순으로 정렬

### 2. 신규 인력 등록 (`registerUserAction`)
- **Action**: `src/app/admin/users/actions.ts`
- **입력**: 
  - `username`: 영어/숫자 조합 (벨리데이션: `/^[a-zA-Z0-9]+$/`)
  - `full_name`: 성함
  - `role`: ADMIN, STAFF, CUSTOMER
  - `email`, `phone`: 선택 입력
- **비밀번호**: 신규 등록 시 '0000'으로 기본 설정

### 3. 인력 정보 수정 (`updateUserAction`)
- **Action**: `src/app/admin/users/actions.ts`
- **입력**: `id`, `formData` (username, full_name, role, email, phone)

### 4. 비밀번호 초기화 (`resetPasswordAction`)
- **Action**: `src/app/admin/users/actions.ts`
- **동작**: 특정 사용자의 비밀번호를 '0000'으로 초기화

---

## 📂 **프로젝트 관리 API (Projects)**
프로젝트 및 멤버 배정 API입니다.

### 1. 프로젝트 목록 조회 (`useProjects`)
- **Hook**: `src/hooks/use-projects.ts`
- **조회 내용**: 프로젝트 기본 정보 및 참여 멤버 수 (`members:project_members(count)`)

### 2. 프로젝트 생성 (`useCreateProject`)
- **Hook**: `src/hooks/use-projects.ts`
- **동작**: 
  1. `projects` 테이블에 기본 정보 저장
  2. `memberIds` 배열을 순회하며 `project_members` 테이블에 멤버 배정

### 3. 프로젝트 수정 (`useUpdateProject`)
- **Hook**: `src/hooks/use-projects.ts`
- **동작**: 기본 정보 수정 후 기존 멤버 전체 삭제 및 새 멤버 재배정

---

## 🎫 **업무 접수 API (Tickets)**
티켓 생성 및 처리 흐름 API입니다.

### 1. 티켓 목록 조회 (`useTickets`)
- **Hook**: `src/hooks/use-tickets.ts`
- **권한 제약**: 현재 사용자가 참여 중인 프로젝트의 티켓만 조회 가능
- **조회 내용**: 티켓 정보, 신청자 정보, 프로젝트명, 다중 담당자 목록

### 2. 새 티켓 등록 (`useCreateTicket`)
- **Hook**: `src/hooks/use-tickets.ts`
- **입력**: 
  - `project_id`, `category`, `receipt_type`, `title`, `description`
  - `assigned_to_ids`: 다중 담당자 ID 배열
  - `end_date`: 종료 예정일 (영업일 벨리데이션 포함)
  - `is_emergency`, `emergency_reason`, `file_urls`
- **동작**: 티켓 생성 후 `ticket_assignees` 테이블에 담당자 정보 배정

### 3. 티켓 수락 (`useAcceptTicket`)
- **Hook**: `src/hooks/use-tickets.ts`
- **동작**: 상태를 `ACCEPTED`로 변경, 마감 기한 설정, 수락한 사용자를 담당자로 배정

---

## 📊 **데이터베이스 주요 스키마 (Database Schema)**

### `public.profiles`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 기본키 |
| username | TEXT | 사용자 ID (유니크) |
| password | TEXT | 비밀번호 (0000 등) |
| full_name | TEXT | 사용자 이름 |
| role | user_role | MASTER, ADMIN, STAFF, CUSTOMER |
| is_approved| BOOLEAN| 승인 여부 (기본 TRUE) |

### `public.tickets`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 기본키 |
| title | TEXT | 티켓 제목 |
| status | ticket_status | WAITING, ACCEPTED, IN_PROGRESS, COMPLETED |
| category | TEXT | 접수 카테고리 |
| project_id | UUID | 소속 프로젝트 외래키 |
| requester_id| UUID | 신청자 외래키 |
| file_urls | TEXT[] | 다중 첨부 파일 경로 배열 |
| is_emergency| BOOLEAN| 긴급 여부 |

---
*본 명세서는 프로젝트 개발 진행에 따라 수시로 업데이트됩니다.*
