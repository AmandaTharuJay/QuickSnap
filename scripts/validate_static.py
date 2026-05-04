from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = ROOT / "web"
REQUIRED_FILES = ["index.html", "styles.css", "app.js"]


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
    for marker in ("protocolProfiles", "analyzeLog", "draftDefect", "renderAuth"):
        if marker not in script:
            raise AssertionError(f"app.js is missing expected behavior: {marker}")


if __name__ == "__main__":
    assert_required_files()
    assert_html_assets()
    assert_app_markers()
    print("Static website validation passed.")
