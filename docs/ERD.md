# Entity Relationship Diagram

Generated from `apps/server/prisma/schema.prisma`. Every business table is scoped by `organizationId` (multi-tenant). Full SQL: `database/schema.sql`; migrations: `apps/server/prisma/migrations/`.

```mermaid
erDiagram
  Organization {
    String id PK
    String name
    String address
    String phone
    String email
    String website
    String taxId
    String currency
    String defaultLanguage
    String invoicePrefix
    Int nextInvoiceNumber
    Float defaultTaxRate
    String invoiceFooter
    String invoiceNotes
    Bytes logo
    String logoMime
    DateTime logoUpdatedAt
    String llmProvider
    String llmModel
    String llmApiKeyEnc
    DateTime createdAt
    DateTime updatedAt
  }
  User {
    String id PK
    String email UK
    String name
    String passwordHash
    String role
    String organizationId FK
    Int failedLoginCount
    DateTime lockedUntil
    DateTime lastLoginAt
    DateTime passwordChangedAt
    DateTime createdAt
    DateTime updatedAt
  }
  RefreshToken {
    String id PK
    String userId FK
    String familyId FK
    String tokenHash UK
    DateTime expiresAt
    DateTime revokedAt
    String replacedBy
    String userAgent
    String ip
    DateTime createdAt
  }
  Customer {
    String id PK
    String organizationId FK
    String name
    String email
    String phone
    String address
    String notes
    DateTime createdAt
    DateTime updatedAt
  }
  Product {
    String id PK
    String organizationId FK
    String name
    String sku
    String description
    Float unitPrice
    String unit
    Boolean active
    DateTime createdAt
    DateTime updatedAt
  }
  Invoice {
    String id PK
    String organizationId FK
    String customerId FK
    String number
    String status
    DateTime issueDate
    DateTime dueDate
    String currency
    String language
    Float taxRate
    String discountType
    Float discountValue
    Float subtotal
    Float discountTotal
    Float taxTotal
    Float total
    String notes
    DateTime paidAt
    String createdById FK
    DateTime createdAt
    DateTime updatedAt
  }
  InvoiceItem {
    String id PK
    String invoiceId FK
    String productId FK
    String description
    Float quantity
    Float unitPrice
    Float lineTotal
    Int position
  }
  Dataset {
    String id PK
    String organizationId FK
    String createdById FK
    String name
    String originalFilename
    String fileType
    Int rowCount
    Int skippedRows
    String columnMapping
    String currency
    DateTime periodStart
    DateTime periodEnd
    DateTime createdAt
  }
  SalesRecord {
    String id PK
    String datasetId FK
    DateTime date
    String product
    Float quantity
    Float unitPrice
    Float total
    String customer
  }
  DatasetSummary {
    String id PK
    String datasetId FK
    String language
    String provider
    String model
    String content
    DateTime createdAt
    DateTime updatedAt
  }
  Customer ||--o{ Invoice : has
  Dataset ||--o{ DatasetSummary : has
  Dataset ||--o{ SalesRecord : has
  Invoice ||--o{ InvoiceItem : has
  Organization ||--o{ Customer : has
  Organization ||--o{ Dataset : has
  Organization ||--o{ Invoice : has
  Organization ||--o{ Product : has
  Organization ||--o{ User : has
  Product ||--o{ InvoiceItem : has
  User ||--o{ Dataset : has
  User ||--o{ RefreshToken : has
```

## Tables

| Table | Purpose |
|---|---|
| Organization | Tenant / company profile, invoice branding, encrypted AI key |
| User | Login accounts (argon2id hash), role admin/staff, lockout |
| RefreshToken | Rotating refresh tokens with family reuse detection |
| Customer | Customers per organization |
| Product | Product catalogue per organization |
| Invoice | Invoices with totals, status, tax |
| InvoiceItem | Line items of an invoice |
| Dataset | One uploaded CSV/XLSX file |
| SalesRecord | Normalised sales rows of a dataset |
| DatasetSummary | Cached analytics + AI summary of a dataset |
