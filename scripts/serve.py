from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
import json
import os
import secrets
import time

from app.qa_engine import analyze_log, answer_question, draft_defect, summarize_history, summarize_result


ROOT = Path(__file__).resolve().parent.parent
WEB_ROOT = ROOT / "web"
DATA_ROOT = ROOT / "data"
SESSIONS_PATH = DATA_ROOT / "sessions.json"
PORT = int(os.environ.get("PORT", "4173"))
DEFAULT_PROTOCOL = "QCOM"
DEFAULT_USER = "QA Tester"


def load_sessions():
    if not SESSIONS_PATH.exists():
        return {}
    with SESSIONS_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_sessions(sessions):
    DATA_ROOT.mkdir(exist_ok=True)
    with SESSIONS_PATH.open("w", encoding="utf-8") as file:
        json.dump(sessions, file, indent=2, sort_keys=True)


def new_session():
    session_id = secrets.token_urlsafe(32)
    sessions = load_sessions()
    sessions[session_id] = {
        "signedIn": True,
        "user": DEFAULT_USER,
        "protocol": DEFAULT_PROTOCOL,
        "history": [],
        "lastLogSummary": "",
        "createdAt": int(time.time()),
    }
    save_sessions(sessions)
    return session_id, sessions[session_id]


def session_payload(session):
    return {
        "signed_in": True,
        "user": session.get("user", DEFAULT_USER),
        "protocol": session.get("protocol", DEFAULT_PROTOCOL),
        "last_log_summary": session.get("lastLogSummary", ""),
        "history": summarize_history(session.get("history", [])),
    }


class ApplicationHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api_get(parsed.path)
            return

        requested = WEB_ROOT / parsed.path.lstrip("/")
        if parsed.path == "/" or not requested.suffix:
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        self.handle_api_post(parsed.path)

    def read_json(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length == 0:
            return {}
        raw_body = self.rfile.read(content_length).decode("utf-8")
        return json.loads(raw_body)

    def write_json(self, payload, status=HTTPStatus.OK, cookie=None):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def session_id(self):
        cookie = SimpleCookie(self.headers.get("Cookie"))
        morsel = cookie.get("aiqa_session")
        return morsel.value if morsel else None

    def current_session(self):
        session_id = self.session_id()
        if not session_id:
            return None, None
        sessions = load_sessions()
        return session_id, sessions.get(session_id)

    def require_session(self):
        session_id, session = self.current_session()
        if not session:
            self.write_json({"error": "Authentication required"}, HTTPStatus.UNAUTHORIZED)
            return None, None, None
        sessions = load_sessions()
        return session_id, session, sessions

    def handle_api_get(self, path):
        if path != "/api/session":
            self.write_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
            return

        _, session = self.current_session()
        if not session:
            self.write_json({"signed_in": False, "history": []})
            return
        self.write_json(session_payload(session))

    def handle_api_post(self, path):
        try:
            if path == "/api/sign-in":
                payload = self.read_json()
                session_id, session = new_session()
                session["user"] = str(payload.get("name") or DEFAULT_USER).strip() or DEFAULT_USER
                sessions = load_sessions()
                sessions[session_id] = session
                save_sessions(sessions)
                cookie = f"aiqa_session={session_id}; HttpOnly; SameSite=Lax; Path=/"
                self.write_json(session_payload(session), cookie=cookie)
                return

            if path == "/api/sign-out":
                session_id = self.session_id()
                if session_id:
                    sessions = load_sessions()
                    sessions.pop(session_id, None)
                    save_sessions(sessions)
                self.write_json({"signed_in": False, "history": []}, cookie="aiqa_session=; Max-Age=0; Path=/")
                return

            session_id, session, sessions = self.require_session()
            if not session:
                return

            payload = self.read_json()
            if path == "/api/protocol":
                session["protocol"] = payload.get("protocol") or DEFAULT_PROTOCOL
                sessions[session_id] = session
                save_sessions(sessions)
                self.write_json(session_payload(session))
                return

            if path == "/api/ask":
                result = answer_question(session.get("protocol", DEFAULT_PROTOCOL), payload.get("question", ""))
                session.setdefault("history", []).append({"type": "question", "result": result})
            elif path == "/api/analyze-log":
                result = analyze_log(session.get("protocol", DEFAULT_PROTOCOL), payload.get("log", ""))
                session["lastLogSummary"] = summarize_result(result)
                session.setdefault("history", []).append({"type": "log", "result": result})
            elif path == "/api/draft-defect":
                result = draft_defect(
                    session.get("protocol", DEFAULT_PROTOCOL),
                    payload.get("summary", ""),
                    payload.get("notes", ""),
                )
                session.setdefault("history", []).append({"type": "defect", "result": result})
            else:
                self.write_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
                return

            session["history"] = session.get("history", [])[-20:]
            sessions[session_id] = session
            save_sessions(sessions)
            result["history"] = summarize_history(session.get("history", []))
            self.write_json(result)
        except json.JSONDecodeError:
            self.write_json({"error": "Invalid JSON body"}, HTTPStatus.BAD_REQUEST)
        except ValueError as error:
            self.write_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ApplicationHandler)
    print(f"AI QA Assistant application available at http://localhost:{PORT}")
    server.serve_forever()
