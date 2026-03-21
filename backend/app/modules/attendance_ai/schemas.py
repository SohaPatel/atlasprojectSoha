from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from app.modules.attendance_ai.models import AttendanceStatus, LeaveStatus, LeaveType


class AttendanceCreate(BaseModel):
    student_id: str
    student_name: str
    subject: str
    date: date
    status: AttendanceStatus
    marked_by: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: int
    student_id: str
    student_name: str
    subject: str
    date: date
    status: AttendanceStatus
    marked_by: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class LeaveRequestCreate(BaseModel):
    student_id: str
    student_name: str
    leave_type: LeaveType
    from_date: date
    to_date: date
    reason: str


class LeaveRequestResponse(BaseModel):
    id: int
    student_id: str
    student_name: str
    leave_type: LeaveType
    from_date: date
    to_date: date
    reason: str
    status: LeaveStatus
    ai_recommendation: Optional[str]
    ai_risk_score: Optional[float]
    reviewed_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AttendanceSummary(BaseModel):
    student_id: str
    student_name: str
    subject: str
    total_classes: int
    present: int
    absent: int
    late: int
    attendance_percentage: float
    is_at_risk: bool


class AIAnalysisResponse(BaseModel):
    student_id: str
    student_name: str
    overall_percentage: float
    is_at_risk: bool
    risk_level: str
    subjects_at_risk: List[str]
    ai_recommendation: str
    suggested_action: str