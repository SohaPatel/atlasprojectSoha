import base64
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.modules.attendance_ai.schemas import (
    AttendanceCreate,
    AttendanceResponse,
    LeaveRequestCreate,
    LeaveRequestResponse,
)
from app.modules.attendance_ai.models import LeaveStatus
from app.modules.attendance_ai.service import attendance_service

router = APIRouter(prefix="/attendance", tags=["attendance"])


# ── Attendance Endpoints ─────────────────────────────────────────

@router.post("/mark", response_model=AttendanceResponse)
async def mark_attendance(
    data: AttendanceCreate,
    db: AsyncSession = Depends(get_db),
):
    """Mark attendance for a student in a subject."""
    return await attendance_service.mark_attendance(db, data)


@router.get("/all", response_model=List[AttendanceResponse])
async def get_all_attendance(
    db: AsyncSession = Depends(get_db),
):
    """Get all attendance records."""
    return await attendance_service.get_all_attendance(db)


@router.get("/student/{student_id}", response_model=List[AttendanceResponse])
async def get_student_attendance(
    student_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get all attendance records for a specific student."""
    return await attendance_service.get_attendance_by_student(db, student_id)


@router.get("/summary/{student_id}")
async def get_attendance_summary(
    student_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get attendance summary for a student."""
    summary = await attendance_service.get_attendance_summary(db, student_id)
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No attendance records found for this student.",
        )
    return summary


# ── AI Analysis Endpoints ────────────────────────────────────────

@router.get("/analyze/{student_id}")
async def analyze_student_attendance(
    student_id: str,
    db: AsyncSession = Depends(get_db),
):
    """AI-powered analysis of a student's attendance."""
    result = await attendance_service.analyze_student(db, student_id)
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["error"],
        )
    return result


@router.get("/at-risk")
async def get_at_risk_students(
    db: AsyncSession = Depends(get_db),
):
    """Get all students who are at risk due to low attendance."""
    return await attendance_service.get_at_risk_students(db)


# ── Leave Request Endpoints ──────────────────────────────────────

@router.post("/leave", response_model=LeaveRequestResponse)
async def create_leave_request(
    data: LeaveRequestCreate,
    db: AsyncSession = Depends(get_db),
):
    """Submit a leave request. AI will analyze and recommend approval/rejection."""
    return await attendance_service.create_leave_request(db, data)


@router.get("/leave/all", response_model=List[LeaveRequestResponse])
async def get_all_leave_requests(
    db: AsyncSession = Depends(get_db),
):
    """Get all leave requests."""
    return await attendance_service.get_all_leave_requests(db)


@router.get("/leave/student/{student_id}", response_model=List[LeaveRequestResponse])
async def get_student_leave_requests(
    student_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get all leave requests for a specific student."""
    return await attendance_service.get_leave_requests_by_student(db, student_id)


@router.patch("/leave/{leave_id}/approve")
async def approve_leave(
    leave_id: int,
    reviewed_by: str,
    db: AsyncSession = Depends(get_db),
):
    """Approve a leave request."""
    leave = await attendance_service.update_leave_status(
        db, leave_id, LeaveStatus.APPROVED, reviewed_by
    )
    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found.",
        )
    return {"message": "Leave approved successfully", "leave": leave}


@router.patch("/leave/{leave_id}/reject")
async def reject_leave(
    leave_id: int,
    reviewed_by: str,
    db: AsyncSession = Depends(get_db),
):
    """Reject a leave request."""
    leave = await attendance_service.update_leave_status(
        db, leave_id, LeaveStatus.REJECTED, reviewed_by
    )
    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found.",
        )
    return {"message": "Leave rejected successfully", "leave": leave}


# ── Medical Certificate Verification ────────────────────────────

@router.post("/verify-medical-certificate")
async def verify_medical_certificate(
    file: UploadFile = File(...),
):
    """Use AI to verify if uploaded file is a valid medical certificate."""
    from app.services.ai.gemini import gemini_client
    import google.generativeai as genai
    from app.core.config import settings
    import json

    if not gemini_client.is_available():
        return {
            "is_valid": True,
            "message": "AI verification unavailable. Please ensure the document is a valid medical certificate.",
            "confidence": "LOW",
            "detected_as": "Unknown"
        }

    try:
        contents = await file.read()

        filename = file.filename.lower()
        if filename.endswith(".pdf"):
            mime_type = "application/pdf"
        elif filename.endswith(".png"):
            mime_type = "image/png"
        elif filename.endswith((".jpg", ".jpeg")):
            mime_type = "image/jpeg"
        else:
            return {
                "is_valid": False,
                "message": "Invalid file type. Please upload a PDF, JPG, or PNG file.",
                "confidence": "HIGH",
                "detected_as": "Invalid file type"
            }

        model = genai.GenerativeModel("gemini-2.0-flash-exp")

        prompt = """Look at this document carefully.

Determine if this is a legitimate medical certificate or medical report issued by a doctor, hospital, or medical institution.

A valid medical certificate should have:
- Doctor's name, signature, or hospital letterhead
- Patient information
- Medical condition or diagnosis
- Date of issue

Respond in this exact JSON format only, no explanation:
{
    "is_medical_document": true or false,
    "confidence": "HIGH" or "MEDIUM" or "LOW",
    "reason": "brief explanation",
    "detected_as": "what this document appears to be"
}"""

        response = model.generate_content([
            {"mime_type": mime_type, "data": base64.b64encode(contents).decode()},
            prompt
        ])

        clean = response.text.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        if clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]

        result = json.loads(clean.strip())

        return {
            "is_valid": result.get("is_medical_document", False),
            "message": result.get("reason", ""),
            "confidence": result.get("confidence", "LOW"),
            "detected_as": result.get("detected_as", "Unknown document")
        }

    except Exception as e:
        print(f"Medical certificate verification error: {e}")
        return {
            "is_valid": False,
            "message": "Could not verify document. Please ensure it is a clear medical certificate.",
            "confidence": "LOW",
            "detected_as": "Unknown"
        }