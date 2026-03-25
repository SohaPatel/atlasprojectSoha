import json
from typing import List, Dict, Any
from app.services.ai.gemini import gemini_client


class AttendanceAIAgent:

    ATTENDANCE_ANALYSIS_PROMPT = """You are an intelligent university attendance management agent.

Analyze the following student attendance data and provide insights:

Student Data:
{data}

University Rules:
- Minimum attendance required: 75%
- Students below 75% are at risk of not being allowed to sit in exams
- Students below 60% are in critical condition
- Late arrivals count as 0.5 attendance

Provide your analysis in the following JSON format only, no explanation:
{{
    "risk_level": "SAFE|WARNING|CRITICAL",
    "overall_percentage": <float>,
    "is_at_risk": <true|false>,
    "subjects_at_risk": ["subject1", "subject2"],
    "ai_recommendation": "detailed recommendation for the student mentioning exact percentage",
    "suggested_action": "specific action to take"
}}"""

    LEAVE_ANALYSIS_PROMPT = """You are an intelligent university leave management agent.

Analyze the following leave request and attendance record carefully.

Leave Request Details:
{leave_data}

Student Attendance Summary:
{attendance_data}

University Leave Rules:
- Minimum attendance required: 75%
- Medical leaves are generally approved if supported by reason
- Students with attendance below 75% need special consideration
- Leaves longer than 5 days need strong justification
- Personal leaves are approved based on current attendance standing

IMPORTANT INSTRUCTIONS:
- You MUST mention the student's EXACT attendance percentage in your reason
- You MUST mention the exact number of days requested
- You MUST mention the leave type
- Make the response feel personal and specific to THIS student
- Example of good reason: "Student John has 62.5% attendance and is requesting 3 days of Medical leave. Approving this will drop attendance further below the critical 60% threshold."
- Example of bad reason: "Student attendance is below 75%." (too generic)

Provide your decision in the following JSON format only, no explanation:
{{
    "recommendation": "APPROVE|REJECT|REVIEW",
    "risk_score": <float between 0 and 1, higher means more risky to approve>,
    "reason": "personalised reason mentioning exact attendance percentage, leave type, and number of days",
    "conditions": "specific conditions for this particular student"
}}"""

    async def analyze_attendance(self, student_id: str, student_name: str, attendance_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not gemini_client.is_available():
            return self._get_demo_analysis(student_id, student_name, attendance_records)

        total = len(attendance_records)
        present = sum(1 for r in attendance_records if r["status"] == "PRESENT")
        late = sum(1 for r in attendance_records if r["status"] == "LATE")
        absent = sum(1 for r in attendance_records if r["status"] == "ABSENT")
        percentage = ((present + late * 0.5) / total * 100) if total > 0 else 0

        subjects = {}
        for record in attendance_records:
            subj = record["subject"]
            if subj not in subjects:
                subjects[subj] = {"present": 0, "absent": 0, "late": 0, "total": 0}
            subjects[subj]["total"] += 1
            subjects[subj][record["status"].lower()] += 1

        data = {
            "student_id": student_id,
            "student_name": student_name,
            "total_classes": total,
            "present": present,
            "absent": absent,
            "late": late,
            "overall_percentage": round(percentage, 2),
            "subject_wise": subjects,
        }

        prompt = self.ATTENDANCE_ANALYSIS_PROMPT.format(data=json.dumps(data, indent=2))

        try:
            response = await gemini_client.generate_text(prompt=prompt, temperature=0.2)
            clean = response.strip()
            if clean.startswith("```json"):
                clean = clean[7:]
            if clean.startswith("```"):
                clean = clean[3:]
            if clean.endswith("```"):
                clean = clean[:-3]
            result = json.loads(clean.strip())
            result["student_id"] = student_id
            result["student_name"] = student_name
            result["overall_percentage"] = round(percentage, 2)
            return result
        except Exception as e:
            print(f"AI analysis error: {e}")
            return self._get_demo_analysis(student_id, student_name, attendance_records)

    async def analyze_leave_request(self, leave_data: Dict[str, Any], attendance_summary: Dict[str, Any]) -> Dict[str, Any]:
        if not gemini_client.is_available():
            return self._get_demo_leave_recommendation(leave_data, attendance_summary)

        prompt = self.LEAVE_ANALYSIS_PROMPT.format(
            leave_data=json.dumps(leave_data, indent=2),
            attendance_data=json.dumps(attendance_summary, indent=2),
        )

        try:
            response = await gemini_client.generate_text(prompt=prompt, temperature=0.2)
            clean = response.strip()
            if clean.startswith("```json"):
                clean = clean[7:]
            if clean.startswith("```"):
                clean = clean[3:]
            if clean.endswith("```"):
                clean = clean[:-3]
            result = json.loads(clean.strip())
            return result
        except Exception as e:
            print(f"Leave analysis error: {e}")
            return self._get_demo_leave_recommendation(leave_data, attendance_summary)

    def _get_demo_analysis(self, student_id: str, student_name: str, attendance_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        total = len(attendance_records)
        present = sum(1 for r in attendance_records if r["status"] == "PRESENT")
        late = sum(1 for r in attendance_records if r["status"] == "LATE")
        percentage = ((present + late * 0.5) / total * 100) if total > 0 else 0
        if percentage >= 75:
            risk_level = "SAFE"
        elif percentage >= 60:
            risk_level = "WARNING"
        else:
            risk_level = "CRITICAL"
        return {
            "student_id": student_id,
            "student_name": student_name,
            "overall_percentage": round(percentage, 2),
            "is_at_risk": percentage < 75,
            "risk_level": risk_level,
            "subjects_at_risk": [],
            "ai_recommendation": f"Student {student_name} has {round(percentage, 2)}% attendance out of {total} total classes. {'Attendance is satisfactory and above the 75% threshold.' if percentage >= 75 else f'Attendance is below the required 75% threshold. Student has been absent for {total - present} out of {total} classes.'}",
            "suggested_action": "No action needed. Keep maintaining good attendance." if percentage >= 75 else f"Student must attend all remaining classes. Currently at {round(percentage, 2)}% which is {round(75 - percentage, 2)}% below the required threshold.",
        }

    def _get_demo_leave_recommendation(self, leave_data: Dict[str, Any], attendance_summary: Dict[str, Any]) -> Dict[str, Any]:
        percentage = attendance_summary.get("overall_percentage", 100)
        leave_type = leave_data.get("leave_type", "OTHER")
        days_requested = leave_data.get("days_requested", 1)
        student_name = leave_data.get("student_name", "Student")
        total_classes = attendance_summary.get("total_classes", 0)

        if percentage < 75:
            return {
                "recommendation": "REJECT",
                "risk_score": 0.8,
                "reason": f"{student_name} currently has {percentage}% attendance and is requesting {days_requested} day(s) of {leave_type} leave. With attendance already {round(75 - percentage, 2)}% below the required 75% threshold across {total_classes} total classes, approving this leave will worsen the situation significantly.",
                "conditions": "Leave can only be approved with a medical certificate and HOD approval. Student must attend all remaining classes without exception.",
            }
        elif leave_type == "MEDICAL":
            return {
                "recommendation": "APPROVE",
                "risk_score": 0.2,
                "reason": f"{student_name} has a healthy {percentage}% attendance and is requesting {days_requested} day(s) of medical leave. Given their strong attendance record and the medical nature of the request, this leave is recommended for approval.",
                "conditions": "Please submit a valid medical certificate within 3 days of returning to college.",
            }
        else:
            return {
                "recommendation": "APPROVE",
                "risk_score": 0.3,
                "reason": f"{student_name} currently has {percentage}% attendance which is above the required 75% threshold. Requesting {days_requested} day(s) of {leave_type} leave. Attendance standing is satisfactory for approval.",
                "conditions": "Ensure all missed assignments and coursework are submitted on time after returning.",
            }


attendance_agent = AttendanceAIAgent()