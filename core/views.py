from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.templatetags.static import static
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_safe


@require_safe
def home(request):
    """The landing page.

    Browsers always check for a fresh copy (so a new deploy shows up at once),
    while Vercel's CDN keeps a cached copy for a day; each deploy clears it."""
    response = render(
        request,
        "core/index.html",
        {"contact_email": settings.CONTACT_EMAIL, "github_url": settings.GITHUB_URL},
    )
    response["Cache-Control"] = "public, max-age=0, must-revalidate"
    response["Vercel-CDN-Cache-Control"] = "max-age=86400"
    return response


@require_safe
@cache_control(public=True, max_age=86400)
def robots(request):
    return HttpResponse("User-agent: *\nAllow: /\n", content_type="text/plain")


@require_safe
def favicon(request):
    return HttpResponseRedirect(static("core/favicon.svg"))
