"""Basic web tests for public pages."""
from playwright.sync_api import sync_playwright
import sys

BASE_URL = "http://localhost:3000"

def test_public_pages():
    """Test that public pages load correctly."""
    results = []
    passed = 0
    failed = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Public pages to test
        public_pages = [
            ("/", "Landing page"),
            ("/login", "Login page"),
            ("/pricing", "Pricing page"),
            ("/terms", "Terms of Service"),
            ("/privacy", "Privacy Policy"),
            ("/blog", "Blog listing"),
            ("/platforms", "Platforms page"),
            ("/access-denied", "Access Denied page"),
        ]

        for path, name in public_pages:
            url = f"{BASE_URL}{path}"
            try:
                response = page.goto(url, wait_until="networkidle", timeout=30000)
                status = response.status if response else "No response"

                if response and response.ok:
                    passed += 1
                    results.append(f"[PASS] {name} ({path}) - Status: {status}")
                else:
                    failed += 1
                    results.append(f"[FAIL] {name} ({path}) - Status: {status}")
            except Exception as e:
                failed += 1
                results.append(f"[FAIL] {name} ({path}) - Error: {str(e)[:50]}")

        browser.close()

    # Print results
    print("\n" + "="*60)
    print("PUBLIC PAGES TEST RESULTS")
    print("="*60)
    for result in results:
        print(result)
    print("="*60)
    print(f"\nSummary: {passed}/{passed+failed} pages loaded successfully")

    return failed == 0


def test_landing_page_elements():
    """Test landing page has key elements."""
    results = []
    passed = 0
    failed = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(f"{BASE_URL}/", wait_until="networkidle", timeout=30000)

        # Check for key elements on landing page
        checks = [
            ("header", "Header exists"),
            ("text=ADAgent", "Brand name visible"),
            ("text=Sign in", "Sign in link/button"),
        ]

        for selector, desc in checks:
            try:
                element = page.locator(selector).first
                if element.is_visible(timeout=5000):
                    passed += 1
                    results.append(f"[PASS] {desc}")
                else:
                    failed += 1
                    results.append(f"[FAIL] {desc} - Not visible")
            except Exception as e:
                failed += 1
                results.append(f"[FAIL] {desc} - {str(e)[:40]}")

        browser.close()

    print("\n" + "="*60)
    print("LANDING PAGE ELEMENTS TEST")
    print("="*60)
    for result in results:
        print(result)
    print("="*60)
    print(f"\nSummary: {passed}/{passed+failed} elements found")

    return failed == 0


def test_login_page():
    """Test login page has required elements."""
    results = []
    passed = 0
    failed = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)

        # Check for login elements
        checks = [
            ("text=Google", "Google sign-in button"),
            ("text=Sign in", "Sign in text"),
        ]

        for selector, desc in checks:
            try:
                element = page.locator(selector).first
                if element.is_visible(timeout=5000):
                    passed += 1
                    results.append(f"[PASS] {desc}")
                else:
                    failed += 1
                    results.append(f"[FAIL] {desc} - Not visible")
            except Exception as e:
                failed += 1
                results.append(f"[FAIL] {desc} - {str(e)[:40]}")

        browser.close()

    print("\n" + "="*60)
    print("LOGIN PAGE TEST")
    print("="*60)
    for result in results:
        print(result)
    print("="*60)
    print(f"\nSummary: {passed}/{passed+failed} elements found")

    return failed == 0


def test_navigation():
    """Test navigation between pages works via direct links."""
    results = []
    passed = 0
    failed = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Test that links exist and point to correct URLs
        page.goto(f"{BASE_URL}/", wait_until="networkidle", timeout=30000)

        link_tests = [
            ("a[href='/pricing']", "/pricing", "Pricing link exists"),
            ("a[href='/blog']", "/blog", "Blog link exists"),
            ("a[href='/login']", "/login", "Login link exists"),
            ("a[href='/terms']", "/terms", "Terms link exists"),
            ("a[href='/privacy']", "/privacy", "Privacy link exists"),
        ]

        for selector, href, desc in link_tests:
            try:
                link = page.locator(selector).first
                if link.is_visible(timeout=3000):
                    actual_href = link.get_attribute("href")
                    if actual_href == href:
                        passed += 1
                        results.append(f"[PASS] {desc}")
                    else:
                        failed += 1
                        results.append(f"[FAIL] {desc} - href: {actual_href}")
                else:
                    failed += 1
                    results.append(f"[FAIL] {desc} - Not visible")
            except Exception as e:
                failed += 1
                results.append(f"[FAIL] {desc} - {str(e)[:40]}")

        # Test actual navigation using page.goto (verifies routes work)
        nav_tests = [
            ("/pricing", "Pricing page loads"),
            ("/blog", "Blog page loads"),
            ("/terms", "Terms page loads"),
        ]

        for path, desc in nav_tests:
            try:
                response = page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=30000)
                if response and response.ok:
                    passed += 1
                    results.append(f"[PASS] {desc}")
                else:
                    failed += 1
                    results.append(f"[FAIL] {desc} - Status: {response.status if response else 'None'}")
            except Exception as e:
                failed += 1
                results.append(f"[FAIL] {desc} - {str(e)[:40]}")

        browser.close()

    print("\n" + "="*60)
    print("NAVIGATION TEST")
    print("="*60)
    for result in results:
        print(result)
    print("="*60)
    print(f"\nSummary: {passed}/{passed+failed} navigation tests passed")

    return failed == 0


if __name__ == "__main__":
    print("="*60)
    print("ADAgentAI WEB TESTS")
    print("="*60)

    all_passed = True

    all_passed &= test_public_pages()
    all_passed &= test_landing_page_elements()
    all_passed &= test_login_page()
    all_passed &= test_navigation()

    print("\n" + "="*60)
    if all_passed:
        print("ALL TESTS PASSED")
    else:
        print("SOME TESTS FAILED")
    print("="*60)

    sys.exit(0 if all_passed else 1)
