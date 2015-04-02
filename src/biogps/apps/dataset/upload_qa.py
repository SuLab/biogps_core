#######################################################
#  Quality assurance script to check uploaded         #
#  GEO datasets for data integrity and completeness.  #
#######################################################

import csv
import json
import linecache
import os
import random
import sys
sys.path.append('/projects/BioGPS/dev_imacleod/BiogpsRedesign/src/')
sys.path.append('/projects/BioGPS/dev_imacleod/BiogpsRedesign/site-packages/')
sys.path.append('/projects/BioGPS/dev_imacleod/BiogpsRedesign/site-packages/'\
                                                               'django_apps/')
os.environ['DJANGO_SETTINGS_MODULE'] = 'biogps.settings_dev_local'
from django.test import Client


def upload_qa():
    null_reporters = dict()
    missing_datasets, missing_ids = list(), list()
    dataset_url = '/service/datasetlist2/%s/'
    genes = ['1017', '12566', '64065']

    # csv of previously uploaded files
    uploaded_csv = '/projects/BioGPS/dev_imacleod/BiogpsRedesign/src/biogps/'\
                                        'apps/dataset/geo/uploaded_files.csv'

    # csv of previously qa checked files
    checked_qa_csv = '/projects/BioGPS/dev_imacleod/BiogpsRedesign/src/'\
                                'biogps/apps/dataset/geo/checked_qa.csv'

    # File maps dataset names to IDs
    dataset_ids = '/projects/BioGPS/dev_imacleod/BiogpsRedesign/src/biogps/'\
                                          'apps/dataset/geo/dataset_ids.txt'
    checked_qa = set()
    ds_ids = dict()
    csv_reader = csv.reader(open(checked_qa_csv, 'r'))
    for row in csv_reader:
        for item in row:
            checked_qa.add(item)
            ds_ids[item] = 0

    with open(uploaded_csv, 'r') as up_csv:
        for line in up_csv:
            datasets = line.split(',')
    total_datasets = len(datasets)

    for dataset in datasets:
        print ''
        print dataset

        if dataset not in checked_qa:
            # Get reporters from csv
            csv_file = '/archive/CompDisc/imacleod/GEO/csv/%s.csv' % dataset
            first_reporter, random_reporter, last_reporter = '', '', ''
            line_number = 0
            try:
                with open(csv_file, 'r') as orig_file:
                    for i, j in enumerate(orig_file):
                        pass
                    num_lines = i + 1
                    # Skip column headers, values start on second line
                    first_reporter = linecache.getline(csv_file, 2).split(
                                                                     ',')[0]
                    random_line = random.randint(3, num_lines)
                    random_reporter = linecache.getline(csv_file, random_line
                                                             ).split(',')[0]
                    last_reporter = linecache.getline(csv_file, num_lines
                                                             ).split(',')[0]
                    linecache.clearcache()
                    print 'First: %s, Random: %s, Last: %s' % (first_reporter,
                                               random_reporter, last_reporter)
            except IOError:
                missing_datasets.append(dataset)
                print '%s.csv not found!' % dataset

            # Remote service call, get dataset ID
            # Try with human and mouse genes
            dataset_id = ''
            found = False
            c = Client()
            for gene in genes:
                res = c.get(dataset_url % gene)
                if res.status_code == 200:
                    for j in json.loads(res.content):
                        if dataset == j['Name']:
                            dataset_id = j['Id']
                            found = True
                            ds_ids[dataset] = dataset_id
                            print 'ID: %s' % dataset_id
                            break
                    if found:
                        break
                else:
                    print 'Error retrieving values for gene: %s!'\
                                   ' Status code: %s' % (gene, res.status_code)

            # Remote service call to check for reporters
            if found:
                reporters = ','.join([first_reporter, random_reporter,
                                                                last_reporter])
                res = c.get('/service/datasetvalues2/%s/?reporters=%s' %
                                                       (dataset_id, reporters))
                if res.status_code == 200:
                    null_reporters[dataset_id] = list()
                    for j in json.loads(res.content)['ProbesetList']:
                        if not j['Values']:
                            null_reporters[dataset_id].append(str(j['Id']))
                    checked_qa.add(dataset)
                else:
                    print 'Error retrieving values for dataset ID: %s with'\
                          ' reporters: %s! Status code: %s' % (dataset_id,
                                                    reporters, res.status_code)
            else:
                missing_ids.append(dataset)
                print 'Dataset ID not found in results for genes: %s!' % (
                                                                    str(genes))
        else:
            print 'Already checked!'

    with open(checked_qa_csv, 'w') as qa_csv:
        qa_csv.write(','.join(checked_qa))

    with open(dataset_ids, 'w') as ids_txt:
        ids_txt.write(str(ds_ids))

    print ''
    print 'Results - Dataset ID: reporters with null values:'
    print '%s' % null_reporters

    print ''
    print 'Datasets with no ID returned for genes %s:' % genes
    print missing_ids

    print ''
    print 'Missing dataset files:'
    print missing_datasets

    print ''
    print '# of datasets checked: %s' % total_datasets

if __name__ == "__main__":
    upload_qa()
