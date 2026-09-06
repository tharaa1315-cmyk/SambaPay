
<div align="center">

# 🌟 SambaPay Enterprise Suite 🌟
**Next-Generation HR, Payroll, & Organizational Management API**

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](#)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](#)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](#)
[![Security: RBAC](https://img.shields.io/badge/Security-RBAC%20Enabled-blueviolet?style=for-the-badge)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](#)

<br>
<p>
  <i>A powerful, decoupled backend architecture designed to handle modern enterprise organizational structures, time tracking, dynamic payroll routing, and strict role-based access controls.</i>
</p>

[**Architecture Diagrams**](#-interactive-architecture--flow-diagrams) • [**Explore Features**](#-core-modules) • [**Getting Started**](#-quick-start)

</div>

---

## 🧭 Table of Contents
1. [Interactive Architecture & Flow Diagrams](#-interactive-architecture--flow-diagrams)
2. [Core Modules](#-core-modules)
3. [Security & Authentication](#-security--authentication)
4. [Tech Stack](#-tech-stack)
5. [Quick Start (Interactive)](#-quick-start)

---

## 📐 Interactive Architecture & Flow Diagrams

SambaPay uses a decoupled, headless architecture separating the UX from the Backend API. Below are the interactive architectural flow graphs (rendered via Mermaid.js natively in Markdown).

### Core System Flow
```mermaid
graph TD;
    Client([📱 Client/Frontend UX]) -->|HTTPS / REST API| Express[Express.js API Router];
    
    subgraph Security Layer
        Express --> Validate[Validate.js Sanitization];
        Validate --> Auth{Auth & RBAC};
        Auth -->|Invalid Token/Role| Deny([⛔ 403 Forbidden]);
    end

    subgraph Core Business Modules
        Auth -->|Authorized| HR[🏢 Organization Controller];
        Auth -->|Authorized| Payroll[💰 Payroll Engine];
        Auth -->|Authorized| Time[⏳ Attendance Controller];
    end

    subgraph Data Layer
        HR --> Mongoose((Mongoose ORM));
        Payroll --> Mongoose;
        Time --> Mongoose;
        Mongoose --> DB[(MongoDB / BSON)];
    end
```

### Payroll Processing Lifecycle Graph
```mermaid
stateDiagram-v2
    direction LR
    [*] --> Draft : Run Payroll Engine
    Draft --> Pending_Review : Generate Payslips
    Pending_Review --> Approved : HR Manager Approves
    Pending_Review --> Draft : Corrections Required
    Approved --> Disbursed : Funds Transfer & Logging
    Disbursed --> [*]
```

### System Workload Distribution
```mermaid
pie title "SambaPay Average Processing Load"
    "Payroll & Financial Engine" : 45
    "Time & Attendance Tracking" : 25
    "HR & Organization Sync" : 20
    "Reporting & Auditing" : 10
```

---

## 🧩 Core Modules

| Module | Description | Key Controllers |
|:---|:---|:---|
| 🏢 **Organization** | Manages departments, company structure, and active employee contracts. | `OrganizationController`, `EmployeeController` |
| ⏳ **Time & Attendance** | Check-ins, leave allocations, schedules, and time-off tracking. | `AttendanceController`, `LeaveController` |
| 💰 **Payroll Engine** | Financial core handling dynamic salary rules, structures, and payslip generation. | `PayrollController`, `PayslipController` |
| 📊 **Reporting & Audit** | Analytical endpoints for HR reports and compliance audit trails. | `ReportController`, `AuditLog` |

---

## 🛡 Security & Authentication

Security is deeply integrated into the SambaPay API lifecycle.

<details>
<summary><b>🔐 Click to expand Security Details</b></summary>

> - **Authentication Pipeline:** Handled by `authController.js` and the robust `User.js` model. Issues secure sessions/tokens.
> - **Role-Based Access Control (RBAC):** Middleware (`rbac.js`) ensures strict separation of duties (e.g., Admin vs. HR vs. Employee).
> - **Cryptography:** Passwords are irreversibly hashed with `bcrypt` / `bcryptjs`.
> - **Request Sanitization:** Incoming payloads are strictly validated and parsed using `validate.js`, `body-parser`, and `accepts`.
</details>

---

## 💻 Tech Stack

<div align="center">
  <table>
    <tr>
      <td align="center" width="25%"><b>Runtime</b><br><br><img src="https://skillicons.dev/icons?i=nodejs" /></td>
      <td align="center" width="25%"><b>Framework</b><br><br><img src="https://skillicons.dev/icons?i=express" /></td>
      <td align="center" width="25%"><b>Database</b><br><br><img src="https://skillicons.dev/icons?i=mongo" /></td>
      <td align="center" width="25%"><b>Package Manager</b><br><br><img src="https://skillicons.dev/icons?i=npm" /></td>
    </tr>
  </table>
</div>

---

## 🚀 Quick Start 

Follow these steps to get SambaPay running locally.

<details>
<summary><b>⚙️ 1. Environment Setup (Click to Expand)</b></summary>
<br>

Create a `.env` file in the `backend/` directory:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/sambapay
JWT_SECRET=your_super_secret_key
NODE_ENV=development
```
</details>

<details>
<summary><b>📦 2. Installation & Execution (Click to Expand)</b></summary>
<br>

Run the following commands in your terminal:

```bash
# Navigate to the backend directory
cd sambapay/backend

# Install all dependencies (bcrypt, mongoose, body-parser, etc.)
npm install

# Start the server
npm run dev
```
</details>

<br>
<p align="center">
  <i>Developed with ❤️ for enterprise efficiency.</i>
</p>
