# ACADEMIX 2.0 — System Architecture

```
                          ACADEMIX 2.0
                                │
             ┌──────────────────┴──────────────────┐
             │                                     │
          FRONTEND                              BACKEND
      React 18 + Vite                      Node.js + Express
      Material UI v5                       Knex.js + MySQL 8
      react-i18next (English 1st)          pdfmake Engine
             │                                     │
             └──────────────────┬──────────────────┘
                                │ REST API (JWT)
                                ▼
                         MySQL / MariaDB
                         (48 Migrations)
```
