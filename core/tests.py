from django.test import SimpleTestCase
from django.urls import reverse


class PageTests(SimpleTestCase):
    def test_home_renders_and_is_cacheable(self):
        r = self.client.get(reverse("home"))
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, 'href="https://github.com/RajatBS"')
        self.assertContains(r, 'data-to="rajat.b.shetty@gmail.com"')
        self.assertIn("s-maxage", r["Cache-Control"])

    def test_robots(self):
        self.assertEqual(self.client.get(reverse("robots")).status_code, 200)
