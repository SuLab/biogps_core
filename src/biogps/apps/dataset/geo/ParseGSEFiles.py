#####################################################
#  NCBI GEO GSE dataset parser. Parses data file    #
#  and loads results into database.                 #
#####################################################

from ast import literal_eval
from datetime import datetime
from os import path
from StringIO import StringIO
import csv
import glob
import numpy as np
import psycopg2
import sys
import tarfile 
from urllib import urlretrieve
import urllib2
from biogps.apps.auth2.models import UserProfile
from biogps.apps.dataset.models import BiogpsDataset, BiogpsDatasetData, BiogpsDatasetMatrix, BiogpsDatasetPlatform
from biogps.apps.dataset.bgps_datasets.dataset_loader import cap_first, gen_ds_id

conn = psycopg2.connect("dbname=BioGPSP user=biogpsp_su\
             host=184.72.51.54 port=5432")
cur = conn.cursor()

def parse_GSE_files():
    species_dict = {'homo sapiens': 'human', 'mus musculus': 'mouse', 'rattus norvegicus': 'rat'}
    local_path = '/storage/sulab/GEO_Data/GSE/'
    #gse_files = glob.glob('/storage/sulab/GEO_Data/GSE/GSE*.txt')
    insil_gse = urllib2.urlopen("http://insilico.ulb.ac.be/Publicutilities/oldgetserieslist")
    gse_files = literal_eval(insil_gse.read())[:1]

    for gse_file in gse_files:
        filename = path.splitext(path.basename(gse_file))[0]
        print '\n%s' % filename

        # Strip out geo accession from filename, 'GSE101' etc
        geo_id = filename.split('-', 1)[0].split('_', 1)[0]

        # Lookup GEO curation ID in order to get sample titles
        cur_id = 0
        u = urllib2.urlopen("http://insilico.ulb.ac.be/Publicutilities/getcurations?gse=%s" % geo_id)
        if u.getcode() == 200:
            cur_data = literal_eval(u.read())
            for i in cur_data['curations']:
                if i['curator'] == 'GEO':
                    cur_id = i['curid']
        else:
            print '\nError retrieving GEO curation ID from InSilicoDB for file %s!' % filename

        try:
            with open('%s%s_series_matrix.txt' % (local_path, gse_file), 'r') as g_file:
                dataset_id = gen_ds_id()
                current_dataset = None
                first_data_column, in_data = False, False
                # Platform dict matches platform to all reporters for it
                # eg. {'GPL96': ['reporter_1', 'reporter_2']}
                metadata, plat_dict = dict(), dict()
                factors, line_errors, sample_list = list(), list(), list()
                current_line, valid_length = 0, 0
                dataset_name, platform, pubmed_id, species, summary = '', '', '', '', ''
                display_params = {'aggregate': [], 'color': [], 'sort': []}
                file_errors = set()
                # For use with matrix
                rep_dict = dict()
                data_list = list()

                for line in g_file:
                    # Remove newlines, quotes
                    line = line.rstrip('\n').replace('"', '')

                    if line.startswith('!Series_title'):
                        dataset_name = line.split('\t', 1)[1]
                    if line.startswith('!Series_pubmed_id'):
                        pubmed_id = line.split('\t', 1)[1].strip()
                    if line.startswith('!Series_summary') and not summary:
                        summary = line.split('\t', 1)[1].strip()
                    if line.startswith('!Series_sample_id'):
                        sample_list = line.split('\t', 1)[1].strip().split(' ')
                    if line.startswith('!Sample_organism_ch1'):
                        species = line.split('\t')[1].strip().lower()
                        print 'Species: %s' % species_dict[species]

                        # Metadata
                        _now = datetime.now()
                        m = BiogpsDataset(id=dataset_id, name=dataset_name, ownerprofile=UserProfile.objects.get(user__username='geo'), platform=platform, species=species_dict[species], metadata=metadata, created=_now, lastmodified=_now)
                        m.save()
                        current_dataset = m
                        print 'Metadata done.'

                    if line.startswith('!Series_platform_id'):
                        platform = line.split('\t', 1)[1].lstrip()
                        plat_dict[platform] = list()
                        print 'Platform: %s' % platform
                        # sample_titles eg: {"GSM16943": "Wild Type Control Set A"}
                        sample_titles = dict()
                        if cur_id:
                            u = urllib2.urlopen("http://insilico.ulb.ac.be/Publicutilities/getannotations?gse=%s&gpl=%s&id=%s" % (geo_id, platform, cur_id))
                            if u.getcode() == 200:
                                titles_data = literal_eval(u.read())
                                for k, v in titles_data.iteritems():
                                    sample_titles[k] = v['title'].strip("'")
                        else:
                            print '\nError retrieving sample titles from InSilicoDB for file %s!' % filename

                        # Request factors metadata from InSilicoDB
                        factors_dict = dict()
                        u = urllib2.urlopen("http://insilico.ulb.ac.be/Publicutilities/getpreferedannotation?gse=%s&gpl=%s" % (geo_id, platform))
                        if u.getcode() == 200:
                            factors_data = literal_eval(u.read())
                            for i in sample_list:
                                factors_dict[i] = factors_data[i]
                                if sample_titles:
                                    factors_dict[i]['title'] = sample_titles[i]
                            [factors.append({i: factors_dict[i]}) for i in sample_list]
                        else:
                            print '\nError retrieving json factors from InSilicoDB for file %s!' % filename

                        metadata = {"id": dataset_id, "name": dataset_name, "owner": "GEO", "geo_gds_id": "", "geo_gpl_id": platform, "geo_gse_id": geo_id, "pubmed_id": pubmed_id, "summary": summary, "factors": factors, "display_params": display_params}

                    elif line.startswith('!series_matrix_table_begin'):
                        in_data = True
                    elif line.startswith('!series_matrix_table_end'):
                        in_data = False
                        print 'Data done.'
                    elif in_data:
                        # If no data go to next file
                        if len(line) == 0:
                            break

                        # Column headers
                        if line.startswith('ID_REF'):
                            line = line.split('\t')

                            # Count number of elements per line
                            valid_length = len(line)

                            # Check which column data starts in
                            for i, j in enumerate(line[1:]):
                                if j.startswith('GSM') and not first_data_column:
                                    first_data_column = i + 1
                                sample_list.append(j)
                        else:
                            # Data line - split on tabs
                            line = line.split('\t')

                            if len(line) != valid_length:
                                file_errors.add(filename)
                                print line
                                if len(line) < valid_length:
                                    line_errors.append([filename, 'Line ' +\
                                                       str(current_line) +\
                                                       ': missing values'])
                                elif len(line) > valid_length:
                                    line_errors.append([filename, 'Line ' +\
                                                        str(current_line) +\
                                                        ': too many values'])

                            reporter = str(line[0].strip())
                            plat_dict[platform].append(reporter)
                            # Create both keys and values out of
                            # reporters and their positions for
                            # fast lookups, adjusting for headers
                            rep_dict[reporter] = current_line
                            rep_dict[current_line] = reporter
                            # Round numeric values to three digits
                            # Let this fail! Don't wrap in try/
                            # except. We need to know about
                            # missing data.
                            data = [round(float(i), 3) for i in line[1:]]
                            data_list.append(data)

                            # Data
                            try:
                                d = BiogpsDatasetData(dataset=current_dataset, reporter=reporter, data=str(data))
                                d.save()
                            except psycopg2.DataError:
                                print '\nDataset ID: %s, Reporter: %s\n' % (current_dataset.id, reporter)
                            current_line += 1

                # Data matrix
                ds_matrix = np.array(data_list, np.float32)
                try:
                    # Temp file
                    s = StringIO()
                    np.save(s, ds_matrix)
                    s.seek(0)
                    mat = BiogpsDatasetMatrix(dataset=current_dataset, reporters=str(rep_dict), matrix=s.read())
                    mat.save()
                    print 'Matrix done.'
                except psycopg2.DataError:
                    print '\nDataset ID: %s, Reporter: %s\n' % (current_dataset.id, reporter)

                # Save platform dict if not found in DB 
                try:
                    all_reps = plat_dict[platform]
                    cur.execute("select platform from dataset_biogpsdatasetplatform where platform = %s", (platform,))
                    records = cur.fetchone()
                    if records:
                        # Platform already in DB - confirm current dataset
                        # has same number of reporters
                        num_reps = len(literal_eval(records.reporters))
                        if num_reps != len(all_reps):
                            print 'Platform reporters mismatch! Plat reps: %s, ds reps: %s' % (num_reps, len(all_reps))
                    else:
                        p = BiogpsDatasetPlatform(platform=platform, reporters=str(all_reps))
                        p.save()
                        print '\nSuccess loading new platform %s with %s reporters' % (platform, len(all_reps))
                except psycopg2.DataError:
                    print '\nDataset ID: %s, Platform: %s\n' % (current_dataset.id, platform)

                try:
                    if len(line_errors) > 0:
                        print 'Line Errors:'
                        print str(line_errors)
                except AttributeError:
                    # No errors to write
                    pass
        except IOError:
            print 'File %s does not exist on local storage.' % gse_file
            # Download file from NCBI
            data_file = '%s_series_matrix.txt.gz' % gse_file
            local_file = local_path + data_file
            print 'Now downloading %s...' % data_file
            urlretrieve('ftp://ftp.ncbi.nih.gov/pub/geo/DATA/SeriesMatrix/%s/%s' % (gse_file, data_file), local_file)
            print 'Download complete. Extracting...'
            tar = tarfile.open(local_file)
            tar.extractall()
            tar.close()
            print 'Extraction complete.'

    print 'File Errors:'
    if len(file_errors) > 0:
        print '%s\n' % str(file_errors)
    else:
        print 'None\n'

    conn.commit()
    cur.close()
    conn.close()


if __name__ == "__main__":
    parse_GSE_files()
