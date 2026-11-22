from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.templatetags.static import static
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_safe


@require_safe
@cache_control(public=True, max_age=300, s_maxage=86400, stale_while_revalidate=604800)
def home(request):
    """The landing page. Nothing in it is per-visitor, so Vercel's CDN caches it;
    each new deployment clears that cache."""
    return render(
        request,
        "core/index.html",
        {"contact_email": settings.CONTACT_EMAIL, "github_url": settings.GITHUB_URL},
    )


@require_safe
@cache_control(public=True, max_age=86400)
def robots(request):
    return HttpResponse("User-agent: *\nAllow: /\n", content_type="text/plain")


@require_safe
def favicon(request):
    return HttpResponseRedirect(static("core/favicon.svg"))
