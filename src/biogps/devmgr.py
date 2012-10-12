#!/usr/bin/env python
import sys, os, os.path

from manage import settings_dev

def main():
    cmd = sys.argv[1] if len(sys.argv)>1 else ""

    cmdline = 'python -Wignore::DeprecationWarning manage.py %s --settings=%s %s  ' % (cmd, settings_dev, ' '.join(sys.argv[2:]))
    print cmdline
    os.system(cmdline)

if __name__ == '__main__':
    main()
