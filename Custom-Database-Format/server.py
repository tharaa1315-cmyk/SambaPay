from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Body, Header, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import threading
from datetime import datetime
import uuid
from fastapi.middleware.cors import CORSMiddleware

# Import the new universal Rust engine
from blaze_rust import BlazeCollection

# --- Global State & Threading ---
dbs: Dict[str, BlazeCollection] = {}
db_lock = threading.Lock()

# --- Database Schemas Mapping for Rust Engine ---
SCHEMAS = {
    "users": {
        "user_id": "str", "employee_id": "str", "name": "str", "email": "str",
        "password_hash": "str", "role": "str", "status": "str"
    },
    "employees": {
        "emp_id": "str", "name": "str", "department": "str", 
        "designation": "str", "salary": "float"
    },
    "attendance": {
        "attendance_id": "str", "employee_id": "str", "date": "str", 
        "check_in": "str", "check_out": "str", "status": "str", "working_hours": "float"
    },
    "leaves": {
        "leave_id": "str", "employee_id": "str", "leave_type": "str", "start_date": "str",
        "end_date": "str", "days": "float", "reason": "str", "status": "str", "approved_by": "str"
    },
    "payroll": {
        "payroll_id": "str", "employee_id": "str", "period": "str", "basic_salary": "float",
        "allowances": "float", "deductions": "float", "net_salary": "float", "status": "str"
    },
    "payslips": {
        "payslip_id": "str", "employee_id": "str", "employee_name": "str", "period": "str",
        "basic_salary": "float", "allowances": "float", "deductions": "float", 
        "net_salary": "float", "status": "str"
    },
    "contracts": {
        "contract_id": "str", "employee_id": "str", "employee_name": "str", "contract_type": "str",
        "start_date": "str", "end_date": "str", "salary": "float", "status": "str"
    },
    "notifications": {
        "notification_id": "str", "user_id": "str", "title": "str", "message": "str",
        "type": "str", "read": "bool", "created_at": "str"
    },
    "settings": {
        "category": "str", "key": "str", "value": "str", "type": "str"
    }
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    global dbs
    print("[*] Initializing SambaPay Database Modules...")
    
    # Initialize 9 separate isolated collections with optimal Trie indices
    dbs["users"] = BlazeCollection("db_users", index_field="user_id", schema=SCHEMAS["users"])
    dbs["employees"] = BlazeCollection("db_employees", index_field="emp_id", schema=SCHEMAS["employees"])
    dbs["attendance"] = BlazeCollection("db_attendance", index_field="attendance_id", schema=SCHEMAS["attendance"])
    dbs["leaves"] = BlazeCollection("db_leaves", index_field="leave_id", schema=SCHEMAS["leaves"])
    dbs["payroll"] = BlazeCollection("db_payroll", index_field="payroll_id", schema=SCHEMAS["payroll"])
    dbs["payslips"] = BlazeCollection("db_payslips", index_field="payslip_id", schema=SCHEMAS["payslips"])
    dbs["contracts"] = BlazeCollection("db_contracts", index_field="contract_id", schema=SCHEMAS["contracts"])
    dbs["notifications"] = BlazeCollection("db_notifs", index_field="user_id", schema=SCHEMAS["notifications"])
    dbs["settings"] = BlazeCollection("db_settings", index_field="key", schema=SCHEMAS["settings"])
    
    print("[*] All 9 collections successfully loaded from disk.")
    yield
    
    with db_lock:
        for name, collection in dbs.items():
            collection.flush()
    print("[*] Database successfully flushed and saved on shutdown.")

app = FastAPI(title="SambaPay HRMS API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5176",
        "http://localhost:5174",
        "http://localhost:5173",
        "*" # Broad allowance for local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class LoginModel(BaseModel):
    email: str
    password: Optional[str] = None
    password_hash: Optional[str] = None

class UserModel(BaseModel):
    user_id: str
    employee_id: str
    name: str
    email: str
    password_hash: str
    role: str
    status: str = "active"

class EmployeeModel(BaseModel):
    emp_id: str
    name: str
    department: str
    designation: str
    salary: float

class AttendanceModel(BaseModel):
    attendance_id: str
    employee_id: str
    date: str
    check_in: str
    check_out: Optional[str] = None
    status: str = "Present"
    working_hours: Optional[float] = 0.0

class LeaveModel(BaseModel):
    leave_id: str
    employee_id: str
    leave_type: str
    start_date: str
    end_date: str
    days: float
    reason: str
    status: str = "Pending"
    approved_by: Optional[str] = None

class PayrollModel(BaseModel):
    payroll_id: str
    employee_id: str
    period: str
    basic_salary: float
    allowances: float = 0.0
    deductions: float = 0.0
    net_salary: float = 0.0
    status: str = "Draft"

class ContractModel(BaseModel):
    contract_id: str
    employee_id: str
    employee_name: str
    contract_type: str
    start_date: str
    end_date: Optional[str] = None # Modified to Optional per instructions
    salary: float
    status: str = "Active"

class NotificationModel(BaseModel):
    notification_id: str
    user_id: str
    title: str
    message: str
    type: str
    read: bool = False
    created_at: str

class SettingModel(BaseModel):
    category: str
    key: str
    value: str
    type: str = "text"

# --- Helper Functions ---
def to_dict(model: BaseModel) -> dict:
    return model.model_dump(exclude_unset=True)

def format_record(data: dict, id_field: str = None) -> dict:
    """Injects compatibility fields (id, employeeId, etc.) and hides sensitive info."""
    if not data: return data
    if "password_hash" in data:
        del data["password_hash"]
    
    # Add generic 'id' field for frontend maps
    if id_field and id_field in data:
        data["id"] = data[id_field]
    elif "record_id" in data:
        data["id"] = data["record_id"]
        
    # Standardize relational IDs for frontend compatibility
    if "emp_id" in data: data["employee_id"] = data["emp_id"]
    if "employee_id" in data: data["employeeId"] = data["employee_id"]
    if "user_id" in data: data["userId"] = data["user_id"]
    
    return data

def fetch_one(collection_name: str, index_val: str, id_field: str = None) -> dict:
    res = dbs[collection_name].search_by_index(index_val)
    if not res:
        raise HTTPException(status_code=404, detail=f"Record '{index_val}' not found in {collection_name}")
    return format_record(res[0].get_fields(), id_field)

def get_db_size(collection_name: str):
    return len(dbs[collection_name].search_all())


# ==========================================
# 1. USERS / AUTHENTICATION MODULE
# ==========================================
@app.post("/auth/login")
def login(req: LoginModel):
    pw_hash = req.password_hash or req.password
    res = dbs["users"].search_conditional({"email": req.email, "password_hash": pw_hash})
    if not res:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_data = format_record(res[0].get_fields(), "user_id")
    return {"status": "success", "token": "mock_jwt_token_123", "user": user_data}

@app.get("/auth/me")
def auth_me(authorization: Optional[str] = Header(None)):
    if not authorization or "mock_jwt_token_123" not in authorization:
        raise HTTPException(status_code=401, detail="Unauthorized token")
    
    # Return first user as a mock for frontend stability
    users = dbs["users"].search_all(limit=1)
    if not users:
        raise HTTPException(status_code=404, detail="No users exist")
    return format_record(users[0].get_fields(), "user_id")

@app.post("/users")
def create_user(user: UserModel):
    with db_lock:
        dbs["users"].insert(to_dict(user))
    return {"status": "success", "user_id": user.user_id}

@app.get("/users")
def get_all_users():
    return [format_record(r.get_fields(), "user_id") for r in dbs["users"].search_all()]

@app.get("/users/{user_id}")
def get_user(user_id: str):
    return fetch_one("users", user_id, "user_id")

@app.put("/users/{user_id}/status")
def update_user_status(user_id: str, status: str = Body(embed=True)):
    with db_lock:
        count = dbs["users"].update_conditional({"user_id": user_id}, {"status": status})
    return {"status": "success", "updated": count}


# ==========================================
# 2. EMPLOYEES MODULE
# ==========================================
@app.post("/employees")
def create_employee(emp: EmployeeModel):
    with db_lock:
        dbs["employees"].insert(to_dict(emp))
    return {"status": "success", "emp_id": emp.emp_id}

@app.get("/employees")
def get_all_employees():
    return [format_record(r.get_fields(), "emp_id") for r in dbs["employees"].search_all()]

@app.get("/employees/search")
def search_employees(department: Optional[str] = None, designation: Optional[str] = None):
    filters = {}
    if department: filters["department"] = department
    if designation: filters["designation"] = designation
    return [format_record(r.get_fields(), "emp_id") for r in dbs["employees"].search_conditional(filters)]

@app.get("/employees/{emp_id}")
def get_employee(emp_id: str):
    return fetch_one("employees", emp_id, "emp_id")

@app.put("/employees/{emp_id}")
def update_employee(emp_id: str, payload: Dict[str, Any] = Body(...)):
    with db_lock:
        dbs["employees"].update_conditional({"emp_id": emp_id}, payload)
    return {"status": "success"}

@app.delete("/employees/{emp_id}")
def delete_employee(emp_id: str):
    with db_lock:
        dbs["employees"].delete_conditional({"emp_id": emp_id})
    return {"status": "success"}


# ==========================================
# 3. ATTENDANCE MODULE
# ==========================================
@app.post("/attendance")
def create_attendance(att: AttendanceModel):
    with db_lock:
        dbs["attendance"].insert(to_dict(att))
    return {"status": "success", "attendance_id": att.attendance_id}

@app.get("/attendance")
def get_attendances(date: Optional[str] = None, employee_id: Optional[str] = None, employeeId: Optional[str] = None):
    emp_ref = employee_id or employeeId
    filters = {}
    if date: filters["date"] = date
    if emp_ref: filters["employee_id"] = emp_ref
    
    if not filters:
        return [format_record(r.get_fields(), "attendance_id") for r in dbs["attendance"].search_all()]
    return [format_record(r.get_fields(), "attendance_id") for r in dbs["attendance"].search_conditional(filters)]

@app.put("/attendance/{attendance_id}")
def update_attendance(attendance_id: str, payload: Dict[str, Any] = Body(...)):
    with db_lock:
        dbs["attendance"].update_conditional({"attendance_id": attendance_id}, payload)
    return {"status": "success"}

@app.delete("/attendance/{attendance_id}")
def delete_attendance(attendance_id: str):
    with db_lock:
        dbs["attendance"].delete_conditional({"attendance_id": attendance_id})
    return {"status": "success"}

@app.post("/attendance/clock-in")
def clock_in(employee_id: str = Body(...)):
    att_id = f"ATT-{uuid.uuid4().hex[:8]}"
    now = datetime.now()
    att = AttendanceModel(
        attendance_id=att_id,
        employee_id=employee_id,
        date=now.strftime("%Y-%m-%d"),
        check_in=now.strftime("%H:%M")
    )
    with db_lock:
        dbs["attendance"].insert(to_dict(att))
    return {"status": "clocked_in", "attendance_id": att_id, "time": att.check_in}

@app.put("/attendance/{attendance_id}/clock-out")
def clock_out(attendance_id: str):
    try:
        record = fetch_one("attendance", attendance_id)
    except:
        raise HTTPException(status_code=404, detail="Attendance record not found")
        
    if record.get("check_out"):
        raise HTTPException(status_code=400, detail="Already clocked out")
    
    now = datetime.now()
    check_out_str = now.strftime("%H:%M")
    
    fmt = "%H:%M"
    t1 = datetime.strptime(record["check_in"], fmt)
    t2 = datetime.strptime(check_out_str, fmt)
    hours = round((t2 - t1).total_seconds() / 3600.0, 2)

    with db_lock:
        dbs["attendance"].update_conditional(
            {"attendance_id": attendance_id},
            {"check_out": check_out_str, "working_hours": hours}
        )
    return {"status": "clocked_out", "working_hours": hours}

@app.get("/attendance/employee/{employee_id}")
def get_employee_attendance(employee_id: str):
    return [format_record(r.get_fields(), "attendance_id") for r in dbs["attendance"].search_conditional({"employee_id": employee_id})]


# ==========================================
# 4. LEAVES / TIME-OFF MODULE
# ==========================================
@app.post("/leaves")
@app.post("/leave")
def submit_leave(leave: LeaveModel):
    with db_lock:
        dbs["leaves"].insert(to_dict(leave))
    return {"status": "submitted", "leave_id": leave.leave_id}

@app.get("/leaves")
@app.get("/leave")
def get_all_leaves(employee_id: Optional[str] = None, employeeId: Optional[str] = None, status: Optional[str] = None):
    emp_ref = employee_id or employeeId
    filters = {}
    if emp_ref: filters["employee_id"] = emp_ref
    if status: filters["status"] = status
    
    if filters:
        return [format_record(r.get_fields(), "leave_id") for r in dbs["leaves"].search_conditional(filters)]
    return [format_record(r.get_fields(), "leave_id") for r in dbs["leaves"].search_all()]

@app.get("/leaves/{leave_id}")
@app.get("/leave/{leave_id}")
def get_leave(leave_id: str):
    return fetch_one("leaves", leave_id, "leave_id")

@app.put("/leaves/{leave_id}")
@app.put("/leave/{leave_id}")
def update_leave(leave_id: str, payload: Dict[str, Any] = Body(...)):
    with db_lock:
        dbs["leaves"].update_conditional({"leave_id": leave_id}, payload)
    return {"status": "success"}

@app.delete("/leaves/{leave_id}")
@app.delete("/leave/{leave_id}")
def delete_leave(leave_id: str):
    with db_lock:
        dbs["leaves"].delete_conditional({"leave_id": leave_id})
    return {"status": "success"}

@app.put("/leaves/{leave_id}/{action}")
@app.put("/leave/{leave_id}/{action}")
def process_leave(leave_id: str, action: str, admin_id: Optional[str] = Body("SYSTEM", embed=True)):
    status_map = {"approve": "Approved", "reject": "Rejected", "cancel": "Cancelled"}
    if action not in status_map:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    with db_lock:
        dbs["leaves"].update_conditional(
            {"leave_id": leave_id},
            {"status": status_map[action], "approved_by": admin_id}
        )
    return {"status": status_map[action]}

@app.get("/leaves/employee/{employee_id}")
@app.get("/leave/employee/{employee_id}")
def get_employee_leaves(employee_id: str):
    return [format_record(r.get_fields(), "leave_id") for r in dbs["leaves"].search_conditional({"employee_id": employee_id})]


# ==========================================
# 5. PAYROLL MODULE
# ==========================================
@app.post("/payroll")
def create_payroll(payroll: PayrollModel):
    with db_lock:
        dbs["payroll"].insert(to_dict(payroll))
    return {"status": "created", "payroll_id": payroll.payroll_id}

@app.get("/payroll")
def get_payrolls():
    return [format_record(r.get_fields(), "payroll_id") for r in dbs["payroll"].search_all()]

@app.get("/payroll/{payroll_id}")
def get_payroll(payroll_id: str):
    return fetch_one("payroll", payroll_id, "payroll_id")

@app.put("/payroll/{payroll_id}")
def update_payroll_data(payroll_id: str, payload: Dict[str, Any] = Body(...)):
    with db_lock:
        dbs["payroll"].update_conditional({"payroll_id": payroll_id}, payload)
    return {"status": "success"}

@app.delete("/payroll/{payroll_id}")
def delete_payroll(payroll_id: str):
    with db_lock:
        dbs["payroll"].delete_conditional({"payroll_id": payroll_id})
    return {"status": "success"}

@app.post("/payroll/{payroll_id}/calculate")
def calculate_payroll(payroll_id: str):
    rec = fetch_one("payroll", payroll_id)
    net = rec.get("basic_salary", 0) + rec.get("allowances", 0) - rec.get("deductions", 0)
    
    with db_lock:
        dbs["payroll"].update_conditional(
            {"payroll_id": payroll_id},
            {"net_salary": net, "status": "Calculated"}
        )
    return {"status": "calculated", "net_salary": net}

@app.put("/payroll/{payroll_id}/{action}")
def update_payroll_state(payroll_id: str, action: str):
    state_map = {"approve": "Approved", "process": "Processed", "paid": "Paid"}
    if action not in state_map:
        raise HTTPException(status_code=400, detail="Invalid state transition")
    
    with db_lock:
        dbs["payroll"].update_conditional({"payroll_id": payroll_id}, {"status": state_map[action]})
    return {"status": state_map[action]}


# ==========================================
# 6. PAYSLIPS MODULE
# ==========================================
@app.post("/payslips")
def create_payslip(data: Dict[str, Any] = Body(...)):
    with db_lock:
        dbs["payslips"].insert(data)
    return {"status": "success"}

@app.get("/payslips")
def get_all_payslips():
    return [format_record(r.get_fields(), "payslip_id") for r in dbs["payslips"].search_all()]

@app.get("/payslips/{payslip_id}")
def get_payslip(payslip_id: str):
    return fetch_one("payslips", payslip_id, "payslip_id")

@app.put("/payslips/{payslip_id}")
def update_payslip(payslip_id: str, payload: Dict[str, Any] = Body(...)):
    with db_lock:
        dbs["payslips"].update_conditional({"payslip_id": payslip_id}, payload)
    return {"status": "success"}

@app.delete("/payslips/{payslip_id}")
def delete_payslip(payslip_id: str):
    with db_lock:
        dbs["payslips"].delete_conditional({"payslip_id": payslip_id})
    return {"status": "success"}

@app.post("/payslips/{payroll_id}/generate")
def generate_payslip(payroll_id: str):
    payslip_id = f"PS-{payroll_id}"
    
    # Duplicate Check to prevent 500 error
    existing = dbs["payslips"].search_by_index(payslip_id)
    if existing:
        return {"status": "generated", "payslip_id": payslip_id, "message": "Already generated"}

    payroll = fetch_one("payroll", payroll_id)
    if payroll.get("status") != "Paid":
        raise HTTPException(status_code=400, detail="Payroll must be Paid before generating a payslip")
    
    try:
        employee = fetch_one("employees", payroll["employee_id"])
        emp_name = employee.get("name", "Unknown")
    except:
        emp_name = "Unknown"

    payslip_data = {
        "payslip_id": payslip_id,
        "employee_id": payroll["employee_id"],
        "employee_name": emp_name,
        "period": payroll["period"],
        "basic_salary": payroll["basic_salary"],
        "allowances": payroll["allowances"],
        "deductions": payroll["deductions"],
        "net_salary": payroll["net_salary"],
        "status": "Generated"
    }

    with db_lock:
        dbs["payslips"].insert(payslip_data)
    
    return {"status": "generated", "payslip_id": payslip_id}

@app.get("/payslips/employee/{employee_id}")
def get_employee_payslips(employee_id: str):
    return [format_record(r.get_fields(), "payslip_id") for r in dbs["payslips"].search_conditional({"employee_id": employee_id})]


# ==========================================
# 7. CONTRACTS MODULE
# ==========================================
@app.post("/contracts")
def create_contract(contract: ContractModel):
    with db_lock:
        dbs["contracts"].insert(to_dict(contract))
    return {"status": "success", "contract_id": contract.contract_id}

@app.get("/contracts")
def get_contracts():
    return [format_record(r.get_fields(), "contract_id") for r in dbs["contracts"].search_all()]

@app.get("/contracts/{contract_id}")
def get_contract(contract_id: str):
    return fetch_one("contracts", contract_id, "contract_id")

@app.put("/contracts/{contract_id}")
def update_contract(contract_id: str, payload: Dict[str, Any] = Body(...)):
    with db_lock:
        dbs["contracts"].update_conditional({"contract_id": contract_id}, payload)
    return {"status": "success"}

@app.delete("/contracts/{contract_id}")
def delete_contract(contract_id: str):
    with db_lock:
        dbs["contracts"].delete_conditional({"contract_id": contract_id})
    return {"status": "success"}

@app.put("/contracts/{contract_id}/{action}")
def modify_contract_state(contract_id: str, action: str):
    state_map = {"activate": "Active", "expire": "Expired", "renew": "Renewed"}
    if action not in state_map:
        raise HTTPException(status_code=400, detail="Invalid contract action")

    with db_lock:
        dbs["contracts"].update_conditional({"contract_id": contract_id}, {"status": state_map[action]})
    return {"status": state_map[action]}


# ==========================================
# 8. NOTIFICATIONS MODULE
# ==========================================
@app.post("/notifications")
def create_notification(notif: NotificationModel):
    with db_lock:
        dbs["notifications"].insert(to_dict(notif))
    return {"status": "success", "notification_id": notif.notification_id}

@app.get("/notifications")
def get_notifications(user_id: Optional[str] = None, userId: Optional[str] = None):
    target_user = user_id or userId
    if target_user:
        return [format_record(r.get_fields(), "notification_id") for r in dbs["notifications"].search_by_index(target_user)]
    return [format_record(r.get_fields(), "notification_id") for r in dbs["notifications"].search_all()]

@app.get("/notifications/{notification_id}")
def get_notification(notification_id: str):
    res = dbs["notifications"].search_conditional({"notification_id": notification_id})
    if not res:
        raise HTTPException(status_code=404, detail="Notification not found")
    return format_record(res[0].get_fields(), "notification_id")

@app.put("/notifications/{notif_id}/read")
def mark_read(notif_id: str):
    with db_lock:
        dbs["notifications"].update_conditional({"notification_id": notif_id}, {"read": True})
    return {"status": "read"}

@app.put("/notifications/read-all/{user_id}")
def mark_all_read(user_id: str):
    with db_lock:
        count = dbs["notifications"].update_conditional({"user_id": user_id, "read": False}, {"read": True})
    return {"status": "success", "marked_read": count}

@app.get("/notifications/unread/{user_id}")
def get_unread(user_id: str):
    return [format_record(r.get_fields(), "notification_id") for r in dbs["notifications"].search_conditional({"user_id": user_id, "read": False})]


# ==========================================
# 9. DASHBOARD & REPORTS MODULE
# ==========================================
@app.get("/dashboard/stats")
def get_dashboard_stats():
    return {
        "employees": get_db_size("employees"),
        "present_today": len(dbs["attendance"].search_conditional({"date": datetime.now().strftime("%Y-%m-%d")})),
        "pending_leaves": len(dbs["leaves"].search_conditional({"status": "Pending"})),
        "active_contracts": len(dbs["contracts"].search_conditional({"status": "Active"})),
        "payroll_pending": len(dbs["payroll"].search_conditional({"status": "Draft"}))
    }

@app.get("/reports/employees")
def report_employees():
    return [format_record(r.get_fields(), "emp_id") for r in dbs["employees"].search_all()]

@app.get("/reports/attendance")
def report_attendance():
    return [format_record(r.get_fields(), "attendance_id") for r in dbs["attendance"].search_all()]

@app.get("/reports/payroll")
def report_payroll():
    return [format_record(r.get_fields(), "payroll_id") for r in dbs["payroll"].search_all()]

@app.get("/reports/leave")
def report_leave():
    return [format_record(r.get_fields(), "leave_id") for r in dbs["leaves"].search_all()]


# ==========================================
# 10. SETTINGS MODULE
# ==========================================
@app.get("/settings")
def get_settings(category: Optional[str] = None):
    if category:
        return [format_record(r.get_fields()) for r in dbs["settings"].search_conditional({"category": category})]
    return [format_record(r.get_fields()) for r in dbs["settings"].search_all()]

@app.put("/settings")
def upsert_setting(setting: SettingModel):
    with db_lock:
        existing = dbs["settings"].search_conditional({"category": setting.category, "key": setting.key})
        if existing:
            dbs["settings"].update(existing[0].record_id, to_dict(setting))
        else:
            dbs["settings"].insert(to_dict(setting))
    return {"status": "success", "setting": to_dict(setting)}