from http.cookiejar import CookieJar
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener
import json
import os


BASE_URL = os.environ.get("AIQA_BASE_URL", "http://127.0.0.1:4173")
opener = build_opener(HTTPCookieProcessor(CookieJar()))


def get(path: str):
    with opener.open(BASE_URL + path, timeout=10) as response:
        body = response.read().decode("utf-8")
        return response, body


def post(path: str, payload: dict):
    data = json.dumps(payload).encode("utf-8")
    request = Request(
        BASE_URL + path,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with opener.open(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def expect_unauthorized(path: str, payload: dict):
    try:
        post(path, payload)
    except HTTPError as error:
        if error.code == 401:
            return
        raise
    raise AssertionError(f"{path} should require authentication")


def main():
    _, home = get("/")
    assert "AI QA Assistant" in home
    assert "Session History" in home

    session = json.loads(get("/api/session")[1])
    assert session["signed_in"] is False
    expect_unauthorized("/api/ask", {"question": "Should fail before sign-in"})

    login = post("/api/sign-in", {"name": "Automation Tester"})
    assert login["signed_in"] is True
    assert login["user"] == "Automation Tester"

    protocol = post("/api/protocol", {"protocol": "SAS"})
    assert protocol["protocol"] == "SAS"

    document = post(
        "/api/documents",
        {
            "title": "SAS timeout runbook",
            "content": "When SAS timeout appears after approval, compare poll acknowledgements and meter deltas.",
        },
    )
    assert document["documents"]

    answer = post("/api/ask", {"question": "How do I triage timeout failures?"})
    assert answer["type"] == "answer"
    assert answer["risk"] == "High"
    assert answer["follow_up_questions"]
    assert answer["source_matches"]

    analysis = post(
        "/api/analyze-log",
        {"log": "AUTH approved txn=42\nWARN retry txn=42\nERROR timeout txn=42"},
    )
    assert analysis["type"] == "log-analysis"
    assert analysis["timeline"]
    assert analysis["severity"] == "High"

    defect = post(
        "/api/draft-defect",
        {"summary": "Timeout after approval", "notes": "Actual timeout after host approval."},
    )
    assert defect["type"] == "defect"
    assert defect["acceptance_criteria"]

    _, report = get("/api/export")
    assert "AI QA Assistant Session Report" in report
    assert "Defects drafted: 1" in report
    assert "Knowledge documents: 1" in report

    cleared = post("/api/clear-history", {})
    assert cleared["history"] == []
    assert cleared["last_log_summary"] == ""
    assert cleared["documents"] == []

    logout = post("/api/sign-out", {})
    assert logout["signed_in"] is False
    print("AI QA Assistant smoke test passed.")


if __name__ == "__main__":
    main()
