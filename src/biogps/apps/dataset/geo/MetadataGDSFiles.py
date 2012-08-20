######################################################
#  Parse GDS metadata from .soft files and load      #
#  them as BiogpsDatasets in the DB.                 #
######################################################

import csv
import os
import sys
from ast import literal_eval
from datetime import datetime
sys.path.append('/projects/BioGPS/dev_imacleod/BiogpsRedesign/src/')
sys.path.append('/projects/BioGPS/dev_imacleod/BiogpsRedesign/src/biogps/')
sys.path.append('/projects/BioGPS/dev_imacleod/BiogpsRedesign/site-packages/')
sys.path.append('/projects/BioGPS/dev_imacleod/BiogpsRedesign/site-packages/'\
                                                               'django_apps/')
os.environ['DJANGO_SETTINGS_MODULE'] = 'biogps.settings_dev_local'
from biogps.apps.adamauth.models import User
from biogps.apps.dataset.models import BiogpsDataset
from utils.models import Species


def update_GDS_metadata():
    # Update all GEO GDS datasets with their current metadata

    # Dataset IDs
    ds_ids = ''
    with open('/projects/BioGPS/dev_imacleod/BiogpsRedesign/src/biogps/apps/'\
                               'dataset/geo/dataset_ids.txt', 'r') as id_file:
        for line in id_file:
            ids_dict = line
        ds_ids = literal_eval(ids_dict)

    in_titles = False
    sample_titles = list()

    # Get set of previously uploaded files
    uploaded_csv = '/projects/BioGPS/dev_imacleod/BiogpsRedesign/src/biogps/'\
                                         'apps/dataset/geo/uploaded_files.csv'
    uploaded_files = set()
    csv_reader = csv.reader(open(uploaded_csv, 'r'))
    for row in csv_reader:
        for item in row:
            uploaded_files.add(item)

    for up_file in uploaded_files:
        filename = os.path.splitext(os.path.basename(up_file))[0]
        if filename[:3] == 'GDS':
            print ''
            print filename
            dataset_id = ds_ids[filename]
            dataset = BiogpsDataset(id=dataset_id)

            u = User.objects.get(id=3380)
            dataset.author = u.get_valid_name()
            dataset.ownerprofile = u.get_profile()
            dataset.metadata = {'GEO_id': filename,
                                'GEO_url': 'http://www.ncbi.nlm.nih.gov/'\
                                           'sites/GDSbrowser?acc=%s' % filename
                               }
            dataset.type = 'gds'
            dataset.tags = 'ncbi geo gds'

            with open('/archive/CompDisc/imacleod/GEO/%s.soft' % filename,
                                                          'r') as soft_file:
                for line in soft_file:
                    line = line.rstrip('\n')
                    # Dataset name
                    if line.startswith('!dataset_title '):
                        dataset.name = line.split('=')[1].strip()
                    elif line.startswith('!dataset_platform '):
                        dataset.platform = line.split('=')[1].strip()
                    elif line.startswith('!dataset_platform_organism '):
                        ds_genus = line.split('=')[1].strip()
                        for i in Species:
                            if i.genus == ds_genus:
                                dataset.taxid = i.taxid
                    elif line.startswith('!dataset_description '):
                        dataset.description = line.split('=')[1].strip()
                    elif line.startswith('#IDENTIFIER'):
                        in_titles = True
                    elif line.startswith('!dataset_table_begin'):
                        in_titles = False
                    elif in_titles:
                        line = line.rstrip('\n')
                        sample_info = line.split('=')
                        sample_id = sample_info[0].strip('#').strip()
                        sample_value = sample_info[1].split(':', 1)[1].rsplit(
                                          ';', 1)[0].strip().replace(',', '')
                        sample_titles.append((sample_id, sample_value))

            dataset.samples = sample_titles
            dataset.short_description = dataset.description[:137] + '...'
            #dataset.share_to_gnf()
            dataset.share_to_public()

            try:
                ds = BiogpsDataset.objects.get(id=dataset_id)
                # Dataset already exists. To update we need to supply the
                # created/last modified dates, and the slug
                dataset.created = ds.created
                dataset.lastmodified = datetime.now()
                dataset.slug = ds.slug
            except BiogpsDataset.DoesNotExist:
                pass

            dataset.save()

if __name__ == "__main__":
    update_GDS_metadata()
