#! /home/imacleod/venv/datasets/bin/python

#####################################################
#  NCBI GEO GDS dataset parser. Creates .csv file   #
#  in preparation for uploading dataset to service  #
#  layer.                                           #
#####################################################

from ast import literal_eval
from os import path
import csv
import glob
import psycopg2
import sys
import urllib2

sys.path.append('/home/imacleod/datachart_sl')
from service_layer.dataset.ds_loading.dataset_loader import gen_ds_id

conn = psycopg2.connect("dbname=biogps_datasets_dev user=postgres\
             host=localhost port=5432")
cur = conn.cursor()

def parse_GDS_files():
    soft_files = glob.glob('/storage/sulab/GEO_Data/GDS/test_copies/*.soft')
    out_path = '/storage/sulab/GEO_Data/GDS/test_copies/csv/'
    test_platforms = list(('GPL8300', 'GPL570', 'GPL96', 'GPL571', 'GPL97',
                           'GPL339', 'GPL340', 'GPL9523', 'GPL1261', 'GPL8321',
                           'GPL5766', 'GPL5759', 'GPL8492'))

    # Files already uploaded
    uploaded_files = set()
    csv_reader = csv.reader(open('/storage/sulab/GEO_Data/GDS/test_copies/csv/'\
         'uploaded_files.csv', 'r'))
    for row in csv_reader:
        for item in row:
            uploaded_files.add(item)

    for soft_file in soft_files:
        filename = path.splitext(path.basename(soft_file))[0]
        print '\n%s' % filename
        if filename not in uploaded_files:
            with open(soft_file, 'r') as s_file:
                first_data_column, in_data = False, False
                col_mask, factors, line_errors, title_list = list(), list(), list(), list()
                current_line, dataset_id, valid_length = 0, 0, 0
                dataset_name, geo_id, platform, pubmed_id, summary = '', '', '', '', ''
                display_params = {'Aggregate': '', 'Color': '', 'Sort': ''}
                # For use with matrix
                rep_dict = dict()
                data_list = list()

                for line in s_file:
                    # GDS files use space after platform, before equal sign
                    # Example: !dataset_platform = GPL570
                    if line.startswith('!dataset_platform '):
                        platform = line.rstrip('\n').split('=')[1].lstrip()
                        if platform in test_platforms:
                            print 'Platform: %s' % platform
                            dataset_id = gen_ds_id()
                            print 'Dataset_id: %s' % dataset_id
                            continue
                        else:
                            # Platform we're not interested in, go to next file
                            break
                    if line.startswith('!dataset_title'):
                        dataset_name = line.split('=')[1].strip()
                    if line.startswith('^DATASET'):
                        geo_id = line.split('=')[1].strip()
                    if line.startswith('!dataset_pubmed_id'):
                        pubmed_id = line.split('=')[1].strip()
                    if line.startswith('!dataset_description'):
                        summary = line.split('=')[1].strip()
                    if line.startswith('!dataset_table_begin'):
                        in_data = True
                    elif line.startswith('!dataset_table_end'):
                        in_data = False
                    elif in_data:
                        # If no data go to next file
                        if len(line) == 0:
                            break

                        # Column headers
                        if line.startswith('ID_REF'):
                            line = line.split()

                            # Remove Identifier column
                            line.pop(1)

                            # Count number of elements per line
                            valid_length = len(line)

                            # Set first data column, titles for samples
                            for i, j in enumerate(line[1:]):
                                if j.startswith('GSM') and \
                                not first_data_column:
                                    first_data_column = i
                                title_list.append(j)
                        else:
                            # Data line - remove extra spaces, split on tabs
                            row_data = list()
                            line = line.replace(': ', ':').split('\t')

                            # Remove Identifier column
                            line.pop(1)

                            if len(line) != valid_length:
                                if len(line) < valid_length:
                                    line_errors.append([filename, 'Line ' +\
                                                        str(current_line) +\
                                              ': missing values'])
                                elif len(line) > valid_length:
                                    line_errors.append([filename, 'Line ' +\
                                                        str(current_line) +\
                                             ': too many values'])

                            for i, j in enumerate(line):
                                if i == 0:
                                    reporter = j.strip()
                                    # Create both keys and values out of
                                    # reporters and their positions for
                                    # fast lookups, adjusting for headers
                                    rep_dict[reporter] = current_line
                                    rep_dict[current_line] = reporter
                                else:
                                    if i >= first_data_column:
                                        # Round numeric values to three digits
                                        # Let this fail! Don't wrap in try/
                                        # except. We need to know about
                                        # missing data.
                                        row_data.append(round(float(j), 3))

                                # Insert data
                                #cur.execute("insert into dataset_data values (%d, '%s', '%s');" % (dataset_id, reporter, row_data))
                            current_line += 1

                # Lookup GEO curation ID in order to get sample titles
                cur_id = 0
                u = urllib2.urlopen("http://insilico.ulb.ac.be/Publicutilities/getcurations?gse=%s" % geo_id)
                if u.getcode() == 200:
                    cur_data = literal_eval(u.read())
                    for i in cur_data['curations']:
                        if i['curator'] == 'GEO':
                            cur_id = i['curid']

                sample_titles = dict()
                if cur_id:
                    u = urllib2.urlopen("http://insilico.ulb.ac.be/Publicutilities/getannotations?gse=%s&gpl=%s&id=%s" % (geo_id, platform, cur_id))
                    if u.getcode() == 200:
                        titles_data = literal_eval(u.read())
                        for k, v in titles_data.iteritems():
                            sample_titles[k] = v['title'].strip("'")

                factors_dict = dict()
                # Request factors metadata from InSilicoDB
                u = urllib2.urlopen("http://insilico.ulb.ac.be/Publicutilities/getpreferedannotation?gse=%s&gpl=%s" % (geo_id, platform))
                if u.getcode() == 200:
                    factors_data = u.read()
                    #factors_data = literal_eval(u.read())
                    for i in title_list:
                        factors_dict[i] = factors_data[i]
                        if sample_titles:
                            factors_dict[i]['title'] = sample_titles[i]
                    [factors.append({i: factors_dict[i]}) for i in title_list]
                else:
                    print '\nError retrieving json factors from InSilicoDB for file %s!' % filename

                metadata = {"ID": dataset_id, "Name": dataset_name, "Owner": "GEO", "GEO_ID": geo_id, "PubMed_ID": pubmed_id, "Summary": summary, "Col_Mask": col_mask, "Factors": factors, "Display_Params": display_params}
                # Insert dataset metadata and matrix in DB
                #cur.execute(query_string)

                try:
                    if len(line_errors) > 0:
                        print 'Errors:'
                        print str(line_errors)
                except AttributeError:
                    # No errors to write
                    pass
        else:
            print 'Already uploaded!'

if __name__ == "__main__":
    parse_GDS_files()
