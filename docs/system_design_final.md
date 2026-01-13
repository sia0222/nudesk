# NuDesk 시스템 설계서 (Final)

## 1. 개요
회사(마스터, 관리자, 직원)와 고객 간의 프로젝트 기반 [접수 및 협업 관리] 시스템입니다.

## 2. 권한 체계
- **MASTER**: 시스템 전체 관리자 (단 1명). 인력 등록 및 모든 데이터 접근 권한.
- **ADMIN**: 실무 운영 관리자. 프로젝트 생성, 인력 배치, 티켓 관리.
- **STAFF**: 실무진. 배정된 프로젝트의 티켓 처리 및 소통.
- **CUSTOMER**: 고객. 소속 프로젝트의 티켓 접수 및 상태 확인.

## 3. 핵심 데이터베이스 설계 (ERD)

```mermaid
erDiagram
    profiles ||--o{ project_members : "belongs to"
    projects ||--o{ project_members : "has members"
    projects ||--o{ tickets : "contains"
    profiles ||--o{ tickets : "creates (customer)"
    profiles ||--o{ tickets : "assigned (staff)"
    tickets ||--o{ chats : "has messages"
    tickets ||--o{ delay_requests : "1-time limit"

    profiles {
        uuid id PK
        string username "Unique ID"
        string full_name
        user_role role "MASTER, ADMIN, STAFF, CUSTOMER"
        boolean is_approved "Default: TRUE"
    }

    projects {
        uuid id PK
        string name
        text description
    }

    tickets {
        uuid id PK
        uuid project_id FK
        uuid customer_id FK
        uuid assigned_staff_id FK
        string title
        ticket_category category "수정, 자료, 기타"
        ticket_status status "WAITING, ACCEPTED, IN_PROGRESS, DELAYED, COMPLETED"
        boolean is_urgent
        integer delay_count "Max: 1"
        datetime deadline
    }
```

## 4. 비즈니스 규칙
1. **프로젝트 기반 보안**: STAFF와 CUSTOMER는 본인이 소속된 프로젝트의 티켓만 볼 수 있음.
2. **연기 제한**: 티켓당 연기 요청은 단 1회(`delay_count <= 1`)로 제한됨.
3. **인력 등록**: 관리자가 직접 인력을 등록하며, 등록 즉시 승인 상태가 됨.
