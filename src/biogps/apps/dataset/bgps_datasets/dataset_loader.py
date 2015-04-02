#! /opt/bgpspy/bin/python

####################################################
#  Parses and loads custom datasets (BioGPS Down-  #
#  loads datasets, etc) into database. Use this    #
#  script for non-GEO datsets. GEO dataset loading #
#  scripts are in 'geo' subdirectory of the Django #
#  dataset app.                                    #
####################################################


from datetime import datetime
from StringIO import StringIO
import csv
import os
import numpy as np
import psycopg2
import sys
sys.path.append('/opt/biogps/src')
sys.path.append('/opt/biogps/src/biogps')
sys.path.append('/opt/biogps/src/biogps/site-packages')
sys.path.append('/opt/biogps/src/biogps/site-packages/django_apps')
sys.path.append('/opt/bgpspy/build/*')
from biogps.apps.auth2.models import UserProfile
from biogps.apps.dataset.models import BiogpsDataset, BiogpsDatasetData, BiogpsDatasetMatrix, BiogpsDatasetPlatform

conn = psycopg2.connect("dbname=BioGPSP user=biogpsp_su\
                         host=10.171.34.17 port=5432")
cur = conn.cursor()


def gen_ds_id():
    ''' Get next dataset id from Postgres sequence
        and confirm it isn't a reserved ID'''
    cur.execute("select nextval('dataset_biogpsdataset_id_seq')")
    dataset_id = int(cur.fetchone()[0])
    while dataset_id in [1, 4, 5]:
        cur.execute("select nextval('dataset_biogpsdataset_id_seq')")
        dataset_id = int(cur.fetchone()[0])
    return dataset_id


def load_datasets():
    os.chdir('/storage/sulab/imacleod')

    # Data file directories
    b = 'BioGPS_Downloads'
    eq = 'eQTL_expression_files'
    em = 'Emory_Data'

    # Datasets to be loaded
    datasets = {'U133AGNF1B.gcrma.csv':
                   {'id': 1, 'dir': b, 'name': 'GeneAtlas U133A, gcrma',
                    'delimiter': 'c', 'color': 'U133AGNF1B.gcrma.coloring.csv',
                    'owner': 'Andrew Su', 'summary': 'The tissue-specific pattern of mRNA expression can indicate important clues about gene function. High-density oligonucleotide arrays offer the opportunity to examine patterns of gene expression on a genome scale. Toward this end, we have designed custom arrays that interrogate the expression of the vast majority of protein-encoding human and mouse genes and have used them to profile a panel of 79 human and 61 mouse tissues. The resulting data set provides the expression patterns for thousands of predicted genes, as well as known and poorly characterized genes, from mice and humans. We have explored this data set for global trends in gene expression, evaluated commonly used lines of evidence in gene prediction methodologies, and investigated patterns indicative of chromosomal organization of transcription. We describe hundreds of regions of correlated transcription and show that some are subject to both tissue and parental allele-specific expression, suggesting a link between spatial expression and imprinting.', 'geo_gds_id': '',
                    'geo_gpl_id': 'GPL96', 'geo_gse_id': 'GSE1133',
                    'pubmed_id': '15075390', 'species': 'human'},

                'NCI60_U133A_20070815.raw.csv':
                   {'dir': b, 'name': 'NCI60 on U133A, gcrma',
                    'delimiter': 'c', 'color': '',
                    'owner': '', 'summary': 'Human NCI60 Cell Lines',
                    'geo_gds_id': '', 'geo_gpl_id': 'GPL96', 'geo_gse_id': '',
                    'pubmed_id': '', 'species': 'human'},

                'GNF1M_plus_macrophage_small.bioGPS.txt':
                   {'dir': b, 'name': 'GeneAtlas GNF1M, gcrma',
                    'delimiter': 't', 'color': 'GNF1M_plus_macrophage_small.bioGPS.coloring.csv',
                    'owner': '', 'summary': '', 'geo_gds_id': '',
                    'geo_gpl_id': 'GPL1073', 'geo_gse_id': '', 'pubmed_id': '',
                    'species': 'mouse'},

                'geneatlas_MOE430_20090327.raw.csv':
                   {'ID': 4, 'dir': b, 'name': 'GeneAtlas MOE430, gcrma',
                    'delimiter': 'c', 'color': 'geneatlas_MOE430_20090327.coloring.csv',
                    'owner': '', 'summary': 'High-throughput gene expression profiling has become an important tool for investigating transcriptional activity in a variety of biological samples. To date, the vast majority of these experiments have focused on specific biological processes and perturbations. Here, we profiled gene expression from a diverse array of normal tissues, organs, and cell lines in mice.',
                    'geo_gds_id': '', 'geo_gpl_id': 'GPL1261', 'geo_gse_id': 'GSE10246',
                    'pubmed_id': '18442421', 'species': 'mouse'},

                'ratlas.gcRMA.txt':
                   {'ID': 5, 'dir': b, 'name': 'GeneAtlas RGU34A, gcrma',
                    'delimiter': 't', 'color': '', 'owner': '',
                    'summary': 'Large scale transcriptome analysis of Wistar and Sprague Dawley rat tissues.',
                    'geo_gds_id': '', 'geo_gpl_id': 'GPL85', 'geo_gse_id': 'GSE952',
                    'pubmed_id': '15060018', 'species': 'rat'},

                'GPL570_data.csv':
                   {'dir': em, 'name': 'Barcode on normal tissues',
                    'delimiter': 'c', 'color': 'GPL570_tissue_grouping_for_BioGPS.csv', 'owner': 'Michael Zilliox',
                    'summary': 'This data set displays a survey across diverse normal human tissues from the U133plus2 Affymetrix microarray. The values shown are z-scores produced by the barcode function of the R package "frma" (http://www.bioconductor.org/packages/2.6/bioc/html/frma.html). A z-score >5 suggests that the gene is expressed in that tissue. The lines drawn at the median, 3X median and 10X median are defaults of the BioGPS presentation and are not central to this analysis. For more details, visit http://rafalab.jhsph.edu/barcode/ or http://nar.oxfordjournals.org/content/39/suppl_1/D1011.full.',
                    'geo_gds_id': '', 'geo_gpl_id': 'GPL570', 'geo_gse_id': '',
                    'pubmed_id': '', 'species': 'human'},

                'tumors_U95_20070810.raw.csv':
                   {'dir': b, 'name': 'Primary Tumors (U95)',
                    'delimiter': 'c', 'color': 'tumors_U95_20070810.coloring.csv',
                    'owner': '', 'summary': '',
                    'geo_gds_id': '', 'geo_gpl_id': 'GPL8300', 'geo_gse_id': '',
                    'pubmed_id': '', 'species': 'human'},

                'adipose_MOE430_20071005.raw.csv':
                   {'dir': b, 'name': 'eQTL -- Adipose (MOE430 V2)',
                    'delimiter': 'c', 'color': '', 'owner': '', 'summary': '',
                    'geo_gds_id': '', 'geo_gpl_id': 'GPL1261', 'geo_gse_id': '',
                    'pubmed_id': '', 'species': 'mouse'},

                'fat_msk.GNF1M.csv':
                   {'dir': eq, 'name': 'eQTL -- Fat (GNF1M)',
                    'delimiter': 'c', 'color': '', 'owner': '', 'summary': '',
                    'geo_gds_id': '', 'geo_gpl_id': 'GPL1073', 'geo_gse_id': '',
                    'pubmed_id': '', 'species': 'mouse'},

                'hypothalamus_msk.GNF1M.csv':
                   {'dir': eq, 'name': 'eQTL -- Hypothalamus (GNF1M)',
                    'delimiter': 'c', 'color': '', 'owner': '', 'summary': '',
                    'geo_gds_id': '', 'geo_gpl_id': 'GPL1073', 'geo_gse_id': '',
                    'pubmed_id': '', 'species': 'mouse'},

                'hypothalamus_msk.MOE430v2.csv':
                   {'dir': eq, 'name': 'eQTL -- Hypothalamus (MOE430 V2)',
                    'delimiter': 'c', 'color': '', 'owner': '', 'summary': '',
                    'geo_gds_id': '', 'geo_gpl_id': 'GPL1261', 'geo_gse_id': '',
                    'pubmed_id': '', 'species': 'mouse'},

                'liver_msk.GNF1M.csv':
                   {'dir': eq, 'name': 'eQTL -- Liver (GNF1M)',
                    'delimiter': 'c', 'color': '', 'owner': '', 'summary': '',
                    'geo_gds_id': '', 'geo_gpl_id': 'GPL1073', 'geo_gse_id': '',
                    'pubmed_id': '', 'species': 'mouse'},

                'liver_msk.MOE430v2.csv':
                   {'dir': eq, 'name': 'eQTL -- Liver (MOE430 V2)',
                    'delimiter': 'c', 'color': '', 'owner': '', 'summary': '',
                    'geo_gds_id': '', 'geo_gpl_id': 'GPL1261', 'geo_gse_id': '',
                    'pubmed_id': '', 'species': 'mouse'},

                'pancreas_msk.GNF1M.csv':
                   {'dir': eq, 'name': 'eQTL -- Pancreas (GNF1M)',
                    'delimiter': 'c', 'color': '', 'owner': '', 'summary': '',
                    'geo_gds_id': '', 'geo_gpl_id': 'GPL1073', 'geo_gse_id': '',
                    'pubmed_id': '', 'species': 'mouse'}
               } 

    # Parse csv file
    for ds in datasets:
        print '\n%s' % ds
        # For use with metadata
        factors_list = list()
        display_dict = {'aggregate': ['title'], 'color': [], 'sort': []}
        # For use with matrix
        rep_dict = dict()
        data_list = list()

        ds_info = datasets[ds]
        try:
            dataset_id = ds_info['id']
        except KeyError:
            # Dataset does not have a default ID, generate one
            dataset_id = gen_ds_id()
        dataset_name = ds_info['name']
        db_platform = None
        platform = ds_info['geo_gpl_id']
        print 'Platform: %s' % platform
        plat_dict = {platform: list()}
        # All reporters for current platform
        all_reps = list()
        try:
            # Check DB for pre-existing platform
            try:
                db_platform = BiogpsDatasetPlatform.objects.get(platform = platform)
                all_reps = db_platform.reporters
            except BiogpsDatasetPlatform.DoesNotExist:
                # Create placeholder platform entry in DB, to be
                # updated once all reporters are parsed
                db_platform = BiogpsDatasetPlatform.objects.create(platform=platform, reporters=[])
        except psycopg2.DataError:
            print 'DB Error - Dataset ID: %s, Platform: %s\n' % (dataset_id, platform)
        species = ds_info['species']
        print 'Species: %s' % species
        current_dataset = BiogpsDataset(id=dataset_id, name=dataset_name, ownerprofile=UserProfile.objects.get(user__username='geo'), platform=db_platform, species=species)

        with open('%s/%s' % (ds_info['dir'], ds), 'rb') as f:
            if ds_info['delimiter'] == 'c':
                reader = csv.reader(f)
            else:
                reader = csv.reader(f, delimiter='\t')

            line = 0
            for row in reader:
                row = [i.strip() for i in row]
                if line == 0:
                    # Capitalize first letter of each column header
                    col_mask = ['%s' % i.capitalize() for i in row[1:]]
                    prev_col = ''

                    # Parse column ordering, coloring
                    repl_idx, order_idx, color_idx = 1, 1, 1
                    color_file = ds_info['color']
                    clr_file_vals = dict()
                    if color_file:
                        with open('%s/%s' % (ds_info['dir'], color_file), 'rb') as c:
                            clr_reader = csv.reader(c)
                            for row in clr_reader:
                                try:
                                    clr_file_vals[row[0]] = ((int(row[1]), int(row[2])))
                                except ValueError:
                                    # Column headers
                                    continue
                    for idx, val in enumerate(col_mask):
                        if idx == 0:
                            prev_col = val
                        else:
                            if val != prev_col:
                                # New group
                                prev_col = val
                                repl_idx = 1
                                order_idx += 1
                                color_idx += 1
                            else:
                                # Same group
                                repl_idx += 1
                        try:
                            factors_list.append({'%s.%s' % (val, repl_idx): {'title': val, 'order_idx': clr_file_vals[val][0], 'color_idx': clr_file_vals[val][1]}})
                        except KeyError:
                            # No color file
                            factors_list.append({'%s.%s' % (val, repl_idx): {'title': val, 'order_idx': order_idx, 'color_idx': color_idx}})
                    metadata = {"id": dataset_id, "name": dataset_name, "owner": ds_info['owner'], "geo_gds_id": ds_info['geo_gds_id'], "geo_gpl_id": platform, "geo_gse_id": ds_info['geo_gse_id'], "species": species, "pubmed_id": ds_info['pubmed_id'], "summary": ds_info['summary'], "factors": factors_list, "display_params": display_dict}
                    # Metadata
                    try:
                        _now = datetime.now()
                        current_dataset.metadata = metadata
                        current_dataset.created, current_dataset.lastmodified = _now, _now
                        current_dataset.save()
                        print 'Metadata done.'
                    except psycopg2.DataError:
                        print 'DB Error - Dataset ID: %s, Metadata: %s\n' % (dataset_id, metadata)
                    line += 1
                    continue

                # Lines 1 - end
                reporter = str(row[0].strip())
                plat_dict[platform].append(reporter)
                # Create both keys and values out of
                # reporters and their positions for
                # fast lookups, adjusting for headers
                adj_line = line - 1
                rep_dict[reporter] = adj_line
                rep_dict[adj_line] = reporter
                # Round numeric values to three digits
                # Let this fail! Don't wrap in try/
                # except. We need to know about
                # missing data.
                data = [round(float(i), 3) for i in row[1:]]
                data_list.append(data)

                # Data
                try:
                    d = BiogpsDatasetData(dataset=current_dataset, reporter=reporter, data=data)
                    d.save()
                except psycopg2.DataError:
                    print 'DB Error - Dataset ID: %s, Reporter: %s\n' % (dataset_id, reporter)
                line += 1
        print 'Data done.'

        # Check/update platform and its reporters
        ds_reps = plat_dict[platform]
        ds_count = len(ds_reps)
        if all_reps:
            # Confirm current dataset reporters count matches DB
            db_count = len(all_reps)
            if db_count == ds_count:
                pass
            else:
                print 'Number of reporters in dataset and DB don\'t match! DB: %s, DS: %s' % (db_count, ds_count)
        else:
            try:
                # Update platform in DB with all reporters
                p = BiogpsDatasetPlatform.objects.get(platform=platform)
                p.reporters = ds_reps
                p.save()
                print 'Success loading new platform %s with %s reporters' % (platform, ds_count)
            except psycopg2.DataError:
                print 'DB Error - Dataset ID: %s, Reporter: %s\n' % (dataset_id, platform)

        # Data matrix
        ds_matrix = np.array(data_list, np.float32)
        try:
            # Temp file
            s = StringIO()
            np.save(s, ds_matrix)
            s.seek(0)
            mat = BiogpsDatasetMatrix(dataset=current_dataset, reporters=rep_dict, matrix=s.read())
            mat.save()
            print 'Matrix done.'
        except psycopg2.DataError:
            print 'DB Error - Dataset ID: %s, Reporter: %s\n' % (dataset_id, reporter)
 

    conn.commit()
    cur.close()
    conn.close()


if __name__ == '__main__':
    load_datasets()
