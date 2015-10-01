######################################################
#  Copy parsed GSE .csv files to service layer data  #
#  loading directory and upload.                     #
######################################################

import csv
import glob
import json
import os
import subprocess
import sys
sys.path.append('/projects/BioGPS/dev_imacleod/BiogpsRedesign/src/')
sys.path.append('/projects/BioGPS/dev_imacleod/BiogpsRedesign/site-packages/')
sys.path.append('/projects/BioGPS/dev_imacleod/BiogpsRedesign/site-packages/'\
                                                               'django_apps/')
os.environ['DJANGO_SETTINGS_MODULE'] = 'biogps.settings_dev_local'
from ast import literal_eval
from biogps.apps.boe.boc_svc import RemoteServiceError
from biogps.apps.dataset.models import SL_Dataset


def upload_GSE_data():
    # Upload GSE datasets to service layer

    # Files to be skipped have already been uploaded as GDS data, as
    # determined by the GDS_checker.py script
    file_errors, problem_datasets, skip_files, uploaded_files = \
    set(), set(), set(), set()

    csv_reader = csv.reader(open('/archive/CompDisc/imacleod/GEO/'\
                                 'skipped_GSE.csv', 'r'))
    for row in csv_reader:
        for item in row:
            skip_files.add(item)

    # Get set of previously uploaded files
    uploaded_csv = '/projects/BioGPS/dev_imacleod/BiogpsRedesign/src/biogps/'\
                                         'apps/dataset/geo/uploaded_files.csv'
    uploaded_files = set()
    csv_reader = csv.reader(open(uploaded_csv, 'r'))
    for row in csv_reader:
        for item in row:
            uploaded_files.add(item)

    # Open dataset descriptions file
    dataset_descriptions = literal_eval(open('/projects/BioGPS/dev_imacleod/'\
                                    'BiogpsRedesign/src/biogps/apps/dataset/'\
                                    'geo/dataset_descriptions.txt', 'r'
                                    ).readlines()[0])

    # Get all csv files to be uploaded
    csv_files = glob.glob('/archive/CompDisc/imacleod/GEO/csv/GSE*.csv')
    color_file = '/archive/CompDisc/imacleod/GEO/csv/%s.color'
    for csv_file in csv_files:
        print ''
        filename = os.path.splitext(os.path.basename(csv_file))[0]
        filename_base = filename.split('-', 1)[0].split('_', 1)[0]
        if filename_base in skip_files:
            # Already uploaded as GDS dataset - need this check in case the
            # parser isn't correctly skipping these files...
            print filename + ' already uploaded as GDS dataset'
        elif filename in uploaded_files:
            print filename + ' already uploaded.'
            # Add to uploaded_files
            uploaded_files.add(filename)
        else:
            print filename + ' needs to be uploaded!'
            # Copy files to archive loading directory
            clr_file = color_file % filename
            copy_status = subprocess.check_call(['scp', csv_file, '/projects/'\
                                            'BioGPS/load_archive/ds_inbound/'])
            if copy_status == 0:
                # Copied dataset file, now copy color file
                copy_status = subprocess.check_call(['scp', clr_file,
                                  '/projects/BioGPS/load_archive/ds_inbound/'])
            else:
                print 'Failed to copy %s to data loading directory.' % filename
                break
            if copy_status == 0:
                # Files successfully copied, upload to SL
                print filename + ' copied successfully.'

                # Set dataset's description
                #desc = '%s - %s' % (filename, dataset_titles[filename])
                desc = dataset_descriptions[filename]

                try:
                    d = SL_Dataset()
                    # Name, data file, description, color file
                    upload_res, upload_content = d.create(filename,
                                  filename + '.csv', desc, filename + '.color')
                except RemoteServiceError:
                    problem_datasets.add(filename)
                    print "** Service layer doesn't like this dataset! **"
                    continue

                # Check response
                if upload_res['status'] == '200':
                    print filename + ' successfully uploaded.'
                    j = json.loads(upload_content)
                    d.datasetid = j['Id']

                    # Add to uploaded_files
                    uploaded_files.add(filename)

                    # Write new uploaded file csv
                    with open(uploaded_csv, 'w') as updated_uploads:
                        updated_uploads.write(','.join([i for i in
                                                              uploaded_files]))
                    # Add role to dataset
                    role_res, role_content = d.add_role('Anonymous')
                    if role_res['status'] == '200':
                        print 'Added Anonymous read role to %s' % filename
                    else:
                        print 'Error adding role to %s' % filename
                        print '%s: %s' % (role_res, role_content)
                        break
                else:
                    print 'Dataset %s upload failed:' % filename
                    print '%s: %s' % (upload_res, upload_content)
                    break
            else:
                print 'Failed to copy %s to data loading directory.' % filename
                break

    print ''
    print 'Problematic datasets:'
    print '%s' % problem_datasets

if __name__ == "__main__":
    upload_GSE_data()
