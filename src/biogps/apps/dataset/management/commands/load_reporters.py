# -*- coding: utf-8 -*-

from django.core.management.base import NoArgsCommand
from django.conf import settings
from django.db import connection
from biogps.apps.dataset.models import BiogpsDataset, BiogpsDatasetReporters


class Command(NoArgsCommand):
    help = 'A utility to populate database reporters table for each dataset ID'
    # Turn off Django's DEBUG mode to limit memory usage
    settings.DEBUG = False

    def handle_noargs(self, **options):
        target_db = settings.DATABASES['default']['NAME']
        ans = ask('Load reporters for all datasets into reporters table in database "%s"?' % target_db)
        if ans == 'Y':
            self.stdout.write('\nPopulating reporters... this is going to take a while, go do something else. Seriously.')
            def reporter_generator(ds):
                '''Generator yields one reporter at a time'''
                for i in ds.dataset_data.values('reporter'):
                    yield i['reporter']
                
            for i in BiogpsDataset.objects.iterator():
                reps = set()
                for r in reporter_generator(i):
                    reps.add(r)
                self.stdout.write('\nDS ID: {0}, reporters: {1}'.format(i.id, len(reps)))

                # Save to DB
                d = BiogpsDatasetReporters(dataset=i, reporters=list(reps))
                d.save()

            self.stdout.write('\nDone!')


def ask(prompt, options='YN'):
    '''Prompt Yes or No, return the upper case 'Y' or 'N'.'''
    options=options.upper()
    while 1:
        s = raw_input(prompt+'[%s]' % '|'.join(list(options))).strip().upper()
        if s in options: break
    return s
