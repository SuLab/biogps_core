#! /home/imacleod/venv/datasets/bin/python

#####################################################
#  NCBI GEO GSE dataset parser. Parses data file    #
#  and loads results into database.                 #
#####################################################

from ast import literal_eval
from os import path
from StringIO import StringIO
import csv
import glob
import numpy as np
import psycopg2
import sys
import urllib2

sys.path.append('/home/imacleod/datachart_sl')
from service_layer.dataset.ds_loading.dataset_loader import cap_first, gen_ds_id

conn = psycopg2.connect("dbname=biogps_datasets_dev user=postgres\
             host=localhost port=5432")
cur = conn.cursor()

def parse_GSE_files():
    gse_files = glob.glob('/storage/sulab/GEO_Data/GSE/GSE*.txt')
    #insil_gse = urllib2.urlopen("http://insilico.ulb.ac.be/Publicutilities/oldgetserieslist")
    #gse_files = literal_eval(insil_gse.read())

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

        with open(gse_file, 'r') as g_file:
            dataset_id = gen_ds_id()
            first_data_column, in_data = False, False
            # Platform dict matches platform to all reporters for it
            # eg. {'GPL96': ['reporter_1', 'reporter_2']}
            plat_dict = dict()
            factors, line_errors, sample_list = list(), list(), list()
            current_line, valid_length = 0, 0
            dataset_name, platform, pubmed_id, summary = '', '', '', ''
            display_params = {'aggregate': ['title'], 'color': [], 'sort': []}
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
                if line.startswith('!Series_platform_id'):
                    platform = line.split('\t', 1)[1].lstrip()
                    plat_dict[platform] = list()
                    print platform
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
                    # Insert metadata
                    cur.execute("insert into dataset_meta values (%s, %s, %s)", (dataset_id, 'GEO', str(metadata)))
                elif line.startswith('!series_matrix_table_begin'):
                    in_data = True
                elif line.startswith('!series_matrix_table_end'):
                    in_data = False
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

                        # Insert data
                        try:
                            cur.execute("insert into dataset_data values (%s, %s, %s)", (dataset_id, reporter, str(data)))
                        except psycopg2.DataError:
                            print '\nDataset ID: %s, Reporter: %s\n' % (dataset_id, reporter)
                        current_line += 1

            # Insert matrix
            ds_matrix = np.array(data_list, np.float32)
            try:
                # Temp file
                s = StringIO()
                np.save(s, ds_matrix)
                s.seek(0)
                cur.execute("insert into dataset_matrix values (%s, %s, %s)", (dataset_id, str(rep_dict), psycopg2.Binary(s.read())))
            except psycopg2.DataError:
                print '\nDataset ID: %s, Reporter: %s\n' % (dataset_id, reporter)

            # Insert platform dict if platform not found in DB 
            try:
                cur.execute("select platform from dataset_platform where platform = %s", (platform,))
                records = cur.fetchone()
                if records:
                    # Platform already in DB
                    print 'Platform and reporters already loaded in DB'
                else:
                    all_reps = plat_dict[platform]
                    cur.execute("insert into dataset_platform values (%s, %s)", (platform, str(all_reps)))
                    print '\nSuccess loading new platform %s with %s reporters' % (platform, len(all_reps))
            except psycopg2.DataError:
                print '\nDataset ID: %s, Platform: %s\n' % (dataset_id, platform)

            try:
                if len(line_errors) > 0:
                    print 'Line Errors:'
                    print str(line_errors)
            except AttributeError:
                # No errors to write
                pass

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
