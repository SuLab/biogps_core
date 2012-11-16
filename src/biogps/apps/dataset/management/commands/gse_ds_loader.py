# -*- coding: utf-8 -*-

from biogps.utils.helper import json
from datetime import datetime
from django.core.management.base import NoArgsCommand
from django.conf import settings
from django.db import connection, IntegrityError
from os import path, remove
from random import randint 
from StringIO import StringIO
import csv
import gzip
import numpy as np
import psycopg2
import struct
import subprocess
import sys
import urllib2
from biogps.apps.auth2.models import UserProfile
from biogps.apps.dataset.models import BiogpsDataset, BiogpsDatasetData, BiogpsDatasetMatrix, BiogpsDatasetPlatform, BiogpsDatasetGeoLoaded, BiogpsDatasetGeoFlagged, BiogpsDatasetProcessing


class Command(NoArgsCommand):
    help = 'A utility that parses and loads GEO GSE datasets into the DB.'
    # Turn off Django's DEBUG mode to limit memory usage
    settings.DEBUG = False

    def handle_noargs(self, **options):
        target_DB = settings.DATABASES['default']['NAME']
        ans = ask('Parse and load GEO GSE datasets into database "%s"?' % target_DB)
        if ans == 'Y':
            self.stdout.write('\nLoading datasets...\n')

            def load_dataset(**kwargs):
                ''' Download, parse, and save new dataset to database. '''
                gse_file = kwargs['gse_file']
                db_id = kwargs['db_id']
                # Add dataset to processing table for multi-threaded support
                processing = BiogpsDatasetProcessing.objects.get(id=1)
                if not db_id:
                    # Don't have platform yet, will get from file
                    processing.datasets.append(geo_id)
                else:
                    processing.datasets.append(db_id)
                processing.save()

                try:
                    local_file = locate_ds_file(gse_file)
                    if not local_file:
                        # Can't find this file anywhere... move on
                        if not db_id:
                            update_processing(gse_file)
                            return
                        else:
                            update_processing(db_id)
                            return
                    else:
                        dataset_id = gen_ds_id()
		        current_dataset, db_platform = None, None
		        first_data_column, in_data = False, False
		        # Platform dict matches platform to all reporters for it
		        # eg. {'GPL96': ['reporter_1', 'reporter_2']}
		       	# Sample titles eg: {"GSM16943": "Wild Type Control Set A"}
		        factors_dict, plat_dict, sample_titles = dict(), dict(), dict()
		        db_reps, factors_list, line_errors, sample_list, sample_title_list = list(), list(), list(), list(), list()
		        current_line, valid_length = 0, 0
		        dataset_name, platform, pubmed_id, species, summary = '', '', '', '', ''
		        display_params = {'aggregate': [], 'color': [], 'sort': []}
		        file_errors = set()
		        # For use with matrix
		        rep_dict = dict()
		        data_list = list()

                        # Decompress file, parse it
                        try:
		            gz = gzip.open(local_file, 'rb')
                        except IOError:
                            # Rare case where multiple processes are working
                            # on the same dataset at the same time. Skip.
                            return
                        try:
                            # First find sample titles for non-Insilico datasets
                            if not db_id:
		                for line in gz:
                                    if line.startswith('!Sample_title'):
                                        # Remove newlines, quotes
		                        line = line.rstrip('\n').replace('"', '')
                                        sample_title_list = line.split('\t', 1)[1].strip().split('\t')
                                        # Rewind file
                                        gz.seek(0)
                                        break
                                    
                            # Now parse all lines
		            for line_no, line in enumerate(gz):
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
                                    # Non-Insilico files need to finalize sample_titles dict
                                    for idx, val in enumerate(sample_list):
                                        sample_titles[val] = sample_title_list[idx]
		                if line.startswith('!Sample_organism_ch1'):
		         	    species = line.split('\t')[1].strip().lower()
		         	    self.stdout.write('Species: %s\n' % species)
		                if line.startswith('!Series_platform_id'):
		         	    platform = line.split('\t', 1)[1].lstrip()
                                    if not db_id:
                                        # Non-Insilico dataset
                                        db_id = '%s_%s' % (geo_id, platform)

                                        # Now have platform, check if loaded
                                        if db_id in BiogpsDatasetGeoLoaded.objects.get(geo_type='gse').datasets:
                                            update_processing(gse_file)
                                            self.stdout.write('{} already loaded in DB...\n'.format(db_id))
                                            return

                                        # Parse dataset factors
                                        [factors_list.append({i: {'title': sample_titles[i]}}) for i in sample_list]
                                    else:
	                                # Lookup GEO curation ID in order to get sample titles
	                                cur_id = 0
	                                u = urllib2.urlopen("http://insilico.ulb.ac.be/Publicutilities/getcurations?gse=%s" % geo_id)
	                                if u.getcode() == 200:
	                                    cur_data = json.loads(u.read())
	    	                            for i in cur_data['curations']:
	    	                                if i['curator'] == 'GEO':
	    		                            cur_id = i['curid']
	                                else:
	    	                            log_file.write('Error retrieving GEO curation ID from InSilicoDB for file %s!\n' % filename)

		           	        if cur_id:
		           	            u = urllib2.urlopen("http://insilico.ulb.ac.be/Publicutilities/getannotations?gse=%s&gpl=%s&id=%s" % (geo_id, platform, cur_id))
		           	            if u.getcode() == 200:
		           	                titles_data = json.loads(u.read())
                                                if titles_data and type(titles_data) is dict:
		           	                    for k, v in titles_data.iteritems():
		           	                        sample_titles[k] = v['title'].strip("'")
                                                else:
                                                    log_file.write('No sample annotations in InSilicoDB for file %s!\n' % filename)
		           	        else:
		           	            log_file.write('Error retrieving sample titles from InSilicoDB for file %s!\n' % filename)

		           	        # Request factors metadata from InSilicoDB
		           	        u = urllib2.urlopen("http://insilico.ulb.ac.be/Publicutilities/getpreferedannotation?gse=%s&gpl=%s" % (geo_id, platform))
		           	        if u.getcode() == 200:
                                            try:
                                                _factors = u.read()
		           	                factors_data = json.loads(_factors)
                                            except ValueError:
                                                log_file.write('**Value Error**\nFactors data: %s\n' % _factors)
                                                factors_data = None
                                            if factors_data:
                                                try:
		           	                    for i in sample_list:
		           	                        factors_dict[i] = factors_data[i]
		           	                        if sample_titles:
		           	                            factors_dict[i]['title'] = sample_titles[i]
                                                except KeyError as e:
                                                    log_file.write('**Key Error**\nKey: %s\nFactors data: %s\n' % (e, factors_data))
                                                    update_processing(db_id)
                                                    return
		           	                [factors_list.append({i: factors_dict[i]}) for i in sample_list]
		           	        else:
		           	            log_file.write('Error retrieving json factors from InSilicoDB for file %s!\n' % filename)

                                    # Empty list to track reporters for this platform/dataset
		         	    plat_dict[platform] = list()

                                    # Check DB for pre-existing platform
                                    try:
                                        db_platform = BiogpsDatasetPlatform.objects.get(platform=platform)
                                        db_reps = db_platform.reporters
                                    except BiogpsDatasetPlatform.DoesNotExist:
                                        # Create placeholder platform entry in DB, to be
                                        # updated once all reporters are parsed
                                        db_platform = BiogpsDatasetPlatform.objects.create(platform=platform, reporters=[])
		         	    self.stdout.write('Platform: %s\n' % platform)
                                elif line.startswith('!series_matrix_table_begin'):
		           	    # Metadata
		           	    metadata = {"id": dataset_id, "name": dataset_name, "owner": "GEO", "geo_gds_id": "", "geo_gpl_id": platform, "geo_gse_id": geo_id, "pubmed_id": pubmed_id, "summary": summary, "factors": factors_list, "display_params": display_params}
		           	    _now = datetime.now()
                                    try:
		           	        m = BiogpsDataset(id=dataset_id, name=dataset_name, ownerprofile=UserProfile.objects.get(user__username='geo'), platform=db_platform, geo_id_plat=db_id, species=species_dict[species], metadata=metadata, created=_now, lastmodified=_now)
                                    except KeyError as e:
                                        log_file.write('\n**Species Key Error**\nSpecies: "%s"\n' % species)
                                        update_processing(db_id)
                                        return
                                    try:
		           	        m.save()
                                    except IntegrityError as e:
		                        log_file.write('DB integrity error: {}\n'.format(e))
                                        # Dataset already loaded, skip
                                        update_processing(db_id)
                                        return
		           	    current_dataset = m
		           	    self.stdout.write('Metadata done.\n')
		           	    in_data = True
		                elif line.startswith('!series_matrix_table_end'):
		           	    in_data = False
		           	    self.stdout.write('Data done.\n')
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
		           	            file_errors.add(str(filename))
		           	            log_file.write(str(line))
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
		           	        # fast lookups
		           	        rep_dict[reporter] = current_line
		           	        rep_dict[current_line] = reporter
		           	        # Round numeric values to three digits
                                        try:
		           	            data = [round(float(i), 3) for i in line[1:]]
                                        except ValueError:
                                            # Missing or invalid data
                                            _reason = 'Missing or invalid data at line %s.' % (current_line)
                                            BiogpsDatasetGeoFlagged.objects.create(geo_type='gse', dataset=current_dataset, reason=_reason)
                                            self.stdout.write('\n%s Logging and skipping...\n' % _reason)
                                            update_loaded(db_id)
                                            update_processing(db_id)
                                            return
		           	        data_list.append(data)

		           	        # Data
		           	        dat = BiogpsDatasetData(dataset=current_dataset, reporter=reporter, data=data)
		           	        dat.save()
		           	        current_line += 1
                        except struct.error:
                            self.stdout.write('Incomplete data file downloaded, logging and skipping...\n')
                            BiogpsDatasetGeoFlagged.objects.create(geo_type='gse', dataset=current_dataset, reason='Incomplete data file downloaded, parsing failed')
                            update_loaded(db_id)
                            update_processing(db_id)
                            return

		        # Data matrix
		        ds_matrix = np.array(data_list, np.float32)

		        # Temp file
		        s = StringIO()
		        np.save(s, ds_matrix)
		        s.seek(0)
		        mat = BiogpsDatasetMatrix(dataset=current_dataset, reporters=rep_dict, matrix=s.read())
		        mat.save()
		        self.stdout.write('Matrix done.\n')

                        # Check/update platform and its reporters
                        ds_reps = plat_dict[platform]
                        ds_count = len(ds_reps)
                        if db_reps:
                            # Confirm current dataset reporters count matches DB
                            db_count = len(db_reps)
                            if db_count == ds_count:
                                pass
                            else:
                                _reason = 'Number of reporters in dataset and DB don\'t match! DB: %s, DS: %s, Platform: %s' % (db_count, ds_count, platform)
                                self.stdout.write('%s\n' % _reason)
                                BiogpsDatasetGeoFlagged.objects.create(geo_type='gse', dataset=current_dataset, reason=_reason)
                        else:
                            # Update platform in DB with all reporters
                            p = BiogpsDatasetPlatform.objects.get(platform=platform)
                            p.reporters = ds_reps
                            p.save()
                            self.stdout.write('Success saving new platform %s with %s reporters\n' % (platform, ds_count))

                        # Add dataset to saved datasets
                        update_loaded(db_id)

                        # Remove dataset from processing table
                        try:
                            update_processing(db_id)
                        except ValueError:
                            update_processing(geo_id)

                        # Display file errors, if any
		        try:
		            if len(line_errors) > 0:
		                log_file.write('Line Errors: ')
		           	log_file.write(str(line_errors))
		        except AttributeError:
		            # No errors to write
		            pass

                        # Close and delete local file
		        gz.close()
                        try:
		            remove(local_file)
                        except OSError:
                            # File could be missing if other
                            # process already removed it
                            pass

                        log_file.write('File Errors: ')
                        if len(file_errors) > 0:
                            log_file.write('%s\n' % str(file_errors))
	                else:
	                    log_file.write('None\n\n')

                except OSError as e:
                    update_processing(db_id)
                    if e.errno == 12:
                        self.stdout.write('Cannot allocate memory...\n')
                        log_file.write('Cannot allocate memory...\n')
                    else:
                        log_file.write(e)

	    def gen_ds_id():
		''' Get next dataset id from Postgres sequence
		    and confirm it isn't a reserved ID'''
                cur = connection.cursor()
		cur.execute("select nextval('dataset_biogpsdataset_id_seq')")
		dataset_id = int(cur.fetchone()[0])
		while dataset_id in range(1, 15):
                    # Reserving IDs 1-14 for BioGPS custom datasets, try again
		    cur.execute("select nextval('dataset_biogpsdataset_id_seq')")
		    dataset_id = int(cur.fetchone()[0])
		return dataset_id

            def locate_ds_file(gse_file):
                ''' Find or create local dataset file'''
		data_file = '%s_series_matrix.txt.gz' % gse_file
		local_file = '%s/%s' % (local_path, data_file)
                if path.isfile(local_file):
                    self.stdout.write('Local file {} found!\n'.format(local_file))
                else:
                    # Download dataset
		    self.stdout.write('Now downloading %s...\n' % data_file)
                    if subprocess.call(['wget', '-nH', '-nd', '-O%s' % local_file, 'ftp://ftp.ncbi.nih.gov/pub/geo/DATA/SeriesMatrix/%s/%s' % (gse_file, data_file)]):
                        # Return code of 1, download failed
                        log_file.write('Downloading file %s failed!\n' % data_file)
                        return None
                    else:
		        self.stdout.write('Download complete.\n')
                return local_file
	    
            def update_loaded(db_id):
                ''' Add dataset_platform to saved datasets'''
                db_obj = BiogpsDatasetGeoLoaded.objects.get(geo_type='gse')
                db_obj.datasets.append(db_id)
                db_obj.save()

            def update_processing(db_id):
                ''' Remove current dataset from Postgres processing table'''
                processing = BiogpsDatasetProcessing.objects.get(id=1)
                processing.datasets.remove(db_id)
                processing.save()


            # Main
	    # Temp GEO GSE dataset directory
            local_path = settings.DATASET_DIR
	    log_file = open('%s/%s' % (local_path, 'geo_gse_log_%s.txt' % randint(0, 10000)), 'w')
            species_dict = {'homo sapiens': 'human', 'mus musculus': 'mouse', 'rattus norvegicus': 'rat'}
            insil_gse = urllib2.urlopen("http://insilico.ulb.ac.be/Publicutilities/oldgetserieslist")
            gse_files = json.loads(insil_gse.read())
            #gse_files = ['GSE24759']

            start_file = 0
            end_file = 3000
            current_file = start_file
            
            for gse_file in gse_files[start_file:end_file]:
                filename = path.splitext(path.basename(gse_file))[0]
	        self.stdout.write('\n%s\n' % filename)
	        log_file.write('\n%s\n' % filename)

	        # Strip out geo accession from filename, 'GSE101' etc
	        geo_id = filename.split('-', 1)[0].split('_', 1)[0]

                # Get platforms for dataset
                platforms = list()
	        u = urllib2.urlopen("http://insilico.ulb.ac.be/Publicutilities/getplatforms?gse=%s" % geo_id)
	        if u.getcode() == 200:
                    res = ''
                    try:
                        res = json.loads(u.read())
                    except ValueError as e:
                        log_file.write('Error reading Insilico response: {}\n'.format(e))
                        load_dataset(gse_file=gse_file, db_id=None)
                        current_file += 1
                        continue
                    res_type = type(res)
                    if res_type is list:
                        # Found entry in Insilico
	    	        [platforms.append(i) for i in json.loads(u.read())]
                    elif res_type is dict:
                        # Most likely no entry found
                        log_file.write(str(u.read()))
                        load_dataset(gse_file=gse_file, db_id=None)
                        current_file += 1
                        continue
	        else:
	    	    log_file.write('Error retrieving GEO curation ID from InSilicoDB for file %s!\n' % filename)
                    continue

                self.stdout.write('Current file: #%s\n' % current_file)
                log_file.write('Current file: #%s\n' % current_file)
                # Determine platforms not yet loaded
                for p in platforms:
                    db_id = '%s_%s' % (geo_id, p)
                    # Check datasets already loaded in DB
                    if db_id in BiogpsDatasetGeoLoaded.objects.get(geo_type='gse').datasets:
                        self.stdout.write('%s already loaded in DB...\n' % db_id)
                    # Check datasets being processed
                    elif db_id in BiogpsDatasetProcessing.objects.get(id=1).datasets:
                        self.stdout.write('%s already being processed...\n' % db_id)
                    else:
                        load_dataset(gse_file=gse_file, db_id=db_id)
                current_file += 1
            log_file.close()


def ask(prompt, options='YN'):
    '''Prompt Yes or No, return the upper case 'Y' or 'N'.'''
    options=options.upper()
    while 1:
        s = raw_input(prompt+'[%s]' % '|'.join(list(options))).strip().upper()
        if s in options: break
    return s
