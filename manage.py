#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path


def main():
    # Local secrets live in .env (and .env.local from `vercel env pull`); never commit them.
    try:
        from dotenv import load_dotenv

        base = Path(__file__).resolve().parent
        load_dotenv(base / ".env")
    except ImportError:
        pass
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "portfolio.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
