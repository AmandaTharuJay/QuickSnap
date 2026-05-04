import py_compile
import sys
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = ROOT / "web"
REQUIRED_FILES = ["index.html", "styles.css", "app.js"]
PYTHON_FILES = ["app/qa_engine.py", "scripts/serve.py"]


class AssetParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = set()
        self.title = ""
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "title":
            self._in_title = True
        if tag == "link" and attrs.get("href"):
            self.assets.add(attrs["href"])
        if tag == "script" and attrs.get("src"):
            self.assets.add(attrs["src"])

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data.strip()


def assert_required_files():
    for filename in REQUIRED_FILES:
        path = WEB_ROOT / filename
        if not path.exists():
            raise AssertionError(f"Missing required website file: {filename}")
        if path.stat().st_size == 0:
            raise AssertionError(f"Website file is empty: {filename}")


def assert_html_assets():
    parser = AssetParser()
    parser.feed((WEB_ROOT / "index.html").read_text(encoding="utf-8"))

    if parser.title != "AI QA Assistant":
        raise AssertionError("index.html must set the AI QA Assistant page title")

    for asset in ("./styles.css", "./app.js"):
        if asset not in parser.assets:
            raise AssertionError(f"index.html does not reference {asset}")


def assert_app_markers():
    script = (WEB_ROOT / "app.js").read_text(encoding="utf-8")
    for marker in (
        '"/api/session"',
        '"/api/ask"',
        '"/api/analyze-log"',
        '"/api/draft-defect"',
        '"/api/export"',
        '"/api/clear-history"',
    ):
        if marker not in script:
            raise AssertionError(f"app.js is missing expected behavior: {marker}")


def assert_python_application():
    sys.path.insert(0, str(ROOT))
    for filename in PYTHON_FILES:
        py_compile.compile(str(ROOT / filename), doraise=True)

    from app.qa_engine import analyze_log, answer_question, draft_defect, generate_session_report

    answer = answer_question("QCOM", "How should I triage a timeout?")
    if answer["risk"] != "High" or not answer["follow_up_questions"]:
        raise AssertionError("Question API engine did not produce expected guidance")

    analysis = analyze_log("QCOM", "AUTH approved txn=42\nERROR timeout txn=42")
    if analysis["severity"] != "High" or analysis["error_count"] != 1 or not analysis["timeline"]:
        raise AssertionError("Log analyzer did not detect high severity timeout")

    defect = draft_defect("SAS", "Meter mismatch", "Actual meter delta is wrong")
    if defect["protocol"] != "SAS" or not defect["acceptance_criteria"]:
        raise AssertionError("Defect drafter did not produce a structured defect")

    report = generate_session_report({
        "user": "QA Tester",
        "protocol": "SAS",
        "history": [{"type": "defect", "result": defect}],
    })
    if "AI QA Assistant Session Report" not in report["markdown"] or "Meter mismatch" not in report["markdown"]:
        raise AssertionError("Report generator did not include session results")


if __name__ == "__main__":
    assert_required_files()
    assert_html_assets()
    assert_app_markers()
    assert_python_application()
    print("AI QA Assistant application validation passed.")
