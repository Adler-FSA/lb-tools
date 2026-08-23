import importlib.util
import sys
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "entity_people_crawler.py"
spec = importlib.util.spec_from_file_location("entity_people_crawler", MODULE)
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


def test_local_entity_role_parser_keeps_opendelta_people_and_rejects_partner_ceo():
    text = (
        '"We are thrilled," says Konstantin Wünscher, CEO of OpenDelta. '
        'OpenDelta co-founder Nick Schteringard added that the launch matters. '
        'We are excited to partner with OpenDelta, says GMCI CEO Maarten Botman.'
    )
    rows = mod.extract_entity_role_mentions(text, "Open Delta DAO LLC")
    names = {x["person_name"] for x in rows}
    assert "Konstantin Wünscher" in names
    assert "Nick Schteringard" in names
    assert "Maarten Botman" not in names


def test_parser_accepts_role_of_entity_variant():
    text = "Konstantin Wünscher is the Chief Executive Officer of OpenDelta and discusses index products."
    rows = mod.extract_entity_role_mentions(text, "Open Delta DAO LLC")
    assert rows
    assert rows[0]["person_name"] == "Konstantin Wünscher"


def test_article_filter_rejects_navigation_and_assets():
    assert mod._article_like("https://blog.opendelta.com/archive/") is False
    assert mod._article_like("https://blog.opendelta.com/about/") is False
    assert mod._article_like("https://blog.opendelta.com/content/images/a.png") is False
    assert mod._article_like("https://blog.opendelta.com/opendelta-indexes-to-launch-in-partnership-with-gmci-2/") is True


def test_discover_links_stays_on_trusted_root(monkeypatch):
    html = '''
    <html><body>
      <a href="/archive/">Archive</a>
      <a href="/article-one/">One</a>
      <a href="https://blog.opendelta.com/article-two/">Two</a>
      <a href="https://evil.example/article-three/">Three</a>
      <a href="/content/images/test.png">Image</a>
    </body></html>
    '''

    class Resp:
        ok = True
        text = html
        url = "https://blog.opendelta.com/archive/"

    monkeypatch.setattr(mod.ext.requests, "get", lambda *a, **k: Resp())
    links = mod.discover_same_domain_links("https://blog.opendelta.com/archive/", "opendelta.com")
    assert "https://blog.opendelta.com/article-one/" in links
    assert "https://blog.opendelta.com/article-two/" in links
    assert all("evil.example" not in x for x in links)
    assert all(not x.endswith(".png") for x in links)


def test_crawler_returns_only_locally_linked_entity_people(monkeypatch):
    monkeypatch.setattr(
        mod,
        "discover_same_domain_links",
        lambda seed, root, limit=14: ["https://blog.opendelta.com/partnership/"] if "archive" in seed else [],
    )
    monkeypatch.setattr(
        mod.ext,
        "read_public_page",
        lambda url: {
            "ok": True,
            "url": url,
            "title": "Partnership",
            "text": "Konstantin Wünscher, CEO of OpenDelta. OpenDelta co-founder Nick Schteringard. GMCI CEO Maarten Botman.",
            "published_at": "2025-03-12",
            "mode": "direct",
        },
    )
    out = mod.crawl_entity_people("Open Delta DAO LLC", ["opendelta.com"])
    names = {x["person_name"] for x in out["findings"]}
    assert names == {"Konstantin Wünscher", "Nick Schteringard"}
    assert out["pages_checked"] == 1
