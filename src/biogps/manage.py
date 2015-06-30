#!/usr/bin/env python
from add_path import *

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "biogps.settings_dev")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)
