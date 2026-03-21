from typing import List, Dict, Any, Optional
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.attendance_ai.models import (
    StudentAttendance,
    LeaveRequest,
    AttendanceStatus,
    LeaveStatus,
)
from app.modules.attendance_ai.schemas import (
    AttendanceCreate,
    LeaveRequestCreate,
)
from app.modules.attendance_ai.agent import attendance_agent


class AttendanceService:

    async def mark_attendance(self, db: AsyncSession, data: AttendanceCreate) -> StudentAttendance:
        record = StudentAttendance(
            student_id=data.student_id,
            student_name=data.student_name,
            subject=data.subject,
            date=data.date,
            status=data.status,
            marked_by=data.marked_by,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return record

    async def get_attendance_by_student(self, db: AsyncSession, student_id: str) -> List[StudentAttendance]:
        result = await db.execute(
            select(StudentAttendance)
            .where(StudentAttendance.student_id == student_id)
            .order_by(StudentAttendance.date.desc())
        )
        return list(result.scalars().all())

    async def get_all_attendance(self, db: AsyncSession) -> List[StudentAttendance]:
        result = await db.execute(
            select(StudentAttendance).order_by(StudentAttendance.date.desc())
        )
        return list(result.scalars().all())

    async def get_attendance_summary(self, db: AsyncSession, student_id: str) -> Dict[str, Any]:
        records = await self.get_attendance_by_student(db, student_id)
        if not records:
            return {}
        total = len(records)
        present = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
        absent = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
        late = sum(1 for r in records if r.status == AttendanceStatus.LATE)
        percentage = ((present + late * 0.5) / total * 100) if total > 0 else 0
        return {
            "student_id": student_id,
            "student_name": records[0].student_name,
            "total_classes": total,
            "present": present,
            "absent": absent,
            "late": late,
            "overall_percentage": round(percentage, 2),
            "is_at_risk": percentage < 75,
        }

    async def analyze_student(self, db: AsyncSession, student_id: str) -> Dict[str, Any]:
        records = await self.get_attendance_by_student(db, student_id)
        if not records:
            return {"error": "No attendance records found for this student."}
        records_data = [
            {
                "subject": r.subject,
                "date": str(r.date),
                "status": r.status.value,
            }
            for r in records
        ]
        student_name = records[0].student_name
        return await attendance_agent.analyze_attendance(
            student_id=student_id,
            student_name=student_name,
            attendance_records=records_data,
        )

    async def get_at_risk_students(self, db: AsyncSession) -> List[Dict[str, Any]]:
        result = await db.execute(select(StudentAttendance))
        all_records = list(result.scalars().all())
        student_map: Dict[str, List] = {}
        for r in all_records:
            if r.student_id not in student_map:
                student_map[r.student_id] = []
            student_map[r.student_id].append(r)
        at_risk = []
        for student_id, records in student_map.items():
            total = len(records)
            present = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
            late = sum(1 for r in records if r.status == AttendanceStatus.LATE)
            percentage = ((present + late * 0.5) / total * 100) if total > 0 else 0
            if percentage < 75:
                at_risk.append({
                    "student_id": student_id,
                    "student_name": records[0].student_name,
                    "overall_percentage": round(percentage, 2),
                    "risk_level": "CRITICAL" if percentage < 60 else "WARNING",
                })
        return at_risk

    async def create_leave_request(self, db: AsyncSession, data: LeaveRequestCreate) -> LeaveRequest:
        attendance_summary = await self.get_attendance_summary(db, data.student_id)
        leave_data = {
            "student_id": data.student_id,
            "student_name": data.student_name,
            "leave_type": data.leave_type.value,
            "from_date": str(data.from_date),
            "to_date": str(data.to_date),
            "reason": data.reason,
        }
        ai_result = await attendance_agent.analyze_leave_request(
            leave_data=leave_data,
            attendance_summary=attendance_summary,
        )
        leave = LeaveRequest(
            student_id=data.student_id,
            student_name=data.student_name,
            leave_type=data.leave_type,
            from_date=data.from_date,
            to_date=data.to_date,
            reason=data.reason,
            status=LeaveStatus.PENDING,
            ai_recommendation=ai_result.get("reason", ""),
            ai_risk_score=ai_result.get("risk_score", 0.5),
        )
        db.add(leave)
        await db.commit()
        await db.refresh(leave)
        return leave

    async def get_all_leave_requests(self, db: AsyncSession) -> List[LeaveRequest]:
        result = await db.execute(
            select(LeaveRequest).order_by(LeaveRequest.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_leave_requests_by_student(self, db: AsyncSession, student_id: str) -> List[LeaveRequest]:
        result = await db.execute(
            select(LeaveRequest)
            .where(LeaveRequest.student_id == student_id)
            .order_by(LeaveRequest.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_leave_status(self, db: AsyncSession, leave_id: int, status: LeaveStatus, reviewed_by: str) -> Optional[LeaveRequest]:
        result = await db.execute(
            select(LeaveRequest).where(LeaveRequest.id == leave_id)
        )
        leave = result.scalar_one_or_none()
        if not leave:
            return None
        leave.status = status
        leave.reviewed_by = reviewed_by
        await db.commit()
        await db.refresh(leave)
        return leave


attendance_service = AttendanceService()

