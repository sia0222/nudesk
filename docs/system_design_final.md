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
    tickets ||--o{ ticket_history : "has tracking"
    profiles ||--o{ ticket_history : "performs actions"

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
        uuid requester_id FK
        string description "Main content (No title field)"
        ticket_status status "WAITING, ACCEPTED, IN_PROGRESS, DELAYED, REQUESTED, COMPLETED"
        date initial_end_date "희망종료일"
        date confirmed_end_date "종료예정일"
        date delayed_end_date "연기승인종료일"
        request_status delay_status "PENDING, APPROVED, REJECTED"
        string processing_delay_reason "처리 연기 사유"
        string delay_reason "연기 사유"
        string delay_rejection_reason "연기 반려 사유"
        request_status complete_status "PENDING, APPROVED, REJECTED"
        string complete_rejection_reason "완료 반려 사유"
        boolean is_emergency
    }

    ticket_history {
        uuid id PK
        uuid ticket_id FK
        string type "Status or event type"
        uuid actor_id FK
        jsonb metadata
        datetime created_at
    }
```

## 4. 비즈니스 규칙
1. **프로젝트 기반 보안**: STAFF와 CUSTOMER는 본인이 소속된 프로젝트의 티켓만 볼 수 있음.
2. **연기 제한**: 정식 연기 요청은 티켓당 단 1회로 제한됨.
3. **종료일 관리**: 고객의 '희망종료일'은 보존되며, 운영진이 확정한 '종료예정일'을 기준으로 지연 여부를 판단함.
4. **승인 프로세스**: 연기 및 완료 요청은 고객의 승인이 필요하며, 반려 시 사유 입력이 필수임.
