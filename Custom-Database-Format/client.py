import requests
import time
from datetime import datetime

# Adjust if your server is running on a different IP/Port
BASE_URL = "http://10.169.133.22:8000"
# BASE_URL = "http://127.0.0.1:8000" # Use this if testing locally on the same machine

def print_step(step_num, title, res):
    print(f"\n[{step_num}] {title}")
    print(f"Status Code: {res.status_code}")
    try:
        print("Response:", res.json())
    except Exception:
        print("Response:", res.text)
    print("-" * 50)

def run_client():
    print("🚀 Starting SambaPay Full Workflow Simulation...\n")

    # ==========================================
    # 1. EMPLOYEES & CONTRACTS MODULE
    # ==========================================
    emp_id = "EMP-001"
    
    res = requests.post(f"{BASE_URL}/employees", json={
        "emp_id": emp_id,
        "name": "Karan",
        "department": "Engineering",
        "designation": "Developer",
        "salary": 82000.0
    })
    print_step(1.1, "Create Employee", res)

    res = requests.post(f"{BASE_URL}/contracts", json={
        "contract_id": "CON-001",
        "employee_id": emp_id,
        "employee_name": "Karan",
        "contract_type": "Full-Time",
        "start_date": "2026-09-01",
        "end_date": "2027-09-01",
        "salary": 82000.0,
        "status": "Active"
    })
    print_step(1.2, "Create Contract for Employee", res)

    # ==========================================
    # 2. USERS / AUTHENTICATION MODULE
    # ==========================================
    user_id = "USR-001"
    email = "karan@sambapay.local"
    password = "hashed_pw_123"

    res = requests.post(f"{BASE_URL}/users", json={
        "user_id": user_id,
        "employee_id": emp_id,
        "name": "Karan",
        "email": email,
        "password_hash": password,
        "role": "EMPLOYEE",
        "status": "active"
    })
    print_step(2.1, "Create User Account", res)

    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password_hash": password
    })
    print_step(2.2, "Test User Login", res)

    # ==========================================
    # 3. ATTENDANCE MODULE
    # ==========================================
    # Note: FastAPI expects raw string for a single Body(...) parameter without embed=True
    res = requests.post(f"{BASE_URL}/attendance/clock-in", json=emp_id)
    print_step(3.1, "Clock In", res)
    
    attendance_id = res.json().get("attendance_id")

    print("   [~] Simulating working hours (waiting 2 seconds)...")
    time.sleep(2)

    res = requests.put(f"{BASE_URL}/attendance/{attendance_id}/clock-out")
    print_step(3.2, "Clock Out (Calculates Hours)", res)

    # ==========================================
    # 4. LEAVES MODULE
    # ==========================================
    leave_id = "LEV-001"
    res = requests.post(f"{BASE_URL}/leaves", json={
        "leave_id": leave_id,
        "employee_id": emp_id,
        "leave_type": "Sick Leave",
        "start_date": "2026-09-10",
        "end_date": "2026-09-11",
        "days": 2.0,
        "reason": "Fever",
        "status": "Pending",
        "approved_by": None
    })
    print_step(4.1, "Submit Leave Request", res)

    # Admin approves the leave
    res = requests.put(f"{BASE_URL}/leaves/{leave_id}/approve", json={
        "admin_id": "ADMIN-999" # Sent as JSON because of Body(embed=True) in server
    })
    print_step(4.2, "HR Approves Leave", res)

    # ==========================================
    # 5. PAYROLL MODULE
    # ==========================================
    payroll_id = "PAY-001"
    res = requests.post(f"{BASE_URL}/payroll", json={
        "payroll_id": payroll_id,
        "employee_id": emp_id,
        "period": "2026-09",
        "basic_salary": 82000.0,
        "allowances": 5000.0,
        "deductions": 1500.0,
        "net_salary": 0.0,
        "status": "Draft"
    })
    print_step(5.1, "Create Draft Payroll", res)

    res = requests.post(f"{BASE_URL}/payroll/{payroll_id}/calculate")
    print_step(5.2, "Calculate Net Salary", res)

    res = requests.put(f"{BASE_URL}/payroll/{payroll_id}/approve")
    print_step(5.3, "Approve Payroll", res)

    res = requests.put(f"{BASE_URL}/payroll/{payroll_id}/paid")
    print_step(5.4, "Mark Payroll as Paid", res)

    # ==========================================
    # 6. PAYSLIPS MODULE
    # ==========================================
    res = requests.post(f"{BASE_URL}/payslips/{payroll_id}/generate")
    print_step(6.1, "Generate Payslip from Paid Payroll", res)

    res = requests.get(f"{BASE_URL}/payslips/employee/{emp_id}")
    print_step(6.2, "Fetch Employee Payslips", res)

    # ==========================================
    # 7. NOTIFICATIONS MODULE
    # ==========================================
    res = requests.post(f"{BASE_URL}/notifications", json={
        "notification_id": "NOT-001",
        "user_id": user_id,
        "title": "Payslip Available",
        "message": "Your September 2026 payslip has been generated.",
        "type": "payslip",
        "read": False,
        "created_at": datetime.now().isoformat()
    })
    print_step(7.1, "Send Notification to User", res)

    res = requests.get(f"{BASE_URL}/notifications/unread/{user_id}")
    print_step(7.2, "Get Unread Notifications", res)

    res = requests.put(f"{BASE_URL}/notifications/read-all/{user_id}")
    print_step(7.3, "Mark All Notifications as Read", res)

if __name__ == "__main__":
    run_client()