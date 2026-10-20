
import re
from collections import defaultdict
from datetime import timedelta

from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.evidence import Evidence


class AnomalyDetectionService:
    """Explainable, rule-based anomaly detection for case events."""

    AFTER_HOURS_START = 20  # 8 PM
    AFTER_HOURS_END = 6      # 6 AM

    FAILED_LOGIN_WINDOW_MINUTES = 5
    FAILED_LOGIN_THRESHOLD = 5

    def __init__(self, db: Session):
        self.db = db

    def analyze_case(self, case_id: int) -> dict:
        """Analyze extracted events belonging to one case."""

        rows = (
            self.db.query(Event, Evidence)
            .join(Evidence, Event.evidence_id == Evidence.id)
            .filter(Evidence.case_id == case_id)
            .order_by(Event.timestamp.asc(), Event.id.asc())
            .all()
        )

        findings = []
        events_by_user = defaultdict(list)

        for event, evidence in rows:
            text = " ".join(
                part for part in (
                    event.event_type or "",
                    event.description or "",
                    event.source_text or "",
                )
                if part
            )
            normalized = text.lower()

            if event.timestamp is not None:
                if (
                    event.timestamp.hour >= self.AFTER_HOURS_START
                    or event.timestamp.hour < self.AFTER_HOURS_END
                ):
                    findings.append(
                        self._finding(
                            rule="after_hours_activity",
                            severity="medium",
                            title="After-hours activity",
                            reason=(
                                "An event occurred outside the configured "
                                "working hours of 06:00–20:00."
                            ),
                            event=event,
                            evidence=evidence,
                        )
                    )

            if self._is_failed_login(normalized):
                user = self._extract_user(text)
                events_by_user[user].append((event, evidence))

            if self._is_usb_transfer(normalized):
                findings.append(
                    self._finding(
                        rule="usb_file_transfer",
                        severity="high",
                        title="Potential USB file transfer",
                        reason=(
                            "The event indicates a possible file transfer to USB media. "
                            "Review the original evidence "
                            "to establish what actually occurred."
                        ),
                        event=event,
                        evidence=evidence,
                    )
                )

        findings.extend(
            self._detect_login_bursts(events_by_user)
        )

        findings = self._deduplicate_findings(findings)

        findings.sort(
            key=lambda item: (
                item["timestamp"] is None,
                item["timestamp"] or "",
                item["rule"],
            )
        )
        return {
            "case_id": case_id,
            "events_analyzed": len(rows),
            "finding_count": len(findings),
            "findings": findings,
            "notice": (
                "Rule-based indicators are investigative leads, "
                "not proof of misconduct."
            ),
        }

    @staticmethod
    def _is_failed_login(text: str) -> bool:
        failed = re.search(
            r"\b(failed|failure|denied|unsuccessful)\b",
            text,
        )
        login = re.search(
            r"\b(login|logon|authentication|auth)\b",
            text,
        )
        return bool(failed and login)

    @staticmethod
    def _is_usb_transfer(text: str) -> bool:
        mentions_usb = re.search(
            r"\b(usb|removable drive|flash drive)\b",
            text,
        )
        mentions_transfer = re.search(
            r"\b(copy|copied|transfer|transferred|export|exported)\b"
            r"|\baction\s*=\s*write\b",
            text,
        )
        return bool(mentions_usb and mentions_transfer)

    @staticmethod
    def _extract_user(text: str) -> str:
        match = re.search(
            r"\buser\s*[:=]?\s*([A-Za-z0-9_.@-]+)",
            text,
            re.IGNORECASE,
        )
        return match.group(1).lower() if match else "unknown"

    def _detect_login_bursts(self, events_by_user: dict) -> list[dict]:
        findings = []

        for user, entries in events_by_user.items():
            entries.sort(
                key=lambda pair: (
                    pair[0].timestamp is None,
                    pair[0].timestamp,
                )
            )

            valid_entries = [
                pair for pair in entries
                if pair[0].timestamp is not None
            ]

            for index, (event, evidence) in enumerate(valid_entries):
                window_end = (
                    event.timestamp
                    + timedelta(
                        minutes=self.FAILED_LOGIN_WINDOW_MINUTES
                    )
                )

                window_events = [
                    pair for pair in valid_entries[index:]
                    if pair[0].timestamp <= window_end
                ]

                if len(window_events) < self.FAILED_LOGIN_THRESHOLD:
                    continue

                findings.append(
                    self._finding(
                        rule="repeated_failed_logins",
                        severity="high",
                        title="Repeated failed login attempts",
                        reason=(
                            f"At least {self.FAILED_LOGIN_THRESHOLD} "
                            f"failed login events for user '{user}' "
                            f"occurred within "
                            f"{self.FAILED_LOGIN_WINDOW_MINUTES} minutes."
                        ),
                        event=event,
                        evidence=evidence,
                    )
                )

                # Avoid emitting a finding for every event in the same burst.
                break

        return findings
    @staticmethod
    def _activity_signature(finding: dict) -> str:
        """Identify equivalent operations without merging unrelated events."""
        description = (finding.get("description") or "").lower()
        event_type = (finding.get("event_type") or "").lower()
        text = f"{description} {event_type}"

        file_match = re.search(r"\bfile\s*=\s*([^\s|,]+)", text)
        if not file_match:
            file_match = re.search(
                r"\b(?:open|read|write|copy)\s+on\s+(.+?)(?:\s+using device\b|$)",
                description,
            )
        filename = file_match.group(1).strip(" \t\"'").lower() if file_match else None

        action_match = re.search(r"\baction\s*=\s*([a-z_]+)", text)
        if not action_match:
            action_match = re.search(r"\bperformed\s+([a-z_]+)", text)
        action = action_match.group(1) if action_match else event_type

        if filename and action in {"open", "read", "write", "copy"}:
            destination_match = re.search(r"\bdestination\s*=\s*([^\s|,]+)", text)
            destination = destination_match.group(1) if destination_match else None
            if destination and destination.startswith("usb") and action in {"write", "copy"}:
                return f"usb_copy:{filename}:{destination}"
            return f"file:{action}:{filename}"

        user_match = re.search(r"\buser\s*[:=]?\s*([a-z0-9_.@-]+)", text)
        user = user_match.group(1) if user_match else None
        if user and re.search(r"\b(?:interactive_login|login)\b", text):
            return f"login:{user}"
        if user and re.search(r"\b(?:session_end|logout)\b", text):
            return f"logout:{user}"

        return "text:" + " ".join(text.split())

    @classmethod
    def _deduplicate_findings(cls, findings: list[dict]) -> list[dict]:
        """Merge same-rule, same-time operations; preserve every source."""
        grouped = {}
        for finding in findings:
            key = (
                finding.get("rule"),
                finding.get("timestamp"),
                cls._activity_signature(finding),
            )
            source = {
                "evidence_id": finding["evidence_id"],
                "filename": finding["filename"],
                "event_id": finding["event_id"],
            }
            if key not in grouped:
                merged = finding.copy()
                merged["supporting_evidence"] = [source]
                grouped[key] = merged
            elif source not in grouped[key]["supporting_evidence"]:
                grouped[key]["supporting_evidence"].append(source)
        return list(grouped.values())

    @staticmethod
    def _finding(
        rule: str,
        severity: str,
        title: str,
        reason: str,
        event: Event,
        evidence: Evidence,
    ) -> dict:
        return {
            "rule": rule,
            "severity": severity,
            "title": title,
            "reason": reason,
            "timestamp": (
                event.timestamp.isoformat()
                if event.timestamp
                else None
            ),
            "event_id": event.id,
            "evidence_id": evidence.id,
            "filename": evidence.original_filename,
            "event_type": event.event_type,
            "description": event.description,
        }
